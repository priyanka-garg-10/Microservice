'use strict';

const mysql = require('mysql2/promise');
const config = require('../config/config');

let pool = null;

async function initDB() {
  if (!config.dbDsn) {
    console.log('No DB_DSN provided in .env, skipping database initialization');
    return;
  }

  // Parse Go MySQL DSN format: user:password@tcp(host:port)/dbname
  // Cannot use a URL string because:
  //   1. Passwords containing '@' break URL parsing
  //   2. Node.js 18+ resolves 'localhost' to ::1 (IPv6); MySQL usually only binds 127.0.0.1
  const dsnMatch = config.dbDsn.match(/^([^:]+):(.+)@tcp\(([^:)]+):(\d+)\)\/(.+)$/);
  if (!dsnMatch) {
    throw new Error(`Invalid DB_DSN format. Expected: user:pass@tcp(host:port)/dbname, got: ${config.dbDsn}`);
  }
  const [, dbUser, dbPass, dbHostRaw, dbPort, dbName] = dsnMatch;
  // Force IPv4 — 'localhost' resolves to ::1 on Node 18+ which is refused by most MySQL installs
  const dbHost = dbHostRaw === 'localhost' ? '127.0.0.1' : dbHostRaw;

  pool = mysql.createPool({
    host:            dbHost,
    port:            parseInt(dbPort, 10),
    user:            dbUser,
    password:        dbPass,
    database:        dbName,
    waitForConnections: true,
    connectionLimit:    10,
  });

  // Verify connectivity
  const conn = await pool.getConnection();
  await conn.release();

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      username VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      encrypted_password TEXT NOT NULL,
      api_key VARCHAR(255) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS user_email_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      sender_email VARCHAR(255) NOT NULL,
      smtp_host VARCHAR(255) NOT NULL,
      smtp_port VARCHAR(10) NOT NULL,
      encrypted_smtp_pass TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY user_sender (user_id, sender_email)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS email_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      sender VARCHAR(255) NOT NULL,
      receivers TEXT NOT NULL,
      subject VARCHAR(255) NOT NULL,
      status VARCHAR(50) NOT NULL,
      error_msg TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  console.log('Database connection established and tables verified.');
}

function getPool() {
  return pool;
}

module.exports = { initDB, getPool };
