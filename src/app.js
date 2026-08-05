const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { clientUrl, adminUrl, corsOrigins, nodeEnv } = require('./config/env');
const routes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const ensureDB = require('./middleware/ensureDB');

const app = express();

app.set('trust proxy', 1);

const allowedOrigins = [
  ...new Set(
    [
      clientUrl,
      adminUrl,
      ...corsOrigins,
      'https://threednet.vercel.app',
      'https://threedadmin.vercel.app',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
    ].filter(Boolean)
  ),
];

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser clients (Postman, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      if (nodeEnv !== 'production') {
        console.warn(`[cors] blocked origin: ${origin}`);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Type'],
    maxAge: 86400,
  })
);
app.use(helmet());
app.use(morgan(nodeEnv === 'production' ? 'combined' : 'dev'));

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
