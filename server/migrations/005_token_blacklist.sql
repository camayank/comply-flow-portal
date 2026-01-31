-- Token Blacklist for JWT Revocation
-- Created: 2026-01-31
-- Purpose: Store revoked tokens to enable proper logout functionality

CREATE TABLE IF NOT EXISTS token_blacklist (
    id SERIAL PRIMARY KEY,
    token_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 hash of the token
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- When the token would have expired
    revoked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reason VARCHAR(50) DEFAULT 'logout' -- 'logout', 'password_change', 'security', etc.
);

-- Index for fast lookup by token hash
CREATE INDEX IF NOT EXISTS idx_token_blacklist_hash ON token_blacklist(token_hash);

-- Index for cleanup of expired tokens
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires ON token_blacklist(expires_at);

-- Comment for documentation
COMMENT ON TABLE token_blacklist IS 'Stores revoked JWT tokens to enable proper logout and security token revocation';
