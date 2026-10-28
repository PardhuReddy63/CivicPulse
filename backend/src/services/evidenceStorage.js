const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { randomUUID } = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const config = require('../config/env');

const extensionByMimeType = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

let supabaseClient;

function createStorageError(message, status, code) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function hasSupabaseConfiguration() {
  return Boolean(config.SUPABASE_URL && config.SUPABASE_SERVICE_ROLE_KEY);
}

function getSupabaseClient() {
  if (!hasSupabaseConfiguration()) {
    throw createStorageError(
      'Persistent evidence storage is not configured.',
      503,
      'EVIDENCE_STORAGE_NOT_CONFIGURED'
    );
  }

  if (!supabaseClient) {
    supabaseClient = createClient(
      config.SUPABASE_URL,
      config.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );
  }

  return supabaseClient;
}

function parseStoragePath(filePath) {
  if (typeof filePath !== 'string' || !filePath.startsWith('supabase://')) {
    return null;
  }

  const match = /^supabase:\/\/([^/]+)\/(.+)$/.exec(filePath);
  if (!match) {
    throw createStorageError(
      'Evidence storage reference is invalid.',
      500,
      'INVALID_EVIDENCE_STORAGE_PATH'
    );
  }

  let bucket;
  try {
    bucket = decodeURIComponent(match[1]);
  } catch {
    throw createStorageError(
      'Evidence storage reference is invalid.',
      500,
      'INVALID_EVIDENCE_STORAGE_PATH'
    );
  }

  const objectPath = match[2];
  if (
    !bucket ||
    bucket !== config.SUPABASE_EVIDENCE_BUCKET ||
    !objectPath.startsWith('evidence/') ||
    objectPath.split('/').some((segment) => !segment || segment === '.' || segment === '..')
  ) {
    throw createStorageError(
      'Evidence storage reference is invalid.',
      500,
      'INVALID_EVIDENCE_STORAGE_PATH'
    );
  }

  return { bucket, objectPath };
}

async function uploadEvidence(file) {
  if (
    !file ||
    !Buffer.isBuffer(file.buffer) ||
    !extensionByMimeType[file.mimetype]
  ) {
    throw createStorageError(
      'A validated image file is required.',
      400,
      'INVALID_EVIDENCE_FILE'
    );
  }

  const extension = extensionByMimeType[file.mimetype];
  const objectName = `${randomUUID()}${extension}`;

  if (hasSupabaseConfiguration()) {
    const bucket = config.SUPABASE_EVIDENCE_BUCKET;
    const objectPath = `evidence/${objectName}`;

    try {
      const { error } = await getSupabaseClient()
        .storage
        .from(bucket)
        .upload(objectPath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) {
        throw createStorageError(
          'Evidence could not be saved to persistent storage.',
          503,
          'EVIDENCE_STORAGE_UNAVAILABLE'
        );
      }

      return `supabase://${encodeURIComponent(bucket)}/${objectPath}`;
    } catch (error) {
      if (error.code === 'EVIDENCE_STORAGE_UNAVAILABLE') throw error;
      throw createStorageError(
        'Evidence could not be saved to persistent storage.',
        503,
        'EVIDENCE_STORAGE_UNAVAILABLE'
      );
    }
  }

  if (config.SUPABASE_URL || config.SUPABASE_SERVICE_ROLE_KEY || process.env.VERCEL) {
    throw createStorageError(
      'Persistent evidence storage is not fully configured.',
      503,
      'EVIDENCE_STORAGE_NOT_CONFIGURED'
    );
  }

  const filename = `evidence_${Date.now()}_${randomUUID().replace(/-/g, '')}${extension}`;
  const destination = path.resolve(config.UPLOAD_DIR, filename);
  try {
    await fs.promises.mkdir(path.dirname(destination), { recursive: true });
    await fs.promises.writeFile(destination, file.buffer, { flag: 'wx' });
  } catch {
    throw createStorageError(
      'Evidence could not be saved to local storage.',
      500,
      'EVIDENCE_STORAGE_WRITE_FAILED'
    );
  }

  return `/uploads/${filename}`;
}

async function deleteEvidence(filePath) {
  const storedObject = parseStoragePath(filePath);
  if (storedObject) {
    const { error } = await getSupabaseClient()
      .storage
      .from(storedObject.bucket)
      .remove([storedObject.objectPath]);

    if (error) {
      throw createStorageError(
        'Failed to remove an unreferenced evidence object.',
        503,
        'EVIDENCE_STORAGE_CLEANUP_FAILED'
      );
    }
    return;
  }

  if (typeof filePath !== 'string' || !filePath.startsWith('/uploads/')) return;

  const filename = path.basename(filePath);
  if (!filename || filename === '.' || filename === path.sep) return;

  const destination = path.resolve(config.UPLOAD_DIR, filename);
  await fs.promises.unlink(destination).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
  });
}

async function downloadEvidence(filePath) {
  const storedObject = parseStoragePath(filePath);
  if (!storedObject) {
    throw createStorageError(
      'Evidence storage reference is invalid.',
      500,
      'INVALID_EVIDENCE_STORAGE_PATH'
    );
  }

  let result;
  try {
    result = await getSupabaseClient()
      .storage
      .from(storedObject.bucket)
      .download(storedObject.objectPath);
  } catch {
    throw createStorageError(
      'Evidence could not be retrieved from persistent storage.',
      503,
      'EVIDENCE_STORAGE_UNAVAILABLE'
    );
  }

  if (result.error) {
    const status = Number(result.error.status || result.error.statusCode);
    if (status === 404 || result.error.error === 'NotFound') {
      throw createStorageError(
        'Evidence image does not exist.',
        404,
        'EVIDENCE_NOT_FOUND'
      );
    }
    throw createStorageError(
      'Evidence could not be retrieved from persistent storage.',
      503,
      'EVIDENCE_STORAGE_UNAVAILABLE'
    );
  }

  if (!result.data || typeof result.data.stream !== 'function') {
    throw createStorageError(
      'Evidence could not be retrieved from persistent storage.',
      503,
      'EVIDENCE_STORAGE_UNAVAILABLE'
    );
  }

  return {
    stream: Readable.fromWeb(result.data.stream()),
    contentType: extensionByMimeType[result.data.type] ? result.data.type : 'application/octet-stream',
  };
}

module.exports = {
  uploadEvidence,
  deleteEvidence,
  downloadEvidence,
  parseStoragePath,
};
