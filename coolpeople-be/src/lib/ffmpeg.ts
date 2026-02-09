/**
 * FFmpeg Wrapper
 * Concatenates and trims video segments using stream copy (no re-encoding).
 * Falls back to VP9 re-encode if codec mismatch causes concat failure.
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

const execFileAsync = promisify(execFile);

// ffmpeg-static exports a string path to the ffmpeg binary
// It's a CJS package, so under NodeNext we import it and extract .default
import ffmpegStatic from 'ffmpeg-static';
const ffmpegPath: string = (ffmpegStatic as unknown as string);

export interface VideoSegment {
  filePath: string;
  startTime: number;
  endTime: number;
}

interface CombineResult {
  outputPath: string;
  duration: number;
}

/**
 * Generate a unique temp file path
 */
const tmpFile = (ext: string): string => {
  const name = `cp-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
  return path.join(os.tmpdir(), name);
};

/**
 * Get video duration using ffprobe (bundled with ffmpeg-static isn't guaranteed,
 * so we parse ffmpeg stderr output instead)
 */
const getVideoDuration = async (filePath: string): Promise<number> => {
  try {
    const { stderr } = await execFileAsync(ffmpegPath, ['-i', filePath], {
      timeout: 10000,
    }).catch((err: any) => ({ stderr: err.stderr || '', stdout: '' }));

    const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
    if (match) {
      return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3]);
    }
  } catch {
    // Ignore
  }
  return 0;
};

/**
 * Trim a single segment from a video file using stream copy.
 */
const trimSegment = async (
  inputPath: string,
  startTime: number,
  duration: number,
  outputPath: string,
  reencode: boolean = false
): Promise<void> => {
  const args = [
    '-y',
    '-ss', String(startTime),
    '-t', String(duration),
    '-i', inputPath,
  ];

  if (reencode) {
    args.push('-c:v', 'libvpx-vp9', '-b:v', '2M', '-c:a', 'libopus');
  } else {
    args.push('-c', 'copy');
  }

  args.push(outputPath);

  await execFileAsync(ffmpegPath, args, { timeout: 120000 });
};

/**
 * Concatenate multiple video files using the concat demuxer.
 */
const concatFiles = async (
  filePaths: string[],
  outputPath: string,
  reencode: boolean = false
): Promise<void> => {
  // Write concat list file
  const listPath = tmpFile('.txt');
  const listContent = filePaths.map((p) => `file '${p}'`).join('\n');
  await fs.writeFile(listPath, listContent);

  const args = [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', listPath,
  ];

  if (reencode) {
    args.push('-c:v', 'libvpx-vp9', '-b:v', '2M', '-c:a', 'libopus');
  } else {
    args.push('-c', 'copy');
  }

  args.push(outputPath);

  try {
    await execFileAsync(ffmpegPath, args, { timeout: 300000 });
  } finally {
    await fs.unlink(listPath).catch(() => {});
  }
};

/**
 * Combine video segments into a single output file.
 * Uses stream copy for speed; falls back to re-encode on failure.
 *
 * @param uploadedFiles - Array of file paths (from multer)
 * @param segments - Array of { filePath, startTime, endTime } describing each segment
 * @returns { outputPath, duration } - Path to final combined file and its duration
 */
export const combineVideos = async (
  uploadedFiles: string[],
  segments: VideoSegment[]
): Promise<CombineResult> => {
  const trimmedPaths: string[] = [];
  const outputPath = tmpFile('.webm');

  // If only one segment with no trimming needed, just use the file directly
  if (segments.length === 1) {
    const seg = segments[0];
    const dur = seg.endTime - seg.startTime;

    // Check if we need to trim at all (segment spans entire file)
    if (seg.startTime < 0.1 && dur > 0) {
      // Still trim to get the exact time range
      await trimSegment(seg.filePath, seg.startTime, dur, outputPath);
      const duration = await getVideoDuration(outputPath);
      return { outputPath, duration: duration || dur };
    }
  }

  try {
    // Step 1: Trim each segment
    for (const seg of segments) {
      const trimmedPath = tmpFile('.webm');
      trimmedPaths.push(trimmedPath);
      const duration = seg.endTime - seg.startTime;
      await trimSegment(seg.filePath, seg.startTime, duration, trimmedPath);
    }

    // Step 2: Concatenate all trimmed segments
    await concatFiles(trimmedPaths, outputPath);
  } catch (err) {
    // Fallback: re-encode if stream copy failed (codec mismatch)
    console.warn('FFmpeg stream copy failed, falling back to re-encode:', err);

    // Clean up any partial output
    await fs.unlink(outputPath).catch(() => {});

    // Re-trim with re-encoding
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const trimmedPath = trimmedPaths[i] || tmpFile('.webm');
      if (!trimmedPaths[i]) trimmedPaths.push(trimmedPath);
      const duration = seg.endTime - seg.startTime;
      await trimSegment(seg.filePath, seg.startTime, duration, trimmedPath, true);
    }

    // Re-concat with re-encoding
    await concatFiles(trimmedPaths, outputPath, true);
  }

  // Clean up trimmed intermediates
  await Promise.all(trimmedPaths.map((p) => fs.unlink(p).catch(() => {})));

  const duration = await getVideoDuration(outputPath);
  const totalExpected = segments.reduce((sum, s) => sum + (s.endTime - s.startTime), 0);

  return { outputPath, duration: duration || totalExpected };
};

/**
 * Clean up temp files (call in finally blocks)
 */
export const cleanupFiles = async (filePaths: string[]): Promise<void> => {
  await Promise.all(filePaths.map((p) => fs.unlink(p).catch(() => {})));
};
