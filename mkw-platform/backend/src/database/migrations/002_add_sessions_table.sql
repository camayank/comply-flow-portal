-- User Sessions table for secure session management
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(64) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fingerprint VARCHAR(64) NOT NULL,
    ip_address INET NOT NULL,
    user_agent TEXT,
    csrf_token VARCHAR(64),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions(last_activity);

-- OTP Store table with hashed storage
CREATE TABLE IF NOT EXISTS otp_store (
    id SERIAL PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL, -- email or phone
    otp_hash VARCHAR(255) NOT NULL, -- bcrypt hashed OTP
    attempts INTEGER DEFAULT 0,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for OTP operations
CREATE INDEX IF NOT EXISTS idx_otp_store_identifier ON otp_store(identifier);
CREATE INDEX IF NOT EXISTS idx_otp_store_expires_at ON otp_store(expires_at);

-- Failed Login Attempts tracking
CREATE TABLE IF NOT EXISTS failed_login_attempts (
    id SERIAL PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL, -- email or IP
    identifier_type VARCHAR(20) NOT NULL, -- 'email' or 'ip'
    attempt_count INTEGER DEFAULT 1,
    last_attempt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    locked_until TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_failed_attempts_identifier ON failed_login_attempts(identifier, identifier_type);
CREATE INDEX IF NOT EXISTS idx_failed_attempts_locked_until ON failed_login_attempts(locked_until);

-- Security Events logging
CREATE TABLE IF NOT EXISTS security_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL, -- login_failed, session_hijack_detected, etc.
    user_id INTEGER REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);

-- Function to cleanup expired records
CREATE OR REPLACE FUNCTION cleanup_expired_security_data()
RETURNS INTEGER AS $$
DECLARE
    cleaned_count INTEGER := 0;
BEGIN
    -- Cleanup expired sessions
    DELETE FROM user_sessions WHERE expires_at < NOW();
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    
    -- Cleanup expired OTPs
    DELETE FROM otp_store WHERE expires_at < NOW();
    GET DIAGNOSTICS cleaned_count = cleaned_count + ROW_COUNT;
    
    -- Cleanup old failed login attempts (older than 24 hours)
    DELETE FROM failed_login_attempts 
    WHERE last_attempt < NOW() - INTERVAL '24 hours'
    AND (locked_until IS NULL OR locked_until < NOW());
    GET DIAGNOSTICS cleaned_count = cleaned_count + ROW_COUNT;
    
    -- Cleanup old security events (older than 90 days)
    DELETE FROM security_events WHERE created_at < NOW() - INTERVAL '90 days';
    GET DIAGNOSTICS cleaned_count = cleaned_count + ROW_COUNT;
    
    RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (in production, use pg_cron or external scheduler)
-- SELECT cleanup_expired_security_data();