/**
 * Multer Upload Middleware
 * Handles multipart file uploads with disk storage (temp dir).
 */

import multer from 'multer';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

const storage = multer.diskStorage({
  destination: os.tmpdir(),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm';
    const name = `upload-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
    cb(null, name);
  },
});

const ALLOWED_MIMES = ['video/mp4', 'video/webm', 'video/quicktime'];

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: mp4, webm, quicktime`));
  }
};

export const videoUpload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB per file
  fileFilter,
});
