const baseProcessor = require('./base-processor');

async function constructionProcessor(job) {
  return baseProcessor.call({
    async execute(data) {
      const { config, farmId } = data;
      const { buildings = [], upgradeLevel } = config;

      console.log(`[Construction] Building/upgrading for farm ${farmId}`);

      await delay(2000);

      return {
        built: buildings.filter(() => Math.random() > 0.5),
        upgraded: buildings.filter(() => Math.random() > 0.3),
        totalTime: 2000,
        timestamp: new Date().toISOString(),
      };
    }
  }, job);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = constructionProcessor;
