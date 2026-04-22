-- Migration: Add PPG-specific tables to the devops-ecosystem base schema
-- Run this after init.sql if the DB was initialized from devops-ecosystem

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── PPG Users (auth provider) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ppg_users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username      VARCHAR(50) UNIQUE NOT NULL,
    full_name     VARCHAR(200) NOT NULL,
    email         VARCHAR(200) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Application Registry ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ppg_app_registry (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    object_type VARCHAR(20) NOT NULL
                CHECK (object_type IN ('application','system','job','connection')),
    name        VARCHAR(200) NOT NULL,
    code        VARCHAR(50) NOT NULL,
    description TEXT,
    owner_team  VARCHAR(100),
    status      VARCHAR(20) NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','inactive','deprecated')),
    environment JSONB NOT NULL DEFAULT '[]',
    extra       JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by  VARCHAR(100) NOT NULL DEFAULT 'system',
    UNIQUE (project_id, code)
);

CREATE INDEX IF NOT EXISTS idx_ppg_app_registry_project ON ppg_app_registry(project_id);
CREATE INDEX IF NOT EXISTS idx_ppg_app_registry_type ON ppg_app_registry(object_type);

-- ── Seed: default admin user (password: admin123) ────────────────────────
INSERT INTO ppg_users (username, full_name, email, password_hash)
VALUES ('admin', 'System Admin', 'admin@vib.com.vn',
        '$2b$12$8C92m.jhLDdHzDkO39TK0e/LH9/SAlgZA0lYHbssRsvg5/BDHtiGe')
ON CONFLICT (username) DO NOTHING;
