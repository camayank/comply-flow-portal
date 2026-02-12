import { db } from '../server/db';
import { documentVault } from '../shared/schema';
import { eq } from 'drizzle-orm';

const BUCKET_ID = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;

const parseGsUri = (value: string): string | null => {
  if (!value.startsWith('gs://')) return null;
  const withoutScheme = value.replace('gs://', '');
  const [bucket, ...pathParts] = withoutScheme.split('/');
  if (!bucket || pathParts.length === 0) return null;
  if (BUCKET_ID && bucket !== BUCKET_ID) return null;
  return pathParts.join('/');
};

const parseUploadsPath = (value: string): string | null => {
  if (value.startsWith('/uploads/')) return value.replace(/^\/uploads\//, '');
  if (value.startsWith('uploads/')) return value.replace(/^uploads\//, '');
  return null;
};

const parseGcsUrl = (value: string): string | null => {
  try {
    const url = new URL(value);
    const hostname = url.hostname;

    if (hostname === 'storage.googleapis.com') {
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length === 0) return null;

      if (parts[0] === 'download' && parts[1] === 'storage' && parts[2] === 'v1' && parts[3] === 'b') {
        const bucket = parts[4];
        if (BUCKET_ID && bucket !== BUCKET_ID) return null;
        const objectIndex = parts.indexOf('o');
        if (objectIndex !== -1 && parts[objectIndex + 1]) {
          return decodeURIComponent(parts.slice(objectIndex + 1).join('/'));
        }
        return null;
      }

      if (parts.length >= 2) {
        const bucket = parts[0];
        if (BUCKET_ID && bucket !== BUCKET_ID) return null;
        return parts.slice(1).join('/');
      }
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

const normalizeFileUrlToPath = (value: string): string | null => {
  if (!value) return null;

  const uploadsPath = parseUploadsPath(value);
  if (uploadsPath) return uploadsPath;

  const gsPath = parseGsUri(value);
  if (gsPath) return gsPath;

  if (/^https?:\/\//i.test(value)) {
    return parseGcsUrl(value);
  }

  if (value.startsWith('/')) {
    return value.replace(/^\/+/, '');
  }

  return null;
};

const isDryRun = process.argv.includes('--dry-run');

async function run() {
  const documents = await db
    .select({
      id: documentVault.id,
      fileUrl: documentVault.fileUrl,
    })
    .from(documentVault);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const doc of documents) {
    const normalized = normalizeFileUrlToPath(doc.fileUrl);

    if (!normalized || normalized === doc.fileUrl) {
      skipped++;
      continue;
    }

    if (isDryRun) {
      console.log(`[dry-run] document_vault ${doc.id}: ${doc.fileUrl} -> ${normalized}`);
      updated++;
      continue;
    }

    try {
      await db.update(documentVault)
        .set({ fileUrl: normalized })
        .where(eq(documentVault.id, doc.id));
      updated++;
    } catch (error: any) {
      failed++;
      console.error(`Failed to update document ${doc.id}: ${error.message}`);
    }
  }

  console.log(`Backfill complete. Updated: ${updated}, Skipped: ${skipped}, Failed: ${failed}`);
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
