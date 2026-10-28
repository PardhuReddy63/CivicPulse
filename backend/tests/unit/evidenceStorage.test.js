jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

const fs = require('fs');
const os = require('os');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const config = require('../../src/config/env');
const evidenceStorage = require('../../src/services/evidenceStorage');

const bucketApi = {
  upload: jest.fn(),
  remove: jest.fn(),
  download: jest.fn(),
};
const supabaseClient = {
  storage: {
    from: jest.fn(() => bucketApi),
  },
};

const originalConfig = {
  SUPABASE_URL: config.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: config.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_EVIDENCE_BUCKET: config.SUPABASE_EVIDENCE_BUCKET,
  UPLOAD_DIR: config.UPLOAD_DIR,
};
const originalVercel = process.env.VERCEL;

afterEach(() => {
  jest.restoreAllMocks();
  config.SUPABASE_URL = originalConfig.SUPABASE_URL;
  config.SUPABASE_SERVICE_ROLE_KEY = originalConfig.SUPABASE_SERVICE_ROLE_KEY;
  config.SUPABASE_EVIDENCE_BUCKET = originalConfig.SUPABASE_EVIDENCE_BUCKET;
  config.UPLOAD_DIR = originalConfig.UPLOAD_DIR;
  if (originalVercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = originalVercel;
});

beforeEach(() => {
  config.SUPABASE_URL = 'https://test-project.supabase.co';
  config.SUPABASE_SERVICE_ROLE_KEY = 'test-only-not-a-real-key';
  config.SUPABASE_EVIDENCE_BUCKET = 'complaint-evidence';
  createClient.mockReturnValue(supabaseClient);
  bucketApi.upload.mockReset().mockResolvedValue({ error: null });
  bucketApi.remove.mockReset().mockResolvedValue({ error: null });
  bucketApi.download.mockReset();
  supabaseClient.storage.from.mockClear();
});

describe('persistent evidence storage', () => {
  test('uploads a validated image into the configured private bucket without upsert', async () => {
    const file = {
      buffer: Buffer.from([0xff, 0xd8, 0xff]),
      mimetype: 'image/jpeg',
    };

    const filePath = await evidenceStorage.uploadEvidence(file);

    expect(filePath).toMatch(
      /^supabase:\/\/complaint-evidence\/evidence\/[0-9a-f-]{36}\.jpg$/
    );
    expect(supabaseClient.storage.from).toHaveBeenCalledWith('complaint-evidence');
    expect(bucketApi.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^evidence\/[0-9a-f-]{36}\.jpg$/),
      file.buffer,
      { contentType: 'image/jpeg', upsert: false }
    );
  });

  test('rejects invalid files before calling Supabase Storage', async () => {
    await expect(evidenceStorage.uploadEvidence({
      buffer: Buffer.from('not an image'),
      mimetype: 'text/plain',
    })).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_EVIDENCE_FILE',
    });

    expect(bucketApi.upload).not.toHaveBeenCalled();
  });

  test('returns a safe storage error when the upload fails', async () => {
    bucketApi.upload.mockResolvedValue({
      error: { message: 'do not expose provider details' },
    });

    await expect(evidenceStorage.uploadEvidence({
      buffer: Buffer.from([137, 80, 78, 71]),
      mimetype: 'image/png',
    })).rejects.toMatchObject({
      status: 503,
      code: 'EVIDENCE_STORAGE_UNAVAILABLE',
      message: 'Evidence could not be saved to persistent storage.',
    });
  });

  test('downloads an object as a private stream', async () => {
    const expectedBytes = Buffer.from('private image bytes');
    bucketApi.download.mockResolvedValue({
      data: new Blob([expectedBytes], { type: 'image/png' }),
      error: null,
    });

    const evidence = await evidenceStorage.downloadEvidence(
      'supabase://complaint-evidence/evidence/example.png'
    );
    const chunks = [];
    for await (const chunk of evidence.stream) chunks.push(chunk);

    expect(Buffer.concat(chunks)).toEqual(expectedBytes);
    expect(evidence.contentType).toBe('image/png');
    expect(bucketApi.download).toHaveBeenCalledWith('evidence/example.png');
  });

  test('reports missing storage objects as not found', async () => {
    bucketApi.download.mockResolvedValue({
      data: null,
      error: { statusCode: '404', error: 'NotFound' },
    });

    await expect(evidenceStorage.downloadEvidence(
      'supabase://complaint-evidence/evidence/missing.jpg'
    )).rejects.toMatchObject({
      status: 404,
      code: 'EVIDENCE_NOT_FOUND',
    });
  });

  test('returns a safe service error when a storage download fails', async () => {
    bucketApi.download.mockResolvedValue({
      data: null,
      error: { statusCode: '500', message: 'do not expose provider details' },
    });

    await expect(evidenceStorage.downloadEvidence(
      'supabase://complaint-evidence/evidence/unavailable.jpg'
    )).rejects.toMatchObject({
      status: 503,
      code: 'EVIDENCE_STORAGE_UNAVAILABLE',
      message: 'Evidence could not be retrieved from persistent storage.',
    });
  });

  test('keeps local uploads in UPLOAD_DIR and removes failed database writes', async () => {
    const directory = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'civicpulse-evidence-')
    );
    config.SUPABASE_URL = '';
    config.SUPABASE_SERVICE_ROLE_KEY = '';
    config.UPLOAD_DIR = directory;
    delete process.env.VERCEL;

    const filePath = await evidenceStorage.uploadEvidence({
      buffer: Buffer.from([0xff, 0xd8, 0xff]),
      mimetype: 'image/jpeg',
    });
    const filename = path.basename(filePath);

    expect(filePath).toMatch(/^\/uploads\/evidence_/);
    await expect(fs.promises.readFile(path.join(directory, filename)))
      .resolves.toEqual(Buffer.from([0xff, 0xd8, 0xff]));

    await evidenceStorage.deleteEvidence(filePath);
    await expect(fs.promises.access(path.join(directory, filename)))
      .rejects.toMatchObject({ code: 'ENOENT' });
    await fs.promises.rm(directory, { recursive: true, force: true });
  });
});
