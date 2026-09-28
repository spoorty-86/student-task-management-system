import { TaskStore } from '../models/store.js';

export const taskController = {
  // GET /api/tasks
  async getTasks(req, res) {
    try {
      const { assigneeId, status, priority } = req.query;
      let tasks = await TaskStore.getTasks();

      if (assigneeId) {
        if (assigneeId === 'unassigned') {
          tasks = tasks.filter((t) => !t.assigneeId);
        } else {
          tasks = tasks.filter((t) => t.assigneeId === assigneeId);
        }
      }

      if (status) {
        tasks = tasks.filter((t) => t.status.toLowerCase() === status.toLowerCase());
      }

      if (priority) {
        tasks = tasks.filter((t) => t.priority.toLowerCase() === priority.toLowerCase());
      }

      res.json({
        success: true,
        count: tasks.length,
        data: tasks,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve tasks',
        error: err.message,
      });
    }
  },

  // GET /api/tasks/:id
  async getTaskById(req, res) {
    try {
      const { id } = req.params;
      const task = await TaskStore.getTaskById(id);

      if (!task) {
        return res.status(404).json({
          success: false,
          message: `Task with ID '${id}' not found.`,
        });
      }

      res.json({
        success: true,
        data: task,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: 'Error retrieving task',
        error: err.message,
      });
    }
  },

  // PATCH /api/tasks/:id/assign - STMS-12 Core Handler
  async assignTask(req, res) {
    try {
      const { id } = req.params;
      const { assigneeId, assignedBy } = req.body;

      // AssigneeId can be a valid string ID, or null/empty string to unassign
      const targetAssigneeId = assigneeId && typeof assigneeId === 'string' && assigneeId.trim() !== ''
        ? assigneeId.trim()
        : null;

      const updatedTask = await TaskStore.assignTask(id, targetAssigneeId, assignedBy || 'usr-101');

      res.json({
        success: true,
        message: targetAssigneeId
          ? `Task successfully assigned to ${updatedTask.assignee?.name || 'team member'}.`
          : 'Task has been successfully unassigned.',
        data: updatedTask,
      });
    } catch (err) {
      if (err.message.startsWith('TASK_NOT_FOUND')) {
        return res.status(404).json({
          success: false,
          error: 'TASK_NOT_FOUND',
          message: err.message,
        });
      }

      if (err.message.startsWith('USER_NOT_FOUND')) {
        return res.status(400).json({
          success: false,
          error: 'USER_NOT_FOUND',
          message: err.message,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error while assigning task.',
        error: err.message,
      });
    }
  },

  // POST /api/tasks
  async createTask(req, res) {
    try {
      const { title, description, priority, deadline, assigneeId, assignedBy } = req.body;

      if (!title || typeof title !== 'string' || title.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Task title is required.',
        });
      }

      const newTask = await TaskStore.createTask({
        title,
        description,
        priority,
        deadline,
        assigneeId,
        assignedBy,
      });

      res.status(201).json({
        success: true,
        message: 'Task created successfully',
        data: newTask,
      });
    } catch (err) {
      if (err.message.startsWith('USER_NOT_FOUND')) {
        return res.status(400).json({
          success: false,
          error: 'USER_NOT_FOUND',
          message: err.message,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create task',
        error: err.message,
      });
    }
  },

  // GET /api/team-members
  async getTeamMembers(req, res) {
    try {
      const users = await TaskStore.getUsers();
      res.json({
        success: true,
        count: users.length,
        data: users,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch team members',
        error: err.message,
      });
    }
  },
};
