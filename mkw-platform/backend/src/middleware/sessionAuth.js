const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('../utils/logger');
const db = require('../database/connection');

// Salesforce-level session management
class SessionManager {
  constructor() {
    this.activeSessions = new Map(); // In production: Redis
    this.revokedTokens = new Set(); // In production: Redis with TTL
  }
  
  // Generate session with enterprise security
  async createSession(user, req) {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const fingerprint = this.generateFingerprint(req);
    
    const sessionData = {
      id: sessionId,
      userId: user.id,
      userRole: user.role,
      fingerprint,
      ip: req.ip,
      userAgent: req.headers['user-agent'] || '',
      createdAt: new Date(),
      lastActivity: new Date(),
      csrfToken: crypto.randomBytes(32).toString('hex')
    };
    
    // Store in database for persistence across restarts
    await db('user_sessions').insert({
      session_id: sessionId,
      user_id: user.id,
      fingerprint,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'] || '',
      csrf_token: sessionData.csrfToken,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      created_at: new Date(),
      last_activity: new Date()
    });
    
    this.activeSessions.set(sessionId, sessionData);
    
    logger.info('Session created', {
      userId: user.id,
      sessionId: sessionId.substring(0, 8) + '...',
      ip: req.ip
    });
    
    return sessionData;
  }
  
  // Validate session with comprehensive checks
  async validateSession(sessionId, req) {
    if (this.revokedTokens.has(sessionId)) {
      return { valid: false, reason: 'Session revoked' };
    }
    
    // Check memory cache first
    let session = this.activeSessions.get(sessionId);
    
    // Fall back to database
    if (!session) {
      const dbSession = await db('user_sessions')
        .where('session_id', sessionId)
        .where('expires_at', '>', new Date())
        .first();
      
      if (!dbSession) {
        return { valid: false, reason: 'Session not found or expired' };
      }
      
      session = {
        id: dbSession.session_id,
        userId: dbSession.user_id,
        fingerprint: dbSession.fingerprint,
        ip: dbSession.ip_address,
        userAgent: dbSession.user_agent,
        csrfToken: dbSession.csrf_token,
        createdAt: dbSession.created_at,
        lastActivity: dbSession.last_activity
      };
      
      this.activeSessions.set(sessionId, session);
    }
    
    // Validate fingerprint (with some tolerance for IP changes)
    const currentFingerprint = this.generateFingerprint(req);
    if (session.fingerprint !== currentFingerprint) {
      // Check if only IP changed (mobile users)
      const sessionFpParts = this.parseFingerprint(session.fingerprint);
      const currentFpParts = this.parseFingerprint(currentFingerprint);
      
      if (sessionFpParts.userAgent !== currentFpParts.userAgent) {
        logger.warn('Session fingerprint mismatch - user agent changed', {
          sessionId: sessionId.substring(0, 8) + '...',
          userId: session.userId,
          oldIP: session.ip,
          newIP: req.ip
        });
        
        await this.revokeSession(sessionId);
        return { valid: false, reason: 'Fingerprint validation failed' };
      }
    }
    
    // Update last activity
    session.lastActivity = new Date();
    await db('user_sessions')
      .where('session_id', sessionId)
      .update({ last_activity: new Date() });
    
    return { valid: true, session };
  }
  
  // Revoke session with cleanup
  async revokeSession(sessionId) {
    this.activeSessions.delete(sessionId);
    this.revokedTokens.add(sessionId);
    
    await db('user_sessions')
      .where('session_id', sessionId)
      .delete();
    
    logger.info('Session revoked', {
      sessionId: sessionId.substring(0, 8) + '...'
    });
  }
  
  // Revoke all sessions for user (password change, security breach)
  async revokeAllUserSessions(userId, exceptSessionId = null) {
    const sessions = await db('user_sessions')
      .where('user_id', userId)
      .select('session_id');
    
    for (const session of sessions) {
      if (session.session_id !== exceptSessionId) {
        this.activeSessions.delete(session.session_id);
        this.revokedTokens.add(session.session_id);
      }
    }
    
    let query = db('user_sessions').where('user_id', userId);
    if (exceptSessionId) {
      query = query.whereNot('session_id', exceptSessionId);
    }
    
    await query.delete();
    
    logger.info('All user sessions revoked', {
      userId,
      exceptSession: exceptSessionId ? 'kept current' : 'all revoked'
    });
  }
  
  // Rotate session ID (for privilege changes)
  async rotateSession(oldSessionId, req) {
    const validation = await this.validateSession(oldSessionId, req);
    if (!validation.valid) {
      return null;
    }
    
    const user = await db('users').where('id', validation.session.userId).first();
    if (!user) {
      return null;
    }
    
    // Revoke old session
    await this.revokeSession(oldSessionId);
    
    // Create new session
    return await this.createSession(user, req);
  }
  
  generateFingerprint(req) {
    const userAgent = req.headers['user-agent'] || '';
    const ipSubnet = req.ip.split('.').slice(0, 3).join('.'); // Allow IP changes within subnet
    
    return crypto
      .createHash('sha256')
      .update(userAgent)
      .update(ipSubnet)
      .digest('hex');
  }
  
  parseFingerprint(fingerprint) {
    // For this implementation, we'll store components separately in future versions
    return { userAgent: 'parsed', ipSubnet: 'parsed' };
  }
  
  // Cleanup expired sessions
  async cleanupExpiredSessions() {
    await db('user_sessions')
      .where('expires_at', '<', new Date())
      .delete();
    
    // Clear memory cache of expired sessions
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (Date.now() - session.lastActivity.getTime() > 24 * 60 * 60 * 1000) {
        this.activeSessions.delete(sessionId);
      }
    }
  }
}

const sessionManager = new SessionManager();

// Middleware for session-based authentication
const sessionAuthMiddleware = async (req, res, next) => {
  try {
    // Get session ID from cookie (preferred) or Authorization header
    let sessionId = null;
    
    if (req.cookies && req.cookies['mkw.sid']) {
      sessionId = req.cookies['mkw.sid'];
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Session ')) {
      sessionId = req.headers.authorization.substring(8);
    }
    
    if (!sessionId) {
      return res.status(401).json({
        success: false,
        error: 'No session provided'
      });
    }
    
    const validation = await sessionManager.validateSession(sessionId, req);
    
    if (!validation.valid) {
      logger.warn('Session validation failed', {
        reason: validation.reason,
        sessionId: sessionId.substring(0, 8) + '...',
        ip: req.ip
      });
      
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session'
      });
    }
    
    // Get user details
    const user = await db('users')
      .where('id', validation.session.userId)
      .where('status', 'active')
      .first();
    
    if (!user) {
      await sessionManager.revokeSession(sessionId);
      return res.status(401).json({
        success: false,
        error: 'User account not found or inactive'
      });
    }
    
    // Attach user and session to request
    req.user = user;
    req.session = validation.session;
    req.sessionId = sessionId;
    
    next();
  } catch (error) {
    logger.error('Session authentication error', {
      error: error.message,
      stack: error.stack,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      error: 'Authentication system error'
    });
  }
};

// JWT-based auth for stateless APIs (optional)
const jwtAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Bearer token required'
      });
    }
    
    const token = authHeader.substring(7);
    
    // Check if token is revoked
    if (sessionManager.revokedTokens.has(token)) {
      return res.status(401).json({
        success: false,
        error: 'Token has been revoked'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user details
    const user = await db('users')
      .where('id', decoded.userId)
      .where('status', 'active')
      .first();
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found or inactive'
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }
    
    logger.error('JWT authentication error', {
      error: error.message,
      ip: req.ip
    });
    
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

module.exports = {
  sessionManager,
  sessionAuthMiddleware,
  jwtAuthMiddleware
};