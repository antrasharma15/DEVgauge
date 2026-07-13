const express = require('express');
const cors = require('cors');
const db = require('./db');
require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error("CRITICAL: JWT_SECRET is not set in environment variables (.env).");
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Express Middlewares
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like Postman, curl, or server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Initialize Database Tables
db.initDatabase().then(() => {
  console.log("Database schema initialization run completed.");
}).catch(err => {
  console.error("Critical error running database schema initialization:", err);
});

// Basic Health Check Route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'DEVgauge backend API is running.' });
});

// Register Routes
app.use('/api/auth', require('./routes/auth'));

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong on the server.' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
});
