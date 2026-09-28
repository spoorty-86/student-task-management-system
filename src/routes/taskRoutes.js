import express from 'express';
import { taskController } from '../controllers/taskController.js';

const router = express.Router();

// Task endpoints
router.get('/tasks', taskController.getTasks);
router.get('/tasks/:id', taskController.getTaskById);
router.post('/tasks', taskController.createTask);

// STMS-12: Assign task endpoint
router.patch('/tasks/:id/assign', taskController.assignTask);

// Team members endpoint
router.get('/team-members', taskController.getTeamMembers);

export default router;
