const baseProcessor = require('./base-processor');

async function researchProcessor(job) {
  return baseProcessor.call({
    async execute(data) {
      const { config, farmId } = data;
      const { technologies = [] } = config;

      console.log(`[Research] Researching technologies for farm ${farmId}`);

      await delay(2000);

      return {
        researched: technologies.filter(() => Math.random() > 0.6),
        totalTime: 2000,
        timestamp: new Date().toISOString(),
      };
    }
  }, job);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = researchProcessor;
