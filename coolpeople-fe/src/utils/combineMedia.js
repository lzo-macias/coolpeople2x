/**
 * combineMedia.js
 * Combines multiple media items (photos + videos) into a single video
 * using Canvas + MediaRecorder. Returns a blob URL and segment boundaries.
 */

const DEFAULT_W = 1080
const DEFAULT_H = 1920
const FPS = 30
const IMAGE_DURATION = 5 // seconds per image
const VIDEO_BITRATE = 16_000_000 // 16 Mbps for high quality output

// Preferred MIME types in order
function getSupportedMime() {
  if (typeof MediaRecorder === 'undefined') return null
  const types = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ]
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t
  }
  return null
}

// Draw media to fill canvas (cover mode — crops to fill, centered)
// If mirrored, flips horizontally before drawing
function drawCover(ctx, source, srcW, srcH, mirrored, canvasW, canvasH) {
  if (mirrored) {
    ctx.save()
    ctx.translate(canvasW, 0)
    ctx.scale(-1, 1)
  }
  const scale = Math.max(canvasW / srcW, canvasH / srcH)
  const dw = srcW * scale
  const dh = srcH * scale
  const dx = (canvasW - dw) / 2
  const dy = (canvasH - dh) / 2
  ctx.drawImage(source, dx, dy, dw, dh)
  if (mirrored) {
    ctx.restore()
  }
}

// Get the actual duration of a video element (handles blob URL Infinity issue)
function probeDuration(video) {
  return new Promise((resolve) => {
    if (video.duration && isFinite(video.duration)) {
      resolve(video.duration)
      return
    }
    // Blob URL Infinity workaround: seek to a huge number, then read duration
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked)
      video.currentTime = 0
      resolve(isFinite(video.duration) ? video.duration : 10)
    }
    video.addEventListener('seeked', onSeeked)
    video.currentTime = 1e10
  })
}

// Load an image and return it + dimensions
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    // Only set crossOrigin for remote URLs — blob/data URLs are same-origin
    // and crossOrigin can taint the canvas in Safari, breaking captureStream
    if (!url.startsWith('blob:') && !url.startsWith('data:')) {
      img.crossOrigin = 'anonymous'
    }
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

// Load a video, return it ready to play with known duration
function loadVideo(url) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    // Only set crossOrigin for remote URLs — blob/data URLs are same-origin
    // and crossOrigin can taint the canvas in Safari, breaking captureStream
    if (!url.startsWith('blob:') && !url.startsWith('data:')) {
      video.crossOrigin = 'anonymous'
    }
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true
    video.src = url

    const onReady = async () => {
      video.removeEventListener('loadeddata', onReady)
      const dur = await probeDuration(video)
      video.currentTime = 0
      resolve({ video, duration: dur })
    }
    video.addEventListener('loadeddata', onReady)
    video.addEventListener('error', () => reject(new Error('Video load failed')))
    video.load()
  })
}

/**
 * Render a single image to the canvas for IMAGE_DURATION seconds.
 * Draws static frames to the canvas while the MediaRecorder captures.
 * Uses explicit requestFrame() to guarantee each draw is captured.
 */
function renderImage(ctx, img, durationSec, mirrored, onProgress, progressBase, progressSpan, canvasW, canvasH, videoTrack) {
  return new Promise((resolve) => {
    const totalFrames = durationSec * FPS
    let frame = 0

    const interval = setInterval(() => {
      ctx.clearRect(0, 0, canvasW, canvasH)
      drawCover(ctx, img, img.naturalWidth, img.naturalHeight, mirrored, canvasW, canvasH)

      // Explicitly tell captureStream to grab this frame
      if (videoTrack && videoTrack.requestFrame) {
        videoTrack.requestFrame()
      }

      frame++

      if (onProgress) {
        onProgress(progressBase + (frame / totalFrames) * progressSpan)
      }

      if (frame >= totalFrames) {
        clearInterval(interval)
        resolve()
      }
    }, 1000 / FPS)
  })
}

/**
 * Render a video to the canvas for its full duration.
 * Plays the video and draws frames via requestAnimationFrame.
 * Routes audio through AudioContext → destination for MediaRecorder.
 */
function renderVideo(ctx, videoEl, duration, mirrored, audioCtx, dest, onProgress, progressBase, progressSpan, startTime = 0, canvasW = DEFAULT_W, canvasH = DEFAULT_H, videoTrack = null) {
  return new Promise((resolve) => {
    let source = null
    try {
      source = audioCtx.createMediaElementSource(videoEl)
      source.connect(dest)
    } catch {
      // Already connected or no audio track — safe to ignore
    }

    videoEl.muted = false
    videoEl.currentTime = startTime
    let animId = null
    let resolved = false

    const cleanup = () => {
      if (resolved) return
      resolved = true
      cancelAnimationFrame(animId)
      videoEl.removeEventListener('ended', onEnded)
      videoEl.muted = true
      if (source) {
        try { source.disconnect() } catch {}
      }
      clearTimeout(safetyTimer)
      resolve()
    }

    const draw = () => {
      if (videoEl.ended || videoEl.paused) return
      ctx.clearRect(0, 0, canvasW, canvasH)
      drawCover(ctx, videoEl, videoEl.videoWidth || canvasW, videoEl.videoHeight || canvasH, mirrored, canvasW, canvasH)

      // Explicitly tell captureStream to grab this frame
      if (videoTrack && videoTrack.requestFrame) {
        videoTrack.requestFrame()
      }

      if (onProgress && duration > 0) {
        const elapsed = videoEl.currentTime - startTime
        onProgress(progressBase + (elapsed / duration) * progressSpan)
      }

      // Stop when we've played for the requested duration
      if (videoEl.currentTime >= startTime + duration - 0.05) {
        videoEl.pause()
        cleanup()
        return
      }

      animId = requestAnimationFrame(draw)
    }

    const onEnded = () => {
      cleanup()
    }

    videoEl.addEventListener('ended', onEnded)

    // Safety timeout in case video doesn't fire 'ended'
    const safetyTimer = setTimeout(() => {
      videoEl.pause()
      cleanup()
    }, (duration + 2) * 1000)

    videoEl.play().then(() => {
      draw()
    }).catch(() => {
      cleanup()
    })
  })
}

/**
 * Main export: combines multiple media items into a single video.
 *
 * @param {Array} items - Array of { type: 'image'|'video', url: string, isMirrored?: boolean, startTime?: number, endTime?: number }
 *   url should be a blob URL or data URL accessible from the page.
 *   startTime/endTime are optional trim points (seconds) for video items.
 * @param {Function} onProgress - Called with a number 0-1 indicating progress.
 * @returns {Promise<{ blobUrl: string, segments: Array<{start, end}>, duration: number }>}
 */
export async function combineMediaItems(items, onProgress, options = {}) {
  if (!items || items.length === 0) {
    throw new Error('No items to combine')
  }

  const mimeType = getSupportedMime()
  if (!mimeType) {
    throw new Error('MediaRecorder not supported in this browser')
  }

  const bitrate = options.bitrate || VIDEO_BITRATE

  // Phase 1: Probe durations and preload all items
  const loaded = []
  for (const item of items) {
    if (item.type === 'image') {
      const img = await loadImage(item.url)
      loaded.push({ type: 'image', img, duration: IMAGE_DURATION, mirrored: item.isMirrored || false, startTime: 0 })
    } else {
      const { video, duration: fullDur } = await loadVideo(item.url)
      const startTime = item.startTime || 0
      const endTime = item.endTime != null ? item.endTime : fullDur
      const effectiveDur = Math.min(endTime, fullDur) - startTime
      loaded.push({ type: 'video', video, duration: effectiveDur, mirrored: item.isMirrored || false, startTime })
    }
  }

  const totalDuration = loaded.reduce((sum, l) => sum + l.duration, 0)
  const hasVideo = loaded.some(l => l.type === 'video')

  // Determine canvas dimensions from the first item, capped to max 1920 on longest side
  const first = loaded[0]
  let canvasW, canvasH
  if (first.type === 'video') {
    canvasW = first.video.videoWidth || DEFAULT_W
    canvasH = first.video.videoHeight || DEFAULT_H
  } else {
    canvasW = first.img.naturalWidth || DEFAULT_W
    canvasH = first.img.naturalHeight || DEFAULT_H
  }
  const maxDim = 1920
  if (canvasW > maxDim || canvasH > maxDim) {
    const scale = maxDim / Math.max(canvasW, canvasH)
    canvasW = Math.round(canvasW * scale)
    canvasH = Math.round(canvasH * scale)
  }

  // Phase 2: Set up Canvas + AudioContext + MediaRecorder
  const canvas = document.createElement('canvas')
  canvas.width = canvasW
  canvas.height = canvasH
  const ctx = canvas.getContext('2d')

  // Use captureStream(0) — only captures when we explicitly call requestFrame()
  // This is more reliable than captureStream(FPS) which depends on Chrome detecting
  // canvas changes (unreliable for static images redrawn via setInterval)
  const canvasStream = canvas.captureStream(0)
  const videoTrack = canvasStream.getVideoTracks()[0]

  // Build the stream for MediaRecorder
  let combinedStream
  let audioCtx = null
  let dest = null

  if (hasVideo) {
    // Only add audio track when there are actual videos with audio
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    // Ensure AudioContext is running (may be suspended if user gesture expired)
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume()
    }
    dest = audioCtx.createMediaStreamDestination()
    combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...dest.stream.getAudioTracks(),
    ])
  } else {
    // Images only — video-only stream, no audio needed
    combinedStream = canvasStream
  }

  const chunks = []
  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: bitrate,
  })
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  const recordingStopped = new Promise((resolve) => {
    recorder.onstop = () => resolve()
  })

  // Draw first frame before starting recorder so it has initial content
  if (loaded[0].type === 'image') {
    drawCover(ctx, loaded[0].img, loaded[0].img.naturalWidth, loaded[0].img.naturalHeight, loaded[0].mirrored, canvasW, canvasH)
  }
  if (videoTrack && videoTrack.requestFrame) {
    videoTrack.requestFrame()
  }

  recorder.start(100)

  // Phase 3: Render each item sequentially
  const segments = []
  let currentTime = 0

  for (let i = 0; i < loaded.length; i++) {
    const item = loaded[i]
    const progressBase = currentTime / totalDuration
    const progressSpan = item.duration / totalDuration

    segments.push({ start: currentTime, end: currentTime + item.duration })

    if (item.type === 'image') {
      await renderImage(ctx, item.img, item.duration, item.mirrored, onProgress, progressBase, progressSpan, canvasW, canvasH, videoTrack)
    } else {
      await renderVideo(ctx, item.video, item.duration, item.mirrored, audioCtx, dest, onProgress, progressBase, progressSpan, item.startTime, canvasW, canvasH, videoTrack)
    }

    currentTime += item.duration
  }

  // Phase 4: Stop recording and produce output
  // IMPORTANT: Stop recorder first, then wait for it to flush all data,
  // THEN stop the canvas stream tracks. Stopping tracks before the recorder
  // finishes causes data loss (empty/broken blob).
  recorder.stop()
  await recordingStopped
  canvasStream.getTracks().forEach((t) => t.stop())

  if (audioCtx) {
    await audioCtx.close()
  }

  const blob = new Blob(chunks, { type: mimeType })

  if (blob.size === 0) {
    throw new Error('Recording produced empty output — no frames were captured')
  }

  const blobUrl = URL.createObjectURL(blob)

  if (onProgress) onProgress(1)

  return { blobUrl, segments, duration: totalDuration }
}
