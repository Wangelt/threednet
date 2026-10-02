// Zero top-level requires — module initialization is fully lazy so /_probe
// always runs even if require('../src/app') crashes the process on Vercel.
let _app = null;
let _connectDB = null;
let _initErr = null;
let _dbReady = null;

// Mirror the request Origin back so CORS works for credentialed requests
// (credentials:"include" rejects Access-Control-Allow-Origin:* per the spec).
function corsHeaders(req) {
  const origin = req.headers.origin;
  if (origin) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Vary': 'Origin',
    };
  }
  return { 'Access-Control-Allow-Origin': '*' };
}

module.exports = async (req, res) => {
  // Raw Node.js probe — no deps, runs before any require
  if (req.url === '/_probe') {
    const body = JSON.stringify({
      deployed: true,
      build: '2026-10-02-v6-lazy',
      initError: _initErr ? _initErr.message : null,
      appLoaded: _app !== null,
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(body);
    return;
  }

  // Handle OPTIONS preflight before app is ready or when init has failed.
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      ...corsHeaders(req),
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Requested-With',
      'Access-Control-Max-Age': '86400',
    });
    res.end();
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
      ...corsHeaders(req),
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
