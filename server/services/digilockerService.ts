/**
 * DigiLocker Integration Service
 *
 * Foundation for integrating with India's official DigiLocker platform
 * https://digilocker.gov.in/
 *
 * Features:
 * - OAuth 2.0 authentication with DigiLocker
 * - Fetch documents (Aadhaar, PAN, DL, etc.)
 * - Pull verified documents (e-documents from issuers)
 * - Upload documents to DigiLocker
 * - Document verification
 *
 * Note: Production use requires:
 * 1. Registration as DigiLocker partner
 * 2. API credentials from DigiLocker
 * 3. Security audit compliance
 */

import { createHash, createHmac, randomBytes } from 'crypto';

// DigiLocker API Configuration
const DIGILOCKER_CONFIG = {
  baseUrl: process.env.DIGILOCKER_API_URL || 'https://api.digitallocker.gov.in',
  sandboxUrl: 'https://apisetu.gov.in/sandbox/digilocker',
  clientId: process.env.DIGILOCKER_CLIENT_ID || '',
  clientSecret: process.env.DIGILOCKER_CLIENT_SECRET || '',
  redirectUri: process.env.DIGILOCKER_REDIRECT_URI || 'https://app.digicomply.in/auth/digilocker/callback',
  scope: 'openid,aadhaar,doc.pan,doc.cld,doc.gst' // Various document scopes
};

// Supported document types from DigiLocker
export const DIGILOCKER_DOCUMENT_TYPES = {
  // Identity Documents
  AADHAAR: { code: 'ADHAR', issuer: 'UIDAI', name: 'Aadhaar Card', category: 'identity' },
  PAN: { code: 'PANCR', issuer: 'CBDT', name: 'PAN Card', category: 'identity' },
  DRIVING_LICENSE: { code: 'DRVLC', issuer: 'RTO', name: 'Driving License', category: 'identity' },
  VOTER_ID: { code: 'VOTERID', issuer: 'ECI', name: 'Voter ID', category: 'identity' },
  PASSPORT: { code: 'PASS', issuer: 'MEA', name: 'Passport', category: 'identity' },

  // Business Documents
  GST_CERTIFICATE: { code: 'GSTCR', issuer: 'GSTN', name: 'GST Certificate', category: 'business' },
  INCORPORATION_CERTIFICATE: { code: 'COICR', issuer: 'MCA', name: 'Certificate of Incorporation', category: 'business' },
  UDYAM_CERTIFICATE: { code: 'UDYAM', issuer: 'MSME', name: 'Udyam Registration', category: 'business' },
  SHOP_ACT: { code: 'SHOPL', issuer: 'STATE', name: 'Shop & Establishment License', category: 'business' },

  // Education Documents
  CBSE_MARKSHEET: { code: 'CBSEM', issuer: 'CBSE', name: 'CBSE Marksheet', category: 'education' },
  DEGREE_CERTIFICATE: { code: 'DEGCR', issuer: 'UGC', name: 'Degree Certificate', category: 'education' },

  // Other Documents
  INSURANCE_POLICY: { code: 'INSURP', issuer: 'IRDAI', name: 'Insurance Policy', category: 'other' },
  VEHICLE_RC: { code: 'VRCRT', issuer: 'RTO', name: 'Vehicle Registration', category: 'other' }
};

// OAuth State storage (in production, use Redis or database)
const oauthStates = new Map<string, { userId: number; entityId?: number; createdAt: Date; redirectUrl?: string }>();

// Token storage (in production, encrypt and store in database)
const userTokens = new Map<number, DigiLockerToken>();

interface DigiLockerToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
  digilockerUserId: string;
}

interface DigiLockerDocument {
  uri: string;
  docType: string;
  issuer: string;
  issuedOn: Date;
  validTill?: Date;
  description: string;
  size: number;
  mimeType: string;
}

/**
 * Generate OAuth authorization URL
 */
export function generateAuthUrl(userId: number, entityId?: number, redirectUrl?: string): string {
  const state = randomBytes(16).toString('hex');

  // Store state for verification
  oauthStates.set(state, {
    userId,
    entityId,
    createdAt: new Date(),
    redirectUrl
  });

  // Clean up old states (older than 10 minutes)
  const now = Date.now();
  for (const [key, value] of oauthStates.entries()) {
    if (now - value.createdAt.getTime() > 10 * 60 * 1000) {
      oauthStates.delete(key);
    }
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: DIGILOCKER_CONFIG.clientId,
    redirect_uri: DIGILOCKER_CONFIG.redirectUri,
    state,
    scope: DIGILOCKER_CONFIG.scope,
    code_challenge_method: 'S256',
    code_challenge: generateCodeChallenge(state)
  });

  return `${DIGILOCKER_CONFIG.baseUrl}/public/oauth2/1/authorize?${params.toString()}`;
}

/**
 * Generate PKCE code challenge
 */
function generateCodeChallenge(state: string): string {
  return createHash('sha256').update(state).digest('base64url');
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForToken(
  code: string,
  state: string
): Promise<{ success: boolean; userId?: number; error?: string }> {
  const stateData = oauthStates.get(state);

  if (!stateData) {
    return { success: false, error: 'Invalid or expired state' };
  }

  try {
    // In production, make actual API call to DigiLocker
    // For now, simulate the token exchange
    if (!DIGILOCKER_CONFIG.clientId) {
      console.log('[DigiLocker] Simulating token exchange (no credentials configured)');

      // Store simulated token
      const simulatedToken: DigiLockerToken = {
        accessToken: `dl_sim_${randomBytes(32).toString('hex')}`,
        refreshToken: `dl_ref_${randomBytes(32).toString('hex')}`,
        expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
        scope: DIGILOCKER_CONFIG.scope,
        digilockerUserId: `DL_${stateData.userId}`
      };

      userTokens.set(stateData.userId, simulatedToken);
      oauthStates.delete(state);

      return { success: true, userId: stateData.userId };
    }

    // Real API call would be here
    const response = await fetch(`${DIGILOCKER_CONFIG.baseUrl}/public/oauth2/1/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: DIGILOCKER_CONFIG.redirectUri,
        client_id: DIGILOCKER_CONFIG.clientId,
        client_secret: DIGILOCKER_CONFIG.clientSecret,
        code_verifier: state
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[DigiLocker] Token exchange failed:', error);
      return { success: false, error: 'Token exchange failed' };
    }

    const tokenData = await response.json();

    const token: DigiLockerToken = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      scope: tokenData.scope,
      digilockerUserId: tokenData.digilocker_id
    };

    userTokens.set(stateData.userId, token);
    oauthStates.delete(state);

    return { success: true, userId: stateData.userId };

  } catch (error: any) {
    console.error('[DigiLocker] Token exchange error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if user has valid DigiLocker connection
 */
export function isConnected(userId: number): boolean {
  const token = userTokens.get(userId);
  if (!token) return false;
  return token.expiresAt > new Date();
}

/**
 * Get user's documents from DigiLocker
 */
export async function getDocuments(userId: number): Promise<{
  success: boolean;
  documents?: DigiLockerDocument[];
  error?: string;
}> {
  const token = userTokens.get(userId);

  if (!token || token.expiresAt < new Date()) {
    return { success: false, error: 'Not connected to DigiLocker' };
  }

  try {
    // In production, make actual API call
    if (!DIGILOCKER_CONFIG.clientId) {
      // Return simulated documents
      return {
        success: true,
        documents: [
          {
            uri: 'in.gov.uidai-ADHAR-123456789012',
            docType: 'ADHAR',
            issuer: 'UIDAI',
            issuedOn: new Date('2020-01-15'),
            description: 'Aadhaar Card',
            size: 125000,
            mimeType: 'application/pdf'
          },
          {
            uri: 'in.gov.cbdt-PANCR-ABCDE1234F',
            docType: 'PANCR',
            issuer: 'CBDT',
            issuedOn: new Date('2019-06-20'),
            description: 'PAN Card',
            size: 85000,
            mimeType: 'application/pdf'
          }
        ]
      };
    }

    const response = await fetch(`${DIGILOCKER_CONFIG.baseUrl}/public/oauth2/2/files/issued`, {
      headers: {
        'Authorization': `Bearer ${token.accessToken}`
      }
    });

    if (!response.ok) {
      return { success: false, error: 'Failed to fetch documents' };
    }

    const data = await response.json();
    return { success: true, documents: data.items };

  } catch (error: any) {
    console.error('[DigiLocker] Get documents error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch specific document from DigiLocker
 */
export async function fetchDocument(
  userId: number,
  documentUri: string
): Promise<{ success: boolean; content?: Buffer; mimeType?: string; error?: string }> {
  const token = userTokens.get(userId);

  if (!token || token.expiresAt < new Date()) {
    return { success: false, error: 'Not connected to DigiLocker' };
  }

  try {
    // In production, fetch actual document
    if (!DIGILOCKER_CONFIG.clientId) {
      console.log('[DigiLocker] Simulating document fetch:', documentUri);
      return {
        success: true,
        content: Buffer.from('Simulated document content'),
        mimeType: 'application/pdf'
      };
    }

    const response = await fetch(`${DIGILOCKER_CONFIG.baseUrl}/public/oauth2/2/file/${encodeURIComponent(documentUri)}`, {
      headers: {
        'Authorization': `Bearer ${token.accessToken}`
      }
    });

    if (!response.ok) {
      return { success: false, error: 'Failed to fetch document' };
    }

    const content = Buffer.from(await response.arrayBuffer());
    const mimeType = response.headers.get('content-type') || 'application/pdf';

    return { success: true, content, mimeType };

  } catch (error: any) {
    console.error('[DigiLocker] Fetch document error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Verify document authenticity using DigiLocker
 */
export async function verifyDocument(
  docType: string,
  docNumber: string,
  additionalParams?: Record<string, string>
): Promise<{
  success: boolean;
  isValid?: boolean;
  documentData?: Record<string, any>;
  error?: string;
}> {
  try {
    // In production, use DigiLocker's verification API
    if (!DIGILOCKER_CONFIG.clientId) {
      console.log('[DigiLocker] Simulating verification for:', docType, docNumber);

      // Simulate verification
      return {
        success: true,
        isValid: true,
        documentData: {
          docType,
          docNumber,
          verifiedAt: new Date().toISOString(),
          status: 'VALID',
          name: 'Verified User',
          note: 'Simulated verification - configure DigiLocker credentials for actual verification'
        }
      };
    }

    // Real verification API call would go here
    const hmac = createHmac('sha256', DIGILOCKER_CONFIG.clientSecret);
    hmac.update(`${docType}|${docNumber}|${Date.now()}`);
    const signature = hmac.digest('hex');

    const response = await fetch(`${DIGILOCKER_CONFIG.baseUrl}/public/oauth2/1/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-DigiLocker-ClientId': DIGILOCKER_CONFIG.clientId,
        'X-DigiLocker-Signature': signature
      },
      body: JSON.stringify({
        doctype: docType,
        docno: docNumber,
        ...additionalParams
      })
    });

    if (!response.ok) {
      return { success: false, error: 'Verification failed' };
    }

    const result = await response.json();
    return {
      success: true,
      isValid: result.status === 'VALID',
      documentData: result
    };

  } catch (error: any) {
    console.error('[DigiLocker] Verification error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Disconnect DigiLocker for a user
 */
export function disconnect(userId: number): boolean {
  return userTokens.delete(userId);
}

/**
 * Get connection status
 */
export function getConnectionStatus(userId: number): {
  connected: boolean;
  expiresAt?: Date;
  scope?: string;
} {
  const token = userTokens.get(userId);

  if (!token) {
    return { connected: false };
  }

  if (token.expiresAt < new Date()) {
    return { connected: false };
  }

  return {
    connected: true,
    expiresAt: token.expiresAt,
    scope: token.scope
  };
}

/**
 * Check if DigiLocker integration is configured
 */
export function isConfigured(): boolean {
  return !!(DIGILOCKER_CONFIG.clientId && DIGILOCKER_CONFIG.clientSecret);
}

/**
 * Get integration status
 */
export function getIntegrationStatus(): {
  configured: boolean;
  mode: 'production' | 'sandbox' | 'simulation';
  supportedDocuments: typeof DIGILOCKER_DOCUMENT_TYPES;
} {
  return {
    configured: isConfigured(),
    mode: isConfigured() ? 'production' : 'simulation',
    supportedDocuments: DIGILOCKER_DOCUMENT_TYPES
  };
}
