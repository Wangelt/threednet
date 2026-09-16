const { port, nodeEnv } = require('./config/env');
const { connectDB } = require('./config/db');
const app = require('./app');
const logger = require('./utils/logger');

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason });
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { err });
  process.exit(1);
});

async function start() {
  await connectDB();
  app.listen(port, () => {
    logger.info(`3D Forge API listening on port ${port} (${nodeEnv})`);
  });
}

start().catch((err) => {
  logger.error('Failed to start server', { err });
  process.exit(1);
});
