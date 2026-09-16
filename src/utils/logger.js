const winston = require('winston');
const { nodeEnv } = require('../config/env');

const logger = winston.createLogger({
  level: nodeEnv === 'production' ? 'info' : 'debug',
  silent: nodeEnv === 'test',
  format:
    nodeEnv === 'production'
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        ),
  transports: [new winston.transports.Console()],
});

module.exports = logger;
