let initError = null;
let app;
try {
  app = require('../src/app');
} catch (err) {
  initError = err;
  console.error('[init] Failed to load app:', err.message, err.stack);
}

const { connectDB } = require('../src/config/db');

let ready;
async function getApp() {
  if (!ready) {
    ready = connectDB().catch((err) => {
      ready = null;
      console.error('MongoDB connect failed on cold start:', err.message);
    });
  }
  await ready;
  return app;
}

module.exports = async (req, res) => {
  if (initError) {
    return res.status(500).json({
      success: false,
      message: 'Server initialization failed',
      error: initError.message,
    });
  }
  const server = await getApp();
  return server(req, res);
};
