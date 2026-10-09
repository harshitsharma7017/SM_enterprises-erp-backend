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
  // Uploaded files, archived documents and backups live in an S3-compatible
  // bucket (Amazon S3 or Cloudflare R2). See storage.service.js.
  storage: {
    endpoint: process.env.S3_ENDPOINT || '',
    region: process.env.S3_REGION || 'auto',
    bucket: process.env.S3_BUCKET || '',
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    urlExpiresSeconds: parseInt(process.env.S3_URL_EXPIRES_SECONDS || '300', 10)
  }
};
