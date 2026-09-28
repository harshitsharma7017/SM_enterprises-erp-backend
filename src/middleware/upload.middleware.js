import multer from 'multer';

// Uploads are held in memory and written through the storage service
// (local disk or an S3-compatible bucket) only after validation passes, so a
// rejected request never leaves a file behind.
const storage = multer.memoryStorage();

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
