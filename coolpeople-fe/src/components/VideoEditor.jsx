import { useState, useRef, useEffect, useCallback } from 'react'
import '../styling/VideoEditor.css'

function VideoEditor({ videoUrl, isMirrored, selectedSound, initialTrimStart = 0, initialTrimEnd = null, initialSegments = null, initialSoundOffset = 0, initialSoundStartFrac = 0, initialSoundEndFrac = 1, initialVideoVolume = 100, initialSoundVolume = 100, onDone, onClose, showSelfieOverlay, selfieSize, selfiePosition }) {
  const videoRef = useRef(null)
  const thumbVideoRef = useRef(null)
  const timelineRef = useRef(null)
  const previewRef = useRef(null)
  const [previewWidth, setPreviewWidth] = useState(0)
  const rafRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  // When restoring segments, init trimStart/trimEnd from segment 0 (not from props which
  // may reflect the last-selected segment and would corrupt segment 0 via sync effect)
  const [trimStart, setTrimStart] = useState(
    initialSegments && initialSegments.length > 0 ? initialSegments[0].start : initialTrimStart
  )
  const [trimEnd, setTrimEnd] = useState(
    initialSegments && initialSegments.length > 0 ? initialSegments[0].end : initialTrimEnd
  )
  const THUMB_COUNT = 10
  const [thumbnails, setThumbnails] = useState(Array(THUMB_COUNT).fill(null))
  const [showTimelineOptions, setShowTimelineOptions] = useState(false)
  const [dragging, setDragging] = useState(null) // 'left', 'right', 'scrub', 'soundLeft', 'soundRight', 'soundSlide', 'soundMove'
  const dragRef = useRef({ type: null, startX: 0, startVal: 0, startVal2: 0 })

  // Sound track state
  const [soundDuration, setSoundDuration] = useState(0)
  const [soundOffset, setSoundOffset] = useState(initialSoundOffset) // where in the sound file we start (seconds)
  const [soundStartFrac, setSoundStartFrac] = useState(initialSoundStartFrac) // left handle (0-1 fraction of bar)
  const [soundEndFrac, setSoundEndFrac] = useState(initialSoundEndFrac) // right handle (0-1 fraction of bar)
  const [soundSlideActive, setSoundSlideActive] = useState(false) // double-click to enable slide mode
  const soundTrackRef = useRef(null)
  const soundBarRef = useRef(null)
  const soundAudioRef = useRef(null)

  // Segments state — each segment is a clip with start/end in the source video
  // Restore from initialSegments if provided, adding IDs for internal tracking
  const buildInitialSegments = () => {
    if (initialSegments && initialSegments.length > 0) {
      return initialSegments.map((s, i) => ({ id: i + 1, start: s.start, end: s.end }))
    }
    return [{ id: 1, start: initialTrimStart, end: initialTrimEnd }]
  }
  const [segments, setSegments] = useState(buildInitialSegments)
  const [selectedSegmentId, setSelectedSegmentId] = useState(segments[0]?.id || 1)
  const nextSegmentId = useRef(segments.length + 1)
  const selectedSegRef = useRef(null)
  const [segPointerDown, setSegPointerDown] = useState(null) // { idx, startX, track }
  const [reorderDragIdx, setReorderDragIdx] = useState(null)
  const syncingRef = useRef(false)

  // Volume state
  const [showSoundOptions, setShowSoundOptions] = useState(false)
  const [showVolumePopup, setShowVolumePopup] = useState(false)
  const [videoVolume, setVideoVolume] = useState(initialVideoVolume) // 0-100
  const [soundVolume, setSoundVolume] = useState(initialSoundVolume) // 0-100

  // Central playhead state
  const playingSegIdxRef = useRef(0)
  const [outputPlayheadFrac, setOutputPlayheadFrac] = useState(0)
  const playheadAreaRef = useRef(null)

  // Ref for sound params so RAF tick always reads latest values
  const soundParamsRef = useRef({ soundStartFrac: 0, soundEndFrac: 1, soundOffset: 0 })
  soundParamsRef.current = { soundStartFrac, soundEndFrac, soundOffset }

  const MIN_CLIP = 1 // minimum 1 second clip
  const MAX_CLIP = 60 // maximum 60 seconds

  // Load video metadata — handle blob URLs that report Infinity duration
  const handleLoadedMetadata = useCallback(() => {
    const vid = videoRef.current
    if (!vid) return
    let dur = vid.duration

    if (!dur || !isFinite(dur) || dur <= 0) {
      // Blob URLs from MediaRecorder often have Infinity duration.
      // Seek to a huge time — browser clamps to actual end — then read currentTime.
      const resolveDuration = () => {
        const realDur = vid.currentTime
        if (realDur > 0) {
          setDuration(realDur)
          if (trimEnd === null) {
            setTrimEnd(Math.min(realDur, MAX_CLIP))
          }
          vid.currentTime = trimStart
        }
      }
      vid.addEventListener('seeked', resolveDuration, { once: true })
      vid.currentTime = 1e10
      return
    }

    setDuration(dur)
    if (trimEnd === null) {
      setTrimEnd(Math.min(dur, MAX_CLIP))
    }
    vid.currentTime = trimStart
  }, [trimStart, trimEnd])

  // Extract thumbnails from video (runs independently — determines duration itself)
  useEffect(() => {
    if (!videoUrl) return
    let cancelled = false

    const extractThumbs = async () => {
      const vid = document.createElement('video')
      vid.muted = true
      vid.playsInline = true
      vid.preload = 'auto'
      // Don't set crossOrigin for blob URLs — causes failures
      if (!videoUrl.startsWith('blob:') && !videoUrl.startsWith('data:')) {
        vid.crossOrigin = 'anonymous'
      }
      vid.src = videoUrl

      try {
        // Wait for video to have enough data
        await new Promise((resolve, reject) => {
          vid.onloadeddata = resolve
          vid.onerror = () => reject(new Error('Video load error'))
          setTimeout(() => resolve(), 4000) // fallback resolve
        })

        // Determine duration — blob URLs from MediaRecorder often return Infinity
        let dur = vid.duration
        if (!dur || !isFinite(dur) || dur <= 0) {
          // Workaround: seek to a very large time, browser clamps to actual end
          vid.currentTime = 1e10
          await new Promise((resolve) => {
            const onSeeked = () => { vid.removeEventListener('seeked', onSeeked); resolve() }
            vid.addEventListener('seeked', onSeeked)
            setTimeout(resolve, 2000)
          })
          dur = vid.currentTime
          if (!dur || dur <= 0) dur = 10 // last resort fallback
        }

        if (cancelled) return

        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        canvas.width = 80
        canvas.height = 56

        const frames = []
        for (let i = 0; i < THUMB_COUNT; i++) {
          if (cancelled) return
          const time = (dur / THUMB_COUNT) * (i + 0.5)
          vid.currentTime = time

          await new Promise((resolve) => {
            const onSeeked = () => { vid.removeEventListener('seeked', onSeeked); resolve() }
            vid.addEventListener('seeked', onSeeked)
            setTimeout(resolve, 1000) // per-frame timeout
          })

          try {
            if (isMirrored) {
              ctx.save()
              ctx.translate(canvas.width, 0)
              ctx.scale(-1, 1)
            }
            ctx.drawImage(vid, 0, 0, canvas.width, canvas.height)
            if (isMirrored) ctx.restore()
            frames.push(canvas.toDataURL('image/jpeg', 0.5))
          } catch {
            frames.push(null)
          }
        }

        if (!cancelled) setThumbnails(frames)
      } catch (err) {
        console.warn('Thumbnail extraction failed:', err)
      } finally {
        vid.src = ''
        vid.load()
      }
    }

    extractThumbs()
    return () => { cancelled = true }
  }, [videoUrl, isMirrored])

  // Load sound duration — listen to multiple events as fallback
  useEffect(() => {
    if (!selectedSound?.audioUrl) { setSoundDuration(0); return }
    const audio = new Audio()
    audio.preload = 'auto'
    audio.crossOrigin = 'anonymous'
    const setDur = () => {
      if (isFinite(audio.duration) && audio.duration > 0) {
        setSoundDuration(audio.duration)
      }
    }
    audio.addEventListener('loadedmetadata', setDur)
    audio.addEventListener('durationchange', setDur)
    audio.addEventListener('canplay', setDur)
    audio.src = selectedSound.audioUrl
    return () => {
      audio.removeEventListener('loadedmetadata', setDur)
      audio.removeEventListener('durationchange', setDur)
      audio.removeEventListener('canplay', setDur)
      audio.src = ''
    }
  }, [selectedSound])

  // Reset sound offset when sound changes (skip initial mount to preserve restored value)
  const soundMountedRef = useRef(false)
  useEffect(() => {
    if (!soundMountedRef.current) { soundMountedRef.current = true; return }
    setSoundOffset(0)
  }, [selectedSound])

  // Deactivate sound slide mode when clicking outside the sound bar
  useEffect(() => {
    if (!soundSlideActive) return
    const handleClickOutside = (e) => {
      if (soundBarRef.current && !soundBarRef.current.contains(e.target)) {
        setSoundSlideActive(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [soundSlideActive])

  // Set audio source when sound changes
  useEffect(() => {
    const audio = soundAudioRef.current
    if (!audio) return
    if (selectedSound?.audioUrl) {
      audio.src = selectedSound.audioUrl
      audio.loop = false
    } else {
      audio.pause()
      audio.src = ''
    }
  }, [selectedSound])

  // Pause audio when playback stops
  useEffect(() => {
    if (!isPlaying && soundAudioRef.current && !soundAudioRef.current.paused) {
      soundAudioRef.current.pause()
    }
  }, [isPlaying])

  // Multi-segment sequential playback + central playhead RAF
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }

    // Capture segments at effect start so RAF uses consistent data
    const segs = segments
    const dur = duration

    const tick = () => {
      const vid = videoRef.current
      if (!vid || dur <= 0) { rafRef.current = requestAnimationFrame(tick); return }

      const t = vid.currentTime
      setCurrentTime(t)

      const idx = playingSegIdxRef.current
      const seg = segs[idx]
      if (!seg) return

      const segEnd = seg.end ?? dur

      // If past current segment end, advance to next
      if (t >= segEnd - 0.05) {
        if (idx < segs.length - 1) {
          playingSegIdxRef.current = idx + 1
          const nextSeg = segs[idx + 1]
          vid.currentTime = nextSeg.start
        } else {
          // Reached the end — stop and reset to beginning
          vid.pause()
          if (soundAudioRef.current && !soundAudioRef.current.paused) soundAudioRef.current.pause()
          setIsPlaying(false)
          playingSegIdxRef.current = 0
          vid.currentTime = segs[0].start
          setCurrentTime(segs[0].start)
          setOutputPlayheadFrac(0)
          return
        }
      }

      // Calculate output playhead fraction
      let outputTime = 0
      for (let i = 0; i < playingSegIdxRef.current && i < segs.length; i++) {
        outputTime += (segs[i].end ?? dur) - segs[i].start
      }
      const curSeg = segs[playingSegIdxRef.current]
      if (curSeg) {
        const elapsed = Math.max(0, vid.currentTime - curSeg.start)
        const segDur = (curSeg.end ?? dur) - curSeg.start
        outputTime += Math.min(elapsed, segDur)
      }
      const total = segs.reduce((sum, s) => sum + ((s.end ?? dur) - s.start), 0)
      setOutputPlayheadFrac(total > 0 ? Math.min(1, outputTime / total) : 0)

      // Sync audio to output timeline position (independent of source video time)
      const audio = soundAudioRef.current
      if (audio && audio.src) {
        const sp = soundParamsRef.current
        const soundStart = sp.soundStartFrac * total
        const soundEnd = sp.soundEndFrac * total
        if (outputTime >= soundStart && outputTime <= soundEnd) {
          const targetAudioTime = sp.soundOffset + (outputTime - soundStart)
          if (Math.abs(audio.currentTime - targetAudioTime) > 0.3) {
            audio.currentTime = targetAudioTime
          }
          if (audio.paused) audio.play().catch(() => {})
        } else {
          if (!audio.paused) audio.pause()
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isPlaying, segments, duration])

  // --- Segment logic ---
  const selectedSegmentIdx = segments.findIndex(s => s.id === selectedSegmentId)
  const selectedSeg = segments[selectedSegmentIdx]
  const totalSegDuration = segments.reduce((sum, s) => sum + ((s.end ?? duration) - s.start), 0)

  // Update output playhead when not playing (segment selection, handle drags, etc.)
  useEffect(() => {
    if (isPlaying) return
    const idx = selectedSegmentIdx >= 0 ? selectedSegmentIdx : 0
    playingSegIdxRef.current = idx
    let outputTime = 0
    for (let i = 0; i < idx && i < segments.length; i++) {
      outputTime += (segments[i].end ?? duration) - segments[i].start
    }
    const seg = segments[idx]
    if (seg) {
      const segDur = (seg.end ?? duration) - seg.start
      outputTime += Math.max(0, Math.min(segDur, currentTime - seg.start))
    }
    setOutputPlayheadFrac(totalSegDuration > 0 ? Math.min(1, outputTime / totalSegDuration) : 0)
  }, [currentTime, selectedSegmentIdx, segments, duration, totalSegDuration, isPlaying])

  const togglePlay = () => {
    const vid = videoRef.current
    if (!vid) return

    if (isPlaying) {
      vid.pause()
      setIsPlaying(false)
    } else {
      // Resume from current playhead position
      const idx = playingSegIdxRef.current
      const seg = segments[idx]
      if (seg) {
        const segEnd = seg.end ?? duration
        // If video time is outside current segment, seek to segment start
        if (vid.currentTime < seg.start || vid.currentTime >= segEnd) {
          vid.currentTime = seg.start
          setCurrentTime(seg.start)
        }
      }
      vid.play().catch(err => console.warn('Video play failed:', err))
      setIsPlaying(true)
    }
  }

  // Get timeline rect for coordinate calculations
  const getTimelineRect = () => {
    if (!timelineRef.current) return { left: 0, width: 1 }
    return timelineRef.current.getBoundingClientRect()
  }

  const getSoundTrackRect = () => {
    if (!soundTrackRef.current) return { left: 0, width: 1 }
    return soundTrackRef.current.getBoundingClientRect()
  }

  const getSoundBarRect = () => {
    if (!soundBarRef.current) return { left: 0, width: 1 }
    return soundBarRef.current.getBoundingClientRect()
  }

  // Drag handlers
  // Seek to a fraction (0–1) of the output timeline
  const seekToOutputFrac = (frac) => {
    const total = segments.reduce((sum, s) => sum + ((s.end ?? duration) - s.start), 0)
    if (total <= 0) return
    let targetTime = frac * total
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]
      const segDur = (seg.end ?? duration) - seg.start
      if (targetTime <= segDur) {
        // Seek into this segment
        playingSegIdxRef.current = i
        const seekTime = seg.start + targetTime
        if (videoRef.current) videoRef.current.currentTime = seekTime
        setCurrentTime(seekTime)
        setOutputPlayheadFrac(frac)
        // Also select this segment
        if (seg.id !== selectedSegmentId) {
          setSelectedSegmentId(seg.id)
          syncingRef.current = true
          setTrimStart(seg.start)
          setTrimEnd(seg.end)
        }
        return
      }
      targetTime -= segDur
    }
  }

  const handleDragStart = (type, clientX, segEl) => {
    setDragging(type)
    const startVal = type === 'left' ? trimStart
      : type === 'right' ? (trimEnd ?? duration)
      : type === 'soundSlide' ? soundOffset
      : type === 'soundLeft' ? soundStartFrac
      : type === 'soundRight' ? soundEndFrac
      : type === 'soundMove' ? soundStartFrac
      : currentTime
    const startVal2 = type === 'soundMove' ? soundEndFrac : 0
    // For left/right handle drag: compute seconds-per-pixel from selected segment's width
    let secPerPx = 0
    const el = segEl || selectedSegRef.current
    if ((type === 'left' || type === 'right') && el) {
      const segRect = el.getBoundingClientRect()
      const segDur = (trimEnd ?? duration) - trimStart
      secPerPx = segRect.width > 0 ? segDur / segRect.width : 1
    }
    dragRef.current = { type, startX: clientX, startVal, startVal2, secPerPx }

    // Pause during drag
    if (videoRef.current && isPlaying) {
      videoRef.current.pause()
      setIsPlaying(false)
    }
  }

  const handleDragMove = useCallback((clientX) => {
    if (!dragRef.current.type || duration <= 0) return

    const type = dragRef.current.type

    // Sound track drag handling
    if (type === 'soundSlide' && soundDuration > 0) {
      const rect = getSoundTrackRect()
      const dx = clientX - dragRef.current.startX
      const secPerPx = duration / rect.width
      const maxOffset = Math.max(0, soundDuration - duration)
      const newOffset = Math.max(0, Math.min(maxOffset, dragRef.current.startVal - dx * secPerPx))
      setSoundOffset(newOffset)
      return
    }

    // Sound move — drag entire bar left/right on the timeline
    if (type === 'soundMove') {
      const rect = getSoundTrackRect()
      const dx = clientX - dragRef.current.startX
      const deltaFrac = dx / rect.width
      const barWidth = dragRef.current.startVal2 - dragRef.current.startVal
      let newStart = dragRef.current.startVal + deltaFrac
      let newEnd = dragRef.current.startVal2 + deltaFrac
      // Clamp to 0–1
      if (newStart < 0) { newStart = 0; newEnd = barWidth }
      if (newEnd > 1) { newEnd = 1; newStart = 1 - barWidth }
      setSoundStartFrac(newStart)
      setSoundEndFrac(newEnd)
      return
    }

    // Sound left/right handle dragging
    if (type === 'soundLeft' || type === 'soundRight') {
      const rect = getSoundBarRect()
      const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      const MIN_SOUND_FRAC = 0.05
      if (type === 'soundLeft') {
        setSoundStartFrac(Math.min(fraction, soundEndFrac - MIN_SOUND_FRAC))
      } else {
        setSoundEndFrac(Math.max(fraction, soundStartFrac + MIN_SOUND_FRAC))
      }
      return
    }

    // Playhead scrub — drag to seek across entire output timeline
    if (type === 'playheadScrub') {
      const areaRect = playheadAreaRef.current?.getBoundingClientRect()
      if (!areaRect || areaRect.width <= 0) return
      const frac = Math.max(0, Math.min(1, (clientX - areaRect.left) / areaRect.width))
      seekToOutputFrac(frac)
      return
    }

    // Handle trim — delta-based (since handles are inside per-segment containers)
    const dx = clientX - dragRef.current.startX
    const dt = dx * (dragRef.current.secPerPx || 0)
    const end = trimEnd ?? duration

    if (type === 'left') {
      const maxStart = end - MIN_CLIP
      const newStart = Math.max(0, Math.min(maxStart, dragRef.current.startVal + dt))
      setTrimStart(newStart)
      if (videoRef.current) videoRef.current.currentTime = newStart
      setCurrentTime(newStart)
    } else if (type === 'right') {
      const minEnd = trimStart + MIN_CLIP
      const maxEnd = Math.min(duration, trimStart + MAX_CLIP)
      const newEnd = Math.max(minEnd, Math.min(maxEnd, dragRef.current.startVal + dt))
      setTrimEnd(newEnd)
      if (videoRef.current) videoRef.current.currentTime = newEnd
      setCurrentTime(newEnd)
    }
  }, [duration, trimStart, trimEnd, soundDuration, soundStartFrac, soundEndFrac])

  const handleDragEnd = useCallback(() => {
    setDragging(null)
    dragRef.current = { type: null, startX: 0, startVal: 0, startVal2: 0 }
  }, [])

  // Global touch/mouse listeners for dragging
  useEffect(() => {
    if (!dragging) return

    const onMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      handleDragMove(clientX)
    }
    const onEnd = () => handleDragEnd()

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onEnd)
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd)

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onEnd)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }
  }, [dragging, handleDragMove, handleDragEnd])

  // Format time as MM:SS
  const formatTime = (t) => {
    if (!t || isNaN(t)) return '0:00'
    const mins = Math.floor(t / 60)
    const secs = Math.floor(t % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }


  // Generate stable pseudo-random waveform bars for sound visualization
  const soundWaveformBars = useCallback(() => {
    if (soundDuration <= 0 || duration <= 0) return []
    // Number of bars proportional to sound duration vs video
    const ratio = soundDuration / duration
    const barCount = Math.round(40 * ratio)
    const bars = []
    // Seeded pseudo-random using sound name
    let seed = 0
    const name = selectedSound?.name || ''
    for (let i = 0; i < name.length; i++) seed += name.charCodeAt(i)
    for (let i = 0; i < barCount; i++) {
      seed = (seed * 16807 + 7) % 2147483647
      bars.push(20 + (seed % 60))
    }
    return bars
  }, [soundDuration, duration, selectedSound])

  // Sound track dimensions
  const soundRatio = soundDuration > 0 && duration > 0 ? soundDuration / duration : 1
  const soundWaveWidthPct = Math.max(100, soundRatio * 100) // % of container
  const soundScrollPct = soundDuration > duration && soundDuration > 0
    ? (soundOffset / (soundDuration - duration)) * (soundWaveWidthPct - 100)
    : 0

  // Apply volume levels to video and sound audio elements
  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = videoVolume / 100
  }, [videoVolume])

  useEffect(() => {
    if (soundAudioRef.current) soundAudioRef.current.volume = soundVolume / 100
  }, [soundVolume])

  // Cleanup on unmount — stop all playback
  useEffect(() => {
    return () => {
      if (videoRef.current) videoRef.current.pause()
      if (soundAudioRef.current) { soundAudioRef.current.pause(); soundAudioRef.current.src = '' }
    }
  }, [])

  // Measure preview width for selfie overlay scaling
  useEffect(() => {
    if (!showSelfieOverlay || !previewRef.current) return
    const measure = () => {
      if (previewRef.current) setPreviewWidth(previewRef.current.offsetWidth)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(previewRef.current)
    return () => ro.disconnect()
  }, [showSelfieOverlay])

  // Sync trimStart/trimEnd changes back to the selected segment
  useEffect(() => {
    if (syncingRef.current) { syncingRef.current = false; return }
    if (selectedSegmentIdx === -1) return
    setSegments(prev => {
      const seg = prev[selectedSegmentIdx]
      if (seg.start === trimStart && seg.end === trimEnd) return prev
      return prev.map((s, i) => i === selectedSegmentIdx ? { ...s, start: trimStart, end: trimEnd } : s)
    })
  }, [trimStart, trimEnd, selectedSegmentIdx])

  const selectSegment = (id) => {
    const seg = segments.find(s => s.id === id)
    if (!seg) return
    setShowSoundOptions(false)
    if (id === selectedSegmentId) {
      setShowTimelineOptions(prev => !prev)
      return
    }
    setSelectedSegmentId(id)
    syncingRef.current = true
    setTrimStart(seg.start)
    setTrimEnd(seg.end)
    if (videoRef.current) videoRef.current.currentTime = seg.start
    setCurrentTime(seg.start)
    setShowTimelineOptions(true)
  }

  const handleSplit = () => {
    // Compute split point from the visual playhead position (outputPlayheadFrac)
    const total = segments.reduce((sum, s) => sum + ((s.end ?? duration) - s.start), 0)
    if (total <= 0) return

    let remaining = outputPlayheadFrac * total
    let splitSegIdx = -1
    let splitTime = 0

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]
      const segDur = (seg.end ?? duration) - seg.start
      if (remaining <= segDur) {
        splitSegIdx = i
        splitTime = seg.start + remaining
        break
      }
      remaining -= segDur
    }

    if (splitSegIdx === -1) return
    const seg = segments[splitSegIdx]
    const segEnd = seg.end ?? duration

    // Don't split too close to edges
    if (splitTime <= seg.start + 0.1 || splitTime >= segEnd - 0.1) return

    const id2 = nextSegmentId.current++
    const seg1 = { id: seg.id, start: seg.start, end: splitTime }
    const seg2 = { id: id2, start: splitTime, end: segEnd }

    setSegments(prev => {
      const idx = prev.findIndex(s => s.id === seg.id)
      if (idx === -1) return prev
      const next = [...prev]
      next.splice(idx, 1, seg1, seg2)
      return next
    })

    // Select the left segment and update trim state
    setSelectedSegmentId(seg.id)
    syncingRef.current = true
    setTrimStart(seg.start)
    setTrimEnd(splitTime)
    if (videoRef.current) videoRef.current.currentTime = splitTime
    setCurrentTime(splitTime)
  }

  const handleTrashSegment = () => {
    if (segments.length <= 1) return
    const newSegs = segments.filter(s => s.id !== selectedSegmentId)
    setSegments(newSegs)
    const newSeg = newSegs[Math.min(selectedSegmentIdx, newSegs.length - 1)]
    setSelectedSegmentId(newSeg.id)
    syncingRef.current = true
    setTrimStart(newSeg.start)
    setTrimEnd(newSeg.end)
    if (videoRef.current) videoRef.current.currentTime = newSeg.start
    setCurrentTime(newSeg.start)
    setShowTimelineOptions(false)
  }

  const getSegmentThumbnails = (seg) => {
    if (duration <= 0) return thumbnails
    const segEnd = seg.end ?? duration
    const result = []
    for (let i = 0; i < THUMB_COUNT; i++) {
      const thumbTime = (duration / THUMB_COUNT) * (i + 0.5)
      if (thumbTime >= seg.start && thumbTime <= segEnd) {
        result.push(thumbnails[i])
      }
    }
    if (result.length === 0) {
      const midTime = (seg.start + segEnd) / 2
      let bestIdx = 0, bestDist = Infinity
      for (let i = 0; i < THUMB_COUNT; i++) {
        const d = Math.abs((duration / THUMB_COUNT) * (i + 0.5) - midTime)
        if (d < bestDist) { bestDist = d; bestIdx = i }
      }
      result.push(thumbnails[bestIdx])
    }
    return result
  }

  // Segment pointer down → either tap (select) or drag (reorder)
  useEffect(() => {
    if (segPointerDown === null || reorderDragIdx !== null) return
    const onMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      if (Math.abs(clientX - segPointerDown.startX) > 12) {
        setReorderDragIdx(segPointerDown.idx)
        setSegPointerDown(null)
      }
    }
    const onEnd = () => {
      selectSegment(segments[segPointerDown.idx].id)
      setSegPointerDown(null)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onEnd)
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onEnd)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }
  }, [segPointerDown, reorderDragIdx, segments, selectedSegmentId])

  // Segment reorder drag
  useEffect(() => {
    if (reorderDragIdx === null) return
    const onMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      const segElements = timelineRef.current?.querySelectorAll('.video-editor-segment')
      if (!segElements || segElements.length < 2) return
      // Swap with adjacent neighbor if pointer crosses its midpoint
      if (reorderDragIdx > 0) {
        const leftRect = segElements[reorderDragIdx - 1].getBoundingClientRect()
        if (clientX < leftRect.left + leftRect.width / 2) {
          const fromIdx = reorderDragIdx
          setSegments(prev => {
            const next = [...prev]; [next[fromIdx - 1], next[fromIdx]] = [next[fromIdx], next[fromIdx - 1]]; return next
          })
          setReorderDragIdx(fromIdx - 1)
          return
        }
      }
      if (reorderDragIdx < segElements.length - 1) {
        const rightRect = segElements[reorderDragIdx + 1].getBoundingClientRect()
        if (clientX > rightRect.left + rightRect.width / 2) {
          const fromIdx = reorderDragIdx
          setSegments(prev => {
            const next = [...prev]; [next[fromIdx + 1], next[fromIdx]] = [next[fromIdx], next[fromIdx + 1]]; return next
          })
          setReorderDragIdx(fromIdx + 1)
          return
        }
      }
    }
    const onEnd = () => { setReorderDragIdx(null) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onEnd)
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onEnd)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }
  }, [reorderDragIdx])

  const handleDone = () => {
    if (videoRef.current) videoRef.current.pause()
    if (soundAudioRef.current) { soundAudioRef.current.pause(); soundAudioRef.current.src = '' }
    if (duration > 0) {
      const finalSegments = segments.map(s => ({ start: s.start, end: s.end ?? duration }))
      // Use segment 0's start and last segment's end as overall trim bounds
      // (trimStart/trimEnd reflect the selected segment, not the overall range)
      const outTrimStart = finalSegments.length > 0 ? finalSegments[0].start : trimStart
      const outTrimEnd = finalSegments.length > 0 ? finalSegments[finalSegments.length - 1].end : (trimEnd ?? duration)
      onDone?.({ trimStart: outTrimStart, trimEnd: outTrimEnd, soundOffset, soundStartFrac, soundEndFrac, videoVolume, soundVolume, segments: finalSegments })
    } else {
      onClose?.()
    }
  }

  return (
    <div className="video-editor">
      {/* Header */}
      <div className="video-editor-header">
        <button className="video-editor-close" onClick={handleDone}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        <span className="video-editor-title">Edit Video</span>
        <button className="video-editor-done" onClick={handleDone}>Done</button>
      </div>

      {/* Video Preview */}
      <div className="video-editor-preview" ref={previewRef} onClick={togglePlay}>
        <video
          ref={videoRef}
          src={videoUrl}
          className={`video-editor-video ${isMirrored ? 'mirrored' : ''}`}
          playsInline
          preload="auto"
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
        {!isPlaying && (
          <div className="video-editor-play-btn">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
              <polygon points="6 3 20 12 6 21 6 3" />
            </svg>
          </div>
        )}
        {/* Selfie cam overlay — display only, non-interactive */}
        {showSelfieOverlay && selfieSize && previewWidth > 0 && (() => {
          const selfieScale = previewWidth / 440
          return (
            <div
              className="video-editor-selfie-overlay"
              style={{
                width: selfieSize.w * selfieScale,
                height: selfieSize.h * selfieScale,
                left: (selfiePosition?.x || 16) * selfieScale,
                top: (selfiePosition?.y || 80) * selfieScale,
                borderRadius: 8 * selfieScale,
              }}
            >
              <video
                src={videoUrl}
                className={`video-editor-selfie-video ${isMirrored ? 'mirrored' : ''}`}
                autoPlay
                loop
                muted
                playsInline
              />
            </div>
          )
        })()}
      </div>

      {/* Time Display — shows output timeline position */}
      <div className="video-editor-time">
        <span>{formatTime(outputPlayheadFrac * totalSegDuration)}</span>
        <span className="video-editor-time-sep">/</span>
        <span>{formatTime(totalSegDuration)}</span>
      </div>

      {/* Playhead area — wraps timeline + options + sound track */}
      <div
        className="video-editor-playhead-area"
        ref={playheadAreaRef}
        onMouseDown={(e) => { handleDragStart('playheadScrub', e.clientX) }}
        onTouchStart={(e) => { handleDragStart('playheadScrub', e.touches[0].clientX) }}
      >
      {/* Timeline — segments row */}
      <div
        className="video-editor-timeline"
        ref={timelineRef}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {segments.map((seg, idx) => {
          const isSelected = seg.id === selectedSegmentId
          const segEnd = seg.end ?? duration
          const segDur = segEnd - seg.start
          const segThumbs = getSegmentThumbnails(seg)

          const showHandles = isSelected
          return (
            <div
              key={seg.id}
              ref={showHandles ? selectedSegRef : undefined}
              className={`video-editor-segment ${showHandles ? 'selected' : ''} ${reorderDragIdx === idx ? 'reorder-dragging' : ''}`}
              style={{ flex: `${Math.max(segDur, 0.1)} 0 0` }}
              onMouseDown={(e) => { e.stopPropagation(); setSegPointerDown({ idx, startX: e.clientX, track: 'main' }) }}
              onTouchStart={(e) => { e.stopPropagation(); setSegPointerDown({ idx, startX: e.touches[0].clientX, track: 'main' }) }}
            >
              <div className="video-editor-segment-thumbs">
                {segThumbs.map((thumb, i) => (
                  <div key={i} className="video-editor-thumb">
                    {thumb ? (
                      <img src={thumb} alt="" draggable={false} />
                    ) : (
                      <div className="video-editor-thumb-placeholder" />
                    )}
                  </div>
                ))}
              </div>

              {/* Handles on selected segment when main track active */}
              {showHandles && (
                <>
                  <div
                    className={`video-editor-handle video-editor-handle-left ${dragging === 'left' ? 'active' : ''}`}
                    onMouseDown={(e) => { e.stopPropagation(); setSegPointerDown(null); handleDragStart('left', e.clientX, e.currentTarget.parentElement) }}
                    onTouchStart={(e) => { e.stopPropagation(); setSegPointerDown(null); handleDragStart('left', e.touches[0].clientX, e.currentTarget.parentElement) }}
                  >
                    <div className="video-editor-handle-grip" />
                  </div>
                  <div
                    className={`video-editor-handle video-editor-handle-right ${dragging === 'right' ? 'active' : ''}`}
                    onMouseDown={(e) => { e.stopPropagation(); setSegPointerDown(null); handleDragStart('right', e.clientX, e.currentTarget.parentElement) }}
                    onTouchStart={(e) => { e.stopPropagation(); setSegPointerDown(null); handleDragStart('right', e.touches[0].clientX, e.currentTarget.parentElement) }}
                  >
                    <div className="video-editor-handle-grip" />
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Options below main track */}
      {showTimelineOptions && (
        <div className="video-editor-options" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
          <button className="video-editor-option" onClick={handleSplit}>
            <div className="video-editor-option-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="2" x2="12" y2="22" />
                <polyline points="8 6 12 2 16 6" />
                <polyline points="8 18 12 22 16 18" />
              </svg>
            </div>
            <span>Split</span>
          </button>
          <button className="video-editor-option" onClick={handleTrashSegment}>
            <div className="video-editor-option-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </div>
            <span>Trash</span>
          </button>
        </div>
      )}

      {/* Sound Audio (synced with video playback) */}
      <audio ref={soundAudioRef} preload="auto" />

      {/* Sound Track — beneath video timeline */}
      {selectedSound && soundDuration > 0 && (
        <div
          className={`sound-track-section ${showSoundOptions ? 'selected' : ''}`}
          ref={soundTrackRef}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => {
            // Don't toggle if interacting with handles or waveform drag
            if (dragging) return
            e.stopPropagation()
            setShowSoundOptions(prev => !prev)
            setShowTimelineOptions(false)
          }}
        >
          <div className="sound-track-label">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            <span>{selectedSound.name}</span>
            {soundDuration > duration && (
              <span className="sound-track-longer-badge">
                {formatTime(soundDuration)}
              </span>
            )}
          </div>
          <div className="sound-track-wrapper" ref={soundBarRef}>
            {/* Bar wraps tightly around handles + waveform, moves with clip region */}
            <div
              className={`sound-track-bar ${soundSlideActive ? 'slide-active' : ''}`}
              style={{
                left: `${soundStartFrac * 100}%`,
                right: `${(1 - soundEndFrac) * 100}%`,
              }}
            >
              {/* Left trim handle */}
              <div
                className={`sound-track-handle sound-track-handle-left ${dragging === 'soundLeft' ? 'active' : ''}`}
                onMouseDown={(e) => { e.stopPropagation(); handleDragStart('soundLeft', e.clientX) }}
                onTouchStart={(e) => { e.stopPropagation(); handleDragStart('soundLeft', e.touches[0].clientX) }}
              >
                <div className="sound-track-handle-grip" />
              </div>

              {/* Waveform — drag to move bar on timeline, double-click to activate slide mode (scroll through audio) */}
              <div
                className={`sound-track-waveform-container ${soundSlideActive ? 'slide-active' : ''}`}
                onDoubleClick={(e) => { e.stopPropagation(); setSoundSlideActive(prev => !prev) }}
                onMouseDown={(e) => { e.stopPropagation(); handleDragStart(soundSlideActive ? 'soundSlide' : 'soundMove', e.clientX) }}
                onTouchStart={(e) => { e.stopPropagation(); handleDragStart(soundSlideActive ? 'soundSlide' : 'soundMove', e.touches[0].clientX) }}
              >
                <div
                  className="sound-track-waveform"
                  style={{
                    width: `${soundWaveWidthPct}%`,
                    transform: `translateX(-${soundScrollPct}%)`,
                  }}
                >
                  {soundWaveformBars().map((h, i) => (
                    <div key={i} className="sound-track-wave-bar" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>

              {/* Right trim handle */}
              <div
                className={`sound-track-handle sound-track-handle-right ${dragging === 'soundRight' ? 'active' : ''}`}
                onMouseDown={(e) => { e.stopPropagation(); handleDragStart('soundRight', e.clientX) }}
                onTouchStart={(e) => { e.stopPropagation(); handleDragStart('soundRight', e.touches[0].clientX) }}
              >
                <div className="sound-track-handle-grip" />
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Options below sound track */}
      {showSoundOptions && selectedSound && soundDuration > 0 && (
        <div className="video-editor-options" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
          <button className="video-editor-option" onClick={() => setShowVolumePopup(true)}>
            <div className="video-editor-option-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            </div>
            <span>Volume</span>
          </button>
        </div>
      )}

      {/* Central playhead — spans full playhead area */}
      <div
        className="video-editor-main-playhead"
        style={{ left: `${outputPlayheadFrac * 100}%` }}
      >
        <div
          className="video-editor-playhead-dot"
          onMouseDown={(e) => { e.stopPropagation(); handleDragStart('playheadScrub', e.clientX) }}
          onTouchStart={(e) => { e.stopPropagation(); handleDragStart('playheadScrub', e.touches[0].clientX) }}
        />
        <div className="video-editor-playhead-line" />
      </div>
      </div>{/* end playhead-area */}

      {/* Volume Popup */}
      {showVolumePopup && (
        <>
          <div className="volume-popup-overlay" onClick={() => setShowVolumePopup(false)} />
          <div className="volume-popup">
            <div className="volume-popup-header">
              <span className="volume-popup-title">Volume</span>
              <button className="volume-popup-close" onClick={() => setShowVolumePopup(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Video audio */}
            <div className="volume-popup-row">
              <div className="volume-popup-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="6" width="5" height="12" rx="1" />
                  <path d="M7 9l5-4v14l-5-4" />
                </svg>
              </div>
              <div className="volume-popup-control">
                <span className="volume-popup-label">Video</span>
                <div className="volume-popup-slider-row">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={videoVolume}
                    onChange={(e) => setVideoVolume(Number(e.target.value))}
                    className="volume-popup-slider volume-popup-slider-video"
                    style={{ '--val': `${videoVolume}%` }}
                  />
                  <span className="volume-popup-value">{videoVolume}%</span>
                </div>
              </div>
            </div>

            {/* Added sound audio */}
            <div className={`volume-popup-row ${!selectedSound ? 'disabled' : ''}`}>
              <div className="volume-popup-icon volume-popup-icon-sound">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              </div>
              <div className="volume-popup-control">
                <span className="volume-popup-label">{selectedSound?.name || 'No sound added'}</span>
                <div className="volume-popup-slider-row">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={soundVolume}
                    onChange={(e) => setSoundVolume(Number(e.target.value))}
                    className="volume-popup-slider volume-popup-slider-sound"
                    style={{ '--val': `${soundVolume}%` }}
                    disabled={!selectedSound}
                  />
                  <span className="volume-popup-value">{soundVolume}%</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  )
}

export default VideoEditor
