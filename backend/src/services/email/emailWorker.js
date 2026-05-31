'use strict';

const nodemailer = require('nodemailer');
const { dequeueEmail } = require('./emailQueue');
const { getPool } = require('../../database/db');
const { decrypt } = require('../../encryption/encryption');
const config = require('../../config/config');

const MAX_ATTEMPTS = 4;
const RETRY_DELAY_MS = 5000;
const RATE_LIMIT_MS = 1000;

// ─── History recording ────────────────────────────────────────────────────────

async function recordHistory(userID, sender, receivers, subject, status, errorMsg) {
  const pool = getPool();
  if (!pool) return;
  try {
    await pool.execute(
      'INSERT INTO email_history (user_id, sender, receivers, subject, status, error_msg) VALUES (?, ?, ?, ?, ?, ?)',
      [userID, sender, receivers, subject, status, errorMsg || null]
    );
  } catch (err) {
    console.error('[Worker] Failed to record history:', err.message);
  }
}

// ─── Failure notification ─────────────────────────────────────────────────────

async function sendFailureNotification(emailRequest, failureReason) {
  if (!config.systemSender || !config.smtpPass || !config.smtpHost) {
    console.warn('[Worker] Cannot send failure notification: missing system credentials in .env');
    return;
  }

  const transporter = nodemailer.createTransport({
    host:   config.smtpHost,
    port:   parseInt(config.smtpPort, 10) || 587,
    secure: false,
    auth:   { user: config.systemSender, pass: config.smtpPass },
  });

  const body =
    `Hello,\r\n\r\n` +
    `Your API request to send an email with the subject '${emailRequest.subject}' has permanently failed after 3 retries.\r\n\r\n` +
    `Error Details:\r\n${failureReason}\r\n\r\n` +
    `Please check your SMTP credentials and try again.`;

  try {
    await transporter.sendMail({
      from:    config.systemSender,
      to:      emailRequest.sender,
      subject: 'Action Required: Email Delivery Failed',
      text:    body,
    });
    console.log(`[Worker] Failure notification sent to ${emailRequest.sender}`);
  } catch (err) {
    console.error(`[Worker] Failed to send failure notification to ${emailRequest.sender}:`, err.message);
  }
}

// ─── Core email sender ────────────────────────────────────────────────────────

async function sendEmail(userID, req) {
  let host = req.smtp_host || '';
  let port = req.smtp_port || '';
  let pass = req.smtp_pass || '';

  if (!pass) {
    const pool = getPool();
    if (pool && userID > 0) {
      try {
        const [rows] = await pool.execute(
          'SELECT smtp_host, smtp_port, encrypted_smtp_pass FROM user_email_settings WHERE user_id = ? AND sender_email = ?',
          [userID, req.sender]
        );
        if (rows.length > 0) {
          const row = rows[0];
          pass = decrypt(row.encrypted_smtp_pass, config.encryptionKey);
          if (!host) host = row.smtp_host;
          if (!port) port = row.smtp_port;
        }
      } catch (err) {
        console.error(`[Worker] Failed to fetch/decrypt credentials for ${req.sender}:`, err.message);
      }
    }
  }

  if (!host) host = config.smtpHost;
  if (!port) port = config.smtpPort;
  if (!pass) pass = config.smtpPass;

  if (!host || !port || !pass) throw new Error('SMTP configuration missing');

  const transporter = nodemailer.createTransport({
    host,
    port:   parseInt(port, 10),
    secure: false,
    auth:   { user: req.sender, pass },
  });

  const allRecipients = [
    ...(req.receivers || []),
    ...(req.cc || []),
    ...(req.bcc || []),
  ];

  const mailOptions = {
    from:    req.sender,
    to:      (req.receivers || []).join(','),
    subject: req.subject,
    ...(req.is_html ? { html: req.body } : { text: req.body }),
  };
  if (req.cc  && req.cc.length  > 0) mailOptions.cc  = req.cc.join(',');
  if (req.bcc && req.bcc.length > 0) mailOptions.bcc = req.bcc.join(',');

  await transporter.sendMail(mailOptions);
  console.log(`[Worker] Successfully sent email (Subject: '${req.subject}') to ${allRecipients.length} recipients`);
  return allRecipients;
}

// ─── Job processor with retries ───────────────────────────────────────────────

async function processJob(job) {
  const { userID, emailRequest: req } = job;
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      console.log(`[Worker] Processing job (attempt ${attempt}/${MAX_ATTEMPTS}): Subject='${req.subject}'`);
      const allRecipients = await sendEmail(userID, req);
      await recordHistory(userID, req.sender, allRecipients.join(','), req.subject, 'SUCCESS', '');
      return;
    } catch (err) {
      lastError = err;
      console.error(`[Worker] Job failed (attempt ${attempt}/${MAX_ATTEMPTS}): ${err.message}`);
      if (attempt < MAX_ATTEMPTS) {
        console.log(`[Worker] Retrying in 5 seconds...`);
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
      }
    }
  }

  // All retries exhausted
  const allRecipients = [
    ...(req.receivers || []),
    ...(req.cc || []),
    ...(req.bcc || []),
  ];
  await recordHistory(userID, req.sender, allRecipients.join(','), req.subject, 'FAILED', lastError.message);
  sendFailureNotification(req, lastError.message).catch(() => {});
  console.error(`[Worker] Job permanently failed after ${MAX_ATTEMPTS} attempts. Failure notification sent to ${req.sender}`);
}

// ─── Worker loop ──────────────────────────────────────────────────────────────

async function workerLoop() {
  while (true) {
    const job = dequeueEmail();
    if (job) {
      await processJob(job);
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
    } else {
      await new Promise(r => setTimeout(r, 100));
    }
  }
}

function initWorker() {
  workerLoop().catch(err => console.error('[Worker] Fatal error:', err));
  console.log('Email background worker started. Waiting for jobs...');
}

module.exports = { initWorker };
