const express = require('express');
const router = express.Router();
const taskService = require('./task-service');
const queueManager = require('./queue-manager');

router.get('/templates', async (req, res) => {
  try {
    const { category } = req.query;
    const templates = await taskService.getTemplates(category);
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/farm/:farmId', async (req, res) => {
  try {
    const tasks = await taskService.getTasksByFarm(req.params.farmId);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const task = await taskService.getTaskById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const task = await taskService.createTask(req.body);
    
    if (task.scheduleType === 'once') {
      await queueManager.addTask(task.id, task.taskType, {
        farmId: task.farmId,
        config: task.config,
      }, task.priority);
    }
    
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const task = await taskService.updateTask(req.params.id, req.body);
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await taskService.deleteTask(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/run', async (req, res) => {
  try {
    const task = await taskService.getTaskById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const job = await queueManager.addTask(task.id, task.taskType, {
      farmId: task.farmId,
      config: task.config,
    }, task.priority);

    res.json({ 
      message: 'Task queued',
      jobId: job.id,
      taskId: task.id,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
