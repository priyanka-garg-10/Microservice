'use strict';

const express = require('express');
const cors    = require('cors');
const authMiddleware = require('../middleware/authMiddleware');

const {
  signup, login, forgotPassword,
  getProfile, updateProfile, changePassword,
  getAPIKey, regenerateAPIKeyHandler,
} = require('../controllers/userControllers');

const {
  sendEmail, credentialsHandler, getHistory, suggestEmail,
} = require('../controllers/emailControllers');

function setupRouter() {
  const router = express.Router();

  // CORS — mirrors Go's corsMiddleware (allow all origins, same headers)
  router.use(cors({
    origin:  '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  }));

  // ── Public auth routes ──────────────────────────────────────────────────────
  router.post('/api/auth/signup',          signup);
  router.post('/api/auth/login',           login);
  router.post('/api/auth/forgot-password', forgotPassword);

  // ── Protected routes (Bearer token or X-API-Key required) ──────────────────
  const protect = express.Router();
  protect.use(authMiddleware);

  protect.get ('/api/user/profile',            getProfile);
  protect.put ('/api/user/profile/update',     updateProfile);
  protect.post('/api/user/password/change',    changePassword);
  protect.get ('/api/user/api-key',            getAPIKey);
  protect.post('/api/user/api-key/regenerate', regenerateAPIKeyHandler);

  protect.post  ('/api/email/send',        sendEmail);
  protect.get   ('/api/email/credentials', credentialsHandler);
  protect.post  ('/api/email/credentials', credentialsHandler);
  protect.put   ('/api/email/credentials', credentialsHandler);
  protect.delete('/api/email/credentials', credentialsHandler);
  protect.get   ('/api/email/history',     getHistory);
  protect.post  ('/api/email/suggest',     suggestEmail);

  router.use(protect);

  return router;
}

module.exports = { setupRouter };
