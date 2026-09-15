const { port, nodeEnv } = require('./config/env');
const { connectDB } = require('./config/db');
const app = require('./app');

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});

async function start() {
  await connectDB();
  app.listen(port, () => {
    console.log(`3D Forge API listening on port ${port} (${nodeEnv})`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
