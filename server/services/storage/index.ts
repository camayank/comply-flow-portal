/**
 * Storage Service
 *
 * Unified file storage with support for local, GCS, and S3
 */

import { db } from '../../db';
import { eq } from 'drizzle-orm';
import { documents, NewDocument } from '../../db/schema/agent-kyc';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';

// ============================================
// TYPES
// ============================================
export interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface UploadOptions {
  category: string;
  subcategory?: string;
  entityType?: string;
  entityId?: number;
  userId: number;
  isPublic?: boolean;
}

export interface StoredFile {
  id: number;
  fileName: string;
  storagePath: string;
  storageProvider: string;
  fileSize: number;
  mimeType: string;
  checksum: string;
}

// ============================================
// STORAGE PROVIDER INTERFACE
// ============================================
interface IStorageProvider {
  name: string;
  upload(buffer: Buffer, path: string, options: { contentType: string; metadata?: Record<string, string> }): Promise<{ path: string; url?: string }>;
  getSignedUrl(path: string, expiresInMinutes: number): Promise<string>;
  delete(path: string): Promise<void>;
}

// ============================================
// LOCAL STORAGE PROVIDER
// ============================================
class LocalStorageProvider implements IStorageProvider {
  name = 'local';
  private basePath: string;

  constructor(basePath: string = './uploads') {
    this.basePath = basePath;
    this.ensureDirectory();
  }

  private async ensureDirectory() {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
    } catch (error) {
      console.error('Failed to create uploads directory:', error);
    }
  }

  async upload(buffer: Buffer, filePath: string, options: { contentType: string }): Promise<{ path: string }> {
    const fullPath = path.join(this.basePath, filePath);
    const directory = path.dirname(fullPath);

    // Ensure directory exists
    await fs.mkdir(directory, { recursive: true });

    // Write file
    await fs.writeFile(fullPath, buffer);

    return { path: filePath };
  }

  async getSignedUrl(filePath: string, expiresInMinutes: number): Promise<string> {
    // For local storage, return a direct path
    // In production, you'd want a signed URL mechanism
    const baseUrl = process.env.APP_URL || 'http://localhost:5000';
    return `${baseUrl}/uploads/${filePath}`;
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = path.join(this.basePath, filePath);
    try {
      await fs.unlink(fullPath);
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  }
}

// ============================================
// GCS STORAGE PROVIDER
// ============================================
class GCSStorageProvider implements IStorageProvider {
  name = 'gcs';
  private storage: any;
  private bucket: any;
  private bucketName: string;

  constructor(options: { bucketId: string; credentials?: any }) {
    this.bucketName = options.bucketId;
    this.initializeGCS(options.credentials);
  }

  private async initializeGCS(credentials?: any) {
    try {
      const { Storage } = await import('@google-cloud/storage');

      if (credentials) {
        this.storage = new Storage({ credentials });
      } else {
        this.storage = new Storage();
      }

      this.bucket = this.storage.bucket(this.bucketName);
      console.log('✅ GCS storage initialized');
    } catch (error) {
      console.error('Failed to initialize GCS:', error);
      throw error;
    }
  }

  async upload(buffer: Buffer, filePath: string, options: { contentType: string; metadata?: Record<string, string> }): Promise<{ path: string; url: string }> {
    const file = this.bucket.file(filePath);

    await file.save(buffer, {
      contentType: options.contentType,
      metadata: {
        metadata: options.metadata,
      },
    });

    return {
      path: filePath,
      url: `https://storage.googleapis.com/${this.bucketName}/${filePath}`,
    };
  }

  async getSignedUrl(filePath: string, expiresInMinutes: number): Promise<string> {
    const file = this.bucket.file(filePath);

    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + expiresInMinutes * 60 * 1000,
    });

    return url;
  }

  async delete(filePath: string): Promise<void> {
    const file = this.bucket.file(filePath);
    await file.delete();
  }
}

// ============================================
// STORAGE SERVICE
// ============================================
class StorageService {
  private provider: IStorageProvider;

  constructor() {
    this.provider = this.initializeProvider();
  }

  private initializeProvider(): IStorageProvider {
    const providerType = process.env.STORAGE_PROVIDER || 'local';

    switch (providerType) {
      case 'gcs':
        if (!process.env.GCS_BUCKET_ID) {
          console.warn('GCS_BUCKET_ID not set, falling back to local storage');
          return new LocalStorageProvider(process.env.LOCAL_STORAGE_PATH);
        }

        let credentials: any = undefined;
        if (process.env.GCS_CREDENTIALS) {
          try {
            credentials = JSON.parse(process.env.GCS_CREDENTIALS);
          } catch (e) {
            console.error('Failed to parse GCS credentials');
          }
        }

        try {
          return new GCSStorageProvider({
            bucketId: process.env.GCS_BUCKET_ID,
            credentials,
          });
        } catch (error) {
          console.warn('Failed to initialize GCS, falling back to local storage');
          return new LocalStorageProvider(process.env.LOCAL_STORAGE_PATH);
        }

      default:
        return new LocalStorageProvider(process.env.LOCAL_STORAGE_PATH);
    }
  }

  /**
   * Upload a file
   */
  async upload(file: UploadedFile, options: UploadOptions): Promise<StoredFile> {
    // Generate checksum
    const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');

    // Generate storage path
    const extension = path.extname(file.originalname);
    const timestamp = Date.now();
    const randomId = crypto.randomBytes(8).toString('hex');
    const fileName = `${timestamp}_${randomId}${extension}`;

    const storagePath = this.generatePath(options.category, options.subcategory, fileName);

    // Upload to provider
    const result = await this.provider.upload(file.buffer, storagePath, {
      contentType: file.mimetype,
      metadata: {
        originalName: file.originalname,
        uploadedBy: options.userId.toString(),
        category: options.category,
      },
    });

    // Create database record
    const [document] = await db.insert(documents).values({
      fileName,
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      checksum,
      storagePath: result.path,
      storageProvider: this.provider.name,
      category: options.category,
      subcategory: options.subcategory,
      entityType: options.entityType,
      entityId: options.entityId,
      uploadedBy: options.userId,
      isPublic: options.isPublic || false,
    }).returning();

    return {
      id: document.id,
      fileName: document.fileName,
      storagePath: document.storagePath,
      storageProvider: document.storageProvider,
      fileSize: document.fileSize!,
      mimeType: document.mimeType!,
      checksum: document.checksum!,
    };
  }

  /**
   * Get signed URL for a document
   */
  async getSignedUrl(documentId: number, expiresInMinutes: number = 60): Promise<string> {
    const doc = await db.query.documents.findFirst({
      where: eq(documents.id, documentId),
    });

    if (!doc) {
      throw new Error('Document not found');
    }

    if (doc.isDeleted) {
      throw new Error('Document has been deleted');
    }

    return this.provider.getSignedUrl(doc.storagePath, expiresInMinutes);
  }

  /**
   * Delete a document
   */
  async delete(documentId: number, userId: number): Promise<void> {
    const doc = await db.query.documents.findFirst({
      where: eq(documents.id, documentId),
    });

    if (!doc) {
      throw new Error('Document not found');
    }

    // Soft delete in database
    await db.update(documents)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: userId,
      })
      .where(eq(documents.id, documentId));

    // Optionally delete from storage (uncomment for hard delete)
    // await this.provider.delete(doc.storagePath);
  }

  /**
   * Get document metadata
   */
  async getDocument(documentId: number) {
    const doc = await db.query.documents.findFirst({
      where: eq(documents.id, documentId),
    });

    if (!doc || doc.isDeleted) {
      return null;
    }

    return doc;
  }

  /**
   * Generate storage path
   */
  private generatePath(category: string, subcategory?: string, fileName: string = ''): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    const parts = [category];
    if (subcategory) parts.push(subcategory);
    parts.push(String(year), month, fileName);

    return parts.join('/');
  }

  /**
   * Validate file type
   */
  validateFileType(mimeType: string, allowedTypes: string[]): boolean {
    return allowedTypes.includes(mimeType);
  }

  /**
   * Validate file size
   */
  validateFileSize(size: number, maxSizeBytes: number): boolean {
    return size <= maxSizeBytes;
  }
}

// Export singleton instance
export const storageService = new StorageService();
