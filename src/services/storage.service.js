/**
 * File storage for uploads (order-format images, company logo, export
 * checklist files). A file is addressed by its key — the relative path
 * already stored in the database, e.g. "order-formats/images-123.jpg" — and
 * is always reached through the API at /storage/<key>:
 *
 *   local (default)  the file lives in public/storage/<key> on this server
 *                    and /storage serves it directly (the previous behaviour).
 *   s3               the file lives in a private S3-compatible bucket
 *                    (Cloudflare R2 or Amazon S3); /storage/<key> answers with
 *                    a redirect to a short-lived signed link.
 *
 * Keys and frontend links are identical for both drivers, so switching is a
 * .env change (plus copying existing files into the bucket).
 *
 * Requests are signed with AWS Signature Version 4 using node:crypto — the
 * same dependency-free approach as the PDF and XLSX writers; no SDK.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const LOCAL_ROOT = path.join(__dirname, '../../public/storage');

/** A key is a relative path of safe segments: no "..", no leading slash, no backslashes. */
export const isSafeKey = (key) => typeof key === 'string'
  && key.length > 0 && key.length <= 512
  && !key.startsWith('/') && !key.includes('\\')
  && key.split('/').every((seg) => seg !== '' && seg !== '.' && seg !== '..');

/** The only folders /storage/<key> will serve — uploads. Backups and anything else stay private. */
export const PUBLIC_FOLDERS = ['order-formats', 'company-profile', 'export-documents'];
export const isPublicKey = (key) => isSafeKey(key) && PUBLIC_FOLDERS.includes(key.split('/')[0]);

const assertKey = (key) => {
  if (!isSafeKey(key)) throw new Error(`Invalid storage key: ${key}`);
};

// ---------------- AWS Signature Version 4 ----------------

const sha256Hex = (data) => crypto.createHash('sha256').update(data).digest('hex');
const hmac = (key, data) => crypto.createHmac('sha256', key).update(data).digest();

/** RFC 3986 encoding as SigV4 requires (encodeURIComponent leaves !'()* alone). */
const encode = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
const encodePath = (p) => p.split('/').map(encode).join('/');

const amzDates = (date) => {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  return { amzDate: iso, dateStamp: iso.slice(0, 8) };
};

/**
 * Signs one request. Returns the signature plus the pieces the caller needs.
 * `headers` must include host (lower-case names); `query` is a plain object;
 * `payloadHash` is the hex SHA-256 of the body or 'UNSIGNED-PAYLOAD'.
 */
export const signV4 = ({ method, pathname, query = {}, headers, payloadHash, region, accessKeyId, secretAccessKey, date, service = 's3' }) => {
  const { amzDate, dateStamp } = amzDates(date);
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const names = Object.keys(headers).map((h) => h.toLowerCase()).sort();
  const lowered = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v).trim().replace(/\s+/g, ' ')]));
  const signedHeaders = names.join(';');
  const canonicalQuery = Object.keys(query).sort().map((k) => `${encode(k)}=${encode(String(query[k]))}`).join('&');
  const canonicalRequest = [
    method,
    encodePath(pathname),
    canonicalQuery,
    names.map((n) => `${n}:${lowered[n]}\n`).join(''),
    signedHeaders,
    payloadHash,
  ].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256Hex(canonicalRequest)].join('\n');
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${secretAccessKey}`, dateStamp), region), service), 'aws4_request');
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');
  return { signature, amzDate, scope, signedHeaders, credential: `${accessKeyId}/${scope}` };
};

// ---------------- S3-compatible driver ----------------

const s3 = () => {
  const c = config.storage;
  const missing = ['endpoint', 'bucket', 'accessKeyId', 'secretAccessKey'].filter((k) => !c[k]);
  if (missing.length) throw new Error(`STORAGE_DRIVER=s3 needs ${missing.map((k) => `S3_${k.replace(/[A-Z]/g, (m) => `_${m}`).toUpperCase()}`).join(', ')} in .env`);
  const endpoint = new URL(c.endpoint);
  // Path-style addressing (https://endpoint/bucket/key) works for both R2 and S3.
  const objectPath = (key) => `/${c.bucket}/${key}`;
  const base = { region: c.region, accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey };

  /** Returns the response body for GET (a Buffer); nothing for PUT / DELETE. */
  const send = async (method, key, body = null, contentType = null) => {
    const payloadHash = sha256Hex(body || '');
    const headers = { host: endpoint.host, 'x-amz-content-sha256': payloadHash };
    if (contentType) headers['content-type'] = contentType;
    const date = new Date();
    headers['x-amz-date'] = amzDates(date).amzDate;
    const sig = signV4({ method, pathname: objectPath(key), headers, payloadHash, date, ...base });
    const response = await fetch(`${endpoint.origin}${encodePath(objectPath(key))}`, {
      method,
      headers: {
        ...headers,
        authorization: `AWS4-HMAC-SHA256 Credential=${sig.credential}, SignedHeaders=${sig.signedHeaders}, Signature=${sig.signature}`,
      },
      body: body || undefined,
    });
    if (!response.ok && !(method === 'DELETE' && response.status === 404)) {
      const detail = (await response.text().catch(() => '')).slice(0, 300);
      throw new Error(`Storage ${method} ${key} failed (${response.status}) ${detail}`);
    }
    return method === 'GET' ? Buffer.from(await response.arrayBuffer()) : undefined;
  };

  return {
    put: (key, buffer, contentType) => send('PUT', key, buffer, contentType || 'application/octet-stream'),
    get: (key) => send('GET', key),
    remove: (key) => send('DELETE', key),
    /** A signed GET link valid for `expires` seconds (query-string auth, nothing secret in it). */
    url: (key, expires = c.urlExpiresSeconds) => {
      const date = new Date();
      const { amzDate, dateStamp } = amzDates(date);
      const query = {
        'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
        'X-Amz-Credential': `${c.accessKeyId}/${dateStamp}/${c.region}/s3/aws4_request`,
        'X-Amz-Date': amzDate,
        'X-Amz-Expires': String(expires),
        'X-Amz-SignedHeaders': 'host',
      };
      const sig = signV4({ method: 'GET', pathname: objectPath(key), query, headers: { host: endpoint.host }, payloadHash: 'UNSIGNED-PAYLOAD', date, ...base });
      const qs = Object.keys(query).sort().map((k) => `${encode(k)}=${encode(query[k])}`).join('&');
      return `${endpoint.origin}${encodePath(objectPath(key))}?${qs}&X-Amz-Signature=${sig.signature}`;
    },
  };
};

// ---------------- Local driver ----------------

const local = {
  put: async (key, buffer) => {
    const file = path.join(LOCAL_ROOT, key);
    await fs.promises.mkdir(path.dirname(file), { recursive: true });
    await fs.promises.writeFile(file, buffer);
  },
  get: (key) => fs.promises.readFile(path.join(LOCAL_ROOT, key)),
  remove: async (key) => {
    await fs.promises.unlink(path.join(LOCAL_ROOT, key)).catch((err) => {
      if (err.code !== 'ENOENT') throw err;
    });
  },
  url: null, // served directly by the /storage static mount
};

const driver = () => (config.storage.driver === 's3' ? s3() : local);

export const storage = {
  driverName: () => (config.storage.driver === 's3' ? 's3' : 'local'),

  /** A new unique key under a folder, keeping the original extension: "order-formats/images-1727…-123.jpg". */
  newKey: (folder, prefix, originalName) => {
    const ext = path.extname(originalName || '').toLowerCase().replace(/[^.a-z0-9]/g, '');
    return `${folder}/${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  },

  put: async (key, buffer, contentType) => {
    assertKey(key);
    await driver().put(key, buffer, contentType);
  },

  /** The file's bytes (private files such as archived documents are read through the API, never /storage). */
  get: async (key) => {
    assertKey(key);
    return driver().get(key);
  },

  /** Deletes a file; a missing file is not an error. Failures are logged, never thrown (cleanup runs after commits). */
  remove: async (key) => {
    if (!isSafeKey(key)) return;
    try {
      await driver().remove(key);
    } catch (err) {
      console.error(`[storage] Failed to remove ${key}:`, err.message);
    }
  },

  /** Signed link for the s3 driver; null for local (use /storage/<key>). */
  signedUrl: (key) => {
    assertKey(key);
    const d = driver();
    return d.url ? d.url(key) : null;
  },
};
