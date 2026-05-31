'use strict';

const express = require('express');
const { initDB } = require('./database/db');
const { setupRouter } = require('./routes/routes');
const { initWorker } = require('./services/email/emailWorker');
const config = require('./config/config');

async function main() {
  // 1. Initialize database (create pool + verify tables exist)
  await initDB();

  // 2. Start the Redis-backed email worker
  //    Replaces Go's: email.InitWorker() → goroutine reading from a buffered channel
  initWorker();

  // 3. Set up Express app
  const app = express();
  app.use(express.json());
  app.use(setupRouter());

  // 4. Start listening
  app.listen(config.port, () => {
    console.log(`Starting API Gateway on port ${config.port}...`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
