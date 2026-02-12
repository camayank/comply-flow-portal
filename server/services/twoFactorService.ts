/**
 * Two-Factor Authentication Service
 * Implements TOTP (Time-based One-Time Password) using Node.js crypto
 * RFC 6238 compliant implementation
 */

import crypto from 'crypto';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const TOTP_WINDOW = 1; // Allow 1 step before/after current time
const TOTP_STEP = 30; // 30 second time step
const TOTP_DIGITS = 6; // 6-digit code

/**
 * Generate a cryptographically secure random secret for TOTP
 */
export function generateSecret(): string {
  // Generate 20 random bytes (160 bits) - standard for TOTP
  const buffer = crypto.randomBytes(20);
  // Base32 encode the secret
  return base32Encode(buffer);
}

/**
 * Generate a TOTP code from a secret
 */
export function generateTOTP(secret: string, time?: number): string {
  const counter = Math.floor((time || Date.now() / 1000) / TOTP_STEP);
  return generateHOTP(secret, counter);
}

/**
 * Verify a TOTP code
 */
export function verifyTOTP(secret: string, token: string, window: number = TOTP_WINDOW): boolean {
  if (!token || token.length !== TOTP_DIGITS) {
    return false;
  }

  const currentTime = Math.floor(Date.now() / 1000);

  // Check current time step and window steps before/after
  for (let i = -window; i <= window; i++) {
    const time = currentTime + (i * TOTP_STEP);
    const expectedToken = generateTOTP(secret, time);

    if (timingSafeEqual(token, expectedToken)) {
      return true;
    }
  }

  return false;
}

/**
 * Generate HOTP (HMAC-based OTP) - base algorithm for TOTP
 */
function generateHOTP(secret: string, counter: number): string {
  // Decode base32 secret
  const key = base32Decode(secret);

  // Convert counter to 8-byte buffer (big-endian)
  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64BE(BigInt(counter));

  // Generate HMAC-SHA1
  const hmac = crypto.createHmac('sha1', key);
  hmac.update(buffer);
  const digest = hmac.digest();

  // Dynamic truncation
  const offset = digest[digest.length - 1] & 0xf;
  const binary = (
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff)
  );

  // Generate 6-digit code
  const otp = binary % Math.pow(10, TOTP_DIGITS);
  return otp.toString().padStart(TOTP_DIGITS, '0');
}

/**
 * Timing-safe string comparison
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Base32 encoding/decoding (RFC 4648)
 */
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer: Buffer): string {
  let result = '';
  let bits = 0;
  let value = 0;

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      result += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    result += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return result;
}

function base32Decode(encoded: string): Buffer {
  const cleanEncoded = encoded.toUpperCase().replace(/[^A-Z2-7]/g, '');
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;

  for (const char of cleanEncoded) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) continue;

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generate QR code URL for authenticator apps
 */
export function generateTOTPUri(secret: string, email: string, issuer: string = 'DigiComply'): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedEmail = encodeURIComponent(email);
  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_STEP}`;
}

/**
 * Enable 2FA for a user
 */
export async function enable2FA(userId: number): Promise<{ secret: string; uri: string; qrCode: string }> {
  // Generate new secret
  const secret = generateSecret();

  // Get user email for the URI
  const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId));

  if (!user) {
    throw new Error('User not found');
  }

  // Store secret (not yet enabled until verified)
  await db.update(users)
    .set({ twoFactorSecret: secret })
    .where(eq(users.id, userId));

  const uri = generateTOTPUri(secret, user.email);

  // Generate QR code data URL (simple text-based for now, frontend can use QR library)
  const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(uri)}`;

  return { secret, uri, qrCode };
}

/**
 * Verify and activate 2FA
 */
export async function verify2FA(userId: number, token: string): Promise<boolean> {
  // Get user's pending secret
  const [user] = await db.select({
    twoFactorSecret: users.twoFactorSecret,
    isTwoFactorEnabled: users.isTwoFactorEnabled
  }).from(users).where(eq(users.id, userId));

  if (!user || !user.twoFactorSecret) {
    throw new Error('2FA not initiated for this user');
  }

  // Verify the token
  if (!verifyTOTP(user.twoFactorSecret, token)) {
    return false;
  }

  // Enable 2FA
  await db.update(users)
    .set({ isTwoFactorEnabled: true })
    .where(eq(users.id, userId));

  return true;
}

/**
 * Disable 2FA for a user
 */
export async function disable2FA(userId: number): Promise<void> {
  await db.update(users)
    .set({
      twoFactorSecret: null,
      isTwoFactorEnabled: false
    })
    .where(eq(users.id, userId));
}

/**
 * Check if user has 2FA enabled
 */
export async function is2FAEnabled(userId: number): Promise<boolean> {
  const [user] = await db.select({
    isTwoFactorEnabled: users.isTwoFactorEnabled
  }).from(users).where(eq(users.id, userId));

  return user?.isTwoFactorEnabled ?? false;
}

/**
 * Validate 2FA token for login
 */
export async function validate2FALogin(userId: number, token: string): Promise<boolean> {
  const [user] = await db.select({
    twoFactorSecret: users.twoFactorSecret,
    isTwoFactorEnabled: users.isTwoFactorEnabled
  }).from(users).where(eq(users.id, userId));

  if (!user || !user.isTwoFactorEnabled || !user.twoFactorSecret) {
    return true; // 2FA not enabled, allow login
  }

  return verifyTOTP(user.twoFactorSecret, token);
}

console.log('✅ Two-Factor Authentication service initialized');
