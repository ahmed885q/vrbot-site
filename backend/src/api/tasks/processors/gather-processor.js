const baseProcessor = require('./base-processor');

async function gatherProcessor(job) {
  return baseProcessor.call({
    async execute(data) {
      const { config, farmId } = data;
      const { resources = [], minAmount = 1000 } = config;

      console.log(`[Gather] Gathering ${resources.join(', ')} for farm ${farmId}`);

      await delay(2000);

      const gathered = resources.reduce((acc, resource) => {
        acc[resource] = minAmount + Math.floor(Math.random() * 500);
        return acc;
      }, {});

      return {
        gathered,
        totalTime: 2000,
        timestamp: new Date().toISOString(),
      };
    }
  }, job);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = gatherProcessor;
