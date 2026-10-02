const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { clientUrl, adminUrl, corsOrigins, nodeEnv } = require('./config/env');
const logger = require('./utils/logger');
const routes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const ensureDB = require('./middleware/ensureDB');

const app = express();

app.set('trust proxy', 1);

function normalizeOrigin(origin) {
  return origin.trim().replace(/\/$/, '');
}

// Derives a regex matching Vercel preview URLs for the same project, e.g. a
// configured "https://threedweb.vercel.app" also allows
// "https://threedweb-git-feature-x-team.vercel.app" and
// "https://threedweb-<hash>-team.vercel.app", so CORS keeps working on every
// branch/PR preview deploy without touching CORS_ORIGINS each time.
function vercelPreviewPattern(url) {
  try {
    const { hostname, protocol } = new URL(url);
    if (!hostname.endsWith('.vercel.app')) return null;
    const slug = hostname.slice(0, -'.vercel.app'.length);
    if (!slug) return null;
    const escapedSlug = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^${protocol}//${escapedSlug}-[a-z0-9-]+\\.vercel\\.app$`, 'i');
  } catch {
    return null;
  }
}

const knownOrigins = [
  clientUrl,
  adminUrl,
  ...corsOrigins,
  'https://threednet.vercel.app',
  'https://threedweb.vercel.app',
  'https://threedadmin.vercel.app',
  'https://threed-lilac.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
].filter(Boolean);

const allowedOrigins = [...new Set(knownOrigins.map(normalizeOrigin))];
const previewPatterns = knownOrigins.map(vercelPreviewPattern).filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser clients (Postman, server-to-server)
      if (!origin) return callback(null, true);
      const normalized = normalizeOrigin(origin);
      if (allowedOrigins.includes(normalized)) return callback(null, true);
      if (previewPatterns.some((pattern) => pattern.test(normalized))) {
        return callback(null, true);
      }
      logger.warn(`[cors] blocked origin: ${origin}`);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Type'],
    maxAge: 86400,
  })
);
app.use(helmet({
  // API responses must be loadable cross-origin; the default "same-origin"
  // policy would block browsers from reading responses from other origins.
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(
  morgan(nodeEnv === 'production' ? 'combined' : 'dev', {
    stream: { write: (msg) => logger.info(msg.trim()) },
  })
);

// Capture raw body for Razorpay webhook signature verification
app.use(
  express.json({
    limit: '2mb',
    verify: (req, res, buf) => {
      if (req.originalUrl === '/api/payments/webhook') {
        req.rawBody = buf.toString('utf8');
      }
    },
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(ensureDB);
app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
