import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import taskRoutes from './routes/taskRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api', taskRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    project: 'Student Task Management System',
    feature: 'STMS-12: Assign Task',
    timestamp: new Date().toISOString(),
  });
});

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Only listen if executed directly
const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMainModule) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Student Task Management System is running!`);
    console.log(`📍 Web Dashboard:  http://localhost:${PORT}`);
    console.log(`🔌 API Endpoints:  http://localhost:${PORT}/api/tasks`);
    console.log(`🎯 Feature Branch: STMS-12-assign-task`);
    console.log(`====================================================`);
  });
}

export default app;
