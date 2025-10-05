import _sodium from 'libsodium-wrappers';

// Encryption key from environment (must be 32 bytes base64)
const ENCRYPTION_KEY_BASE64 = process.env.CREDENTIAL_ENCRYPTION_KEY || '';

let encryptionKey: Uint8Array | null = null;

// Initialize encryption
export async function initializeEncryption(): Promise<void> {
  await _sodium.ready;
  
  if (!ENCRYPTION_KEY_BASE64) {
    console.warn('⚠️  CREDENTIAL_ENCRYPTION_KEY not set - using development key');
    // Generate a random key for development (NOT production!)
    encryptionKey = _sodium.crypto_secretbox_keygen();
    console.warn('⚠️  Development encryption key generated - DO NOT USE IN PRODUCTION');
  } else {
    // Decode base64 key from environment
    encryptionKey = _sodium.from_base64(ENCRYPTION_KEY_BASE64, _sodium.base64_variants.ORIGINAL);
  }
}

// Encrypt a string value
export async function encryptCredential(plaintext: string): Promise<string> {
  if (!encryptionKey) {
    await initializeEncryption();
  }
  
  await _sodium.ready;
  
  const nonce = _sodium.randombytes_buf(_sodium.crypto_secretbox_NONCEBYTES);
  const encrypted = _sodium.crypto_secretbox_easy(plaintext, nonce, encryptionKey!);
  
  // Combine nonce + ciphertext and encode as base64
  const combined = new Uint8Array(nonce.length + encrypted.length);
  combined.set(nonce);
  combined.set(encrypted, nonce.length);
  
  return _sodium.to_base64(combined, _sodium.base64_variants.ORIGINAL);
}

// Decrypt a string value
export async function decryptCredential(ciphertext: string): Promise<string> {
  if (!encryptionKey) {
    await initializeEncryption();
  }
  
  await _sodium.ready;
  
  const combined = _sodium.from_base64(ciphertext, _sodium.base64_variants.ORIGINAL);
  
  const nonce = combined.slice(0, _sodium.crypto_secretbox_NONCEBYTES);
  const encrypted = combined.slice(_sodium.crypto_secretbox_NONCEBYTES);
  
  const decrypted = _sodium.crypto_secretbox_open_easy(encrypted, nonce, encryptionKey!);
  
  return _sodium.to_string(decrypted);
}

// Generate a new encryption key (for setup)
export async function generateEncryptionKey(): Promise<string> {
  await _sodium.ready;
  const key = _sodium.crypto_secretbox_keygen();
  return _sodium.to_base64(key, _sodium.base64_variants.ORIGINAL);
}
