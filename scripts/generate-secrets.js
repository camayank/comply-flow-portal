#!/usr/bin/env node
/**
 * Secure Secrets Generator
 *
 * Generates cryptographically secure secrets for production deployment.
 * Run this script to generate new secrets for your .env file.
 *
 * Usage: node scripts/generate-secrets.js
 */

const crypto = require('crypto');

function generateSecret(length = 32) {
  return crypto.randomBytes(length).toString('base64');
}

function generateHexSecret(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

console.log('\n🔐 COMPLY FLOW PORTAL - Secure Secrets Generator\n');
console.log('='.repeat(60));
console.log('\nCopy these values to your .env file:\n');
console.log('# JWT Authentication');
console.log(`JWT_SECRET=${generateSecret(48)}`);
console.log(`JWT_REFRESH_SECRET=${generateSecret(48)}`);
console.log('');
console.log('# Session Management');
console.log(`SESSION_SECRET=${generateSecret(48)}`);
console.log('');
console.log('# Encryption (32 bytes for AES-256)');
console.log(`ENCRYPTION_KEY=${generateHexSecret(32)}`);
console.log('');
console.log('='.repeat(60));
console.log('\n⚠️  IMPORTANT SECURITY NOTES:');
console.log('   1. Never commit these secrets to version control');
console.log('   2. Use different secrets for each environment');
console.log('   3. Rotate secrets periodically');
console.log('   4. Store production secrets in a secure vault\n');
