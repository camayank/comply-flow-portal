import { getSignedUrl } from './file-upload';

const BUCKET_ID = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value);

const extractPathFromGsUri = (value: string) => {
  if (!value.startsWith('gs://')) return null;
  const withoutScheme = value.replace('gs://', '');
  const [bucket, ...pathParts] = withoutScheme.split('/');
  if (!bucket || pathParts.length === 0) return null;
  if (BUCKET_ID && bucket !== BUCKET_ID) return null;
  return pathParts.join('/');
};

const extractPathFromGcsUrl = (value: string) => {
  try {
    const url = new URL(value);
    const hostname = url.hostname;

    if (hostname === 'storage.googleapis.com') {
      const parts = url.pathname.split('/').filter(Boolean);
      if (!parts.length) return null;
      if (BUCKET_ID && parts[0] !== BUCKET_ID) return null;
      return parts.slice(1).join('/');
    }

    if (hostname.endsWith('.storage.googleapis.com')) {
      const bucket = hostname.split('.')[0];
      if (BUCKET_ID && bucket !== BUCKET_ID) return null;
      return url.pathname.replace(/^\/+/, '');
    }
  } catch (error) {
    return null;
  }
  return null;
};

export async function resolveDownloadUrl(fileUrl: string): Promise<string> {
  if (!fileUrl) return fileUrl;

  if (fileUrl.startsWith('/uploads/')) {
    return fileUrl;
  }

  const gsPath = extractPathFromGsUri(fileUrl);
  if (gsPath) {
    return getSignedUrl(gsPath);
  }

  if (isHttpUrl(fileUrl)) {
    const gcsPath = extractPathFromGcsUrl(fileUrl);
    if (gcsPath) {
      return getSignedUrl(gcsPath);
    }
    return fileUrl;
  }

  return getSignedUrl(fileUrl);
}
