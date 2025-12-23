const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sharp = require('sharp');
const AWS = require('aws-sdk');
const { body, param, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const db = require('../database/connection');
const logger = require('../utils/logger');
const { sessionAuthMiddleware, requirePermission } = require('../middleware/sessionAuth');

const router = express.Router();

// Configure AWS S3 if using cloud storage
let s3 = null;
if (process.env.STORAGE_PROVIDER === 's3' && process.env.AWS_ACCESS_KEY_ID) {
  AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'ap-south-1'
  });
  s3 = new AWS.S3();
  logger.info('S3 storage configured', { 
    region: process.env.AWS_REGION,
    bucket: process.env.S3_BUCKET_NAME
  });
}

// File upload rate limiting
const fileUploadLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 file uploads per windowMs
  message: {
    success: false,
    error: 'Too many file uploads. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Ensure uploads directory exists for local storage
const uploadsDir = path.join(__dirname, '../../uploads');
if (process.env.STORAGE_PROVIDER !== 's3' && !fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  logger.info('Created uploads directory', { path: uploadsDir });
}

// File type and size validation
const allowedFileTypes = (process.env.ALLOWED_FILE_TYPES || 'pdf,doc,docx,jpg,jpeg,png,xls,xlsx,zip')
  .split(',')
  .map(type => type.trim().toLowerCase());

const maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB default

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(file.originalname).toLowerCase();
    const filename = `${timestamp}-${randomString}${extension}`;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase().substring(1);
  
  if (!allowedFileTypes.includes(extension)) {
    const error = new Error(`File type .${extension} is not allowed`);
    error.code = 'INVALID_FILE_TYPE';
    return cb(error, false);
  }
  
  // Additional MIME type validation
  const allowedMimeTypes = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    zip: 'application/zip'
  };
  
  const expectedMimeType = allowedMimeTypes[extension];
  if (expectedMimeType && file.mimetype !== expectedMimeType) {
    const error = new Error(`Invalid MIME type for .${extension} file`);
    error.code = 'INVALID_MIME_TYPE';
    return cb(error, false);
  }
  
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxFileSize,
    files: 5 // Maximum 5 files per request
  }
});

// Apply authentication to all file routes
router.use(sessionAuthMiddleware);

// Helper function to calculate file hash
const calculateFileHash = (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', data => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
};

// Helper function to upload to S3
const uploadToS3 = (filePath, key, contentType) => {
  return new Promise((resolve, reject) => {
    if (!s3) {
      return reject(new Error('S3 not configured'));
    }
    
    const fileStream = fs.createReadStream(filePath);
    
    const uploadParams = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: fileStream,
      ContentType: contentType,
      ServerSideEncryption: 'AES256'
    };
    
    s3.upload(uploadParams, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

// Helper function to generate thumbnail for images
const generateThumbnail = async (filePath, outputPath) => {
  try {
    await sharp(filePath)
      .resize(200, 200, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80 })
      .toFile(outputPath);
    
    return true;
  } catch (error) {
    logger.warn('Thumbnail generation failed', {
      error: error.message,
      filePath
    });
    return false;
  }
};

// Upload files
router.post('/upload', fileUploadLimit, requirePermission(['documents:create']), (req, res) => {
  upload.array('files', 5)(req, res, async (err) => {
    try {
      if (err instanceof multer.MulterError) {
        let errorMessage = 'File upload error';
        
        if (err.code === 'LIMIT_FILE_SIZE') {
          errorMessage = `File size too large. Maximum allowed: ${Math.round(maxFileSize / 1024 / 1024)}MB`;
        } else if (err.code === 'LIMIT_FILE_COUNT') {
          errorMessage = 'Too many files. Maximum 5 files per upload.';
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          errorMessage = 'Unexpected file field name.';
        }
        
        return res.status(400).json({
          success: false,
          error: errorMessage
        });
      }
      
      if (err) {
        if (err.code === 'INVALID_FILE_TYPE' || err.code === 'INVALID_MIME_TYPE') {
          return res.status(400).json({
            success: false,
            error: err.message
          });
        }
        
        throw err;
      }
      
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No files were uploaded'
        });
      }
      
      const { serviceRequestId, documentType = 'support' } = req.body;
      
      // Validate service request ownership if provided
      if (serviceRequestId) {
        const serviceRequest = await db('service_requests')
          .where('id', serviceRequestId)
          .first();
        
        if (!serviceRequest) {
          // Clean up uploaded files
          req.files.forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
          
          return res.status(404).json({
            success: false,
            error: 'Service request not found'
          });
        }
        
        // Check if user has permission to upload to this service request
        const canUpload = req.user.role_name === 'super_admin' ||
                         req.user.role_name === 'admin' ||
                         serviceRequest.assigned_to === req.user.id ||
                         serviceRequest.client_email === req.user.email;
        
        if (!canUpload) {
          // Clean up uploaded files
          req.files.forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
          
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to upload files for this service request'
          });
        }
      }
      
      const uploadedFiles = [];
      
      for (const file of req.files) {
        try {
          // Calculate file hash
          const fileHash = await calculateFileHash(file.path);
          
          // Check for duplicate files
          const existingFile = await db('service_documents')
            .where('file_hash', fileHash)
            .first();
          
          if (existingFile && serviceRequestId) {
            // File already exists, clean up and skip
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
            
            uploadedFiles.push({
              id: existingFile.id,
              originalName: existingFile.original_name,
              size: existingFile.file_size,
              type: existingFile.mime_type,
              duplicate: true
            });
            continue;
          }
          
          let finalPath = file.path;
          let publicUrl = null;
          
          // Upload to S3 if configured
          if (s3) {
            const s3Key = `documents/${Date.now()}-${path.basename(file.path)}`;
            
            try {
              const s3Result = await uploadToS3(file.path, s3Key, file.mimetype);
              publicUrl = s3Result.Location;
              finalPath = s3Key;
              
              // Clean up local file after S3 upload
              if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
              }
            } catch (s3Error) {
              logger.error('S3 upload failed', {
                error: s3Error.message,
                file: file.originalname,
                userId: req.user.id
              });
              
              // Fall back to local storage
              publicUrl = null;
            }
          }
          
          // Generate thumbnail for images
          let thumbnailPath = null;
          if (['image/jpeg', 'image/png', 'image/jpg'].includes(file.mimetype)) {
            const thumbnailFilename = `thumb_${path.basename(file.path, path.extname(file.path))}.jpg`;
            const thumbnailFullPath = path.join(uploadsDir, thumbnailFilename);
            
            const thumbnailGenerated = await generateThumbnail(
              s3 ? file.path : finalPath,
              thumbnailFullPath
            );
            
            if (thumbnailGenerated) {
              if (s3) {
                // Upload thumbnail to S3
                const thumbS3Key = `thumbnails/${thumbnailFilename}`;
                try {
                  await uploadToS3(thumbnailFullPath, thumbS3Key, 'image/jpeg');
                  thumbnailPath = thumbS3Key;
                  
                  // Clean up local thumbnail
                  if (fs.existsSync(thumbnailFullPath)) {
                    fs.unlinkSync(thumbnailFullPath);
                  }
                } catch (thumbError) {
                  logger.warn('Thumbnail S3 upload failed', {
                    error: thumbError.message,
                    file: file.originalname
                  });
                }
              } else {
                thumbnailPath = thumbnailFilename;
              }
            }
          }
          
          // Save file record to database
          const [fileId] = await db('service_documents').insert({
            service_request_id: serviceRequestId || null,
            document_type: documentType,
            original_name: file.originalname,
            stored_name: path.basename(finalPath),
            file_path: finalPath,
            mime_type: file.mimetype,
            file_size: file.size,
            file_hash: fileHash,
            is_required: false,
            is_client_visible: true,
            uploaded_by: req.user.id,
            metadata: JSON.stringify({
              upload_ip: req.ip,
              user_agent: req.headers['user-agent'],
              storage_provider: s3 ? 's3' : 'local',
              public_url: publicUrl,
              thumbnail_path: thumbnailPath
            })
          }).returning('id');
          
          const newFileId = fileId.id || fileId;
          
          uploadedFiles.push({
            id: newFileId,
            originalName: file.originalname,
            size: file.size,
            type: file.mimetype,
            hash: fileHash,
            url: publicUrl || `/api/files/download/${newFileId}`,
            thumbnailUrl: thumbnailPath ? (s3 ? `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${thumbnailPath}` : `/api/files/thumbnail/${newFileId}`) : null
          });
          
          logger.info('File uploaded successfully', {
            fileId: newFileId,
            originalName: file.originalname,
            size: file.size,
            userId: req.user.id,
            serviceRequestId,
            storageProvider: s3 ? 's3' : 'local'
          });
          
          // Create audit log
          await db('audit_logs').insert({
            user_id: req.user.id,
            action: 'file_uploaded',
            entity_type: 'service_documents',
            entity_id: newFileId,
            new_values: JSON.stringify({
              original_name: file.originalname,
              file_size: file.size,
              document_type: documentType,
              service_request_id: serviceRequestId
            }),
            ip_address: req.ip,
            user_agent: req.headers['user-agent']
          });
          
        } catch (fileError) {
          logger.error('File processing error', {
            error: fileError.message,
            file: file.originalname,
            userId: req.user.id
          });
          
          // Clean up file on error
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          
          uploadedFiles.push({
            originalName: file.originalname,
            error: 'File processing failed',
            success: false
          });
        }
      }
      
      const successCount = uploadedFiles.filter(f => !f.error).length;
      const errorCount = uploadedFiles.filter(f => f.error).length;
      
      res.status(successCount > 0 ? 200 : 500).json({
        success: successCount > 0,
        data: {
          uploaded: uploadedFiles,
          summary: {
            total: req.files.length,
            successful: successCount,
            failed: errorCount
          }
        }
      });
      
    } catch (error) {
      logger.error('File upload error', {
        error: error.message,
        stack: error.stack,
        userId: req.user.id,
        ip: req.ip
      });
      
      // Clean up any uploaded files on error
      if (req.files) {
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'File upload failed'
      });
    }
  });
});

// Download file
router.get('/download/:fileId', [
  param('fileId').isInt({ min: 1 })
], requirePermission(['documents:read']), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file ID'
      });
    }

    const { fileId } = req.params;
    
    // Get file record
    const file = await db('service_documents')
      .leftJoin('service_requests', 'service_documents.service_request_id', 'service_requests.id')
      .select(
        'service_documents.*',
        'service_requests.client_email',
        'service_requests.assigned_to'
      )
      .where('service_documents.id', fileId)
      .first();
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    // Check access permissions
    const canAccess = req.user.role_name === 'super_admin' ||
                     req.user.role_name === 'admin' ||
                     file.uploaded_by === req.user.id ||
                     file.assigned_to === req.user.id ||
                     file.client_email === req.user.email;
    
    if (!canAccess) {
      logger.warn('Unauthorized file access attempt', {
        fileId,
        userId: req.user.id,
        fileOwner: file.uploaded_by,
        ip: req.ip
      });
      
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // Handle S3 files
    const metadata = JSON.parse(file.metadata || '{}');
    if (metadata.storage_provider === 's3' && s3) {
      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: file.file_path,
        Expires: 3600 // 1 hour
      };
      
      try {
        const url = s3.getSignedUrl('getObject', params);
        
        // Create audit log
        await db('audit_logs').insert({
          user_id: req.user.id,
          action: 'file_downloaded',
          entity_type: 'service_documents',
          entity_id: fileId,
          ip_address: req.ip,
          user_agent: req.headers['user-agent']
        });
        
        return res.redirect(url);
      } catch (s3Error) {
        logger.error('S3 download URL generation failed', {
          error: s3Error.message,
          fileId,
          userId: req.user.id
        });
        
        return res.status(500).json({
          success: false,
          error: 'File download failed'
        });
      }
    }
    
    // Handle local files
    const filePath = path.join(uploadsDir, file.stored_name);
    
    if (!fs.existsSync(filePath)) {
      logger.error('File not found on disk', {
        fileId,
        filePath,
        userId: req.user.id
      });
      
      return res.status(404).json({
        success: false,
        error: 'File not found on storage'
      });
    }
    
    // Create audit log
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'file_downloaded',
      entity_type: 'service_documents',
      entity_id: fileId,
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    logger.info('File downloaded', {
      fileId,
      fileName: file.original_name,
      userId: req.user.id,
      ip: req.ip
    });
    
    // Set appropriate headers
    res.set({
      'Content-Type': file.mime_type,
      'Content-Disposition': `attachment; filename="${file.original_name}"`,
      'Cache-Control': 'private, no-cache'
    });
    
    // Stream file to response
    res.sendFile(filePath);
    
  } catch (error) {
    logger.error('File download error', {
      error: error.message,
      fileId: req.params.fileId,
      userId: req.user.id,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      error: 'File download failed'
    });
  }
});

// List files for service request
router.get('/service-request/:serviceRequestId', [
  param('serviceRequestId').isInt({ min: 1 }),
  query('document_type').optional().isString()
], requirePermission(['documents:read']), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { serviceRequestId } = req.params;
    const { document_type } = req.query;
    
    // Check service request access
    const serviceRequest = await db('service_requests')
      .where('id', serviceRequestId)
      .first();
    
    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        error: 'Service request not found'
      });
    }
    
    const canAccess = req.user.role_name === 'super_admin' ||
                     req.user.role_name === 'admin' ||
                     serviceRequest.assigned_to === req.user.id ||
                     serviceRequest.client_email === req.user.email;
    
    if (!canAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // Build query
    let query = db('service_documents')
      .leftJoin('system_users', 'service_documents.uploaded_by', 'system_users.id')
      .select(
        'service_documents.*',
        'system_users.first_name as uploader_first_name',
        'system_users.last_name as uploader_last_name',
        'system_users.email as uploader_email'
      )
      .where('service_documents.service_request_id', serviceRequestId)
      .orderBy('service_documents.created_at', 'desc');
    
    if (document_type) {
      query = query.where('service_documents.document_type', document_type);
    }
    
    const files = await query;
    
    const filesWithUrls = files.map(file => {
      const metadata = JSON.parse(file.metadata || '{}');
      
      return {
        id: file.id,
        originalName: file.original_name,
        documentType: file.document_type,
        mimeType: file.mime_type,
        fileSize: file.file_size,
        isRequired: file.is_required,
        isClientVisible: file.is_client_visible,
        uploadedAt: file.created_at,
        uploader: {
          name: `${file.uploader_first_name || ''} ${file.uploader_last_name || ''}`.trim(),
          email: file.uploader_email
        },
        downloadUrl: `/api/files/download/${file.id}`,
        thumbnailUrl: metadata.thumbnail_path ? 
          (metadata.storage_provider === 's3' ? 
            `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${metadata.thumbnail_path}` :
            `/api/files/thumbnail/${file.id}`) : null
      };
    });
    
    res.json({
      success: true,
      data: {
        files: filesWithUrls,
        serviceRequestId: parseInt(serviceRequestId),
        totalFiles: filesWithUrls.length
      }
    });
    
  } catch (error) {
    logger.error('File list error', {
      error: error.message,
      serviceRequestId: req.params.serviceRequestId,
      userId: req.user.id,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch files'
    });
  }
});

// Delete file
router.delete('/:fileId', [
  param('fileId').isInt({ min: 1 })
], requirePermission(['documents:delete']), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file ID'
      });
    }

    const { fileId } = req.params;
    
    // Get file record
    const file = await db('service_documents')
      .leftJoin('service_requests', 'service_documents.service_request_id', 'service_requests.id')
      .select(
        'service_documents.*',
        'service_requests.assigned_to'
      )
      .where('service_documents.id', fileId)
      .first();
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    // Check delete permissions
    const canDelete = req.user.role_name === 'super_admin' ||
                     req.user.role_name === 'admin' ||
                     file.uploaded_by === req.user.id ||
                     (file.assigned_to === req.user.id && ['admin', 'operations_manager'].includes(req.user.role_name));
    
    if (!canDelete) {
      logger.warn('Unauthorized file deletion attempt', {
        fileId,
        userId: req.user.id,
        fileOwner: file.uploaded_by,
        ip: req.ip
      });
      
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    const metadata = JSON.parse(file.metadata || '{}');
    
    // Delete from S3 if stored there
    if (metadata.storage_provider === 's3' && s3) {
      try {
        await s3.deleteObject({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: file.file_path
        }).promise();
        
        // Delete thumbnail if exists
        if (metadata.thumbnail_path) {
          await s3.deleteObject({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: metadata.thumbnail_path
          }).promise();
        }
      } catch (s3Error) {
        logger.warn('S3 file deletion failed', {
          error: s3Error.message,
          fileId,
          s3Key: file.file_path
        });
      }
    } else {
      // Delete local file
      const filePath = path.join(uploadsDir, file.stored_name);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      // Delete thumbnail if exists
      if (metadata.thumbnail_path) {
        const thumbnailPath = path.join(uploadsDir, metadata.thumbnail_path);
        if (fs.existsSync(thumbnailPath)) {
          fs.unlinkSync(thumbnailPath);
        }
      }
    }
    
    // Delete database record
    await db('service_documents').where('id', fileId).del();
    
    // Create audit log
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'file_deleted',
      entity_type: 'service_documents',
      entity_id: fileId,
      old_values: JSON.stringify({
        original_name: file.original_name,
        file_size: file.file_size,
        document_type: file.document_type
      }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    logger.info('File deleted successfully', {
      fileId,
      fileName: file.original_name,
      userId: req.user.id,
      ip: req.ip
    });
    
    res.json({
      success: true,
      message: 'File deleted successfully'
    });
    
  } catch (error) {
    logger.error('File deletion error', {
      error: error.message,
      fileId: req.params.fileId,
      userId: req.user.id,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      error: 'File deletion failed'
    });
  }
});

// Get file thumbnail
router.get('/thumbnail/:fileId', [
  param('fileId').isInt({ min: 1 })
], async (req, res) => {
  try {
    const { fileId } = req.params;
    
    const file = await db('service_documents')
      .where('id', fileId)
      .first();
    
    if (!file) {
      return res.status(404).send('Thumbnail not found');
    }
    
    const metadata = JSON.parse(file.metadata || '{}');
    
    if (!metadata.thumbnail_path) {
      return res.status(404).send('No thumbnail available');
    }
    
    if (metadata.storage_provider === 's3' && s3) {
      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: metadata.thumbnail_path,
        Expires: 3600
      };
      
      const url = s3.getSignedUrl('getObject', params);
      return res.redirect(url);
    }
    
    // Local thumbnail
    const thumbnailPath = path.join(uploadsDir, metadata.thumbnail_path);
    
    if (!fs.existsSync(thumbnailPath)) {
      return res.status(404).send('Thumbnail file not found');
    }
    
    res.set({
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=3600'
    });
    
    res.sendFile(thumbnailPath);
    
  } catch (error) {
    logger.error('Thumbnail fetch error', {
      error: error.message,
      fileId: req.params.fileId,
      ip: req.ip
    });
    
    res.status(500).send('Thumbnail fetch failed');
  }
});

module.exports = router;