const createTasksAPI = require('./api/tasks-api');

const PORT = process.env.TASKS_PORT || 3001;

const app = createTasksAPI();

app.listen(PORT, () => {
  console.log(`🚀 Viking Rise Tasks API running on port ${PORT}`);
  console.log(`📍 Health: http://localhost:${PORT}/api/health`);
  console.log(`📍 Tasks: http://localhost:${PORT}/api/tasks`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});
