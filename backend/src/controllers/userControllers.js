'use strict';

const { getPool } = require('../database/db');
const { generateToken } = require('../encryption/encryption');
const {
  createUser,
  getUserByUsername,
  getUserByEmail,
  verifyPassword,
  updatePassword,
  updateUserProfile,
  regenerateAPIKey,
} = require('../services/user/user');
const { authenticateRequest } = require('../auth/auth');
const config = require('../config/config');

// POST /api/auth/signup
async function signup(req, res) {
  if (!getPool()) return res.status(500).send('Database not configured');

  const { name, username, email, password } = req.body;
  if (!name || !username || !email || !password) {
    return res.status(400).send('All fields are required');
  }

  try { await getUserByUsername(username); return res.status(409).send('Username already exists'); } catch (_) {}
  try { await getUserByEmail(email);       return res.status(409).send('Email already exists');    } catch (_) {}

  let newUser;
  try {
    newUser = await createUser(name, username, email, password);
  } catch (err) {
    console.error('Failed to create user:', err.message);
    return res.status(500).send('Failed to create user');
  }

  let token;
  try {
    token = generateToken(newUser.id, newUser.username, config.encryptionKey);
  } catch (err) {
    console.error('Failed to generate session token:', err.message);
    return res.status(500).send('Failed to create session');
  }

  res.json({ status: 'success', message: 'User created successfully', user: newUser, token });
}

// POST /api/auth/login
async function login(req, res) {
  if (!getPool()) return res.status(500).send('Database not configured');

  const { username, password } = req.body;
  if (!username || !password) return res.status(400).send('Username and password are required');

  let user;
  try {
    user = await getUserByUsername(username);
  } catch (_) {
    return res.status(401).send('Invalid username or password');
  }

  const valid = await verifyPassword(user.id, password);
  if (!valid) return res.status(401).send('Invalid username or password');

  let token;
  try {
    token = generateToken(user.id, user.username, config.encryptionKey);
  } catch (err) {
    console.error('Failed to generate session token:', err.message);
    return res.status(500).send('Failed to create session');
  }

  res.json({ status: 'success', message: 'Login successful', user, token });
}

// POST /api/auth/forgot-password
async function forgotPassword(req, res) {
  if (!getPool()) return res.status(500).send('Database not configured');

  const { email } = req.body;
  if (!email) return res.status(400).send('Email is required');

  try {
    const user = await getUserByEmail(email);
    console.log(`Forgot password request for user: ${user.email} (ID: ${user.id})`);
  } catch (_) {
    // For security, don't reveal if email exists
  }

  res.json({ status: 'success', message: 'If the email exists, a password reset link has been sent' });
}

// GET /api/user/profile
async function getProfile(req, res) {
  if (!getPool()) return res.status(500).send('Database not configured');
  res.json({ status: 'success', user: req.user });
}

// PUT /api/user/profile/update
async function updateProfile(req, res) {
  if (!getPool()) return res.status(500).send('Database not configured');

  const { name, email } = req.body;
  if (!name || !email) return res.status(400).send('Name and email are required');

  try {
    await updateUserProfile(req.user.id, name, email);
  } catch (err) {
    return res.status(500).send('Failed to update profile');
  }

  const updatedUser = await getUserByUsername(req.user.username);
  res.json({ status: 'success', message: 'Profile updated successfully', user: updatedUser });
}

// POST /api/user/password/change
async function changePassword(req, res) {
  if (!getPool()) return res.status(500).send('Database not configured');

  const { old_password, new_password } = req.body;
  if (!old_password || !new_password) {
    return res.status(400).send('Old and new passwords are required');
  }

  const valid = await verifyPassword(req.user.id, old_password);
  if (!valid) return res.status(401).send('Invalid old password');

  try {
    await updatePassword(req.user.id, new_password);
  } catch (err) {
    return res.status(500).send('Failed to change password');
  }

  res.json({ status: 'success', message: 'Password changed successfully' });
}

// GET /api/user/api-key
async function getAPIKey(req, res) {
  if (!getPool()) return res.status(500).send('Database not configured');
  res.json({ status: 'success', api_key: req.user.api_key, user_id: req.user.id, username: req.user.username });
}

// POST /api/user/api-key/regenerate
async function regenerateAPIKeyHandler(req, res) {
  if (!getPool()) return res.status(500).send('Database not configured');

  let newKey;
  try {
    newKey = await regenerateAPIKey(req.user.id);
  } catch (err) {
    return res.status(500).send('Failed to regenerate API key');
  }

  res.json({ status: 'success', message: 'API key regenerated successfully', api_key: newKey });
}

module.exports = {
  signup,
  login,
  forgotPassword,
  getProfile,
  updateProfile,
  changePassword,
  getAPIKey,
  regenerateAPIKeyHandler,
};
