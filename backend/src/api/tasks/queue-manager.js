const Queue = require('bull');
const prisma = require('../../config/prisma');

const taskQueue = new Queue('viking-tasks', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

class QueueManager {
  constructor() {
    this.queue = taskQueue;
    this.setupProcessors();
  }

  setupProcessors() {
    this.queue.process('gather', require('./processors/gather-processor'));
    this.queue.process('construction', require('./processors/construction-processor'));
    this.queue.process('research', require('./processors/research-processor'));
  }

  async addTask(taskId, taskType, data, priority = 3) {
    const job = await this.queue.add(
      taskType,
      { taskId, ...data },
      { priority }
    );

    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'queued' },
    });

    return job;
  }

  async getJobStatus(jobId) {
    const job = await this.queue.getJob(jobId);
    if (!job) return null;
    
    const state = await job.getState();
    return { jobId: job.id, state, data: job.data };
  }

  async removeJob(jobId) {
    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.remove();
    }
  }
}

module.exports = new QueueManager();
