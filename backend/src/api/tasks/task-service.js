const prisma = require('../../config/prisma');

class TaskService {
  async createTask(data) {
    const task = await prisma.task.create({
      data: {
        ...data,
        nextRunAt: this.calculateNextRun(data.scheduleType, data.scheduleValue),
      },
    });
    return task;
  }

  async getTasksByFarm(farmId) {
    return prisma.task.findMany({
      where: { farmId, enabled: true },
      orderBy: [{ priority: 'asc' }, { nextRunAt: 'asc' }],
    });
  }

  async getTaskById(id) {
    return prisma.task.findUnique({
      where: { id },
      include: { executions: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });
  }

  async updateTask(id, data) {
    return prisma.task.update({
      where: { id },
      data,
    });
  }

  async deleteTask(id) {
    return prisma.task.delete({
      where: { id },
    });
  }

  async getDueTasks() {
    const now = new Date();
    return prisma.task.findMany({
      where: {
        enabled: true,
        nextRunAt: { lte: now },
      },
      orderBy: [{ priority: 'asc' }],
    });
  }

  async getTemplates(category) {
    return prisma.taskTemplate.findMany({
      where: { 
        isActive: true,
        ...(category && { category }),
      },
    });
  }

  calculateNextRun(scheduleType, scheduleValue) {
    const now = new Date();

    switch (scheduleType) {
      case 'once':
        return null;
      case 'interval':
        const interval = scheduleValue?.interval || 3600000;
        return new Date(now.getTime() + interval);
      case 'daily':
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(scheduleValue?.hour || 0, scheduleValue?.minute || 0, 0, 0);
        return tomorrow;
      default:
        return null;
    }
  }
}

module.exports = new TaskService();
