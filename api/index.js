// Zero top-level requires — module initialization is fully lazy so /_probe
// always runs even if require('../src/app') crashes the process on Vercel.
let _app = null;
let _connectDB = null;
let _initErr = null;
let _dbReady = null;

module.exports = async (req, res) => {
  // Raw Node.js probe — no deps, runs before any require
  if (req.url === '/_probe') {
    const body = JSON.stringify({
      deployed: true,
      build: '2026-10-02-v5-lazy',
      initError: _initErr ? _initErr.message : null,
      appLoaded: _app !== null,
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(body);
    return;
  }

  // Lazy init — runs once per warm instance, never at module load time
  if (!_app && !_initErr) {
    try {
      _app = require('../src/app');
      _connectDB = require('../src/config/db').connectDB;
    } catch (err) {
      _initErr = err;
      console.error('[init] FAILED:', err.message, '\n', err.stack);
    }
  }

  if (_initErr) {
    res.writeHead(500, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify({ success: false, message: 'Server initialization failed', error: _initErr.message }));
    return;
  }

  // DB connection — cached across warm invocations
  if (!_dbReady) {
    _dbReady = _connectDB().catch((err) => {
      _dbReady = null;
      console.error('[db] connect error:', err.message);
    });
  }
  await _dbReady;

  _app(req, res);
};
