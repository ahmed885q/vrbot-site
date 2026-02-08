const prisma = require('../../../config/prisma');

async function baseProcessor(job) {
  const { taskId } = job.data;
  const startTime = Date.now();

  const execution = await prisma.taskExecution.create({
    data: {
      taskId,
      status: 'running',
      startedAt: new Date(),
    },
  });

  try {
    console.log(`[Processor] Starting task ${taskId}`);

    const result = await this.execute(job.data);

    const duration = Date.now() - startTime;

    await prisma.taskExecution.update({
      where: { id: execution.id },
      data: {
        status: 'success',
        completedAt: new Date(),
        durationMs: duration,
        result: JSON.stringify(result),  // ← التعديل هنا
      },
    });

    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'completed',
        lastRunAt: new Date(),
        lastSuccessAt: new Date(),
        runCount: { increment: 1 },
        successCount: { increment: 1 },
      },
    });

    console.log(`[Processor] Task ${taskId} completed in ${duration}ms`);

    return { success: true, data: result };
  } catch (error) {
    const duration = Date.now() - startTime;

    await prisma.taskExecution.update({
      where: { id: execution.id },
      data: {
        status: 'failed',
        completedAt: new Date(),
        durationMs: duration,
        error: error.message,
      },
    });

    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'failed',
        lastRunAt: new Date(),
        lastError: error.message,
        runCount: { increment: 1 },
        failCount: { increment: 1 },
      },
    });

    console.error(`[Processor] Task ${taskId} failed:`, error);

    throw error;
  }
}

module.exports = baseProcessor;
