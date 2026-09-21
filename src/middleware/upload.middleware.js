import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // We use a specific folder for order-formats just like Laravel does: 'order-formats'
    const uploadPath = path.join(__dirname, '../../public/storage/order-formats');
    
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter for images
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error('Invalid file type. Only JPG, JPEG, PNG and WEBP are allowed.');
    err.status = 400;
    cb(err, false);
  }
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 4 * 1024 * 1024 // 4MB max
  }
});

// Wraps a multer middleware so expected upload errors (oversized file, too
// many files, rejected type from fileFilter above) are answered as a client
// error in the project's existing `{ success, message }` shape, instead of
// falling through to the generic 500 in error-handler.js. Anything multer
// didn't raise itself still goes to `next(err)` for the global handler.
export const handleUploadErrors = (uploadMiddlewareFn) => (req, res, next) => {
  uploadMiddlewareFn(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (err.status) {
      return res.status(err.status).json({ success: false, message: err.message });
    }
    next(err);
  });
};
