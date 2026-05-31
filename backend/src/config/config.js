'use strict';

const path = require('path');

// Try loading .env from multiple locations (mirrors Go's godotenv fallback logic)
function loadEnv() {
  const locations = [
    path.resolve(__dirname, '../../../.env'),   // backend/../.. = project root
    path.resolve(__dirname, '../../.env'),
    path.resolve(process.cwd(), '.env'),
  ];

  for (const loc of locations) {
    try {
      require('dotenv').config({ path: loc });
      break;
    } catch (_) {
      // continue
    }
  }
}

loadEnv();

function loadConfig() {
  const port = process.env.API_PORT || '8080';
  const sysSender = (process.env.SENDER || '').replace(/^"|"$/g, '').trim();

  return {
    port,
    smtpHost:      process.env.SMTP_HOST || '',
    smtpPort:      process.env.SMTP_PORT || '',
    smtpPass:      process.env.SMTP_PASS || '',
    systemSender:  sysSender,
    dbDsn:         process.env.DB_DSN || '',
    encryptionKey: process.env.ENCRYPTION_KEY || '',
    openAIAPIKey:  process.env.OPENAI_API_KEY || '',
    redisUrl:      process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  };
}

module.exports = loadConfig();
