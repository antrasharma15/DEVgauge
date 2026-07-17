-- DEVgauge Database Schema
-- Compatible with Supabase PostgreSQL and standard local PostgreSQL

-- Enable UUID extension if available (optional, but good practice for Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- TRIGGER FUNCTION FOR UPDATING TIMESTAMPS
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Handle schema migration for existing databases missing updated_at
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Trigger for users updated_at
DROP TRIGGER IF EXISTS update_users_modtime ON users;
CREATE TRIGGER update_users_modtime
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- PROJECTS TABLE
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_name VARCHAR(100) NOT NULL,
    github_url VARCHAR(255),
    file_path VARCHAR(255),
    language VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Handle schema migration for existing databases
ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS file_path VARCHAR(255);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS language VARCHAR(50);

-- Trigger for projects updated_at
DROP TRIGGER IF EXISTS update_projects_modtime ON projects;
CREATE TRIGGER update_projects_modtime
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- REVIEWS TABLE
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    review_type VARCHAR(50) NOT NULL, -- 'snippet' or 'file'
    overall_score INT NOT NULL DEFAULT 100, -- Score from 0 to 100
    summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- REVIEW FINDINGS TABLE
CREATE TABLE IF NOT EXISTS review_findings (
    id SERIAL PRIMARY KEY,
    review_id INT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    severity VARCHAR(20) NOT NULL, -- 'error', 'warning', 'info'
    issue TEXT NOT NULL,
    explanation TEXT,
    suggested_fix TEXT,
    file_name VARCHAR(255),
    line_number INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- PASSWORD RESETS TABLE
CREATE TABLE IF NOT EXISTS password_resets (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES TO OPTIMIZE JOIN AND LOOKUP QUERIES
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_name_trgm ON projects USING gin (project_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_reviews_project_id ON reviews(project_id);
CREATE INDEX IF NOT EXISTS idx_reviews_project_id_created_at_desc ON reviews (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_project_type_created ON reviews (project_id, review_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_findings_review_id ON review_findings(review_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);

-- COMPLEXITY METRICS TABLE (Day 9)
CREATE TABLE IF NOT EXISTS complexity_metrics (
    id SERIAL PRIMARY KEY,
    review_id INT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE UNIQUE,
    cyclomatic_complexity INT NOT NULL,
    avg_function_complexity NUMERIC(5,2) NOT NULL,
    file_complexity INT NOT NULL,
    num_functions INT NOT NULL,
    num_classes INT NOT NULL,
    lines_of_code INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for complexity metrics review lookup
CREATE INDEX IF NOT EXISTS idx_complexity_metrics_review_id ON complexity_metrics(review_id);

-- DOCUMENTATION ENTRIES TABLE (Day 10)
CREATE TABLE IF NOT EXISTS documentation_entries (
    id SERIAL PRIMARY KEY,
    review_id INT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    entry_type VARCHAR(20) NOT NULL, -- 'file', 'class', 'function'
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    parameters JSONB, -- Array of parameter definitions: [{ name, type, description }]
    returns TEXT, -- Returns statement/description
    docstring TEXT, -- Formatted JSDoc / docstring content
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for documentation entries review lookup
CREATE INDEX IF NOT EXISTS idx_documentation_entries_review_id ON documentation_entries(review_id);
