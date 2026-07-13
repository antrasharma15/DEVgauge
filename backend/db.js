const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("CRITICAL: DATABASE_URL is not set in environment variables (.env).");
  process.exit(1);
}

// Create connection pool
const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('supabase') || connectionString.includes('render') || connectionString.includes('railway')
    ? { rejectUnauthorized: false }
    : false
});

// Database query wrapper
const query = (text, params) => pool.query(text, params);

// Dynamic database schema initializer
const initDatabase = async () => {
  try {
    console.log("Checking and initializing database tables...");
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schemaSql);
      console.log("Database tables verified/created successfully.");
    } else {
      console.warn("Warning: schema.sql file not found. Skipping auto-initialization.");
    }
  } catch (err) {
    console.error("Database initialization error:", err.message);
  }
};

module.exports = {
  pool,
  query,
  initDatabase
};
