import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'garment_erp'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  // Original ERP: config('permissions.super_admin.email') — the one account
  // UserService/UpdateUserRequest protect from deletion, deactivation and
  // having its Super Admin role stripped. Not "whoever holds the Super Admin
  // role" — one specific configured account.
  superAdminEmail: process.env.SUPER_ADMIN_EMAIL || 'test@test.com',
  // Uploaded files: 'local' (public/storage on this server) or 's3' (any
  // S3-compatible bucket — Cloudflare R2 or Amazon S3). See storage.service.js.
  storage: {
    driver: (process.env.STORAGE_DRIVER || 'local').toLowerCase(),
    endpoint: process.env.S3_ENDPOINT || '',
    region: process.env.S3_REGION || 'auto',
    bucket: process.env.S3_BUCKET || '',
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    urlExpiresSeconds: parseInt(process.env.S3_URL_EXPIRES_SECONDS || '300', 10)
  }
};
