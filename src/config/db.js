const mongoose = require('mongoose');
const { mongoUri, nodeEnv } = require('./env');
const logger = require('../utils/logger');

/**
 * Cached connection for serverless (Vercel) — reuse across warm invocations.
 */
let connecting;

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connecting) return connecting;

  mongoose.set('strictQuery', true);
  mongoose.set('bufferTimeoutMS', 20000);

  connecting = mongoose
    .connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
    })
    .then((conn) => {
      logger.info('MongoDB connected');
      connecting = null;
      return conn;
    })
    .catch((err) => {
      connecting = null;
      throw err;
    });

  return connecting;
}

function isDBReady() {
  return mongoose.connection.readyState === 1;
}

module.exports = { connectDB, isDBReady };
