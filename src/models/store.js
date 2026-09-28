import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');

export class TaskStore {
  static async getUsers() {
    try {
      const data = await fs.readFile(USERS_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (err) {
      console.error('Error reading users.json:', err);
      return [];
    }
  }

  static async getUserById(userId) {
    const users = await this.getUsers();
    return users.find((u) => u.id === userId) || null;
  }

  static async getTasks() {
    try {
      const data = await fs.readFile(TASKS_FILE, 'utf-8');
      const rawTasks = JSON.parse(data);
      const users = await this.getUsers();
      const userMap = new Map(users.map((u) => [u.id, u]));

      // Link each task with populated assignee details
      return rawTasks.map((task) => ({
        ...task,
        assignee: task.assigneeId ? userMap.get(task.assigneeId) || null : null,
      }));
    } catch (err) {
      console.error('Error reading tasks.json:', err);
      return [];
    }
  }

  static async getTaskById(taskId) {
    const tasks = await this.getTasks();
    return tasks.find((t) => t.id === taskId || t.ticketId.toLowerCase() === taskId.toLowerCase()) || null;
  }

  static async saveRawTasks(tasks) {
    await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf-8');
  }

  /**
   * STMS-12: Assigns a task to a user, or unassigns if assigneeId is null/empty.
   */
  static async assignTask(taskId, assigneeId, assignedBy = 'usr-101') {
    const rawData = await fs.readFile(TASKS_FILE, 'utf-8');
    const rawTasks = JSON.parse(rawData);

    const taskIndex = rawTasks.findIndex(
      (t) => t.id === taskId || t.ticketId.toLowerCase() === taskId.toLowerCase()
    );

    if (taskIndex === -1) {
      throw new Error(`TASK_NOT_FOUND: Task with ID '${taskId}' does not exist.`);
    }

    const currentTask = rawTasks[taskIndex];
    let assignee = null;

    if (assigneeId) {
      assignee = await this.getUserById(assigneeId);
      if (!assignee) {
        throw new Error(`USER_NOT_FOUND: Team member with ID '${assigneeId}' was not found.`);
      }
    }

    const previousAssigneeId = currentTask.assigneeId;
    const isUnassigning = !assigneeId;
    const isReassigning = previousAssigneeId && previousAssigneeId !== assigneeId;

    const action = isUnassigning ? 'UNASSIGNED' : isReassigning ? 'REASSIGNED' : 'ASSIGNED';
    const timestamp = new Date().toISOString();

    const historyEntry = {
      action,
      from: previousAssigneeId || null,
      to: assigneeId || null,
      by: assignedBy,
      timestamp,
    };

    // Update task entity
    currentTask.assigneeId = assigneeId || null;
    currentTask.assignedAt = assigneeId ? timestamp : null;
    currentTask.assignedBy = assigneeId ? assignedBy : null;
    currentTask.history = currentTask.history || [];
    currentTask.history.unshift(historyEntry);

    // If task was in 'To Do' and is now assigned, advance or keep status
    if (assigneeId && currentTask.status === 'To Do') {
      currentTask.status = 'In Progress';
    }

    rawTasks[taskIndex] = currentTask;
    await this.saveRawTasks(rawTasks);

    return {
      ...currentTask,
      assignee: assignee,
    };
  }

  /**
   * Helper to create a new task
   */
  static async createTask({ title, description, priority = 'Medium', deadline = null, assigneeId = null, assignedBy = 'usr-101' }) {
    const rawData = await fs.readFile(TASKS_FILE, 'utf-8');
    const rawTasks = JSON.parse(rawData);

    const nextNumber = rawTasks.length + 101;
    const taskId = `task-${nextNumber}`;
    const ticketId = `STMS-${nextNumber}`;

    let assignee = null;
    if (assigneeId) {
      assignee = await this.getUserById(assigneeId);
      if (!assignee) {
        throw new Error(`USER_NOT_FOUND: Team member with ID '${assigneeId}' not found.`);
      }
    }

    const timestamp = new Date().toISOString();
    const newTask = {
      id: taskId,
      ticketId,
      title: title.trim(),
      description: description ? description.trim() : '',
      priority,
      status: assigneeId ? 'In Progress' : 'To Do',
      deadline,
      assigneeId: assigneeId || null,
      assignedAt: assigneeId ? timestamp : null,
      assignedBy: assigneeId ? assignedBy : null,
      history: assigneeId
        ? [{ action: 'ASSIGNED', to: assigneeId, by: assignedBy, timestamp }]
        : [{ action: 'CREATED', by: assignedBy, timestamp }],
    };

    rawTasks.push(newTask);
    await this.saveRawTasks(rawTasks);

    return {
      ...newTask,
      assignee,
    };
  }
}
