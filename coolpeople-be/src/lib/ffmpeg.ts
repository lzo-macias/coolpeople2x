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
 * Trim a single segment from a video file.
 * When re-encoding, places -ss after -i for frame-accurate seeking and
 * normalises resolution to 1080x1920 so segments from different sources
 * can be concatenated without glitches.
 */
const trimSegment = async (
  inputPath: string,
  startTime: number,
  duration: number,
  outputPath: string,
  reencode: boolean = false
): Promise<void> => {
  const args: string[] = ['-y'];

  if (reencode) {
    // Frame-accurate: decode from beginning, then seek
    args.push('-i', inputPath, '-ss', String(startTime), '-t', String(duration));
    // Scale + pad to 1080x1920 so all segments have matching dimensions
    args.push(
      '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black',
      '-c:v', 'libvpx-vp9', '-b:v', '8M', '-c:a', 'libopus', '-ar', '48000', '-ac', '2',
    );
  } else {
    // Fast seek before input for stream copy (keyframe-aligned)
    args.push('-ss', String(startTime), '-t', String(duration), '-i', inputPath);
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
    args.push('-c:v', 'libvpx-vp9', '-b:v', '8M', '-c:a', 'libopus', '-ar', '48000', '-ac', '2');
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

  // Detect if segments reference multiple distinct source files.
  // Different sources likely have different codecs/resolutions, so we must
  // re-encode to produce a clean, glitch-free combined video.
  const uniqueSources = new Set(segments.map((s) => s.filePath));
  const forceReencode = uniqueSources.size > 1;

  // If only one segment with no trimming needed, just use the file directly
  if (segments.length === 1 && !forceReencode) {
    const seg = segments[0];
    const dur = seg.endTime - seg.startTime;

    // Check if we need to trim at all (segment spans entire file)
    if (seg.startTime < 0.1 && dur > 0) {
      // Try stream copy first, fall back to re-encode (needed for mp4→webm)
      try {
        await trimSegment(seg.filePath, seg.startTime, dur, outputPath);
        const duration = await getVideoDuration(outputPath);
        return { outputPath, duration: duration || dur };
      } catch (err) {
        console.warn('Stream copy failed for single segment, re-encoding:', err);
        await fs.unlink(outputPath).catch(() => {});
        await trimSegment(seg.filePath, seg.startTime, dur, outputPath, true);
        const duration = await getVideoDuration(outputPath);
        return { outputPath, duration: duration || dur };
      }
    }
  }

  if (forceReencode) {
    // Multi-source: always re-encode for frame-accurate trimming and
    // consistent codec/resolution across all segments.
    for (const seg of segments) {
      const trimmedPath = tmpFile('.webm');
      trimmedPaths.push(trimmedPath);
      const duration = seg.endTime - seg.startTime;
      await trimSegment(seg.filePath, seg.startTime, duration, trimmedPath, true);
    }
    await concatFiles(trimmedPaths, outputPath, false); // concat demuxer with stream copy (already re-encoded to same format)
  } else {
    // Single source: try stream copy first, fall back to re-encode
    try {
      for (const seg of segments) {
        const trimmedPath = tmpFile('.webm');
        trimmedPaths.push(trimmedPath);
        const duration = seg.endTime - seg.startTime;
        await trimSegment(seg.filePath, seg.startTime, duration, trimmedPath);
      }
      await concatFiles(trimmedPaths, outputPath);
    } catch (err) {
      console.warn('FFmpeg stream copy failed, falling back to re-encode:', err);
      await fs.unlink(outputPath).catch(() => {});

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const trimmedPath = trimmedPaths[i] || tmpFile('.webm');
        if (!trimmedPaths[i]) trimmedPaths.push(trimmedPath);
        const duration = seg.endTime - seg.startTime;
        await trimSegment(seg.filePath, seg.startTime, duration, trimmedPath, true);
      }
      await concatFiles(trimmedPaths, outputPath, true);
    }
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
