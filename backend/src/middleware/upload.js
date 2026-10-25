const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const config = require('../config/env');

const uploadDir = path.resolve(config.UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate secure randomized server-side filename; do not trust client name
    const randomHex = crypto.randomBytes(16).toString('hex');
    const extensionsByMimeType = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    const ext = extensionsByMimeType[file.mimetype] || path.extname(file.originalname).toLowerCase();
    cb(null, `evidence_${Date.now()}_${randomHex}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error('Unsupported media type. Allowed formats: JPEG, PNG, WebP.');
    error.status = 415;
    cb(error, false);
  }
}

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB maximum as per spec section 11
  },
  fileFilter,
});

const signaturesByMimeType = {
  'image/jpeg': (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  'image/png': (buffer) => buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  'image/webp': (buffer) =>
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP',
};

async function validateImageContents(req, res, next) {
  if (!req.file) return next();

  try {
    const buffer = await fs.promises.readFile(req.file.path);
    const matchesSignature = signaturesByMimeType[req.file.mimetype]?.(buffer);
    if (matchesSignature) return next();

    await fs.promises.unlink(req.file.path);
    const error = new Error('The uploaded file contents do not match a supported image format.');
    error.status = 415;
    error.code = 'INVALID_IMAGE_CONTENT';
    return next(error);
  } catch (error) {
    return next(error);
  }
}

module.exports = upload;
module.exports.validateImageContents = validateImageContents;
module.exports.signaturesByMimeType = signaturesByMimeType;
