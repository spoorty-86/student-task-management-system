// State management
let allTasks = [];
let teamMembers = [];
let activeAssignTaskId = null;
const currentUserId = 'usr-101'; // Default logged-in student (R Srujan Kumar)

// DOM Elements
const tasksGrid = document.getElementById('tasksGrid');
const tasksCounter = document.getElementById('tasksCounter');
const metricTotal = document.getElementById('metricTotal');
const metricAssigned = document.getElementById('metricAssigned');
const metricUnassigned = document.getElementById('metricUnassigned');
const metricMyTasks = document.getElementById('metricMyTasks');

const searchInput = document.getElementById('searchInput');
const filterAssignee = document.getElementById('filterAssignee');
const filterPriority = document.getElementById('filterPriority');

// Assign Modal Elements
const assignModalOverlay = document.getElementById('assignModalOverlay');
const assignModalTicketId = document.getElementById('assignModalTicketId');
const assignModalTaskName = document.getElementById('assignModalTaskName');
const memberSearchInput = document.getElementById('memberSearchInput');
const teamMembersList = document.getElementById('teamMembersList');
const btnCloseAssignModal = document.getElementById('btnCloseAssignModal');
const btnCancelAssign = document.getElementById('btnCancelAssign');
const btnUnassignTask = document.getElementById('btnUnassignTask');

// Create Task Modal Elements
const createModalOverlay = document.getElementById('createModalOverlay');
const btnOpenCreateModal = document.getElementById('btnOpenCreateModal');
const btnCloseCreateModal = document.getElementById('btnCloseCreateModal');
const btnCancelCreate = document.getElementById('btnCancelCreate');
const createTaskForm = document.getElementById('createTaskForm');
const createAssignee = document.getElementById('createAssignee');

// Toast Container
const toastContainer = document.getElementById('toastContainer');

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await loadTeamMembers();
  await loadTasks();
});

function setupEventListeners() {
  searchInput.addEventListener('input', applyFilters);
  filterAssignee.addEventListener('change', applyFilters);
  filterPriority.addEventListener('change', applyFilters);

  // Assign Modal events
  btnCloseAssignModal.addEventListener('click', closeAssignModal);
  btnCancelAssign.addEventListener('click', closeAssignModal);
  btnUnassignTask.addEventListener('click', () => handleAssignTask(null));
  memberSearchInput.addEventListener('input', filterMemberListInModal);

  // Create Modal events
  btnOpenCreateModal.addEventListener('click', openCreateModal);
  btnCloseCreateModal.addEventListener('click', closeCreateModal);
  btnCancelCreate.addEventListener('click', closeCreateModal);
  createTaskForm.addEventListener('submit', handleCreateTask);

  // Close modals on overlay backdrop click
  window.addEventListener('click', (e) => {
    if (e.target === assignModalOverlay) closeAssignModal();
    if (e.target === createModalOverlay) closeCreateModal();
  });
}

// Load team members
async function loadTeamMembers() {
  try {
    const res = await fetch('/api/team-members');
    const json = await res.json();
    if (json.success) {
      teamMembers = json.data;
      populateMemberDropdowns();
    }
  } catch (err) {
    console.error('Failed to load team members:', err);
    showToast('Failed to load team members', 'error');
  }
}

function populateMemberDropdowns() {
  // Populate filter dropdown
  teamMembers.forEach((m) => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = `${m.name} (${m.role})`;
    filterAssignee.appendChild(opt);
  });

  // Populate create modal dropdown
  createAssignee.innerHTML = '<option value="">Leave Unassigned</option>';
  teamMembers.forEach((m) => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = `${m.name} (${m.role})`;
    createAssignee.appendChild(opt);
  });
}

// Load tasks from API
async function loadTasks() {
  try {
    const res = await fetch('/api/tasks');
    const json = await res.json();
    if (json.success) {
      allTasks = json.data;
      updateMetrics();
      applyFilters();
    }
  } catch (err) {
    console.error('Failed to load tasks:', err);
    showToast('Failed to connect to backend server', 'error');
  }
}

// Compute & update metric counters
function updateMetrics() {
  const total = allTasks.length;
  const assigned = allTasks.filter((t) => !!t.assigneeId).length;
  const unassigned = total - assigned;
  const myTasks = allTasks.filter((t) => t.assigneeId === currentUserId).length;

  metricTotal.textContent = total;
  metricAssigned.textContent = assigned;
  metricUnassigned.textContent = unassigned;
  metricMyTasks.textContent = myTasks;
}

// Filter and render
function applyFilters() {
  const query = searchInput.value.toLowerCase().trim();
  const assigneeVal = filterAssignee.value;
  const priorityVal = filterPriority.value;

  const filtered = allTasks.filter((task) => {
    // Search query matching
    const matchesSearch =
      !query ||
      task.title.toLowerCase().includes(query) ||
      task.ticketId.toLowerCase().includes(query) ||
      (task.description && task.description.toLowerCase().includes(query)) ||
      (task.assignee && task.assignee.name.toLowerCase().includes(query));

    // Assignee filter matching
    let matchesAssignee = true;
    if (assigneeVal === 'unassigned') {
      matchesAssignee = !task.assigneeId;
    } else if (assigneeVal === 'mine') {
      matchesAssignee = task.assigneeId === currentUserId;
    } else if (assigneeVal !== 'all') {
      matchesAssignee = task.assigneeId === assigneeVal;
    }

    // Priority filter matching
    const matchesPriority = priorityVal === 'all' || task.priority === priorityVal;

    return matchesSearch && matchesAssignee && matchesPriority;
  });

  renderTasks(filtered);
}

// Render cards into DOM
function renderTasks(tasks) {
  tasksCounter.textContent = `Showing ${tasks.length} of ${allTasks.length} tasks`;

  if (tasks.length === 0) {
    tasksGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
        <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">No tasks match your filter criteria.</p>
        <button class="btn btn-secondary" onclick="resetFilters()">Reset All Filters</button>
      </div>
    `;
    return;
  }

  tasksGrid.innerHTML = tasks.map((task) => createTaskCardHtml(task)).join('');

  // Attach button click listeners
  tasks.forEach((task) => {
    const btn = document.getElementById(`btn-assign-${task.id}`);
    if (btn) {
      btn.addEventListener('click', () => openAssignModal(task));
    }
  });
}

function resetFilters() {
  searchInput.value = '';
  filterAssignee.value = 'all';
  filterPriority.value = 'all';
  applyFilters();
}

function createTaskCardHtml(task) {
  const isAssigned = !!task.assigneeId && !!task.assignee;
  const statusClass = `badge-status-${task.status.toLowerCase().replace(/\s+/g, '-')}`;
  const priorityClass = `badge-priority-${task.priority.toLowerCase()}`;

  const assigneeMarkup = isAssigned
    ? `
      <div class="assignee-box is-assigned">
        <div class="assignee-profile">
          <img src="${task.assignee.avatar}" alt="${task.assignee.name}" class="assignee-avatar">
          <div class="assignee-text-group">
            <span class="assignee-name">${escapeHtml(task.assignee.name)}</span>
            <span class="assignee-role">${escapeHtml(task.assignee.role || 'Team Member')}</span>
          </div>
        </div>
        <button id="btn-assign-${task.id}" class="btn-assign-action" title="Change Assignee">
          Reassign
        </button>
      </div>
    `
    : `
      <div class="assignee-box">
        <div class="assignee-profile">
          <div class="unassigned-avatar">?</div>
          <div class="assignee-text-group">
            <span class="assignee-name" style="color: var(--warning);">Unassigned</span>
            <span class="assignee-role">No member linked</span>
          </div>
        </div>
        <button id="btn-assign-${task.id}" class="btn-assign-action unassigned-btn">
          + Assign Task
        </button>
      </div>
    `;

  return `
    <article class="task-card" id="task-card-${task.id}">
      <div>
        <div class="task-header">
          <span class="task-ticket-tag">${escapeHtml(task.ticketId)}</span>
          <div class="task-badges">
            <span class="badge ${priorityClass}">${escapeHtml(task.priority)}</span>
            <span class="badge ${statusClass}">${escapeHtml(task.status)}</span>
          </div>
        </div>
        <h3 class="task-title">${escapeHtml(task.title)}</h3>
        <p class="task-desc">${escapeHtml(task.description || 'No description provided.')}</p>
      </div>
      ${assigneeMarkup}
    </article>
  `;
}

// Assign Modal Workflow (STMS-12 Feature)
function openAssignModal(task) {
  activeAssignTaskId = task.id;
  assignModalTicketId.textContent = task.ticketId;
  assignModalTaskName.textContent = task.title;
  memberSearchInput.value = '';

  // Render members list
  renderMemberList(task.assigneeId);

  // If already unassigned, hide or style unassign button
  btnUnassignTask.style.display = task.assigneeId ? 'inline-flex' : 'none';

  assignModalOverlay.classList.add('active');
  setTimeout(() => memberSearchInput.focus(), 50);
}

function closeAssignModal() {
  assignModalOverlay.classList.remove('active');
  activeAssignTaskId = null;
}

function renderMemberList(currentAssigneeId) {
  const query = memberSearchInput.value.toLowerCase().trim();
  const filtered = teamMembers.filter(
    (m) =>
      !query ||
      m.name.toLowerCase().includes(query) ||
      m.role.toLowerCase().includes(query) ||
      m.email.toLowerCase().includes(query)
  );

  if (filtered.length === 0) {
    teamMembersList.innerHTML = `<p style="padding: 1rem; text-align: center; color: var(--text-muted);">No matching team members found.</p>`;
    return;
  }

  teamMembersList.innerHTML = filtered
    .map((member) => {
      const isSelected = member.id === currentAssigneeId;
      return `
        <div class="member-option ${isSelected ? 'selected' : ''}" onclick="window.selectMember('${member.id}')">
          <div class="member-option-left">
            <img src="${member.avatar}" alt="${member.name}" class="member-option-avatar">
            <div>
              <div class="member-option-name">${escapeHtml(member.name)}</div>
              <div class="member-option-role">${escapeHtml(member.role)} &bull; ${escapeHtml(member.email)}</div>
            </div>
          </div>
          ${isSelected ? '<span class="member-check">✓ Current</span>' : ''}
        </div>
      `;
    })
    .join('');
}

function filterMemberListInModal() {
  const currentTask = allTasks.find((t) => t.id === activeAssignTaskId);
  renderMemberList(currentTask ? currentTask.assigneeId : null);
}

// Global hook for selecting a member
window.selectMember = async (memberId) => {
  await handleAssignTask(memberId);
};

// Core STMS-12 API Call: PATCH /api/tasks/:id/assign
async function handleAssignTask(assigneeId) {
  if (!activeAssignTaskId) return;

  const targetTaskId = activeAssignTaskId;

  try {
    const res = await fetch(`/api/tasks/${targetTaskId}/assign`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assigneeId: assigneeId,
        assignedBy: currentUserId,
      }),
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Failed to update task assignment.');
    }

    // Update in-memory state
    const taskIndex = allTasks.findIndex((t) => t.id === targetTaskId);
    if (taskIndex !== -1) {
      allTasks[taskIndex] = json.data;
    }

    closeAssignModal();
    updateMetrics();
    applyFilters();

    const memberName = json.data.assignee ? json.data.assignee.name : null;
    showToast(
      memberName ? `Task assigned to ${memberName}!` : 'Task unassigned successfully.',
      'success'
    );
  } catch (err) {
    console.error('Assignment error:', err);
    showToast(err.message, 'error');
  }
}

// Create Task Modal Workflow
function openCreateModal() {
  createTaskForm.reset();
  createModalOverlay.classList.add('active');
}

function closeCreateModal() {
  createModalOverlay.classList.remove('active');
}

async function handleCreateTask(e) {
  e.preventDefault();
  const title = document.getElementById('createTitle').value;
  const description = document.getElementById('createDescription').value;
  const priority = document.getElementById('createPriority').value;
  const deadline = document.getElementById('createDeadline').value || null;
  const assigneeId = document.getElementById('createAssignee').value || null;

  try {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        priority,
        deadline,
        assigneeId,
        assignedBy: currentUserId,
      }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Failed to create task');
    }

    allTasks.push(json.data);
    closeCreateModal();
    updateMetrics();
    applyFilters();
    showToast(`Task ${json.data.ticketId} created successfully!`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Toast helper
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✅' : '⚠️'}</span>
    <span>${escapeHtml(message)}</span>
  `;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
