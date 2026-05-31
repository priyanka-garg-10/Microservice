'use strict';

const crypto = require('crypto');

const NONCE_SIZE = 12; // GCM standard nonce
const TAG_SIZE = 16;   // GCM auth tag

/**
 * AES-256-GCM encrypt — binary-compatible with Go's crypto/cipher GCM.
 * Output format (base64): nonce(12) || ciphertext(N) || authTag(16)
 */
function encrypt(plaintext, keyString) {
  const key = Buffer.from(keyString, 'utf8');
  if (key.length !== 32) {
    throw new Error('encryption key must be exactly 32 bytes for AES-256');
  }

  const nonce = crypto.randomBytes(NONCE_SIZE);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Matches Go: aesGCM.Seal(nonce, nonce, plaintext, nil) → nonce||ciphertext||tag
  return Buffer.concat([nonce, encrypted, authTag]).toString('base64');
}

/**
 * AES-256-GCM decrypt — binary-compatible with Go's crypto/cipher GCM.
 */
function decrypt(encryptedString, keyString) {
  const key = Buffer.from(keyString, 'utf8');
  if (key.length !== 32) {
    throw new Error('encryption key must be exactly 32 bytes for AES-256');
  }

  const buf = Buffer.from(encryptedString, 'base64');
  if (buf.length < NONCE_SIZE + TAG_SIZE) {
    throw new Error('ciphertext too short');
  }

  const nonce      = buf.slice(0, NONCE_SIZE);
  const authTag    = buf.slice(buf.length - TAG_SIZE);
  const ciphertext = buf.slice(NONCE_SIZE, buf.length - TAG_SIZE);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Generate a session token: AES-GCM-encrypted JSON with user claims.
 * Matches Go's encryption.GenerateToken.
 */
function generateToken(userID, username, keyString) {
  const claims = {
    user_id:    userID,
    username:   username,
    expires_at: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
  };
  return encrypt(JSON.stringify(claims), keyString);
}

/**
 * Validate a session token. Returns claims or throws.
 * Matches Go's encryption.ValidateToken.
 */
function validateToken(tokenString, keyString) {
  let decrypted;
  try {
    decrypted = decrypt(tokenString, keyString);
  } catch (_) {
    throw new Error('invalid or expired session token');
  }

  let claims;
  try {
    claims = JSON.parse(decrypted);
  } catch (_) {
    throw new Error('failed to parse token claims');
  }

  if (Math.floor(Date.now() / 1000) > claims.expires_at) {
    throw new Error('session token has expired');
  }

  return claims;
}

module.exports = { encrypt, decrypt, generateToken, validateToken };
