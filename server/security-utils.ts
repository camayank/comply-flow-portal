/**
 * Security Utilities
 * Cryptographically secure functions for password generation, tokens, and secrets
 */

import crypto from 'crypto';

/**
 * Generate a cryptographically secure random password
 * @param length - Password length (default: 12)
 * @param options - Options for password composition
 * @returns Secure random password
 */
export function generateSecurePassword(
  length: number = 12,
  options: {
    includeUppercase?: boolean;
    includeLowercase?: boolean;
    includeNumbers?: boolean;
    includeSymbols?: boolean;
    prefix?: string;
  } = {}
): string {
  const {
    includeUppercase = true,
    includeLowercase = true,
    includeNumbers = true,
    includeSymbols = false,
    prefix = '',
  } = options;

  let charset = '';
  if (includeUppercase) charset += 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excluded I, O to avoid confusion
  if (includeLowercase) charset += 'abcdefghjkmnpqrstuvwxyz'; // Excluded i, l, o to avoid confusion
  if (includeNumbers) charset += '23456789'; // Excluded 0, 1 to avoid confusion
  if (includeSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

  if (!charset) {
    charset = 'abcdefghjkmnpqrstuvwxyz23456789';
  }

  const passwordLength = Math.max(length - prefix.length, 8);
  const randomBytes = crypto.randomBytes(passwordLength);
  let password = '';

  for (let i = 0; i < passwordLength; i++) {
    password += charset[randomBytes[i] % charset.length];
  }

  return prefix + password;
}

/**
 * Generate a secure temporary password for user accounts
 * Uses crypto.randomBytes for cryptographic security
 * @returns A secure temporary password
 */
export function generateTempPassword(): string {
  return generateSecurePassword(12, {
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: false,
    prefix: 'DC',
  });
}

/**
 * Generate a secure random token (for OTP, reset tokens, etc.)
 * @param length - Token length in bytes (output will be hex, so 2x characters)
 * @returns Hex-encoded secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a numeric OTP code
 * @param digits - Number of digits (default: 6)
 * @returns Numeric OTP string
 */
export function generateOTP(digits: number = 6): string {
  const max = Math.pow(10, digits);
  const randomNumber = crypto.randomInt(0, max);
  return randomNumber.toString().padStart(digits, '0');
}

/**
 * Generate a secure secret for JWT, sessions, or encryption
 * @param length - Length in bytes (default: 32 for 256-bit)
 * @returns Base64-encoded secret
 */
export function generateSecureSecret(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64');
}

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns Object with isValid and reasons
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  reasons: string[];
} {
  const reasons: string[] = [];
  let score = 0;

  if (password.length < 8) {
    reasons.push('Password must be at least 8 characters');
  } else {
    score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;
  }

  if (!/[a-z]/.test(password)) {
    reasons.push('Password must contain lowercase letters');
  } else {
    score += 1;
  }

  if (!/[A-Z]/.test(password)) {
    reasons.push('Password must contain uppercase letters');
  } else {
    score += 1;
  }

  if (!/[0-9]/.test(password)) {
    reasons.push('Password must contain numbers');
  } else {
    score += 1;
  }

  if (!/[^a-zA-Z0-9]/.test(password)) {
    reasons.push('Password should contain special characters');
  } else {
    score += 1;
  }

  return {
    isValid: reasons.length === 0 || (reasons.length === 1 && reasons[0].includes('should')),
    score: Math.min(score, 5),
    reasons,
  };
}

/**
 * Generate a secure random string suitable for IDs
 * @param length - Length of the string
 * @returns URL-safe random string
 */
export function generateSecureId(length: number = 16): string {
  const bytes = crypto.randomBytes(Math.ceil((length * 3) / 4));
  return bytes.toString('base64url').slice(0, length);
}
