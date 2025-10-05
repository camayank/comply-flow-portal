# Integration System Security Enhancement Required

## ⚠️ CRITICAL: Credential Encryption for Production

### Current State
The integration system currently stores API credentials in **plaintext** in the database:
- GSP credentials (GSTIN, username, password)
- ERI credentials (PAN, password)
- MCA21 credentials (CIN, DIN, password)
- Google Sheets service account private keys

### Required for Production Deployment

**Before going to production, implement one of these encryption strategies:**

#### Option 1: Field-Level Encryption (Recommended)
```typescript
// Install crypto library
npm install @node-rs/bcrypt libsodium-wrappers

// Encrypt before storing
import sodium from 'libsodium-wrappers';

async function encryptCredential(plaintext: string, masterKey: Buffer): Promise<string> {
  await sodium.ready;
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const encrypted = sodium.crypto_secretbox_easy(plaintext, nonce, masterKey);
  return Buffer.concat([nonce, encrypted]).toString('base64');
}

async function decryptCredential(ciphertext: string, masterKey: Buffer): Promise<string> {
  await sodium.ready;
  const decoded = Buffer.from(ciphertext, 'base64');
  const nonce = decoded.slice(0, sodium.crypto_secretbox_NONCEBYTES);
  const encrypted = decoded.slice(sodium.crypto_secretbox_NONCEBYTES);
  return sodium.crypto_secretbox_open_easy(encrypted, nonce, masterKey, 'text');
}
```

#### Option 2: Use External Secrets Manager
- **AWS Secrets Manager**: Store credentials in AWS, reference by ARN
- **Google Cloud Secret Manager**: Store in GCP, fetch at runtime
- **HashiCorp Vault**: Self-hosted secrets management

#### Option 3: Environment-Based Encryption
```typescript
// Use KMS (Key Management Service) for encryption keys
// Store encryption key in environment variable (not in code)
const MASTER_KEY = process.env.CREDENTIAL_ENCRYPTION_KEY;

// Encrypt on write, decrypt on read
```

### Implementation Checklist
- [ ] Choose encryption strategy (Field-level, KMS, or Secrets Manager)
- [ ] Install required dependencies
- [ ] Create encryption/decryption utility functions
- [ ] Update integrationHub.storeCredentials() to encrypt before saving
- [ ] Update integrationHub.getCredentials() to decrypt after fetching
- [ ] Rotate existing plaintext credentials and re-encrypt
- [ ] Add encryption key rotation policy
- [ ] Document key management procedures
- [ ] Add to security audit checklist

### Current Risk Level: HIGH
**Risk**: Unauthorized database access exposes all client API credentials  
**Impact**: Complete compromise of client government portal accounts  
**Mitigation**: Implement encryption before production deployment
