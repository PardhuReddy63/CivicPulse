const multer = require('multer');
const storage = multer.memoryStorage();

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
    const buffer = req.file.buffer;
    const matchesSignature = Buffer.isBuffer(buffer) &&
      signaturesByMimeType[req.file.mimetype]?.(buffer);
    if (matchesSignature) return next();

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
