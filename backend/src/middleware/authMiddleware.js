'use strict';

const { authenticateRequest } = require('../auth/auth');

/**
 * Express middleware that validates Bearer token or X-API-Key.
 * Attaches the authenticated user to req.user and continues.
 * Mirrors Go's routes.authMiddleware.
 */
async function authMiddleware(req, res, next) {
  try {
    req.user = await authenticateRequest(req);
    next();
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
}

module.exports = authMiddleware;
