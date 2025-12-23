import { Storage } from '@google-cloud/storage';
import multer from 'multer';
import { nanoid } from 'nanoid';
import path from 'path';
import fs from 'fs/promises';
import type { Request } from 'express';

const BUCKET_ID = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
const PRIVATE_DIR = process.env.PRIVATE_OBJECT_DIR || '/.private';
const PUBLIC_DIR = '/public';
const LOCAL_STORAGE_PATH = process.env.LOCAL_STORAGE_PATH || './uploads';

// Check if GCS is configured
const isGCSConfigured = !!BUCKET_ID && !!process.env.GOOGLE_APPLICATION_CREDENTIALS;

let storage: Storage | null = null;
let bucket: any = null;

if (isGCSConfigured) {
  try {
    storage = new Storage();
    bucket = storage.bucket(BUCKET_ID!);
    console.log('✅ Google Cloud Storage configured');
  } catch (error) {
    console.warn('⚠️  GCS initialization failed, falling back to local storage:', error);
  }
} else {
  console.log('ℹ️  Google Cloud Storage not configured - using local file storage');
  console.log('   Set DEFAULT_OBJECT_STORAGE_BUCKET_ID and GOOGLE_APPLICATION_CREDENTIALS for production');
}

// Allowed file types with their MIME types
export const ALLOWED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'text/csv': ['.csv']
};

// File size limits (in bytes)
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

// File upload validation
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = Object.keys(ALLOWED_FILE_TYPES);
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${Object.values(ALLOWED_FILE_TYPES).flat().join(', ')}`));
  }
};

// Multer memory storage configuration
export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 5 // Maximum 5 files per request
  }
});

/**
 * Upload file to storage (Google Cloud Storage or local filesystem)
 * @param file - Multer file object
 * @param isPublic - Whether file should be publicly accessible
 * @param folder - Optional subfolder path
 * @returns Object containing file URL and metadata
 */
export async function uploadToStorage(
  file: Express.Multer.File,
  isPublic: boolean = false,
  folder?: string
): Promise<{
  url: string;
  path: string;
  filename: string;
  size: number;
  mimetype: string;
}> {
  // Generate unique filename
  const fileId = nanoid(12);
  const ext = path.extname(file.originalname);
  const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filename = `${fileId}_${safeName}`;

  // Construct storage path
  const baseDir = isPublic ? PUBLIC_DIR : PRIVATE_DIR;
  const filePath = folder ? `${baseDir}/${folder}/${filename}` : `${baseDir}/${filename}`;

  // Use GCS if configured, otherwise use local storage
  if (isGCSConfigured && bucket) {
    return uploadToGCS(file, filename, filePath, isPublic);
  } else {
    return uploadToLocal(file, filename, filePath, isPublic);
  }
}

/**
 * Upload file to Google Cloud Storage
 */
async function uploadToGCS(
  file: Express.Multer.File,
  filename: string,
  filePath: string,
  isPublic: boolean
): Promise<{
  url: string;
  path: string;
  filename: string;
  size: number;
  mimetype: string;
}> {
  const blob = bucket.file(filePath);
  const blobStream = blob.createWriteStream({
    resumable: false,
    metadata: {
      contentType: file.mimetype,
      metadata: {
        originalName: file.originalname,
        uploadedAt: new Date().toISOString()
      }
    }
  });

  return new Promise((resolve, reject) => {
    blobStream.on('error', (error) => {
      reject(new Error(`GCS upload failed: ${error.message}`));
    });

    blobStream.on('finish', async () => {
      // Make file public if requested
      if (isPublic) {
        await blob.makePublic();
      }

      // Generate signed URL for private files (valid for 1 hour)
      let url: string;
      if (isPublic) {
        url = `https://storage.googleapis.com/${BUCKET_ID}${filePath}`;
      } else {
        const [signedUrl] = await blob.getSignedUrl({
          action: 'read',
          expires: Date.now() + 60 * 60 * 1000 // 1 hour
        });
        url = signedUrl;
      }

      resolve({
        url,
        path: filePath,
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      });
    });

    blobStream.end(file.buffer);
  });
}

/**
 * Upload file to local filesystem (development/fallback)
 */
async function uploadToLocal(
  file: Express.Multer.File,
  filename: string,
  filePath: string,
  isPublic: boolean
): Promise<{
  url: string;
  path: string;
  filename: string;
  size: number;
  mimetype: string;
}> {
  try {
    // Create directory structure
    const fullPath = path.join(LOCAL_STORAGE_PATH, filePath);
    const directory = path.dirname(fullPath);

    await fs.mkdir(directory, { recursive: true });

    // Write file
    await fs.writeFile(fullPath, file.buffer);

    // Generate URL
    // For local storage, we'll serve files from /uploads endpoint
    const url = `/uploads${filePath}`;

    return {
      url,
      path: filePath,
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype
    };
  } catch (error: any) {
    throw new Error(`Local upload failed: ${error.message}`);
  }
}

/**
 * Delete file from storage (GCS or local)
 * @param filePath - Path to file in storage
 */
export async function deleteFromStorage(filePath: string): Promise<void> {
  try {
    if (isGCSConfigured && bucket) {
      await bucket.file(filePath).delete();
    } else {
      const fullPath = path.join(LOCAL_STORAGE_PATH, filePath);
      await fs.unlink(fullPath);
    }
  } catch (error: any) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}

/**
 * Get signed URL for private file access
 * @param filePath - Path to file in storage
 * @param expiresIn - Expiration time in milliseconds (default: 1 hour)
 */
export async function getSignedUrl(filePath: string, expiresIn: number = 60 * 60 * 1000): Promise<string> {
  try {
    if (isGCSConfigured && bucket) {
      const [signedUrl] = await bucket.file(filePath).getSignedUrl({
        action: 'read',
        expires: Date.now() + expiresIn
      });
      return signedUrl;
    } else {
      // For local storage, return the direct URL
      // In production, this should be protected by authentication middleware
      return `/uploads${filePath}`;
    }
  } catch (error: any) {
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }
}

/**
 * Check if file exists in storage
 * @param filePath - Path to file in storage
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const [exists] = await bucket.file(filePath).exists();
    return exists;
  } catch (error) {
    return false;
  }
}

/**
 * Get file metadata from storage
 * @param filePath - Path to file in storage
 */
export async function getFileMetadata(filePath: string): Promise<{
  name: string;
  size: number;
  contentType: string;
  created: Date;
  updated: Date;
}> {
  try {
    const [metadata] = await bucket.file(filePath).getMetadata();
    return {
      name: metadata.name || '',
      size: parseInt(String(metadata.size || '0')),
      contentType: metadata.contentType || 'application/octet-stream',
      created: new Date(metadata.timeCreated || Date.now()),
      updated: new Date(metadata.updated || Date.now())
    };
  } catch (error: any) {
    throw new Error(`Failed to get file metadata: ${error.message}`);
  }
}

/**
 * Validate file size based on type
 * @param file - Multer file object
 */
export function validateFileSize(file: Express.Multer.File): { valid: boolean; error?: string } {
  const isImage = file.mimetype.startsWith('image/');
  const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
  
  if (file.size > maxSize) {
    const maxMB = Math.round(maxSize / 1024 / 1024);
    return {
      valid: false,
      error: `File size exceeds ${maxMB}MB limit for ${isImage ? 'images' : 'documents'}`
    };
  }
  
  return { valid: true };
}

/**
 * Sanitize filename for safe storage
 * @param filename - Original filename
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
}
