/**
 * One-off: copies every file under public/storage/ into the bucket with the
 * same key ("public/storage/order-formats/a.jpg" → "order-formats/a.jpg"), for
 * installations that kept uploads on disk before storage moved to S3.
 *
 * Safe to re-run — each key is overwritten with the same bytes. Local files
 * are left in place; delete public/storage/ yourself once the app is checked.
 *
 *   npm run storage:upload-local
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { storage, isSafeKey } from '../src/services/storage.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_ROOT = path.join(__dirname, '../public/storage');

const CONTENT_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
  '.csv': 'text/csv',
  '.txt': 'text/plain',
  '.zip': 'application/zip',
  '.gz': 'application/gzip',
};

async function run() {
  storage.assertConfigured();
  if (!fs.existsSync(LOCAL_ROOT)) {
    console.log(`Nothing to upload: ${LOCAL_ROOT} does not exist.`);
    return;
  }

  const files = (await fs.promises.readdir(LOCAL_ROOT, { recursive: true, withFileTypes: true }))
    .filter((entry) => entry.isFile() && !entry.name.startsWith('.'))
    .map((entry) => path.join(entry.parentPath, entry.name));

  let uploaded = 0;
  const failed = [];
  for (const file of files) {
    const key = path.relative(LOCAL_ROOT, file).split(path.sep).join('/');
    if (!isSafeKey(key)) {
      failed.push(`${key} (not a valid key)`);
      continue;
    }
    try {
      const contentType = CONTENT_TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
      await storage.put(key, await fs.promises.readFile(file), contentType);
      uploaded += 1;
      console.log(`  ↑ ${key}`);
    } catch (err) {
      failed.push(`${key} (${err.message})`);
    }
  }

  console.log(`✅ Uploaded ${uploaded} of ${files.length} file(s).`);
  if (failed.length) {
    console.error(`❌ ${failed.length} failed:\n  ${failed.join('\n  ')}`);
    process.exitCode = 1;
  }
}

run().catch((err) => {
  console.error('❌ Upload failed:', err.message);
  process.exitCode = 1;
});
