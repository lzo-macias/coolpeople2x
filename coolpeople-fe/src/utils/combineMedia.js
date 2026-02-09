/**
 * combineMedia.js
 * Combines multiple media items (photos + videos) into a single video
 * using Canvas + MediaRecorder. Returns a blob URL and segment boundaries.
 */

const CANVAS_W = 1080
const CANVAS_H = 1920
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
function drawCover(ctx, source, srcW, srcH, mirrored) {
  if (mirrored) {
    ctx.save()
    ctx.translate(CANVAS_W, 0)
    ctx.scale(-1, 1)
  }
  const scale = Math.max(CANVAS_W / srcW, CANVAS_H / srcH)
  const dw = srcW * scale
  const dh = srcH * scale
  const dx = (CANVAS_W - dw) / 2
  const dy = (CANVAS_H - dh) / 2
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
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

// Load a video, return it ready to play with known duration
function loadVideo(url) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
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
 */
function renderImage(ctx, img, durationSec, mirrored, onProgress, progressBase, progressSpan) {
  return new Promise((resolve) => {
    const totalFrames = durationSec * FPS
    let frame = 0

    const interval = setInterval(() => {
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
      drawCover(ctx, img, img.naturalWidth, img.naturalHeight, mirrored)
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
function renderVideo(ctx, videoEl, duration, mirrored, audioCtx, dest, onProgress, progressBase, progressSpan, startTime = 0) {
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
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
      drawCover(ctx, videoEl, videoEl.videoWidth || CANVAS_W, videoEl.videoHeight || CANVAS_H, mirrored)

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

  // Phase 2: Set up Canvas + AudioContext + MediaRecorder
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_W
  canvas.height = CANVAS_H
  const ctx = canvas.getContext('2d')

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  const dest = audioCtx.createMediaStreamDestination()

  // Combine canvas video stream with audio stream
  const canvasStream = canvas.captureStream(FPS)
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...dest.stream.getAudioTracks(),
  ])

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
      await renderImage(ctx, item.img, item.duration, item.mirrored, onProgress, progressBase, progressSpan)
    } else {
      await renderVideo(ctx, item.video, item.duration, item.mirrored, audioCtx, dest, onProgress, progressBase, progressSpan, item.startTime)
    }

    currentTime += item.duration
  }

  // Phase 4: Stop recording and produce output
  recorder.stop()
  canvasStream.getTracks().forEach((t) => t.stop())
  await recordingStopped

  await audioCtx.close()

  const blob = new Blob(chunks, { type: mimeType })
  const blobUrl = URL.createObjectURL(blob)

  if (onProgress) onProgress(1)

  return { blobUrl, segments, duration: totalDuration }
}
