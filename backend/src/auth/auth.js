'use strict';

const { validateToken } = require('../encryption/encryption');
const { getUserByUsername, getUserByAPIKey } = require('../services/user/user');
const config = require('../config/config');

/**
 * Authenticate a request using Bearer token or X-API-Key header.
 * Mirrors Go's user.AuthenticateRequest.
 * Returns the user object or throws.
 */
async function authenticateRequest(req) {
  const authHeader = req.headers['authorization'] || '';

  if (authHeader) {
    const tokenString = authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : authHeader;

    try {
      const claims = validateToken(tokenString, config.encryptionKey);
      const user = await getUserByUsername(claims.username);
      return user;
    } catch (_) {
      // fall through to API key check
    }
  }

  // X-API-Key header (or raw Authorization header without Bearer prefix)
  let apiKey = req.headers['x-api-key'] || '';
  if (!apiKey) {
    apiKey = authHeader;
  }

  if (apiKey && !apiKey.startsWith('Bearer ')) {
    try {
      const user = await getUserByAPIKey(apiKey);
      return user;
    } catch (_) {
      // fall through
    }
  }

  throw new Error('unauthorized: invalid or missing session token or API key');
}

module.exports = { authenticateRequest };
