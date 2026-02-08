const Queue = require('bull');
const prisma = require('../../config/prisma');

// Mock mode for development
const useMockQueue = process.env.USE_MOCK_QUEUE === 'true';

if (useMockQueue) {
  console.log('⚠️  Mock Queue Mode - tasks will run immediately');
}

const taskQueue = useMockQueue ? null : new Queue('viking-tasks', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

class QueueManager {
  constructor() {
    this.queue = taskQueue;
    this.mockMode = useMockQueue;
    if (!this.mockMode) {
      this.setupProcessors();
    }
  }

  setupProcessors() {
    if (this.mockMode) return;
    this.queue.process('gather', require('./processors/gather-processor'));
    this.queue.process('construction', require('./processors/construction-processor'));
    this.queue.process('research', require('./processors/research-processor'));
  }

  async addTask(taskId, taskType, data, priority = 3) {
    if (this.mockMode) {
      console.log(`[Mock] Task ${taskId} queued (type: ${taskType})`);
      await prisma.task.update({
        where: { id: taskId },
        data: { status: 'queued' },
      });
      return { id: `mock-${Date.now()}`, data };
    }

    const job = await this.queue.add(taskType, { taskId, ...data }, { priority });
    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'queued' },
    });
    return job;
  }

  async getJobStatus(jobId) {
    if (this.mockMode) {
      return { jobId, state: 'mock', data: {} };
    }
    const job = await this.queue.getJob(jobId);
    if (!job) return null;
    const state = await job.getState();
    return { jobId: job.id, state, data: job.data };
  }

  async removeJob(jobId) {
    if (this.mockMode) return;
    const job = await this.queue.getJob(jobId);
    if (job) await job.remove();
  }
}

module.exports = new QueueManager();
