const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body } = require('express-validator');
const db = require('../db');
const auth = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');
const { validateRules } = require('../middleware/validate');
const { AppError } = require('../middleware/errorHandler');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET env variable is not set!");
}

// Validation schemas
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 50 }).withMessage('Name must be under 50 characters'),
  body('email').trim().isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
    .matches(/[a-zA-Z]/).withMessage('Password must contain at least one letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
];

const loginValidation = [
  body('email').trim().isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
];

const forgotPasswordValidation = [
  body('email').trim().isEmail().withMessage('Please provide a valid email address').normalizeEmail()
];

const resetPasswordValidation = [
  body('token').trim().notEmpty().withMessage('Password reset token is required'),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
    .matches(/[a-zA-Z]/).withMessage('Password must contain at least one letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
];

// @route   POST api/auth/register
// @desc    Register a user
// @access  Public (Rate Limited)
router.post('/register', rateLimiter, validateRules(registerValidation), async (req, res, next) => {
  const { name, email, password } = req.body;

  try {
    // Check for existing user
    const userSelectResult = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (userSelectResult.rows.length > 0) {
      throw new AppError('User already exists', 400);
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
        if (err) return next(err);
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
    next(err);
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public (Rate Limited)
router.post('/login', rateLimiter, validateRules(loginValidation), async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // Check for user
    const userSelectResult = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (userSelectResult.rows.length === 0) {
      throw new AppError('Invalid credentials', 400);
    }

    const user = userSelectResult.rows[0];

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError('Invalid credentials', 400);
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
        if (err) return next(err);
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
    next(err);
  }
});

// @route   POST api/auth/forgot-password
// @desc    Generate password reset token
// @access  Public (Rate Limited)
router.post('/forgot-password', rateLimiter, validateRules(forgotPasswordValidation), async (req, res, next) => {
  const { email } = req.body;

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
    next(err);
  }
});

// @route   POST api/auth/reset-password
// @desc    Reset password using token
// @access  Public (Rate Limited)
router.post('/reset-password', rateLimiter, validateRules(resetPasswordValidation), async (req, res, next) => {
  const { token, password } = req.body;

  try {
    // Fetch reset token record
    const resetResult = await db.query(
      'SELECT * FROM password_resets WHERE token = $1 AND expires_at > NOW() AND used = FALSE',
      [token]
    );

    if (resetResult.rows.length === 0) {
      throw new AppError('Password reset token is invalid or has expired', 400);
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
    next(err);
  }
});

// @route   GET api/auth/me
// @desc    Get current user data
// @access  Private
router.get('/me', auth, async (req, res, next) => {
  try {
    const userResult = await db.query('SELECT id, name, email, created_at, updated_at FROM users WHERE id = $1', [req.user.id]);
    if (userResult.rows.length === 0) {
      throw new AppError('User not found', 404);
    }
    res.json(userResult.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
