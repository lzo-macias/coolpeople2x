/**
 * Audio Extraction & Mixing
 * Extracts audio from reel videos and optionally mixes with overlay sounds.
 * Uses the same ffmpeg-static binary as ffmpeg.ts.
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import https from 'https';
import http from 'http';

const execFileAsync = promisify(execFile);

import ffmpegStatic from 'ffmpeg-static';
const ffmpegPath: string = (ffmpegStatic as unknown as string);

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const tmpFile = (ext: string): string => {
  const name = `cp-audio-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
  return path.join(os.tmpdir(), name);
};

// -----------------------------------------------------------------------------
// Resolve local video path from URL
// -----------------------------------------------------------------------------

/**
 * Strips http://localhost:PORT/uploads/ prefix and resolves to absolute path.
 * Returns null for non-local URLs or if file doesn't exist.
 */
export const resolveLocalVideoPath = async (videoUrl: string): Promise<string | null> => {
  try {
    const match = videoUrl.match(/^https?:\/\/localhost:\d+\/uploads\/(.+)$/);
    if (!match) return null;

    const relativePath = decodeURIComponent(match[1]);
    const absolutePath = path.resolve(process.cwd(), 'uploads', relativePath);

    await fs.access(absolutePath);
    return absolutePath;
  } catch {
    return null;
  }
};

// -----------------------------------------------------------------------------
// Download external audio to temp file
// -----------------------------------------------------------------------------

/**
 * Downloads an external audio file (e.g. overlay sound from CDN) to a temp file.
 * 30s timeout, 50MB max. Returns temp path or null on failure.
 */
export const downloadExternalAudio = (url: string): Promise<string | null> => {
  return new Promise((resolve) => {
    const tempPath = tmpFile(path.extname(new URL(url).pathname) || '.mp3');
    const protocol = url.startsWith('https') ? https : http;

    const req = protocol.get(url, { timeout: 30000 }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        resolve(null);
        return;
      }

      let size = 0;
      const maxSize = 50 * 1024 * 1024;
      const chunks: Buffer[] = [];

      res.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > maxSize) {
          res.destroy();
          resolve(null);
          return;
        }
        chunks.push(chunk);
      });

      res.on('end', async () => {
        try {
          await fs.writeFile(tempPath, Buffer.concat(chunks));
          resolve(tempPath);
        } catch {
          resolve(null);
        }
      });

      res.on('error', () => resolve(null));
    });

    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.on('error', () => resolve(null));
  });
};

// -----------------------------------------------------------------------------
// Extract & mix audio from video
// -----------------------------------------------------------------------------

export interface ExtractAudioOptions {
  videoPath: string;
  duration: number;
  overlayUrl?: string | null;
  videoVolume?: number;   // 0-100, default 100
  soundVolume?: number;   // 0-100, default 100
  soundOffset?: number;   // seconds offset for overlay, default 0
}

export interface ExtractAudioResult {
  audioPath: string;
  durationSeconds: number;
}

/**
 * Extracts audio from a video file, optionally mixing with an overlay sound.
 * - No overlay: extracts audio track with volume filter
 * - With overlay: downloads overlay, mixes both tracks using amix + adelay
 * Output: .mp3 (192kbps, 44.1kHz stereo)
 */
export const extractAudio = async (opts: ExtractAudioOptions): Promise<ExtractAudioResult> => {
  const {
    videoPath,
    duration,
    overlayUrl,
    videoVolume = 100,
    soundVolume = 100,
    soundOffset = 0,
  } = opts;

  const outputPath = tmpFile('.mp3');
  const tempFiles: string[] = [];

  try {
    const vidVol = Math.max(0, Math.min(videoVolume, 100)) / 100;
    const sndVol = Math.max(0, Math.min(soundVolume, 100)) / 100;

    if (overlayUrl) {
      // Download overlay sound
      const overlayPath = await downloadExternalAudio(overlayUrl);
      if (overlayPath) {
        tempFiles.push(overlayPath);

        // Mix video audio + overlay
        const delayMs = Math.max(0, Math.round(soundOffset * 1000));
        const filterComplex = [
          `[0:a]volume=${vidVol}[va]`,
          `[1:a]adelay=${delayMs}|${delayMs},volume=${sndVol}[sa]`,
          `[va][sa]amix=inputs=2:duration=first:dropout_transition=2[out]`,
        ].join(';');

        await execFileAsync(ffmpegPath, [
          '-y',
          '-i', videoPath,
          '-i', overlayPath,
          '-filter_complex', filterComplex,
          '-map', '[out]',
          '-t', String(duration),
          '-c:a', 'libmp3lame', '-b:a', '192k', '-ar', '44100', '-ac', '2',
          outputPath,
        ], { timeout: 120000 });

        return { audioPath: outputPath, durationSeconds: duration };
      }
      // If overlay download failed, fall through to video-only extraction
    }

    // Extract audio from video only (with volume)
    await execFileAsync(ffmpegPath, [
      '-y',
      '-i', videoPath,
      '-vn',
      '-af', `volume=${vidVol}`,
      '-t', String(duration),
      '-c:a', 'libmp3lame', '-b:a', '192k', '-ar', '44100', '-ac', '2',
      outputPath,
    ], { timeout: 120000 });

    return { audioPath: outputPath, durationSeconds: duration };
  } catch (err) {
    // Clean up output on failure
    await fs.unlink(outputPath).catch(() => {});
    throw err;
  } finally {
    // Clean up downloaded overlay temp files
    for (const f of tempFiles) {
      await fs.unlink(f).catch(() => {});
    }
  }
};
