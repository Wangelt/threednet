const mongoose = require('mongoose');
const { mongoUri, nodeEnv } = require('./env');

async function connectDB() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(mongoUri);
  if (nodeEnv !== 'test') {
    console.log('MongoDB connected');
  }
}

module.exports = { connectDB };
