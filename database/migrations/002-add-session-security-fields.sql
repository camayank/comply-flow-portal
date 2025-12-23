-- Migration: Add session security fields for enterprise-grade security
-- Description: Adds fingerprinting, CSRF tokens, and activity tracking to user sessions
-- Created: 2025-11-08
-- Part of: Salesforce-level security hardening

-- Add new security columns to user_sessions table
ALTER TABLE user_sessions
  ADD COLUMN IF NOT EXISTS fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS csrf_token TEXT,
  ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP DEFAULT NOW();

-- Create index on fingerprint for faster session validation
CREATE INDEX IF NOT EXISTS idx_user_sessions_fingerprint ON user_sessions(fingerprint);

-- Create index on last_activity for session cleanup queries
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions(last_activity);

-- Create index on csrf_token for CSRF validation
CREATE INDEX IF NOT EXISTS idx_user_sessions_csrf_token ON user_sessions(csrf_token);

-- Update existing sessions to have last_activity = created_at (backfill)
UPDATE user_sessions
SET last_activity = created_at
WHERE last_activity IS NULL;

-- Add comment to document security enhancement
COMMENT ON COLUMN user_sessions.fingerprint IS 'Session fingerprint (SHA256 hash of user-agent + IP subnet) for hijack detection';
COMMENT ON COLUMN user_sessions.csrf_token IS 'CSRF protection token unique to this session';
COMMENT ON COLUMN user_sessions.last_activity IS 'Timestamp of last session activity for timeout tracking';
