const express = require('express');
const taskRoutes = require('./tasks/routes');
const scheduler = require('./tasks/scheduler');

function createTasksAPI() {
  const app = express();

  app.use(express.json());

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
  });

  app.use('/api/tasks', taskRoutes);

  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      service: 'viking-rise-tasks',
      timestamp: new Date().toISOString(),
    });
  });

  scheduler.start();

  return app;
}

module.exports = createTasksAPI;
