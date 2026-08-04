const app = require('../src/app');
const { connectDB } = require('../src/config/db');

// Connect once per cold start; ensureDB middleware also reconnects if needed
let ready;
async function getApp() {
  if (!ready) {
    ready = connectDB().catch((err) => {
      ready = null;
      console.error('MongoDB connect failed on cold start:', err.message);
      // Still export app — ensureDB will retry and return a clean 503
    });
  }
  await ready;
  return app;
}

module.exports = async (req, res) => {
  const server = await getApp();
  return server(req, res);
};
