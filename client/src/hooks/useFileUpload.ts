import { useState } from 'react';
import { toast } from 'sonner';

interface UseFileUploadOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  onUpload?: (file: File) => Promise<any>;
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = [],
    onUpload,
  } = options;

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<any>(null);

  const validateFile = (file: File): boolean => {
    // Check file size
    if (file.size > maxSize) {
      toast.error(`File size exceeds ${maxSize / (1024 * 1024)}MB limit`);
      return false;
    }

    // Check file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      toast.error('File type not allowed');
      return false;
    }

    return true;
  };

  const uploadFile = async (file: File) => {
    if (!validateFile(file)) {
      return null;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      if (onUpload) {
        const result = await onUpload(file);
        setUploadedFile(result);
        setUploadProgress(100);
        toast.success('File uploaded successfully');
        return result;
      }

      return null;
    } catch (error: any) {
      toast.error(error.message || 'File upload failed');
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setUploading(false);
    setUploadProgress(0);
    setUploadedFile(null);
  };

  return {
    uploading,
    uploadProgress,
    uploadedFile,
    uploadFile,
    reset,
  };
}
