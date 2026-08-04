const { port, nodeEnv } = require('./config/env');
const { connectDB } = require('./config/db');
const app = require('./app');

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
