/**
 * Authentication Routes
 * Handles user registration, login, OTP verification, and token management
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../config/database';
import { generateTokenPair, verifyToken } from '../config/jwt';
import { authenticateToken, verifyRefreshToken } from '../middleware/auth';
import { authLimiter, otpLimiter } from '../middleware/rateLimiter';
import { asyncHandler, ValidationError, UnauthorizedError, ConflictError } from '../middleware/errorHandler';
import { sendOTPEmail } from '../services/emailService';
import { sendOTPSMS } from '../services/smsService';
import { logger, authLogger } from '../config/logger';

const router = Router();

// Helper: Generate OTP
function generateOTP(): string {
  const length = parseInt(process.env.OTP_LENGTH || '6');
  return Math.floor(Math.random() * Math.pow(10, length))
    .toString()
    .padStart(length, '0');
}

// Helper: Hash OTP
async function hashOTP(otp: string): Promise<string> {
  return bcrypt.hash(otp, 12);
}

// Helper: Validate password strength
interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];
  const MIN_LENGTH = 8;

  if (password.length < MIN_LENGTH) {
    errors.push(`Password must be at least ${MIN_LENGTH} characters long`);
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*...)');
  }

  // Check for common weak passwords
  const commonPasswords = ['password', 'password1', '12345678', 'qwerty', 'letmein', 'admin'];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common. Please choose a stronger password');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * POST /api/v1/auth/register
 * Register new user
 */
router.post('/register', authLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { email, password, firstName, lastName, phone } = req.body;

  // Validate input
  if (!email || !password || !firstName) {
    throw new ValidationError('Email, password, and first name are required');
  }

  // Validate password strength
  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.isValid) {
    throw new ValidationError(`Password requirements not met: ${passwordValidation.errors.join('; ')}`);
  }

  // Check if user exists
  const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existingUser.rows.length > 0) {
    throw new ConflictError('User with this email already exists');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Create user
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, first_name, last_name, phone)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, email, first_name, last_name`,
    [email, passwordHash, firstName, lastName, phone || null]
  );

  const user = result.rows[0];

  // Assign default 'client' role
  const clientRole = await pool.query('SELECT id FROM roles WHERE name = $1', ['client']);
  if (clientRole.rows.length > 0) {
    await pool.query(
      'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
      [user.id, clientRole.rows[0].id]
    );
  }

  authLogger.info('User registered successfully:', { userId: user.id, email: user.email });

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      userId: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
    },
  });
}));

/**
 * POST /api/v1/auth/login
 * User login
 */
router.post('/login', authLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ValidationError('Email and password are required');
  }

  // Get user with roles
  const userResult = await pool.query(
    `SELECT u.id, u.email, u.password_hash, u.first_name, u.last_name, u.is_active,
            array_agg(r.name) as roles
     FROM users u
     LEFT JOIN user_roles ur ON u.id = ur.user_id
     LEFT JOIN roles r ON ur.role_id = r.id
     WHERE u.email = $1
     GROUP BY u.id`,
    [email]
  );

  if (userResult.rows.length === 0) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const user = userResult.rows[0];

  // Check if user is active
  if (!user.is_active) {
    throw new UnauthorizedError('Account is deactivated');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    authLogger.warn('Failed login attempt:', { email });
    throw new UnauthorizedError('Invalid email or password');
  }

  // Generate tokens
  const tokens = generateTokenPair({
    userId: user.id,
    email: user.email,
    roles: user.roles.filter((r: string) => r !== null),
  });

  // Update last login
  await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

  authLogger.info('User logged in successfully:', { userId: user.id, email: user.email });

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        roles: user.roles.filter((r: string) => r !== null),
      },
      ...tokens,
    },
  });
}));

/**
 * POST /api/v1/auth/send-otp
 * Send OTP for verification
 */
router.post('/send-otp', otpLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { email, phone } = req.body;

  if (!email && !phone) {
    throw new ValidationError('Email or phone is required');
  }

  // Generate OTP
  const otp = generateOTP();
  const otpHash = await hashOTP(otp);
  const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || '10');
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  // Store OTP in database (upsert pattern)
  const identifier = email || phone;
  const identifierType = email ? 'email' : 'phone';

  await pool.query(
    `INSERT INTO otp_store (identifier, identifier_type, otp_hash, expires_at, attempts, created_at)
     VALUES ($1, $2, $3, $4, 0, CURRENT_TIMESTAMP)
     ON CONFLICT (identifier)
     DO UPDATE SET otp_hash = $3, expires_at = $4, attempts = 0, created_at = CURRENT_TIMESTAMP`,
    [identifier, identifierType, otpHash, expiresAt]
  );

  authLogger.info('OTP generated and stored:', { identifier, identifierType });

  // Send OTP via email
  if (email) {
    await sendOTPEmail(email, 'User', otp);
  }

  // Send OTP via SMS
  if (phone) {
    await sendOTPSMS(phone, otp);
  }

  res.json({
    success: true,
    message: 'OTP sent successfully',
    data: {
      expiresAt,
      // SECURITY: Never include OTP in response, even in development
    },
  });
}));

/**
 * POST /api/v1/auth/verify-otp
 * Verify OTP with actual database validation
 */
router.post('/verify-otp', otpLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { email, phone, otp } = req.body;

  if ((!email && !phone) || !otp) {
    throw new ValidationError('Email/phone and OTP are required');
  }

  const identifier = email || phone;
  const MAX_ATTEMPTS = 5;

  // Get stored OTP from database
  const result = await pool.query(
    `SELECT otp_hash, expires_at, attempts FROM otp_store WHERE identifier = $1`,
    [identifier]
  );

  if (result.rows.length === 0) {
    authLogger.warn('OTP verification failed: No OTP found', { identifier });
    throw new UnauthorizedError('Invalid or expired OTP');
  }

  const storedOtp = result.rows[0];

  // Check if too many attempts
  if (storedOtp.attempts >= MAX_ATTEMPTS) {
    authLogger.warn('OTP verification failed: Too many attempts', { identifier, attempts: storedOtp.attempts });
    // Delete the OTP to force regeneration
    await pool.query('DELETE FROM otp_store WHERE identifier = $1', [identifier]);
    throw new UnauthorizedError('Too many failed attempts. Please request a new OTP.');
  }

  // Check if OTP is expired
  if (new Date(storedOtp.expires_at) < new Date()) {
    authLogger.warn('OTP verification failed: Expired', { identifier });
    await pool.query('DELETE FROM otp_store WHERE identifier = $1', [identifier]);
    throw new UnauthorizedError('OTP has expired. Please request a new one.');
  }

  // Verify OTP hash
  const isValid = await bcrypt.compare(otp, storedOtp.otp_hash);

  if (!isValid) {
    // Increment attempt counter
    await pool.query(
      'UPDATE otp_store SET attempts = attempts + 1 WHERE identifier = $1',
      [identifier]
    );
    authLogger.warn('OTP verification failed: Invalid OTP', { identifier, attempts: storedOtp.attempts + 1 });
    throw new UnauthorizedError('Invalid OTP');
  }

  // OTP is valid - delete it (one-time use)
  await pool.query('DELETE FROM otp_store WHERE identifier = $1', [identifier]);

  // Mark email/phone as verified for the user
  if (email) {
    await pool.query(
      'UPDATE users SET email_verified = true WHERE email = $1',
      [email]
    );
  }

  authLogger.info('OTP verified successfully:', { identifier });

  res.json({
    success: true,
    message: 'OTP verified successfully',
  });
}));

/**
 * POST /api/v1/auth/refresh
 * Refresh access token
 */
router.post('/refresh', verifyRefreshToken, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  // Generate new tokens
  const tokens = generateTokenPair({
    userId: req.user.userId,
    email: req.user.email,
    roles: req.user.roles,
  });

  res.json({
    success: true,
    message: 'Token refreshed successfully',
    data: tokens,
  });
}));

/**
 * POST /api/v1/auth/logout
 * Logout user - revokes the current token
 */
router.post('/logout', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  // Import token revocation function
  const { revokeToken } = await import('../middleware/auth');

  // Get the token from the request
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token && req.user?.exp) {
    // Revoke the token - add to blacklist until its expiry
    const expiresAt = new Date(req.user.exp * 1000);
    await revokeToken(token, expiresAt);
  }

  authLogger.info('User logged out - token revoked:', { userId: req.userId });

  res.json({
    success: true,
    message: 'Logged out successfully',
  });
}));

/**
 * GET /api/v1/auth/me
 * Get current user
 */
router.get('/me', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const result = await pool.query(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.is_active, u.email_verified,
            array_agg(r.name) as roles
     FROM users u
     LEFT JOIN user_roles ur ON u.id = ur.user_id
     LEFT JOIN roles r ON ur.role_id = r.id
     WHERE u.id = $1
     GROUP BY u.id`,
    [req.userId]
  );

  if (result.rows.length === 0) {
    throw new UnauthorizedError('User not found');
  }

  const user = result.rows[0];

  res.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      isActive: user.is_active,
      emailVerified: user.email_verified,
      roles: user.roles.filter((r: string) => r !== null),
    },
  });
}));

/**
 * POST /api/v1/auth/password/reset
 * Request password reset
 */
router.post('/password/reset', authLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    throw new ValidationError('Email is required');
  }

  // Check if user exists
  const user = await pool.query('SELECT id, first_name FROM users WHERE email = $1', [email]);

  // Always return success (security best practice)
  authLogger.info('Password reset requested:', { email });

  res.json({
    success: true,
    message: 'If the email exists, a password reset link will be sent',
  });
}));

export default router;
