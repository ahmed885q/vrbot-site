const cron = require('node-cron');
const taskService = require('./task-service');
const queueManager = require('./queue-manager');

class TaskScheduler {
  constructor() {
    this.job = null;
  }

  start() {
    this.job = cron.schedule('* * * * *', async () => {
      try {
        await this.processDueTasks();
      } catch (error) {
        console.error('[Scheduler] Error:', error);
      }
    });

    console.log('[Scheduler] Started - checking tasks every minute');
  }

  async processDueTasks() {
    const dueTasks = await taskService.getDueTasks();

    if (dueTasks.length === 0) return;

    console.log(`[Scheduler] Found ${dueTasks.length} due tasks`);

    for (const task of dueTasks) {
      try {
        await queueManager.addTask(task.id, task.taskType, {
          farmId: task.farmId,
          config: task.config,
        }, task.priority);

        const nextRun = taskService.calculateNextRun(
          task.scheduleType,
          task.scheduleValue
        );

        if (nextRun) {
          await taskService.updateTask(task.id, { nextRunAt: nextRun });
        }

        console.log(`[Scheduler] Queued task ${task.taskName} (${task.id})`);
      } catch (error) {
        console.error(`[Scheduler] Failed to queue task ${task.id}:`, error);
      }
    }
  }

  stop() {
    if (this.job) {
      this.job.stop();
      console.log('[Scheduler] Stopped');
    }
  }
}

module.exports = new TaskScheduler();
