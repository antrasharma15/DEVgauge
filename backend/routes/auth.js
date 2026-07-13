const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');
const auth = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET env variable is not set!");
}

// Validation helpers
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const validatePassword = (password) => {
  // Enforce length >= 6, contains at least one letter and one number
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return password.length >= 6 && hasLetter && hasNumber;
};

// @route   POST api/auth/register
// @desc    Register a user
// @access  Public (Rate Limited)
router.post('/register', rateLimiter, async (req, res) => {
  const { name, email, password } = req.body;

  // Basic validation
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please enter all fields' });
  }

  // Format validation
  if (!validateEmail(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address' });
  }

  // Strength validation
  if (!validatePassword(password)) {
    return res.status(400).json({ 
      message: 'Password must be at least 6 characters long and contain both letters and numbers' 
    });
  }

  try {
    // Check for existing user
    const userSelectResult = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (userSelectResult.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user
    const insertResult = await db.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
      [name.trim(), email.toLowerCase().trim(), hashedPassword]
    );

    const newUser = insertResult.rows[0];

    // Create JWT
    const payload = {
      user: {
        id: newUser.id
      }
    };

    jwt.sign(
      payload,
      JWT_SECRET,
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        res.status(201).json({
          token,
          user: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            created_at: newUser.created_at
          }
        });
      }
    );

  } catch (err) {
    console.error("Register Error:", err.message);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public (Rate Limited)
router.post('/login', rateLimiter, async (req, res) => {
  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    return res.status(400).json({ message: 'Please enter all fields' });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ message: 'Invalid credentials' }); // Ambiguous for security
  }

  try {
    // Check for user
    const userSelectResult = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (userSelectResult.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = userSelectResult.rows[0];

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create JWT
    const payload = {
      user: {
        id: user.id
      }
    };

    jwt.sign(
      payload,
      JWT_SECRET,
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            created_at: user.created_at
          }
        });
      }
    );

  } catch (err) {
    console.error("Login Error:", err.message);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// @route   POST api/auth/forgot-password
// @desc    Generate password reset token
// @access  Public (Rate Limited)
router.post('/forgot-password', rateLimiter, async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Please provide an email address' });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address' });
  }

  try {
    // Check if user exists
    const userSelectResult = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (userSelectResult.rows.length === 0) {
      // Return 200 standard response to prevent user enumeration
      return res.json({ message: 'If an account exists with that email, a reset token has been generated.' });
    }

    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration

    // Save reset token record
    await db.query(
      'INSERT INTO password_resets (email, token, expires_at) VALUES ($1, $2, $3)',
      [email.toLowerCase().trim(), token, expiresAt]
    );

    // Normally we send this via email. For developer reference, we return it in response during local development
    res.json({ 
      message: 'If an account exists with that email, a reset token has been generated.',
      // Return token in dev mode
      token: process.env.NODE_ENV === 'development' ? token : undefined 
    });

  } catch (err) {
    console.error("Forgot Password Error:", err.message);
    res.status(500).json({ message: 'Server error during password reset request' });
  }
});

// @route   POST api/auth/reset-password
// @desc    Reset password using token
// @access  Public (Rate Limited)
router.post('/reset-password', rateLimiter, async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ message: 'Please enter all fields' });
  }

  if (!validatePassword(password)) {
    return res.status(400).json({ 
      message: 'Password must be at least 6 characters long and contain both letters and numbers' 
    });
  }

  try {
    // Fetch reset token record
    const resetResult = await db.query(
      'SELECT * FROM password_resets WHERE token = $1 AND expires_at > NOW() AND used = FALSE',
      [token]
    );

    if (resetResult.rows.length === 0) {
      return res.status(400).json({ message: 'Password reset token is invalid or has expired' });
    }

    const resetRecord = resetResult.rows[0];

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user's password
    await db.query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2',
      [hashedPassword, resetRecord.email]
    );

    // Mark token as used
    await db.query(
      'UPDATE password_resets SET used = TRUE WHERE id = $1',
      [resetRecord.id]
    );

    res.json({ message: 'Password has been successfully updated.' });

  } catch (err) {
    console.error("Reset Password Error:", err.message);
    res.status(500).json({ message: 'Server error during password reset' });
  }
});

// @route   GET api/auth/me
// @desc    Get current user data
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const userResult = await db.query('SELECT id, name, email, created_at, updated_at FROM users WHERE id = $1', [req.user.id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(userResult.rows[0]);
  } catch (err) {
    console.error("Get Auth User Error:", err.message);
    res.status(500).json({ message: 'Server error fetching user info' });
  }
});

module.exports = router;
