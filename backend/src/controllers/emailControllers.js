'use strict';

const axios = require('axios');
const { getPool } = require('../database/db');
const { encrypt, decrypt } = require('../encryption/encryption');
const { enqueueEmail } = require('../services/email/emailQueue');
const config = require('../config/config');

// ─── POST /api/email/send ─────────────────────────────────────────────────────
// Validates each request and enqueues it onto the Redis job queue.
// Returns HTTP 202 immediately (fire-and-forget, mirrors Go's channel push).

async function sendEmail(req, res) {
  const requests = req.body;

  if (!Array.isArray(requests) || requests.length === 0) {
    return res.status(400).send('Invalid JSON request body. Expected array of email objects');
  }

  let queuedCount = 0;

  for (const r of requests) {
    if (!r.sender || !Array.isArray(r.receivers) || r.receivers.length === 0 || !r.subject || !r.body) {
      console.warn(`Skipping invalid request for user ${req.user.id}: missing sender, receivers, subject, or body`);
      continue;
    }

    try {
      await enqueueEmail(req.user.id, {
        sender:    r.sender,
        receivers: r.receivers,
        cc:        r.cc  || [],
        bcc:       r.bcc || [],
        subject:   r.subject,
        body:      r.body,
        is_html:   r.is_html || false,
      });
      queuedCount++;
    } catch (err) {
      console.error('Email queue error:', err.message);
      return res.status(503).send('Server is too busy, email queue is full');
    }
  }

  res.status(202).json({
    status:  'success',
    message: `Queued ${queuedCount} email request(s) for background processing`,
  });
}

// ─── /api/email/credentials (GET, POST, PUT, DELETE) ─────────────────────────

async function credentialsHandler(req, res) {
  if (!getPool()) return res.status(500).send('Database not configured');

  const pool = getPool();
  const userID = req.user.id;

  if (req.method === 'GET') {
    const sender = req.query.sender;

    if (sender) {
      const [rows] = await pool.execute(
        'SELECT id, sender_email, smtp_host, smtp_port, created_at FROM user_email_settings WHERE user_id = ? AND sender_email = ?',
        [userID, sender]
      );
      if (rows.length === 0) return res.status(404).send('Credential not found');
      return res.json(rows[0]);
    }

    const [rows] = await pool.execute(
      'SELECT id, sender_email, smtp_host, smtp_port, created_at FROM user_email_settings WHERE user_id = ? ORDER BY sender_email ASC',
      [userID]
    );
    return res.json(rows);
  }

  if (req.method === 'POST') {
    const { sender_email, smtp_host, smtp_port, smtp_pass } = req.body;
    if (!sender_email || !smtp_host || !smtp_port || !smtp_pass) {
      return res.status(400).send('All fields are required');
    }

    let encryptedPass;
    try {
      encryptedPass = encrypt(smtp_pass, config.encryptionKey);
    } catch (err) {
      console.error('Encryption failed:', err.message);
      return res.status(500).send('Internal server error during encryption');
    }

    await pool.execute(
      `INSERT INTO user_email_settings (user_id, sender_email, smtp_host, smtp_port, encrypted_smtp_pass)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         smtp_host = VALUES(smtp_host),
         smtp_port = VALUES(smtp_port),
         encrypted_smtp_pass = VALUES(encrypted_smtp_pass)`,
      [userID, sender_email, smtp_host, smtp_port, encryptedPass]
    );

    return res.json({ status: 'success', message: 'Credentials encrypted and saved securely' });
  }

  if (req.method === 'PUT') {
    const { sender_email, smtp_host, smtp_port, smtp_pass } = req.body;
    if (!sender_email) return res.status(400).send('sender_email is required');

    if (smtp_pass) {
      let encryptedPass;
      try {
        encryptedPass = encrypt(smtp_pass, config.encryptionKey);
      } catch (err) {
        console.error('Encryption failed:', err.message);
        return res.status(500).send('Encryption error');
      }
      await pool.execute(
        'UPDATE user_email_settings SET smtp_host=?, smtp_port=?, encrypted_smtp_pass=? WHERE user_id=? AND sender_email=?',
        [smtp_host, smtp_port, encryptedPass, userID, sender_email]
      );
    } else {
      await pool.execute(
        'UPDATE user_email_settings SET smtp_host=?, smtp_port=? WHERE user_id=? AND sender_email=?',
        [smtp_host, smtp_port, userID, sender_email]
      );
    }

    return res.json({ status: 'success', message: 'Credentials updated successfully' });
  }

  if (req.method === 'DELETE') {
    const sender = req.query.sender;
    if (!sender) return res.status(400).send('sender query param required');

    await pool.execute(
      'DELETE FROM user_email_settings WHERE user_id = ? AND sender_email = ?',
      [userID, sender]
    );

    return res.json({ status: 'success', message: 'Credential deleted' });
  }

  res.status(405).send('Method not allowed');
}

// ─── GET /api/email/history ───────────────────────────────────────────────────

async function getHistory(req, res) {
  if (!getPool()) return res.status(500).send('Database not configured');

  const pool = getPool();
  const userID = req.user.id;
  const q = req.query;

  const sender   = q.sender   || '';
  const status   = q.status   || '';
  const dateFrom = q.date_from || '';
  const dateTo   = q.date_to   || '';

  let page     = parseInt(q.page, 10)      || 1;
  let pageSize = parseInt(q.page_size, 10) || 20;
  if (page < 1)     page = 1;
  if (pageSize < 1) pageSize = 20;
  const offset = (page - 1) * pageSize;

  // Build dynamic WHERE clause
  let where = 'WHERE user_id = ?';
  const args = [userID];

  if (sender)   { where += ' AND sender = ?';                args.push(sender);   }
  if (status)   { where += ' AND status = ?';                args.push(status);   }
  if (dateFrom) { where += ' AND DATE(created_at) >= ?';     args.push(dateFrom); }
  if (dateTo)   { where += ' AND DATE(created_at) <= ?';     args.push(dateTo);   }

  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM email_history ${where}`,
    args
  );

  const [rows] = await pool.execute(
    `SELECT id, sender, receivers, subject, status, IFNULL(error_msg,'') AS error_msg, created_at
     FROM email_history ${where}
     ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...args, pageSize, offset]
  );

  const pages = Math.ceil(total / pageSize) || 0;
  res.json({ total, page, pages, history: rows });
}

// ─── POST /api/email/suggest ──────────────────────────────────────────────────

async function suggestEmail(req, res) {
  const { subject, body } = req.body;
  if (!body) return res.status(400).send('body is required');

  const prompt =
    `You are an email writing assistant. Given the email subject and the body written so far, ` +
    `suggest ONLY the next single sentence to continue the body. Return just the sentence, no explanation, no quotes.\n\n` +
    `Subject: ${subject}\n\nBody so far: ${body}\n\nNext sentence:`;

  let response;
  try {
    response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens:  80,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${config.openAIAPIKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err) {
    return res.status(502).send('Failed to reach OpenAI');
  }

  const choices = response.data?.choices;
  if (!choices || choices.length === 0) {
    return res.status(502).send('Invalid OpenAI response');
  }

  res.json({ suggestion: choices[0].message.content });
}

module.exports = { sendEmail, credentialsHandler, getHistory, suggestEmail };
