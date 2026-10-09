/**
 * Database backup: mysqldump → gzip → bucket key "backups/<db>_<UTC stamp>.sql.gz".
 * The backup goes to the private bucket (S3 / R2), off this server; /storage
 * never serves the backups/ folder.
 *
 * Run on a schedule (e.g. cron: `0 2 * * * cd /app && npm run backup:db`).
 * Needs the mysqldump client on the PATH. Credentials come from .env and are
 * passed through the environment, never on the command line.
 * Retention is left to the bucket's lifecycle rule (e.g. expire backups/ after 90 days).
 */
import { spawn } from 'child_process';
import zlib from 'zlib';
import { pipeline } from 'stream/promises';
import { config } from '../src/config/env.js';
import { storage } from '../src/services/storage.service.js';

/** Streams mysqldump through gzip into memory; rejects if mysqldump fails. */
const dump = async () => {
  const args = ['-h', config.db.host, '-P', String(config.db.port), '-u', config.db.user,
    '--single-transaction', '--routines', '--triggers', config.db.name];
  const child = spawn('mysqldump', args, { env: { ...process.env, MYSQL_PWD: config.db.password } });
  let stderr = '';
  child.stderr.on('data', (d) => { stderr += d; });
  const exited = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', resolve);
  });
  const chunks = [];
  await pipeline(child.stdout, zlib.createGzip(), async function* collect(source) {
    for await (const chunk of source) chunks.push(chunk);
  });
  const code = await exited;
  if (code !== 0) throw new Error(`mysqldump exited with ${code}: ${stderr.replace(/.*Using a password.*\n?/g, '').trim()}`);
  return Buffer.concat(chunks);
};

async function run() {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z').replace('T', '-');
  const name = `${config.db.name}_${stamp}.sql.gz`;
  const buffer = await dump();
  if (buffer.length < 100) throw new Error('The dump is unexpectedly small; not saved.');

  const key = `backups/${name}`;
  await storage.put(key, buffer, 'application/gzip');
  console.log(`✅ Backup uploaded to the bucket: ${key} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

run().then(() => process.exit(0)).catch((err) => {
  console.error('❌ Backup failed:', err.message);
  process.exit(1);
});
