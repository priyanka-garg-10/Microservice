'use strict';

const crypto = require('crypto');
const { getPool } = require('../../database/db');
const { encrypt, decrypt } = require('../../encryption/encryption');
const config = require('../../config/config');

function generateAPIKey() {
  return crypto.randomBytes(32).toString('hex');
}

async function createUser(name, username, email, password) {
  const apiKey = generateAPIKey();
  const encryptedPass = encrypt(password, config.encryptionKey);

  const [result] = await getPool().execute(
    'INSERT INTO users (name, username, email, encrypted_password, api_key) VALUES (?, ?, ?, ?, ?)',
    [name, username, email, encryptedPass, apiKey]
  );

  return {
    id:         result.insertId,
    name,
    username,
    email,
    api_key:    apiKey,
    created_at: new Date().toISOString(),
  };
}

async function getUserByUsername(username) {
  const [rows] = await getPool().execute(
    'SELECT id, name, username, email, api_key, created_at FROM users WHERE username = ?',
    [username]
  );
  if (rows.length === 0) throw new Error('user not found');
  return rows[0];
}

async function getUserByEmail(email) {
  const [rows] = await getPool().execute(
    'SELECT id, name, username, email, api_key, created_at FROM users WHERE email = ?',
    [email]
  );
  if (rows.length === 0) throw new Error('user not found');
  return rows[0];
}

async function getUserByAPIKey(apiKey) {
  const [rows] = await getPool().execute(
    'SELECT id, name, username, email, api_key, created_at FROM users WHERE api_key = ?',
    [apiKey]
  );
  if (rows.length === 0) throw new Error('user not found');
  return rows[0];
}

async function verifyPassword(userID, password) {
  const [rows] = await getPool().execute(
    'SELECT encrypted_password FROM users WHERE id = ?',
    [userID]
  );
  if (rows.length === 0) return false;
  const decrypted = decrypt(rows[0].encrypted_password, config.encryptionKey);
  return decrypted === password;
}

async function updatePassword(userID, newPassword) {
  const encryptedPass = encrypt(newPassword, config.encryptionKey);
  await getPool().execute(
    'UPDATE users SET encrypted_password = ? WHERE id = ?',
    [encryptedPass, userID]
  );
}

async function updateUserProfile(userID, name, email) {
  await getPool().execute(
    'UPDATE users SET name = ?, email = ? WHERE id = ?',
    [name, email, userID]
  );
}

async function regenerateAPIKey(userID) {
  const apiKey = generateAPIKey();
  await getPool().execute(
    'UPDATE users SET api_key = ? WHERE id = ?',
    [apiKey, userID]
  );
  return apiKey;
}

module.exports = {
  createUser,
  getUserByUsername,
  getUserByEmail,
  getUserByAPIKey,
  verifyPassword,
  updatePassword,
  updateUserProfile,
  regenerateAPIKey,
};
