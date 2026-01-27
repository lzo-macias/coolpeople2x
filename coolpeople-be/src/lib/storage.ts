/**
 * Storage Abstraction Layer
 * Provides a consistent interface for file storage operations.
 * MVP uses local filesystem; swap to S3/R2 by implementing StorageProvider.
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { env, isDev } from '../config/env.js';

// -----------------------------------------------------------------------------
// Storage Provider Interface
// -----------------------------------------------------------------------------

export interface StorageProvider {
  upload(file: Buffer, key: string, contentType: string): Promise<string>;
  delete(key: string): Promise<void>;
  getUrl(key: string): string;
}

// -----------------------------------------------------------------------------
// Local Filesystem Storage (MVP)
// Stores files in /uploads directory, serves via Express static
// -----------------------------------------------------------------------------

class LocalStorage implements StorageProvider {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.resolve(process.cwd(), 'uploads');
  }

  async upload(file: Buffer, key: string, _contentType: string): Promise<string> {
    const filePath = path.join(this.uploadDir, key);
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, file);
    return this.getUrl(key);
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.uploadDir, key);
    try {
      await fs.unlink(filePath);
    } catch {
      // File may not exist, that's fine
    }
  }

  getUrl(key: string): string {
    const baseUrl = isDev
      ? `http://localhost:${env.PORT}`
      : process.env.BASE_URL || `http://localhost:${env.PORT}`;
    return `${baseUrl}/uploads/${key}`;
  }
}

// -----------------------------------------------------------------------------
// Storage Singleton
// -----------------------------------------------------------------------------

let storageInstance: StorageProvider | null = null;

export const getStorage = (): StorageProvider => {
  if (!storageInstance) {
    // MVP: always use local storage
    // Future: check env to instantiate S3/R2 provider
    storageInstance = new LocalStorage();
  }
  return storageInstance;
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Generate a unique storage key for uploaded files
 */
export const generateStorageKey = (
  prefix: string,
  originalFilename: string
): string => {
  const ext = path.extname(originalFilename);
  const hash = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  return `${prefix}/${timestamp}-${hash}${ext}`;
};

/**
 * Allowed video MIME types
 */
export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime', // .mov
  'video/webm',
] as const;

/**
 * Max file size: 100MB
 */
export const MAX_FILE_SIZE = 100 * 1024 * 1024;

/**
 * Validate that a file is an acceptable video
 */
export const isValidVideoType = (mimeType: string): boolean => {
  return (ALLOWED_VIDEO_TYPES as readonly string[]).includes(mimeType);
};
