let initError = null;
let app;
let connectDB;

try {
  app = require('../src/app');
  ({ connectDB } = require('../src/config/db'));
} catch (err) {
  initError = err;
  console.error('[init] Failed to initialize:', err.message, '\n', err.stack);
}

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
