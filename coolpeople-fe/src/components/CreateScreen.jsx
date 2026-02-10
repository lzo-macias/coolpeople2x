import { useState, useRef, useEffect, useCallback } from 'react'
import AddSound from './AddSound'
import EditClipScreen from './EditClipScreen'
import PostScreen from './PostScreen'
import PartyCreationFlow from './PartyCreationFlow'
import '../styling/CreateScreen.css'
import { messagesApi, usersApi, partiesApi, searchApi, reelsApi } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { combineMediaItems } from '../utils/combineMedia'

// Mock phone contacts
const mockContacts = [
  { id: 101, phone: '+1 (555) 123-4567', name: 'Mom', isOnPlatform: false },
  { id: 102, phone: '+1 (555) 234-5678', name: 'David Martinez', isOnPlatform: false },
  { id: 103, phone: '+1 (555) 345-6789', name: null, isOnPlatform: false },
  { id: 104, phone: '+1 (555) 456-7890', name: 'Sarah K', isOnPlatform: false },
  { id: 105, phone: '+1 (555) 567-8901', name: null, isOnPlatform: false },
  { id: 106, phone: '+1 (555) 678-9012', name: 'Work - John', isOnPlatform: false },
]

function CreateScreen({ onClose, isConversationMode, conversationUser, onSendToConversation, onPartyCreated, onPostCreated, userParty, userRacesFollowing = [], userRacesCompeting = [], conversations = {}, currentUserId }) {
  const { user: authUser } = useAuth()
  const [selectedDuration, setSelectedDuration] = useState('PHOTO')
  const [selectedMode, setSelectedMode] = useState('record') // 'record', 'nominate', 'race', or 'party'
  const [platformUsers, setPlatformUsers] = useState([])
  const [loadingPlatformUsers, setLoadingPlatformUsers] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeoutRef = useRef(null)
  const [showAddSound, setShowAddSound] = useState(false)
  const [selectedSound, setSelectedSound] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [showClipConfirm, setShowClipConfirm] = useState(false)
  const [showEditClipScreen, setShowEditClipScreen] = useState(false)
  const [showPostScreen, setShowPostScreen] = useState(false)
  const [showPartyCreationFlow, setShowPartyCreationFlow] = useState(false)
  const [raceName, setRaceName] = useState('')
  const [raceDeadline, setRaceDeadline] = useState(null)
  const [raceType, setRaceType] = useState('user') // 'user' or 'party'
  const [winMethod, setWinMethod] = useState('points') // 'ballot' or 'points'
  const [selectedExistingRace, setSelectedExistingRace] = useState(null) // Track if user selected existing race
  const [facingMode, setFacingMode] = useState('user') // 'user' = front, 'environment' = back
  const [cameraError, setCameraError] = useState(null)
  const durations = ['10m', '60s', '15s', 'PHOTO']

  // Nominate mode specific state
  const [showSelfieCam, setShowSelfieCam] = useState(true)
  const [showTagFlow, setShowTagFlow] = useState(false)
  const [tagQuery, setTagQuery] = useState('')
  const [tagSource, setTagSource] = useState('platform') // 'platform', 'contacts', or 'phone'
  const [selectedTag, setSelectedTag] = useState(null)
  const [editingContactName, setEditingContactName] = useState(null)
  const [customContactNames, setCustomContactNames] = useState({})
  const [phoneNumber, setPhoneNumber] = useState('')

  // Text overlays (shared between EditClipScreen and PostScreen)
  const [textOverlays, setTextOverlays] = useState([])
  const [showSentConfirmation, setShowSentConfirmation] = useState(false)

  // Selfie overlay state (shared between EditClipScreen and PostScreen)
  const [selfieSize, setSelfieSize] = useState({ w: 120, h: 160 })
  const [selfiePosition, setSelfiePosition] = useState({ x: 16, y: 80 })
  const [showSelfieOverlay, setShowSelfieOverlay] = useState(false)

  // Video trim state (shared between EditClipScreen and PostScreen)
  const [videoTrimStart, setVideoTrimStart] = useState(0)
  const [videoTrimEnd, setVideoTrimEnd] = useState(null)
  const [videoEdits, setVideoEdits] = useState(null) // soundOffset, videoVolume, soundVolume, segments

  // Callback for child screens to sync video edits back to CreateScreen
  const handleVideoEditsChange = useCallback((edits) => {
    if (edits) {
      setVideoTrimStart(edits.trimStart ?? 0)
      setVideoTrimEnd(edits.trimEnd ?? null)
      setVideoEdits({
        soundOffset: edits.soundOffset,
        soundStartFrac: edits.soundStartFrac ?? 0,
        soundEndFrac: edits.soundEndFrac ?? 1,
        videoVolume: edits.videoVolume,
        soundVolume: edits.soundVolume,
        segments: edits.segments,
      })
    }
  }, [])

  // Drafts & Media Panel state
  const [showMediaPanel, setShowMediaPanel] = useState(false)
  const [mediaPanelTab, setMediaPanelTab] = useState('recents') // 'recents' or 'drafts'
  const [deviceMedia, setDeviceMedia] = useState([])
  const [loadingDeviceMedia, setLoadingDeviceMedia] = useState(false)
  const fileInputRef = useRef(null)

  // Multi-select state
  const [multiSelectMode, setMultiSelectMode] = useState(false)
  const [selectedMediaItems, setSelectedMediaItems] = useState([])
  const [isCombiningMedia, setIsCombiningMedia] = useState(false)
  const [combineProgress, setCombineProgress] = useState(0)
  const [combineError, setCombineError] = useState(null)

  // Playlist for multi-video playback (original quality, no re-encoding)
  const [videoPlaylist, setVideoPlaylist] = useState(null)

  // Combining state for post-time rendering
  const [isCombiningForPost, setIsCombiningForPost] = useState(false)

  // Posting loading state
  const [isPosting, setIsPosting] = useState(false)
  const [postingStep, setPostingStep] = useState(0) // 0=preparing, 1=combining, 2=uploading, 3=finishing

  // Filter out drafts older than 30 days
  const filterExpiredDrafts = (draftsArray) => {
    const thirtyDaysAgo = Date.now() - 1000 * 60 * 60 * 24 * 30
    return draftsArray.filter(d => d.timestamp > thirtyDaysAgo)
  }

  const [drafts, setDrafts] = useState(() => {
    try {
      const saved = localStorage.getItem('coolpeople-drafts')
      if (!saved) return []
      const parsed = JSON.parse(saved)
      const filtered = filterExpiredDrafts(parsed)
      // Save back if any were removed
      if (filtered.length !== parsed.length) {
        localStorage.setItem('coolpeople-drafts', JSON.stringify(filtered))
      }
      return filtered
    } catch {
      return []
    }
  })

  // Reload drafts from localStorage (used when returning from PostScreen)
  const reloadDraftsFromStorage = () => {
    try {
      const saved = localStorage.getItem('coolpeople-drafts')
      if (!saved) {
        setDrafts([])
        return
      }
      const parsed = JSON.parse(saved)
      const filtered = filterExpiredDrafts(parsed)
      // Save back if any were removed
      if (filtered.length !== parsed.length) {
        localStorage.setItem('coolpeople-drafts', JSON.stringify(filtered))
      }
      setDrafts(filtered)
    } catch {
      // Keep current state if parse fails
    }
  }

  // Save drafts to localStorage when they change
  useEffect(() => {
    const saveDraftsToStorage = (draftsToSave) => {
      try {
        localStorage.setItem('coolpeople-drafts', JSON.stringify(draftsToSave))
        return true
      } catch (e) {
        if (e.name === 'QuotaExceededError' && draftsToSave.length > 1) {
          console.log('Storage full, removing oldest draft...')
          return saveDraftsToStorage(draftsToSave.slice(0, -1))
        }
        console.error('Failed to save drafts:', e)
        return false
      }
    }
    saveDraftsToStorage(drafts)
  }, [drafts])

  // Fetch real platform users (DM contacts + ALL following) and parties for tagging
  const fetchPlatformUsers = useCallback(async () => {
    if (!authUser?.id) return
    setLoadingPlatformUsers(true)
    try {
      const users = []
      const seenIds = new Set()

      // 1. Fetch recent DM conversations
      try {
        const conversationsRes = await messagesApi.getConversations()
        if (conversationsRes.data) {
          conversationsRes.data.forEach(conv => {
            const otherUser = conv.otherUser
            if (otherUser && !seenIds.has(otherUser.id)) {
              seenIds.add(otherUser.id)
              users.push({
                id: otherUser.id,
                username: otherUser.handle || otherUser.username || otherUser.displayName || 'user',
                name: otherUser.name || otherUser.displayName || otherUser.handle || 'User',
                avatar: otherUser.avatarUrl || otherUser.avatar || `https://i.pravatar.cc/100?u=${otherUser.id}`,
                isOnPlatform: true,
                type: 'user',
              })
            }
          })
        }
      } catch (e) {
        console.warn('Failed to fetch conversations for tagging:', e)
      }

      // 2. Fetch ALL following (paginate through every page)
      try {
        let cursor = undefined
        let hasMore = true
        while (hasMore) {
          const followingRes = await usersApi.getFollowing(authUser.id, cursor)
          if (followingRes.data && followingRes.data.length > 0) {
            followingRes.data.forEach(f => {
              const followedUser = f.following || f
              if (followedUser && !seenIds.has(followedUser.id)) {
                seenIds.add(followedUser.id)
                users.push({
                  id: followedUser.id,
                  username: followedUser.handle || followedUser.username || followedUser.displayName || 'user',
                  name: followedUser.name || followedUser.displayName || followedUser.handle || 'User',
                  avatar: followedUser.avatarUrl || followedUser.avatar || `https://i.pravatar.cc/100?u=${followedUser.id}`,
                  isOnPlatform: true,
                  type: 'user',
                })
              }
            })
            cursor = followingRes.pagination?.cursor || followingRes.nextCursor
            hasMore = !!(cursor && followingRes.pagination?.hasMore !== false)
          } else {
            hasMore = false
          }
        }
      } catch (e) {
        console.warn('Failed to fetch following for tagging:', e)
      }

      // 3. Fetch parties (available on the platform)
      try {
        const partiesRes = await partiesApi.listParties()
        if (partiesRes.data) {
          partiesRes.data.forEach(party => {
            if (!seenIds.has(`party-${party.id}`)) {
              seenIds.add(`party-${party.id}`)
              users.push({
                id: party.id,
                username: party.handle || party.name,
                name: party.name,
                avatar: party.avatarUrl || `https://i.pravatar.cc/100?u=${party.id}`,
                isOnPlatform: true,
                type: 'party',
              })
            }
          })
        }
      } catch (e) {
        console.warn('Failed to fetch parties for tagging:', e)
      }

      setPlatformUsers(users)
    } catch (error) {
      console.error('Error fetching platform users:', error)
    } finally {
      setLoadingPlatformUsers(false)
    }
  }, [authUser?.id])

  // Fetch platform users when tag flow opens
  useEffect(() => {
    if (showTagFlow && tagSource === 'platform' && platformUsers.length === 0) {
      fetchPlatformUsers()
    }
  }, [showTagFlow, tagSource, platformUsers.length, fetchPlatformUsers])

  // Debounced live search for ANY user or party on the platform
  useEffect(() => {
    if (tagSource !== 'platform' || !tagQuery.trim()) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = []
        const seenIds = new Set()

        // Search users
        const usersRes = await searchApi.search(tagQuery.trim(), { type: 'users', limit: 20 })
        if (usersRes.data?.users) {
          usersRes.data.users.forEach(user => {
            if (!seenIds.has(user.id)) {
              seenIds.add(user.id)
              results.push({
                id: user.id,
                username: user.username || user.displayName || 'user',
                name: user.displayName || user.username || 'User',
                avatar: user.avatarUrl || `https://i.pravatar.cc/100?u=${user.id}`,
                isOnPlatform: true,
                type: 'user',
              })
            }
          })
        }

        // Search parties
        const partiesRes = await searchApi.search(tagQuery.trim(), { type: 'parties', limit: 20 })
        if (partiesRes.data?.parties) {
          partiesRes.data.parties.forEach(party => {
            if (!seenIds.has(`party-${party.id}`)) {
              seenIds.add(`party-${party.id}`)
              results.push({
                id: party.id,
                username: party.handle || party.name,
                name: party.name,
                avatar: party.avatarUrl || `https://i.pravatar.cc/100?u=${party.id}`,
                isOnPlatform: true,
                type: 'party',
              })
            }
          })
        }

        setSearchResults(results)
      } catch (e) {
        console.warn('Tag search failed:', e)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [tagQuery, tagSource])

  // Clear all drafts - call window.clearDrafts() in browser console
  useEffect(() => {
    window.clearDrafts = () => {
      localStorage.removeItem('coolpeople-drafts')
      setDrafts([])
      console.log('All drafts cleared!')
    }
  }, [])

  // =========================================================================
  // Device Media Library Access
  // =========================================================================

  const [mediaPermissionStatus, setMediaPermissionStatus] = useState('unknown') // 'unknown' | 'prompt' | 'granted' | 'denied'
  const dirHandleRef = useRef(null) // For File System Access API (desktop)

  // IndexedDB helpers for persisting device media + directory handle
  const DB_NAME = 'coolpeople-media'
  const DB_STORE = 'device-media'
  const DB_HANDLE_STORE = 'dir-handle'

  const openMediaDB = () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 2)
      request.onupgradeneeded = (e) => {
        const db = e.target.result
        if (!db.objectStoreNames.contains(DB_STORE)) {
          db.createObjectStore(DB_STORE, { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains(DB_HANDLE_STORE)) {
          db.createObjectStore(DB_HANDLE_STORE, { keyPath: 'key' })
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  const saveMediaToDB = async (mediaItems) => {
    try {
      const db = await openMediaDB()
      const tx = db.transaction(DB_STORE, 'readwrite')
      const store = tx.objectStore(DB_STORE)
      for (const item of mediaItems) {
        store.put(item)
      }
      await new Promise((resolve, reject) => {
        tx.oncomplete = resolve
        tx.onerror = () => reject(tx.error)
      })
    } catch (e) {
      console.warn('Failed to save media to IndexedDB:', e)
    }
  }

  const clearMediaDB = async () => {
    try {
      const db = await openMediaDB()
      const tx = db.transaction(DB_STORE, 'readwrite')
      tx.objectStore(DB_STORE).clear()
    } catch (e) {
      console.warn('Failed to clear media DB:', e)
    }
  }

  // Save/load the directory handle for File System Access API (desktop)
  const saveDirHandle = async (handle) => {
    try {
      const db = await openMediaDB()
      const tx = db.transaction(DB_HANDLE_STORE, 'readwrite')
      tx.objectStore(DB_HANDLE_STORE).put({ key: 'photos-dir', handle })
    } catch (e) {
      console.warn('Failed to save dir handle:', e)
    }
  }

  const loadDirHandle = async () => {
    try {
      const db = await openMediaDB()
      const tx = db.transaction(DB_HANDLE_STORE, 'readonly')
      const request = tx.objectStore(DB_HANDLE_STORE).get('photos-dir')
      return new Promise((resolve) => {
        request.onsuccess = () => resolve(request.result?.handle || null)
        request.onerror = () => resolve(null)
      })
    } catch {
      return null
    }
  }

  // Generate thumbnail from a video file
  const generateVideoThumbnail = (file) => {
    return new Promise((resolve) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.muted = true
      video.playsInline = true
      const url = URL.createObjectURL(file)
      video.src = url

      video.onloadeddata = () => {
        video.currentTime = Math.min(1, video.duration * 0.1)
      }

      video.onseeked = () => {
        const canvas = document.createElement('canvas')
        canvas.width = Math.min(video.videoWidth, 400)
        canvas.height = Math.min(video.videoHeight, 700)
        const ctx = canvas.getContext('2d')
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url)
          resolve(blob)
        }, 'image/jpeg', 0.7)
      }

      video.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(null)
      }
    })
  }

  // Process files into media items (shared by all access methods)
  // Determine media type from MIME or extension fallback (browsers often
  // report an empty file.type for .mov, .heic, .mkv, .avi, .m4v etc.)
  const classifyMediaFile = (file) => {
    if (file.type.startsWith('video/')) return 'video'
    if (file.type.startsWith('image/')) return 'image'
    // Fallback: match by extension
    const name = (file.name || '').toLowerCase()
    const videoExts = ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v', '.3gp', '.ogv']
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.bmp', '.svg']
    if (videoExts.some(ext => name.endsWith(ext))) return 'video'
    if (imageExts.some(ext => name.endsWith(ext))) return 'image'
    return null
  }

  const processFilesIntoMedia = async (files) => {
    const newMedia = []
    for (const file of files) {
      const mediaType = classifyMediaFile(file)
      if (!mediaType) continue
      const isVideo = mediaType === 'video'
      const isImage = mediaType === 'image'

      const id = `device-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      let thumbnailBlob = null
      if (isVideo) {
        thumbnailBlob = await generateVideoThumbnail(file)
      }

      newMedia.push({
        id,
        type: isVideo ? 'video' : 'image',
        blob: file,
        thumbnailBlob,
        thumbnail: isImage ? URL.createObjectURL(file) : (thumbnailBlob ? URL.createObjectURL(thumbnailBlob) : null),
        videoUrl: isVideo ? URL.createObjectURL(file) : null,
        timestamp: file.lastModified || Date.now(),
        fileName: file.name,
      })
    }
    return newMedia
  }

  // Detect if running inside Capacitor native shell
  const isCapacitor = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()

  // Detect if File System Access API is available (desktop Chrome/Edge)
  const hasFileSystemAccess = typeof window !== 'undefined' && 'showDirectoryPicker' in window

  // Check if user is on mobile browser (not Capacitor)
  const isMobileBrowser = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) && !isCapacitor

  // ---- DESKTOP: File System Access API ----
  // Read all images/videos from a directory handle recursively
  const readMediaFromDirectory = async (dirHandle, maxFiles = 200) => {
    const files = []
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif']
    const videoExts = ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v']

    const walk = async (handle) => {
      if (files.length >= maxFiles) return
      for await (const entry of handle.values()) {
        if (files.length >= maxFiles) break
        if (entry.kind === 'file') {
          const name = entry.name.toLowerCase()
          const isMedia = [...imageExts, ...videoExts].some(ext => name.endsWith(ext))
          if (isMedia) {
            try {
              const file = await entry.getFile()
              files.push(file)
            } catch { /* skip inaccessible files */ }
          }
        } else if (entry.kind === 'directory' && !entry.name.startsWith('.')) {
          await walk(entry)
        }
      }
    }

    await walk(dirHandle)
    // Sort by lastModified, newest first
    files.sort((a, b) => b.lastModified - a.lastModified)
    return files
  }

  // Request directory access (first time on desktop)
  const requestDesktopDirectoryAccess = async () => {
    try {
      const dirHandle = await window.showDirectoryPicker({
        mode: 'read',
        startIn: 'pictures',
      })
      dirHandleRef.current = dirHandle
      await saveDirHandle(dirHandle)
      return dirHandle
    } catch (e) {
      // User cancelled the picker
      if (e.name === 'AbortError') return null
      throw e
    }
  }

  // Re-verify permission on a saved directory handle
  const verifyDirPermission = async (handle) => {
    const opts = { mode: 'read' }
    if (await handle.queryPermission(opts) === 'granted') return true
    if (await handle.requestPermission(opts) === 'granted') return true
    return false
  }

  // Load media from directory handle (desktop)
  const loadDesktopMedia = async (dirHandle) => {
    setLoadingDeviceMedia(true)
    try {
      await clearMediaDB()
      const files = await readMediaFromDirectory(dirHandle)
      const media = await processFilesIntoMedia(files)

      // Save to IndexedDB for fast reload
      await saveMediaToDB(media.map(item => ({
        id: item.id,
        type: item.type,
        blob: item.blob,
        thumbnailBlob: item.thumbnailBlob,
        timestamp: item.timestamp,
        fileName: item.fileName,
      })))

      setDeviceMedia(media.sort((a, b) => b.timestamp - a.timestamp))
    } catch (e) {
      console.warn('Failed to read desktop directory:', e)
    }
    setLoadingDeviceMedia(false)
  }

  // ---- MOBILE (Capacitor): Native photo library ----
  const loadCapacitorMedia = async () => {
    setLoadingDeviceMedia(true)
    try {
      const { Media } = await import('@capacitor-community/media')

      const { medias } = await Media.getMedias({
        quantity: 200,
        types: 'all',
        sort: 'creationDate',
        thumbnailWidth: 400,
        thumbnailHeight: 700,
        thumbnailQuality: 70,
      })

      const media = medias.map((asset, i) => {
        // duration > 0 means video, otherwise image
        const isVideo = asset.duration && asset.duration > 0
        // Thumbnail is returned as base64 JPEG data
        const thumbnailSrc = asset.data ? `data:image/jpeg;base64,${asset.data}` : null

        return {
          id: `cap-${asset.identifier || i}`,
          type: isVideo ? 'video' : 'image',
          thumbnail: thumbnailSrc,
          videoUrl: null, // will be resolved via getMediaByIdentifier when selected
          identifier: asset.identifier, // needed to get full-res path on iOS
          timestamp: asset.creationDate ? new Date(asset.creationDate).getTime() : Date.now() - i * 1000,
          fileName: asset.identifier || `media-${i}`,
          duration: asset.duration || 0,
        }
      })

      setDeviceMedia(media)
    } catch (e) {
      console.warn('Failed to load Capacitor media:', e)
      // Fallback to file input on error
      setMediaPermissionStatus('granted')
    }
    setLoadingDeviceMedia(false)
  }

  // Resolve full-res path for a Capacitor media asset when user taps it
  const resolveCapacitorMediaPath = async (item) => {
    try {
      const { Media } = await import('@capacitor-community/media')
      const { path } = await Media.getMediaByIdentifier({ identifier: item.identifier })
      return path
    } catch (e) {
      console.warn('Failed to resolve media path:', e)
      return null
    }
  }

  // ---- MOBILE BROWSER: File input (opens native photo picker) ----
  const handleDeviceFilesSelected = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    setLoadingDeviceMedia(true)
    const newMedia = await processFilesIntoMedia(files)

    setDeviceMedia(prev => {
      const existingIds = new Set(prev.map(m => m.fileName))
      const deduped = newMedia.filter(m => !existingIds.has(m.fileName))
      const combined = [...deduped, ...prev]
      return combined.sort((a, b) => b.timestamp - a.timestamp)
    })

    // Persist to IndexedDB
    await saveMediaToDB(newMedia.map(item => ({
      id: item.id,
      type: item.type,
      blob: item.blob,
      thumbnailBlob: item.thumbnailBlob,
      timestamp: item.timestamp,
      fileName: item.fileName,
    })))

    setLoadingDeviceMedia(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ---- PERMISSION FLOW ----
  // Called when user opens media panel for the first time
  const handleMediaPermissionGrant = async () => {
    setMediaPermissionStatus('granting')

    try {
      if (isCapacitor) {
        // Native: getMedias() auto-triggers the OS permission prompt on first call
        setMediaPermissionStatus('granted')
        if (authUser?.id) {
          usersApi.grantMediaAccess(authUser.id).catch(() => {})
        }
        await loadCapacitorMedia()
        // If loadCapacitorMedia failed (permission denied), it will fallback internally
      } else if (hasFileSystemAccess && !isMobileBrowser) {
        // Desktop Chrome/Edge: use File System Access API
        const dirHandle = await requestDesktopDirectoryAccess()
        if (dirHandle) {
          setMediaPermissionStatus('granted')
          if (authUser?.id) {
            usersApi.grantMediaAccess(authUser.id).catch(() => {})
          }
          await loadDesktopMedia(dirHandle)
        } else {
          setMediaPermissionStatus('prompt') // User cancelled, stay on prompt
        }
      } else {
        // Mobile browser / Firefox / Safari: use file input
        // Permission is implicit when user selects files
        setMediaPermissionStatus('granted')
        if (authUser?.id) {
          usersApi.grantMediaAccess(authUser.id).catch(() => {})
        }
        // Trigger file picker immediately
        fileInputRef.current?.click()
      }
    } catch (e) {
      console.warn('Media permission error:', e)
      setMediaPermissionStatus('denied')
    }
  }

  // Load persisted device media & check permission on mount
  useEffect(() => {
    const initMediaAccess = async () => {
      // Check if user already granted via backend
      const userGranted = authUser?.mediaAccessGranted

      if (userGranted) {
        setMediaPermissionStatus('granted')

        if (isCapacitor) {
          await loadCapacitorMedia()
        } else if (hasFileSystemAccess && !isMobileBrowser) {
          // Desktop: try to restore saved directory handle
          const savedHandle = await loadDirHandle()
          if (savedHandle) {
            const hasAccess = await verifyDirPermission(savedHandle).catch(() => false)
            if (hasAccess) {
              dirHandleRef.current = savedHandle
              await loadDesktopMedia(savedHandle)
              return
            }
          }
          // No saved handle or permission expired — load from IndexedDB cache
          const db = await openMediaDB()
          const tx = db.transaction(DB_STORE, 'readonly')
          const request = tx.objectStore(DB_STORE).getAll()
          request.onsuccess = () => {
            const items = request.result.map(item => ({
              ...item,
              thumbnail: item.type === 'image' ? URL.createObjectURL(item.blob) : (item.thumbnailBlob ? URL.createObjectURL(item.thumbnailBlob) : null),
              videoUrl: item.type === 'video' ? URL.createObjectURL(item.blob) : null,
            }))
            if (items.length > 0) setDeviceMedia(items.sort((a, b) => b.timestamp - a.timestamp))
          }
        } else {
          // Mobile browser: load any previously cached media from IndexedDB
          const db = await openMediaDB()
          const tx = db.transaction(DB_STORE, 'readonly')
          const request = tx.objectStore(DB_STORE).getAll()
          request.onsuccess = () => {
            const items = request.result.map(item => ({
              ...item,
              thumbnail: item.type === 'image' ? URL.createObjectURL(item.blob) : (item.thumbnailBlob ? URL.createObjectURL(item.thumbnailBlob) : null),
              videoUrl: item.type === 'video' ? URL.createObjectURL(item.blob) : null,
            }))
            if (items.length > 0) setDeviceMedia(items.sort((a, b) => b.timestamp - a.timestamp))
          }
        }
      } else {
        setMediaPermissionStatus('prompt')
      }
    }

    initMediaAccess()

    return () => {
      // Cleanup blob URLs on unmount
      deviceMedia.forEach(item => {
        if (item.thumbnail) URL.revokeObjectURL(item.thumbnail)
        if (item.videoUrl) URL.revokeObjectURL(item.videoUrl)
      })
    }
  }, [authUser?.mediaAccessGranted]) // eslint-disable-line react-hooks/exhaustive-deps

  // Desktop: refresh media from directory (re-scan for new files)
  const refreshDesktopMedia = async () => {
    if (dirHandleRef.current) {
      await loadDesktopMedia(dirHandleRef.current)
    } else if (hasFileSystemAccess && !isMobileBrowser) {
      const savedHandle = await loadDirHandle()
      if (savedHandle) {
        const hasAccess = await verifyDirPermission(savedHandle).catch(() => false)
        if (hasAccess) {
          dirHandleRef.current = savedHandle
          await loadDesktopMedia(savedHandle)
        }
      }
    }
  }

  // Get combined timeline (device media + drafts), sorted newest first
  const getRecentsWithDrafts = () => {
    const thirtyDaysAgo = Date.now() - 1000 * 60 * 60 * 24 * 30
    const recentDrafts = drafts
      .filter(d => d.timestamp > thirtyDaysAgo)
      .map(d => ({ ...d, isDraft: true }))

    const combined = [...deviceMedia, ...recentDrafts]
    return combined.sort((a, b) => b.timestamp - a.timestamp)
  }

  // Capture thumbnail from video
  const captureThumbnail = () => {
    if (!videoRef.current) return null

    try {
      const video = videoRef.current
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth || 360
      canvas.height = video.videoHeight || 640
      const ctx = canvas.getContext('2d')

      // If mirrored, flip the canvas
      if (recordedWithFrontCamera) {
        ctx.translate(canvas.width, 0)
        ctx.scale(-1, 1)
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      return canvas.toDataURL('image/jpeg', 0.8)
    } catch (err) {
      console.error('Error capturing thumbnail:', err)
      return null
    }
  }

  // Save to drafts function
  const saveToDrafts = (videoUrl, isMirrored = false) => {
    const thumbnail = captureThumbnail()

    // Use base64 data for persistent storage, fallback to URL for external videos
    const videoData = recordedVideoBase64 || videoUrl

    const newDraft = {
      id: `draft-${Date.now()}`,
      type: 'video',
      videoUrl: videoData,
      thumbnail: thumbnail || videoData,
      isMirrored,
      timestamp: Date.now(),
      mode: selectedMode,
      raceName: raceName || null,
      raceDeadline: raceDeadline || null,
      taggedUser: selectedTag || null,
      textOverlays: [...textOverlays],
      // Video edits
      segments: videoEdits?.segments || null,
      trimStart: videoTrimStart,
      trimEnd: videoTrimEnd,
      soundOffset: videoEdits?.soundOffset ?? 0,
      soundStartFrac: videoEdits?.soundStartFrac ?? 0,
      soundEndFrac: videoEdits?.soundEndFrac ?? 1,
      videoVolume: videoEdits?.videoVolume ?? 100,
      soundVolume: videoEdits?.soundVolume ?? 100,
      // Sound selection
      ...(selectedSound && {
        soundUrl: selectedSound.audioUrl,
        soundName: selectedSound.name,
      }),
    }
    setDrafts(prev => [newDraft, ...prev])
    return newDraft
  }

  // State for loaded quote nomination draft
  const [loadedQuotedReel, setLoadedQuotedReel] = useState(null)
  const [isLoadedFromDraft, setIsLoadedFromDraft] = useState(false)
  const [isFromDeviceMedia, setIsFromDeviceMedia] = useState(false)
  const [deviceMediaType, setDeviceMediaType] = useState(null) // 'image' or 'video'

  // Load draft into editor
  const loadDraft = (draft) => {
    // For quote nominations, use selfieVideoUrl if available, otherwise videoUrl
    const videoToLoad = draft.isQuoteNomination
      ? (draft.selfieVideoUrl || draft.videoUrl)
      : draft.videoUrl

    console.log('Loading draft:', {
      isQuoteNomination: draft.isQuoteNomination,
      hasSelfieVideoUrl: !!draft.selfieVideoUrl,
      hasVideoUrl: !!draft.videoUrl,
      hasQuotedReel: !!draft.quotedReel,
      videoLength: videoToLoad?.length
    })

    setRecordedVideoUrl(videoToLoad)
    // Keep recordedVideoBase64 in sync so all downstream paths
    // (post, save-draft, send) use the correct video data
    setRecordedVideoBase64(videoToLoad && videoToLoad.startsWith('data:') ? videoToLoad : null)
    setVideoPlaylist(null)
    setRecordedWithFrontCamera(draft.isMirrored || false)
    if (draft.mode) setSelectedMode(draft.mode)
    if (draft.raceName) setRaceName(draft.raceName)
    if (draft.raceDeadline) setRaceDeadline(draft.raceDeadline)
    if (draft.taggedUser) setSelectedTag(draft.taggedUser)
    if (draft.textOverlays) setTextOverlays(draft.textOverlays)
    // Handle quote nomination drafts
    if (draft.isQuoteNomination && draft.quotedReel) {
      setLoadedQuotedReel(draft.quotedReel)
    } else {
      setLoadedQuotedReel(null)
    }
    // Restore selected sound from draft
    if (draft.soundUrl && draft.soundName) {
      setSelectedSound({ audioUrl: draft.soundUrl, name: draft.soundName })
    } else {
      setSelectedSound(null)
    }
    // Restore video edits from draft
    if (draft.segments || draft.soundOffset !== undefined) {
      setVideoEdits({
        soundOffset: draft.soundOffset ?? 0,
        soundStartFrac: draft.soundStartFrac ?? 0,
        soundEndFrac: draft.soundEndFrac ?? 1,
        videoVolume: draft.videoVolume ?? 100,
        soundVolume: draft.soundVolume ?? 100,
        segments: draft.segments || null,
      })
      setVideoTrimStart(draft.trimStart ?? 0)
      setVideoTrimEnd(draft.trimEnd ?? null)
    } else {
      setVideoEdits(null)
      setVideoTrimStart(0)
      setVideoTrimEnd(null)
    }
    setIsLoadedFromDraft(true)
    setIsFromDeviceMedia(false)
    setDeviceMediaType(null)
    setShowMediaPanel(false)
    setShowClipConfirm(false)
    setShowEditClipScreen(true)
  }

  // Load recent media (from device) into editor
  const loadRecentMedia = async (media) => {
    let url = null

    if (media.identifier && isCapacitor) {
      // Capacitor native asset — resolve full-res path
      const path = await resolveCapacitorMediaPath(media)
      if (path) {
        // Capacitor file paths need to be converted to web-viewable URLs
        url = window.Capacitor?.convertFileSrc?.(path) || path
      }
    } else if (media.blob) {
      // Create a fresh blob URL so revoking old ones doesn't break reopen
      url = URL.createObjectURL(media.blob)
    } else if (media.type === 'image') {
      url = media.thumbnail
    } else {
      url = media.videoUrl
    }

    if (url) {
      setRecordedVideoUrl(url)
    }
    // Clear stale base64 — device media uses blob URLs, not base64
    setRecordedVideoBase64(null)
    setVideoPlaylist(null)

    setRecordedWithFrontCamera(false)
    setSelectedMode('record')
    setRaceName('')
    setRaceDeadline(null)
    setSelectedTag(null)
    setTextOverlays([])
    setVideoEdits(null)
    setVideoTrimStart(0)
    setVideoTrimEnd(null)
    setIsFromDeviceMedia(true)
    setDeviceMediaType(media.type || 'video')
    setShowMediaPanel(false)
    setShowClipConfirm(false)
    setShowEditClipScreen(true)
  }

  // Multi-select handlers
  const handleMultiSelectToggle = (item) => {
    setSelectedMediaItems(prev => {
      const exists = prev.find(i => i.id === item.id)
      if (exists) return prev.filter(i => i.id !== item.id)
      if (prev.length >= 10) return prev // max 10 items
      return [...prev, item]
    })
  }

  // Probe video duration from a URL (blob or data URL)
  const probeVideoDuration = (url) => {
    return new Promise((resolve) => {
      const vid = document.createElement('video')
      vid.preload = 'auto'
      vid.muted = true
      vid.playsInline = true
      vid.src = url
      const onReady = () => {
        vid.removeEventListener('loadeddata', onReady)
        if (vid.duration && isFinite(vid.duration) && vid.duration > 0) {
          resolve(vid.duration)
          return
        }
        // Blob URL Infinity workaround
        const onSeeked = () => {
          vid.removeEventListener('seeked', onSeeked)
          resolve(isFinite(vid.duration) ? vid.duration : 10)
        }
        vid.addEventListener('seeked', onSeeked)
        vid.currentTime = 1e10
      }
      vid.addEventListener('loadeddata', onReady)
      vid.addEventListener('error', () => resolve(10))
      vid.load()
    })
  }

  const handleMultiSelectDone = async () => {
    if (selectedMediaItems.length < 2) return

    setIsCombiningMedia(true)
    setCombineProgress(0)
    setCombineError(null)

    try {
      // Build items array with resolved URLs
      const items = []
      for (const media of selectedMediaItems) {
        let url = null
        if (media.isDraft) {
          url = media.videoUrl
        } else if (media.identifier && isCapacitor) {
          const path = await resolveCapacitorMediaPath(media)
          if (path) url = window.Capacitor?.convertFileSrc?.(path) || path
        } else if (media.blob) {
          url = URL.createObjectURL(media.blob)
        } else if (media.type === 'image') {
          url = media.thumbnail
        } else {
          url = media.videoUrl
        }
        if (url) {
          // Detect actual type — drafts always say 'video' but may contain images
          const actualType = (url.startsWith('data:image/') || media.type === 'image') ? 'image' : media.type
          items.push({ type: actualType, url, isMirrored: media.isMirrored || false })
        }
      }

      if (items.length < 2) {
        throw new Error('Could not resolve enough media items')
      }

      const allVideos = items.every(i => i.type === 'video')

      if (allVideos) {
        // ── PLAYLIST MODE: no re-encoding, original quality ──
        const playlist = []
        for (let i = 0; i < items.length; i++) {
          setCombineProgress((i + 0.5) / items.length)
          const dur = await probeVideoDuration(items[i].url)
          playlist.push({ url: items[i].url, duration: dur, isMirrored: items[i].isMirrored })
        }

        // Build segments with local times + source index (for VideoEditor)
        const segments = playlist.map((p, i) => ({
          start: 0,
          end: p.duration,
          sourceIdx: i,
        }))

        setRecordedVideoUrl(playlist[0].url)
        setRecordedVideoBase64(playlist[0].url.startsWith('data:') ? playlist[0].url : null)
        setRecordedWithFrontCamera(playlist[0].isMirrored)
        setVideoPlaylist(playlist)
        setSelectedMode('record')
        setRaceName('')
        setRaceDeadline(null)
        setSelectedTag(null)
        setTextOverlays([])
        setVideoTrimStart(0)
        setVideoTrimEnd(null)
        setVideoEdits({
          soundOffset: 0,
          soundStartFrac: 0,
          soundEndFrac: 1,
          videoVolume: 100,
          soundVolume: 100,
          segments,
        })
      } else {
        // ── CANVAS COMBINE: needed when images are mixed in ──
        const result = await combineMediaItems(items, (p) => setCombineProgress(p))
        setRecordedVideoUrl(result.blobUrl)
        setRecordedVideoBase64(null)
        // Convert to base64 in background (non-blocking) so edit screen opens immediately
        try {
          fetch(result.blobUrl).then(resp => resp.blob()).then(blob => {
            const reader = new FileReader()
            reader.onloadend = () => setRecordedVideoBase64(reader.result)
            reader.readAsDataURL(blob)
          }).catch(() => {})
        } catch { /* blob URL still works for this session */ }
        setRecordedWithFrontCamera(false)
        setVideoPlaylist(null)
        setSelectedMode('record')
        setRaceName('')
        setRaceDeadline(null)
        setSelectedTag(null)
        setTextOverlays([])
        setVideoTrimStart(0)
        setVideoTrimEnd(null)
        setVideoEdits({
          soundOffset: 0,
          soundStartFrac: 0,
          soundEndFrac: 1,
          videoVolume: 100,
          soundVolume: 100,
          segments: result.segments,
        })
      }

      // Reset multi-select and open editor
      setMultiSelectMode(false)
      setSelectedMediaItems([])
      setIsFromDeviceMedia(false)
      setDeviceMediaType(null)
      setShowMediaPanel(false)
      setShowClipConfirm(false)
      setShowEditClipScreen(true)
    } catch (e) {
      console.error('Failed to combine media:', e)
      setCombineError(e.message || 'Failed to combine media')
    } finally {
      setIsCombiningMedia(false)
    }
  }

  // Delete draft
  const deleteDraft = (draftId) => {
    setDrafts(prev => prev.filter(d => d.id !== draftId))
  }

  // Refs
  const videoRef = useRef(null)
  const selfieVideoRef = useRef(null)
  const streamRef = useRef(null)
  const soundAudioRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordedChunksRef = useRef([])
  const recordingStartTimeRef = useRef(null)
  const [recordedDuration, setRecordedDuration] = useState(null)
  const [recordedVideoUrl, setRecordedVideoUrl] = useState(null)
  const [recordedVideoBase64, setRecordedVideoBase64] = useState(null) // Store base64 for drafts
  const [recordedWithFrontCamera, setRecordedWithFrontCamera] = useState(false)

  // Play selected sound on CreateScreen — loops freely in camera mode, syncs with recorded video
  useEffect(() => {
    const audio = soundAudioRef.current
    if (!audio) return

    if (!selectedSound?.audioUrl) {
      audio.pause()
      audio.src = ''
      return
    }

    audio.src = selectedSound.audioUrl
    audio.loop = true

    if (recordedVideoUrl) {
      // Sync with recorded video playback
      // Use a small delay to ensure videoRef points to the new recorded <video> after React re-render
      let cancelled = false
      const setup = () => {
        const video = videoRef.current
        if (!video || cancelled) return

        // Ensure video plays with audio (browser may have muted it for autoplay policy)
        video.muted = false
        video.volume = 1.0

        const syncPlay = () => { audio.currentTime = 0; audio.play().catch(() => {}) }
        const syncPause = () => audio.pause()
        const syncSeek = () => { audio.currentTime = video.currentTime }

        video.addEventListener('play', syncPlay)
        video.addEventListener('pause', syncPause)
        video.addEventListener('seeked', syncSeek)

        // If video is already playing, start the sound too
        if (!video.paused) {
          audio.currentTime = video.currentTime
          audio.play().catch(() => {})
        } else {
          // Video hasn't started yet — kick it off with audio
          video.play().catch(() => {})
        }

        // Store for cleanup
        setup._cleanup = () => {
          video.removeEventListener('play', syncPlay)
          video.removeEventListener('pause', syncPause)
          video.removeEventListener('seeked', syncSeek)
          audio.pause()
        }
      }

      // Delay to let React commit the new video element to the DOM
      const timer = setTimeout(setup, 100)

      return () => {
        cancelled = true
        clearTimeout(timer)
        setup._cleanup?.()
        audio.pause()
      }
    } else {
      // No video yet (camera mode) — just loop the sound freely
      audio.currentTime = 0
      audio.play().catch(() => {})
      return () => audio.pause()
    }
  }, [selectedSound, recordedVideoUrl])

  // Stop sound when navigating to sub-screens (EditClip/PostScreen handle their own audio)
  useEffect(() => {
    const audio = soundAudioRef.current
    if (!audio) return
    if (showEditClipScreen || showPostScreen || showPartyCreationFlow) {
      audio.pause()
    } else if (selectedSound?.audioUrl) {
      // Resuming back to CreateScreen — restart sound
      audio.play().catch(() => {})
    }
  }, [showEditClipScreen, showPostScreen, showPartyCreationFlow])

  // Reset selfie overlay when video changes — only enable for nominate/quote mode
  useEffect(() => {
    setSelfieSize({ w: 120, h: 160 })
    setSelfiePosition({ x: 16, y: 80 })
    setShowSelfieOverlay(selectedMode === 'nominate' || !!loadedQuotedReel)
  }, [recordedVideoUrl, selectedMode, loadedQuotedReel])

  // Sync selfie video with main video
  const syncSelfieVideo = () => {
    if (videoRef.current && selfieVideoRef.current && recordedVideoUrl) {
      const timeDiff = Math.abs(videoRef.current.currentTime - selfieVideoRef.current.currentTime)
      if (timeDiff > 0.05) {
        selfieVideoRef.current.currentTime = videoRef.current.currentTime
      }
    }
  }

  // Swipe handling for duration selector
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  // Camera initialization
  const startCamera = async (facing = facingMode, useExact = true) => {
    try {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }

      const constraints = {
        video: {
          // Use exact on mobile to force camera switch, fall back to ideal
          facingMode: useExact ? { exact: facing } : { ideal: facing },
          width: { ideal: 1080 },
          height: { ideal: 1920 }
        },
        audio: true
      }

      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints)
      } catch (exactErr) {
        // exact facingMode failed (device may only have one camera) — retry as preference
        if (useExact) {
          console.log('Exact facingMode failed, retrying as preference:', exactErr.message)
          return startCamera(facing, false)
        }
        throw exactErr
      }

      streamRef.current = stream

      // Attach to video element - might need to wait for ref to be ready
      const attachStream = () => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        } else {
          // Retry if ref isn't ready yet
          setTimeout(attachStream, 50)
        }
      }
      attachStream()

      setCameraError(null)
    } catch (err) {
      console.error('Camera error:', err)
      setCameraError('Unable to access camera')
    }
  }

  // Flip camera between front and back
  const flipCamera = () => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(newFacing)
    startCamera(newFacing, true)
  }

  // Start camera on mount — use preference (not exact) so it works on all devices
  useEffect(() => {
    startCamera(facingMode, false)

    // Cleanup on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // Re-attach stream to video element when switching back to live mode
  useEffect(() => {
    // Only attach live stream when there's no recorded video
    if (!recordedVideoUrl && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [recordedVideoUrl])

  // Recording handlers
  // Long-press timer for PHOTO mode → hold to record video
  const longPressTimerRef = useRef(null)
  const isLongPressRef = useRef(false)
  const isPressingRef = useRef(false)

  const startVideoRecording = () => {
    if (!streamRef.current) return

    setIsRecording(true)
    recordedChunksRef.current = []
    recordingStartTimeRef.current = Date.now()
    setRecordedWithFrontCamera(facingMode === 'user')

    // Determine supported mime type
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4'

    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        if (recordedChunksRef.current.length === 0) {
          console.warn('No recorded data captured')
          setShowClipConfirm(true)
          return
        }
        // Compute recording duration in seconds
        const elapsed = recordingStartTimeRef.current
          ? Math.round((Date.now() - recordingStartTimeRef.current) / 1000)
          : 10
        setRecordedDuration(Math.max(1, elapsed))
        const blob = new Blob(recordedChunksRef.current, { type: mimeType })
        const url = URL.createObjectURL(blob)
        setRecordedVideoUrl(url)

        // Convert blob to base64 for persistent storage in drafts
        const reader = new FileReader()
        reader.onloadend = () => {
          setRecordedVideoBase64(reader.result)
        }
        reader.readAsDataURL(blob)

        setShowClipConfirm(true)
      }

      mediaRecorder.start(100) // Collect data every 100ms
    } catch (err) {
      console.error('MediaRecorder error:', err)
      setIsRecording(false)
    }
  }

  // Capture a still photo from the live camera feed
  const capturePhoto = () => {
    if (!streamRef.current) return

    // Use ImageCapture API if available (higher quality, works reliably)
    const videoTrack = streamRef.current.getVideoTracks()[0]
    if (!videoTrack) return

    if (typeof ImageCapture !== 'undefined') {
      const imageCapture = new ImageCapture(videoTrack)
      imageCapture.grabFrame().then(bitmap => {
        const canvas = document.createElement('canvas')
        canvas.width = bitmap.width
        canvas.height = bitmap.height
        const ctx = canvas.getContext('2d')

        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0)
          ctx.scale(-1, 1)
        }

        ctx.drawImage(bitmap, 0, 0)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
        setRecordedVideoUrl(dataUrl)
        setRecordedVideoBase64(dataUrl)
        setRecordedWithFrontCamera(false) // Already mirrored in canvas
        setRecordedDuration(0)
        setShowClipConfirm(true)
      }).catch(() => {
        // Fallback to canvas drawImage from video element
        capturePhotoFromVideo()
      })
    } else {
      capturePhotoFromVideo()
    }
  }

  // Fallback photo capture from video element (Safari, Firefox)
  const capturePhotoFromVideo = () => {
    const video = videoRef.current
    if (!video || video.readyState < 2) return // HAVE_CURRENT_DATA

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1080
    canvas.height = video.videoHeight || 1920
    const ctx = canvas.getContext('2d')

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
    setRecordedVideoUrl(dataUrl)
    setRecordedVideoBase64(dataUrl)
    setRecordedWithFrontCamera(false) // Already mirrored in canvas
    setRecordedDuration(0)
    setShowClipConfirm(true)
  }

  const handleRecordStart = () => {
    if (!streamRef.current) return
    isPressingRef.current = true

    if (selectedDuration === 'PHOTO') {
      // PHOTO mode: tap = photo, hold = video
      isLongPressRef.current = false
      longPressTimerRef.current = setTimeout(() => {
        isLongPressRef.current = true
        startVideoRecording()
      }, 300)
    } else {
      // Video durations: start recording immediately on press
      startVideoRecording()
    }
  }

  const handleRecordEnd = () => {
    // Clear long-press timer if it hasn't fired yet
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }

    // Only capture if handleRecordStart was called first (prevents phantom captures on mount)
    if (!isPressingRef.current) return
    isPressingRef.current = false

    if (selectedDuration === 'PHOTO' && !isLongPressRef.current && !isRecording) {
      // Short tap in PHOTO mode → capture still photo
      capturePhoto()
      return
    }

    // Stop video recording
    if (isRecording && mediaRecorderRef.current) {
      setIsRecording(false)
      mediaRecorderRef.current.stop()
    }
  }

  const handleConfirmClip = () => {
    // Pause video before transitioning
    if (videoRef.current) {
      videoRef.current.pause()
    }
    setShowClipConfirm(false)
    if (selectedMode === 'party') {
      setShowPartyCreationFlow(true)
    } else if (selectedMode === 'nominate') {
      // Show tag flow for nominate mode
      setShowTagFlow(true)
    } else {
      setShowEditClipScreen(true)
    }
  }

  const handleCloseEditClipScreen = () => {
    // Reset everything back to beginning
    setShowEditClipScreen(false)

    // Clear recorded video
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl)
      setRecordedVideoUrl(null)
    }
    setRecordedVideoBase64(null)
    setVideoPlaylist(null)

    // Reset nominate mode state
    setSelectedTag(null)
    setTextOverlays([])
    setShowClipConfirm(false)
    setShowTagFlow(false)
    setLoadedQuotedReel(null)
    setIsLoadedFromDraft(false)
    setIsFromDeviceMedia(false)
    setDeviceMediaType(null)

    // Reset sound selection and stop audio
    setSelectedSound(null)
    if (soundAudioRef.current) { soundAudioRef.current.pause(); soundAudioRef.current.src = '' }

    // Reset trim state and video edits
    setVideoTrimStart(0)
    setVideoTrimEnd(null)
    setVideoEdits(null)

    // Re-attach camera stream
    setTimeout(() => {
      if (videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current
      }
    }, 50)
  }

  const handleNextFromEditClip = (trimData) => {
    if (trimData) {
      setVideoTrimStart(trimData.trimStart ?? 0)
      setVideoTrimEnd(trimData.trimEnd ?? null)
      setVideoEdits({
        soundOffset: trimData.soundOffset,
        soundStartFrac: trimData.soundStartFrac ?? 0,
        soundEndFrac: trimData.soundEndFrac ?? 1,
        videoVolume: trimData.videoVolume,
        soundVolume: trimData.soundVolume,
        segments: trimData.segments,
      })
    }
    setShowPostScreen(true)
  }

  // Manage video playback when transitioning between screens
  useEffect(() => {
    if (videoRef.current && recordedVideoUrl) {
      if (showEditClipScreen || showPostScreen || showPartyCreationFlow) {
        // Pause when another screen is shown
        videoRef.current.pause()
      } else {
        // Resume and restart when returning to this screen
        // Use timeout to ensure video element is ready after screen transition
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.currentTime = 0
            videoRef.current.play().catch(() => {})
          }
        }, 50)
      }
    }
  }, [showEditClipScreen, showPostScreen, showPartyCreationFlow, recordedVideoUrl])

  const handleClosePostScreen = (postScreenEdits) => {
    setShowPostScreen(false)
    // Sync any video edits PostScreen may have made (e.g. via its VideoEditor) back to CreateScreen
    if (postScreenEdits) {
      handleVideoEditsChange(postScreenEdits)
    }
    // Reload drafts in case PostScreen saved any
    reloadDraftsFromStorage()
    // EditClipScreen stays mounted, so all edits (text overlays, race pill, etc.) are preserved
  }

  // Called when draft is saved from PostScreen - resets to camera mode
  const handleDraftSavedFromPostScreen = () => {
    setShowPostScreen(false)

    // Clear recorded video and reset to camera
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl)
      setRecordedVideoUrl(null)
    }
    setRecordedVideoBase64(null)
    setVideoPlaylist(null)

    // Reset mode-specific state
    setSelectedTag(null)
    setTextOverlays([])
    setLoadedQuotedReel(null)
    setIsLoadedFromDraft(false)
    setIsFromDeviceMedia(false)
    setDeviceMediaType(null)

    // Reset sound selection and stop audio
    setSelectedSound(null)
    if (soundAudioRef.current) { soundAudioRef.current.pause(); soundAudioRef.current.src = '' }

    // Reload drafts from storage
    reloadDraftsFromStorage()

    // Re-attach camera stream
    setTimeout(() => {
      if (videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current
      }
    }, 50)
  }

  const handlePost = async (postData) => {
    console.log('Posting:', postData)

    setIsPosting(true)
    setPostingStep(0)

    let videoUrl = recordedVideoBase64 || recordedVideoUrl
    let postDuration = recordedDuration || 10
    let postMirrored = recordedWithFrontCamera

    // If playlist mode, combine all segments server-side via FFmpeg
    if (videoPlaylist && videoPlaylist.length > 1) {
      setPostingStep(1)
      setIsCombiningForPost(true)
      setCombineProgress(0)
      try {
        const segments = postData.segments || videoEdits?.segments || []

        // Deduplicate playlist URLs and map to file indices for upload
        const uniqueUrls = [...new Set(videoPlaylist.map(p => p.url))]
        const urlToIndex = new Map(uniqueUrls.map((url, i) => [url, i]))

        // Build segments with fileIndex from sourceIdx (segments use local times)
        const serverSegments = segments.map(seg => ({
          fileIndex: urlToIndex.get(videoPlaylist[seg.sourceIdx].url),
          startTime: seg.start,
          endTime: seg.end,
        }))

        setCombineProgress(0.1) // Fetching blobs

        // Fetch each unique blob URL into a Blob
        const blobs = await Promise.all(
          uniqueUrls.map(async (url) => {
            const resp = await fetch(url)
            return resp.blob()
          })
        )

        setCombineProgress(0.3) // Building upload

        // Build FormData
        const formData = new FormData()
        blobs.forEach((blob, i) => {
          formData.append('videos', blob, `video-${i}.webm`)
        })
        formData.append('segments', JSON.stringify(serverSegments))

        setCombineProgress(0.5) // Uploading & combining

        // Upload to server for FFmpeg concatenation
        const result = await reelsApi.combineVideos(formData)

        setCombineProgress(1.0)

        videoUrl = result.data.videoUrl
        postDuration = result.data.duration
        // FFmpeg doesn't alter mirroring — preserve source mirror state for the player
        postMirrored = videoPlaylist.every(p => p.isMirrored)

        // Recalculate segments for the combined video: convert local source times
        // to cumulative timestamps so ReelCard plays the single file correctly
        let cumulative = 0
        const combinedSegments = segments.map(seg => {
          const dur = seg.end - seg.start
          const newSeg = { start: cumulative, end: cumulative + dur }
          cumulative += dur
          return newSeg
        })
        postData.segments = combinedSegments
        postData.trimStart = 0
        postData.trimEnd = cumulative
      } catch (err) {
        console.error('Failed to combine playlist for post:', err)
        // Fall through with first video as fallback
      } finally {
        setIsCombiningForPost(false)
      }
    }

    // Backend schema requires integer duration
    postDuration = Math.max(1, Math.round(postDuration))

    // Use targetRace from PostScreen if provided, otherwise use raceName from race mode
    const finalTargetRace = postData.targetRace || (selectedMode === 'race' ? raceName : null)

    // Check if creating a new race (race mode with name but no existing race selected)
    const isCreatingNewRace = selectedMode === 'race' && raceName && !selectedExistingRace

    setPostingStep(2)

    // Create the post with video and all data
    if (onPostCreated) {
      try {
        await onPostCreated({
          ...postData,
          videoUrl,
          duration: postDuration,
          isMirrored: postMirrored,
          targetRace: finalTargetRace,
          isNomination: selectedMode === 'nominate',
          taggedUser: selectedTag,
          textOverlays: textOverlays,
          // Selfie overlay data (only for nominate/quote mode)
          selfieSize: (selectedMode === 'nominate' || !!loadedQuotedReel) && showSelfieOverlay ? selfieSize : undefined,
          selfiePosition: (selectedMode === 'nominate' || !!loadedQuotedReel) && showSelfieOverlay ? selfiePosition : undefined,
          showSelfieOverlay: (selectedMode === 'nominate' || !!loadedQuotedReel) && showSelfieOverlay,
          // Race creation data
          isCreatingNewRace,
          selectedExistingRace,
          raceDeadline: isCreatingNewRace ? raceDeadline : null,
          raceType: isCreatingNewRace ? raceType : null,
          winMethod: isCreatingNewRace ? winMethod : null,
        })
      } finally {
        setIsPosting(false)
      }
    } else {
      setIsPosting(false)
      setShowPostScreen(false)
      onClose()
    }
  }

  const handleClosePartyCreationFlow = () => {
    setShowPartyCreationFlow(false)
  }

  const handlePartyCreated = (partyData) => {
    console.log('Party created:', partyData)
    setShowPartyCreationFlow(false)
    onPartyCreated?.(partyData)
  }

  const handleDeleteClip = () => {
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl)
      setRecordedVideoUrl(null)
    }
    setRecordedVideoBase64(null)
    setVideoPlaylist(null)
    setShowClipConfirm(false)
    setVideoTrimStart(0)
    setVideoTrimEnd(null)
    setSelectedSound(null)
    if (soundAudioRef.current) { soundAudioRef.current.pause(); soundAudioRef.current.src = '' }

    // Re-attach camera stream after a brief delay to ensure video element is ready
    setTimeout(() => {
      if (videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current
      }
    }, 50)
  }

  // Tag flow handlers
  const handleSelectTag = (user) => {
    // Toggle selection - clicking selected user deselects them
    if (selectedTag?.id === user.id) {
      setSelectedTag(null)
    } else {
      setSelectedTag(user)
    }
    setTagQuery('')
    setPhoneNumber('')
  }

  const handleConfirmTag = () => {
    // If using phone number, create a phone invite tag
    if (tagSource === 'phone' && phoneNumber.trim()) {
      setSelectedTag({
        id: `phone-${Date.now()}`,
        phone: phoneNumber.trim(),
        name: null,
        isOnPlatform: false,
        isPhoneInvite: true
      })
    }
    setShowTagFlow(false)
    setShowEditClipScreen(true)
  }

  const handleSkipTag = () => {
    setSelectedTag(null)
    setShowTagFlow(false)
    setShowEditClipScreen(true)
  }

  const handleSaveContactName = (contactId, newName) => {
    setCustomContactNames(prev => ({ ...prev, [contactId]: newName }))
    setEditingContactName(null)
  }

  const getFilteredUsers = () => {
    const query = tagQuery.toLowerCase()
    if (tagSource === 'platform') {
      // When searching, use live API search results
      if (query.trim()) {
        return searchResults
      }
      // When not searching, show all pre-fetched users & parties
      return platformUsers
    } else if (tagSource === 'contacts') {
      return mockContacts.filter(contact => {
        const displayName = customContactNames[contact.id] || contact.name || contact.phone
        return displayName.toLowerCase().includes(query)
      })
    }
    return []
  }

  const getContactDisplayName = (contact) => {
    return customContactNames[contact.id] || contact.name || contact.phone
  }

  const filteredUsers = getFilteredUsers()

  // Check if can continue (has selection or valid phone)
  const canContinueTag = selectedTag || (tagSource === 'phone' && phoneNumber.trim().length >= 10)

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX
  }

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current
    const threshold = 50
    const currentIndex = durations.indexOf(selectedDuration)

    if (Math.abs(diff) > threshold) {
      if (diff > 0 && currentIndex < durations.length - 1) {
        // Swipe left -> next option
        setSelectedDuration(durations[currentIndex + 1])
      } else if (diff < 0 && currentIndex > 0) {
        // Swipe right -> previous option
        setSelectedDuration(durations[currentIndex - 1])
      }
    }
  }

  return (
    <div className="create-screen">
      {/* Camera Preview */}
      <div className="create-camera-preview">
        {recordedVideoUrl && recordedDuration === 0 ? (
          /* Photo capture — show as image */
          <img
            key="photo"
            src={recordedVideoUrl}
            className={`create-preview-video`}
            alt=""
          />
        ) : recordedVideoUrl ? (
          <video
            key="recorded"
            ref={videoRef}
            src={recordedVideoUrl}
            className={`create-preview-video ${recordedWithFrontCamera ? 'mirrored' : ''}`}
            autoPlay
            loop
            playsInline
            onTimeUpdate={syncSelfieVideo}
            onPlay={(e) => { e.target.muted = false; e.target.volume = 1.0 }}
            onLoadedData={() => console.log('Recorded video loaded successfully')}
            onError={(e) => console.error('Recorded video error:', e)}
          />
        ) : (
          <video
            key="live"
            ref={videoRef}
            className={`create-preview-video ${facingMode === 'user' ? 'mirrored' : ''}`}
            autoPlay
            muted
            playsInline
          />
        )}
        {cameraError && (
          <div className="create-camera-error">
            <span>{cameraError}</span>
            <button onClick={() => startCamera()}>Retry</button>
          </div>
        )}
      </div>

      {/* Selfie Cam - Live feed during recording phase (before we have recorded video) */}
      {selectedMode === 'nominate' && showSelfieCam && !recordedVideoUrl && !showTagFlow && (
        <div className={`create-selfie-cam ${isRecording ? 'recording' : ''}`}>
          <button className="selfie-cam-remove" onClick={() => setShowSelfieCam(false)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <video
            className="selfie-cam-video mirrored"
            autoPlay
            muted
            playsInline
            ref={(el) => {
              if (el && streamRef.current) {
                el.srcObject = streamRef.current
              }
            }}
          />
          {isRecording && <div className="selfie-cam-recording-dot" />}
        </div>
      )}

      {/* Top Controls */}
      <div className="create-top-controls">
        <button className="create-close-btn" onClick={showClipConfirm ? handleDeleteClip : onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <button className="create-sound-btn" onClick={() => setShowAddSound(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
          <span>{selectedSound ? selectedSound.name : 'add sound'}</span>
        </button>

        <div className="create-side-controls">
          <button className="create-side-btn flip-camera" onClick={flipCamera}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20 7h-3a2 2 0 00-2 2v6a2 2 0 002 2h3a2 2 0 002-2V9a2 2 0 00-2-2z" />
              <path d="M14 7H4a2 2 0 00-2 2v6a2 2 0 002 2h10" />
              <path d="M7 7V4l3 3-3 3V7z" />
              <path d="M17 17v3l-3-3 3-3v3z" />
            </svg>
          </button>
          <button className="create-side-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </button>
          <button className="create-side-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </button>
          <button className="create-side-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
              <circle cx="12" cy="12" r="4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Bottom Controls */}
      {!showTagFlow && (
        <div
          className="create-bottom-controls"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Duration Selector */}
          {!isRecording && !showClipConfirm && (
            <div className="create-duration-selector">
              {durations.map((duration) => (
                <button
                  key={duration}
                  className={`create-duration-btn ${selectedDuration === duration ? 'active' : ''}`}
                  onClick={() => setSelectedDuration(duration)}
                >
                  {duration}
                </button>
              ))}
            </div>
          )}

          {/* Record Button Row */}
          <div className={`create-record-row ${showClipConfirm ? 'confirm-mode' : ''} mode-${selectedMode}`}>
            {/* Buttons always in fixed order, CSS handles centering active one */}
            {/* Distance from active: 2+ slots away = "far" class for smaller size */}
            {!(isRecording || showClipConfirm) ? (
              <div className="create-buttons-track">
                <button
                  className={`create-nominate-btn ${selectedMode === 'nominate' ? 'active' : ''} ${(selectedMode === 'race' || selectedMode === 'party') ? 'far' : ''}`}
                  onClick={() => setSelectedMode('nominate')}
                  onMouseDown={() => selectedMode === 'nominate' && handleRecordStart()}
                  onMouseUp={handleRecordEnd}
                  onMouseLeave={handleRecordEnd}
                  onTouchStart={() => selectedMode === 'nominate' && handleRecordStart()}
                  onTouchEnd={handleRecordEnd}
                >
                  <div className="create-nominate-inner">
                    <span className="nominate-text">Nominate</span>
                  </div>
                </button>

                <button
                  className={`create-record-btn ${selectedMode === 'record' ? 'active' : ''} ${selectedMode === 'party' ? 'far' : ''}`}
                  onClick={() => setSelectedMode('record')}
                  onMouseDown={() => selectedMode === 'record' && handleRecordStart()}
                  onMouseUp={handleRecordEnd}
                  onMouseLeave={handleRecordEnd}
                  onTouchStart={() => selectedMode === 'record' && handleRecordStart()}
                  onTouchEnd={handleRecordEnd}
                >
                  <div className="create-record-inner">
                    <span className="create-record-c">C</span>
                    <span className="create-record-p">P</span>
                  </div>
                </button>

                <button
                  className={`create-race-btn ${selectedMode === 'race' ? 'active' : ''} ${selectedMode === 'nominate' ? 'far' : ''}`}
                  onClick={() => setSelectedMode('race')}
                  onMouseDown={() => selectedMode === 'race' && handleRecordStart()}
                  onMouseUp={handleRecordEnd}
                  onMouseLeave={handleRecordEnd}
                  onTouchStart={() => selectedMode === 'race' && handleRecordStart()}
                  onTouchEnd={handleRecordEnd}
                >
                  <div className="create-race-inner">
                    <span className="race-text">Race</span>
                  </div>
                </button>

                <button
                  className={`create-party-btn ${selectedMode === 'party' ? 'active' : ''} ${(selectedMode === 'nominate' || selectedMode === 'record') ? 'far' : ''}`}
                  onClick={() => setSelectedMode('party')}
                  onMouseDown={() => selectedMode === 'party' && handleRecordStart()}
                  onMouseUp={handleRecordEnd}
                  onMouseLeave={handleRecordEnd}
                  onTouchStart={() => selectedMode === 'party' && handleRecordStart()}
                  onTouchEnd={handleRecordEnd}
                >
                  <div className="create-party-inner">
                    <span className="party-text">Party</span>
                  </div>
                </button>
              </div>
            ) : (
              /* Only show active button when recording or confirming - needs release handlers */
              selectedMode === 'record' ? (
                <button
                  className={`create-record-btn active ${isRecording ? 'recording' : ''}`}
                  onMouseUp={handleRecordEnd}
                  onMouseLeave={handleRecordEnd}
                  onTouchEnd={handleRecordEnd}
                >
                  <div className="create-record-inner">
                    <span className="create-record-c">C</span>
                    <span className="create-record-p">P</span>
                  </div>
                </button>
              ) : selectedMode === 'nominate' ? (
                <button
                  className={`create-nominate-btn active ${isRecording ? 'recording' : ''}`}
                  onMouseUp={handleRecordEnd}
                  onMouseLeave={handleRecordEnd}
                  onTouchEnd={handleRecordEnd}
                >
                  <div className="create-nominate-inner">
                    <span className="nominate-text">Nominate</span>
                  </div>
                </button>
              ) : selectedMode === 'race' ? (
                <button
                  className={`create-race-btn active ${isRecording ? 'recording' : ''}`}
                  onMouseUp={handleRecordEnd}
                  onMouseLeave={handleRecordEnd}
                  onTouchEnd={handleRecordEnd}
                >
                  <div className="create-race-inner">
                    <span className="race-text">Race</span>
                  </div>
                </button>
              ) : (
                <button
                  className={`create-party-btn active ${isRecording ? 'recording' : ''}`}
                  onMouseUp={handleRecordEnd}
                  onMouseLeave={handleRecordEnd}
                  onTouchEnd={handleRecordEnd}
                >
                  <div className="create-party-inner">
                    <span className="party-text">Party</span>
                  </div>
                </button>
              )
            )}

            {/* Clip Confirm Actions */}
            {showClipConfirm && (
              <div className="clip-inline-actions">
                <button className="clip-action-btn delete" onClick={handleDeleteClip}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
                <button className="clip-action-btn draft" onClick={() => {
                  saveToDrafts(recordedVideoUrl, recordedWithFrontCamera)
                  setShowSentConfirmation(true)
                  setTimeout(() => setShowSentConfirmation(false), 1500)
                  handleDeleteClip()
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                </button>
                <button className="clip-action-btn confirm" onClick={handleConfirmClip}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tag Flow Overlay - for Nominate mode */}
      {showTagFlow && (
        <div className="nominate-tag-flow">
          {/* Top Section - Selected Tag Display */}
          <div className="tag-top-section">
            {selectedTag ? (
              <div className="selected-tag-display">
                <span className="tag-at">@</span>
                <span className="tag-name">{selectedTag.username || getContactDisplayName(selectedTag)}</span>
              </div>
            ) : tagSource === 'phone' && phoneNumber ? (
              <div className="selected-tag-display">
                <span className="tag-phone-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                </span>
                <span className="tag-name">{phoneNumber}</span>
              </div>
            ) : (
              <div className="tag-placeholder-text">Tag someone in your nomination</div>
            )}
          </div>


          {/* Bottom Section - Search & List */}
          <div className="tag-bottom-section">
            {/* Source Toggle */}
            <div className="tag-source-toggle">
              <button
                className={`tag-source-btn ${tagSource === 'platform' ? 'active' : ''}`}
                onClick={() => { setTagSource('platform'); setSelectedTag(null); }}
              >
                On Platform
              </button>
              <button
                className={`tag-source-btn ${tagSource === 'contacts' ? 'active' : ''}`}
                onClick={() => { setTagSource('contacts'); setSelectedTag(null); }}
              >
                Contacts
              </button>
              <button
                className={`tag-source-btn ${tagSource === 'phone' ? 'active' : ''}`}
                onClick={() => { setTagSource('phone'); setSelectedTag(null); }}
              >
                Phone #
              </button>
            </div>

            {/* Search Input or Phone Input */}
            {tagSource === 'phone' ? (
              <div className="tag-phone-input-container">
                <span className="tag-phone-prefix">+1</span>
                <input
                  type="tel"
                  className="tag-phone-input"
                  placeholder="Enter phone number to invite"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                  maxLength={10}
                  autoFocus
                />
              </div>
            ) : (
              <div className="tag-input-container">
                <span className="tag-input-at">@</span>
                <input
                  type="text"
                  className="tag-input"
                  placeholder="search to tag someone"
                  value={tagQuery}
                  onChange={(e) => setTagQuery(e.target.value)}
                  autoFocus
                />
              </div>
            )}

            {/* Users/Contacts List */}
            {tagSource !== 'phone' && (
              <div className="tag-users-list">
                {isSearching && tagQuery.trim() && (
                  <div className="tag-searching-indicator">Searching...</div>
                )}
                {filteredUsers.map(user => (
                  <div
                    key={`${user.type || 'user'}-${user.id}`}
                    className={`tag-user-item ${selectedTag?.id === user.id ? 'selected' : ''}`}
                    onClick={() => handleSelectTag(user)}
                  >
                    {tagSource === 'platform' ? (
                      <>
                        <div className="tag-avatar-wrapper">
                          <img src={user.avatar} alt={user.name} className="tag-user-avatar" />
                          {user.type === 'party' && (
                            <span className="tag-party-badge">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                              </svg>
                            </span>
                          )}
                        </div>
                        <div className="tag-user-info">
                          <span className="tag-user-name">
                            {user.name}
                            {user.type === 'party' && <span className="tag-party-label">Party</span>}
                          </span>
                          <span className="tag-user-handle">@{user.username}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="tag-contact-avatar">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        </div>
                        <div className="tag-user-info">
                          <span className="tag-user-name">{getContactDisplayName(user)}</span>
                          {!user.isOnPlatform && <span className="tag-invite-label">Will receive invite</span>}
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {!isSearching && tagQuery.trim() && filteredUsers.length === 0 && (
                  <div className="tag-no-results">No users or parties found</div>
                )}
              </div>
            )}

            {/* Phone invite message */}
            {tagSource === 'phone' && phoneNumber.length >= 10 && (
              <div className="tag-phone-invite-msg">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>They'll receive an invite to join and see your nomination</span>
              </div>
            )}
          </div>

          {/* Tag Actions */}
          <div className="tag-flow-actions">
            <button className="tag-skip-btn" onClick={handleSkipTag}>
              Skip
            </button>
            <button
              className="tag-confirm-btn"
              onClick={handleConfirmTag}
              disabled={!canContinueTag}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Bottom Bar with Gallery */}
      {!showTagFlow && (
        <div className="create-bottom-bar">
          <button className="create-gallery-btn" onClick={() => setShowMediaPanel(true)}>
            {drafts.length > 0 || deviceMedia.length > 0 ? (
              <img
                src={drafts.length > 0 ? drafts[0].thumbnail : deviceMedia[0]?.thumbnail}
                alt="Gallery"
              />
            ) : (
              <div className="gallery-empty-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              </div>
            )}
            {drafts.length > 0 && <span className="gallery-draft-badge">{drafts.length}</span>}
          </button>
        </div>
      )}

      {/* Hidden file input for device media picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,.mov,.mp4,.webm,.avi,.mkv,.m4v,.heic,.heif"
        multiple
        style={{ display: 'none' }}
        onChange={handleDeviceFilesSelected}
      />

      {/* Media Panel (Drafts & Recents) */}
      {showMediaPanel && (
        <div className="media-panel-overlay" onClick={() => { setShowMediaPanel(false); setMultiSelectMode(false); setSelectedMediaItems([]) }}>
          <div className="media-panel" onClick={(e) => e.stopPropagation()}>
            {/* Tab Header */}
            <div className="media-panel-header">
              <button
                className={`media-panel-tab ${mediaPanelTab === 'recents' ? 'active' : ''}`}
                onClick={() => { setMediaPanelTab('recents') }}
              >
                Recents
              </button>
              <button
                className={`media-panel-tab ${mediaPanelTab === 'drafts' ? 'active' : ''}`}
                onClick={() => { setMediaPanelTab('drafts') }}
              >
                Drafts
              </button>
            </div>

            {/* Multi-Select Bar (both tabs, if MediaRecorder available) */}
            {typeof MediaRecorder !== 'undefined' && (mediaPanelTab === 'drafts' || mediaPermissionStatus === 'granted') && (
              <div className="media-panel-multiselect-bar">
                {multiSelectMode && selectedMediaItems.length >= 1 && (
                  <button
                    className="media-panel-multiselect-done-btn"
                    onClick={handleMultiSelectDone}
                    disabled={isCombiningMedia || selectedMediaItems.length < 2}
                  >
                    Done ({selectedMediaItems.length})
                  </button>
                )}
                {combineError && (
                  <span className="media-combine-error">{combineError}</span>
                )}
                <button
                  className={`media-panel-multiselect-btn ${multiSelectMode ? 'active' : ''}`}
                  onClick={() => {
                    setMultiSelectMode(prev => !prev)
                    setSelectedMediaItems([])
                    setCombineError(null)
                  }}
                >
                  <svg className="multiselect-icon" width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <rect x="0.5" y="3.5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                    <rect x="4.5" y="0.5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="rgba(0,0,0,0.3)" />
                  </svg>
                  Multiple
                </button>
              </div>
            )}

            {/* Media Grid */}
            <div className="media-panel-grid">
              {mediaPanelTab === 'recents' ? (
                <>
                {/* Permission prompt - shown on first open before granting access */}
                {(mediaPermissionStatus === 'prompt' || mediaPermissionStatus === 'unknown') && (
                  <div className="media-permission-prompt" onClick={(e) => e.stopPropagation()}>
                    <div className="media-permission-icon">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="url(#permGrad)" strokeWidth="1.5">
                        <defs>
                          <linearGradient id="permGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#00F2EA" />
                            <stop offset="100%" stopColor="#FF2A55" />
                          </linearGradient>
                        </defs>
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="M21 15l-5-5L5 21" />
                      </svg>
                    </div>
                    <h3>Access your photos & videos</h3>
                    <p>Allow CoolPeople to access your photo library to share your best moments</p>
                    <button className="media-permission-allow-btn" onClick={handleMediaPermissionGrant}>
                      Allow Access
                    </button>
                    <button className="media-permission-skip-btn" onClick={() => setMediaPermissionStatus('denied')}>
                      Not now
                    </button>
                  </div>
                )}

                {/* Granting in progress */}
                {mediaPermissionStatus === 'granting' && (
                  <div className="media-permission-prompt">
                    <div className="media-loading-spinner" />
                    <p>Loading your media...</p>
                  </div>
                )}

                {/* Denied state */}
                {mediaPermissionStatus === 'denied' && (
                  <div className="media-permission-prompt">
                    <p>Media access not granted</p>
                    <button className="media-permission-allow-btn" onClick={handleMediaPermissionGrant}>
                      Try Again
                    </button>
                  </div>
                )}

                {/* Granted: show media grid with optional "Add more" tile */}
                {mediaPermissionStatus === 'granted' && (
                  <>
                  {/* Add more tile (for mobile browser / adding more files) */}
                  {(isMobileBrowser || (!hasFileSystemAccess && !isCapacitor)) && (
                    <div
                      className="media-grid-item add-media-tile"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      <span>Add more</span>
                    </div>
                  )}

                  {/* Desktop: refresh button to re-scan directory */}
                  {hasFileSystemAccess && !isMobileBrowser && !isCapacitor && (
                    <div
                      className="media-grid-item add-media-tile"
                      onClick={refreshDesktopMedia}
                    >
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                        <path d="M1 4v6h6" />
                        <path d="M23 20v-6h-6" />
                        <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                      </svg>
                      <span>{loadingDeviceMedia ? 'Scanning...' : 'Refresh'}</span>
                      {loadingDeviceMedia && <div className="media-loading-spinner" />}
                    </div>
                  )}
                  </>
                )}

                {mediaPermissionStatus === 'granted' && getRecentsWithDrafts().length > 0 ? getRecentsWithDrafts().map(item => {
                  // Determine what to show as main content
                  const mainThumbnail = item.isDraft && item.isQuoteNomination && item.quotedReel?.thumbnail
                    ? item.quotedReel.thumbnail
                    : item.thumbnail
                  const mainVideo = item.isDraft ? item.videoUrl : (!item.thumbnail && item.videoUrl ? item.videoUrl : null)

                  const multiSelectIndex = multiSelectMode
                    ? selectedMediaItems.findIndex(i => i.id === item.id)
                    : -1

                  return (
                    <div
                      key={item.id}
                      className={`media-grid-item ${item.isDraft && (item.isQuoteNomination || item.mode === 'nominate') ? 'draft-item' : ''} ${multiSelectIndex >= 0 ? 'multi-selected' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (multiSelectMode) {
                          handleMultiSelectToggle(item.isDraft ? { ...item, isDraft: true } : item)
                          return
                        }
                        item.isDraft ? loadDraft(item) : loadRecentMedia(item)
                      }}
                    >
                      {/* Main content - thumbnail or video fallback */}
                      {mainThumbnail ? (
                        <img src={mainThumbnail} alt="" />
                      ) : mainVideo ? (
                        <video src={mainVideo} autoPlay loop muted playsInline className="media-grid-video" />
                      ) : (
                        <div className="media-grid-placeholder" />
                      )}

                      {/* Multi-select number badge — bottom left */}
                      {multiSelectMode && multiSelectIndex >= 0 && (
                        <div className="media-multiselect-badge">
                          {multiSelectIndex + 1}
                        </div>
                      )}

                      {/* Selfie overlay for nominate mode drafts in recents */}
                      {item.isDraft && (item.isQuoteNomination || item.mode === 'nominate') && (item.selfieVideoUrl || item.videoUrl) && (
                        <div className="draft-selfie-overlay">
                          <video src={item.selfieVideoUrl || item.videoUrl} autoPlay loop muted playsInline />
                        </div>
                      )}

                      {/* Hide type icons when multiselect badge is showing (same position) */}
                      {item.type === 'video' && multiSelectIndex < 0 && (
                        <div className="media-item-video-icon">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                        </div>
                      )}
                      {item.type === 'image' && !item.isDraft && multiSelectIndex < 0 && (
                        <div className="media-item-image-icon">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                            <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="white" strokeWidth="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5" fill="white"/>
                            <path d="M21 15l-5-5L5 21" stroke="white" strokeWidth="2" fill="none"/>
                          </svg>
                        </div>
                      )}
                      {item.isDraft && (
                        <div className="media-item-draft-badge">draft</div>
                      )}
                    </div>
                  )
                }) : null}
                </>
              ) : (
                drafts.length > 0 ? (
                  drafts.map(draft => {
                    // Determine what to show as main content
                    const mainThumbnail = draft.isQuoteNomination && draft.quotedReel?.thumbnail
                      ? draft.quotedReel.thumbnail
                      : draft.thumbnail
                    const mainVideo = draft.videoUrl

                    const draftMultiSelectIndex = multiSelectMode
                      ? selectedMediaItems.findIndex(i => i.id === draft.id)
                      : -1

                    return (
                      <div
                        key={draft.id}
                        className={`media-grid-item draft-item ${draft.isQuoteNomination ? 'quote-draft' : ''} ${draftMultiSelectIndex >= 0 ? 'multi-selected' : ''}`}
                        onClick={() => {
                          if (multiSelectMode) {
                            handleMultiSelectToggle({ ...draft, isDraft: true })
                            return
                          }
                          loadDraft(draft)
                        }}
                      >
                        {/* Main content - thumbnail or video fallback */}
                        {mainThumbnail ? (
                          <img src={mainThumbnail} alt="" />
                        ) : mainVideo ? (
                          <video src={mainVideo} autoPlay loop muted playsInline className="media-grid-video" />
                        ) : (
                          <div className="media-grid-placeholder" />
                        )}

                      {/* Multi-select number badge — bottom left */}
                      {multiSelectMode && draftMultiSelectIndex >= 0 && (
                        <div className="media-multiselect-badge">
                          {draftMultiSelectIndex + 1}
                        </div>
                      )}

                      {/* Selfie overlay for nominate mode drafts (including quote nominations) */}
                      {(draft.isQuoteNomination || draft.mode === 'nominate') && (draft.selfieVideoUrl || draft.videoUrl) && (
                        <div className="draft-selfie-overlay">
                          <video src={draft.selfieVideoUrl || draft.videoUrl} autoPlay loop muted playsInline />
                        </div>
                      )}

                      {/* Tag overlay for nominate mode */}
                      {draft.taggedUser && (
                        <div className="draft-tag-overlay">
                          <span className="draft-tag-at">@</span>
                          <span className="draft-tag-name">{draft.taggedUser.username || draft.taggedUser.name}</span>
                        </div>
                      )}

                      {/* Race pill overlay */}
                      {draft.mode === 'race' && draft.raceName && (
                        <div className="draft-race-pill">
                          <span className="draft-race-dot"></span>
                          <span>{draft.raceName}</span>
                        </div>
                      )}

                      {/* Hide video icon when multiselect badge is showing (same position) */}
                      {draftMultiSelectIndex < 0 && (
                        <div className="media-item-video-icon">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                        </div>
                      )}
                      {/* Hide delete button in multiselect mode */}
                      {!multiSelectMode && (
                        <button
                          className="draft-delete-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteDraft(draft.id)
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                      <div className={`draft-mode-badge ${draft.mode === 'race' ? 'race' : draft.mode === 'nominate' ? 'nominate' : draft.mode === 'party' ? 'party' : ''}`}>
                        {draft.isQuoteNomination ? 'Quote' : draft.mode === 'race' ? 'Race' : draft.mode === 'nominate' ? 'Nominate' : draft.mode === 'party' ? 'Party' : 'Post'}
                      </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="media-panel-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                    <span>No drafts yet</span>
                    <p>Save videos to continue editing later</p>
                  </div>
                )
              )}
            </div>

            {/* Combining Media Overlay */}
            {isCombiningMedia && (
              <div className="media-combine-overlay">
                <div className="media-combine-modal">
                  <div className="media-loading-spinner" />
                  <p>Combining {selectedMediaItems.length} items...</p>
                  <div className="media-combine-progress-bar">
                    <div
                      className="media-combine-progress-fill"
                      style={{ width: `${Math.round(combineProgress * 100)}%` }}
                    />
                  </div>
                  <span className="media-combine-percent">{Math.round(combineProgress * 100)}%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sent Confirmation Animation */}
      {showSentConfirmation && (
        <div className="sent-confirmation">
          <div className="sent-check-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="url(#sentGradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <defs>
                <linearGradient id="sentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00F2EA" />
                  <stop offset="100%" stopColor="#FF2A55" />
                </linearGradient>
              </defs>
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
        </div>
      )}

      {/* Added Sound Audio (plays on CreateScreen — loops in camera mode, syncs with recorded video) */}
      <audio ref={soundAudioRef} preload="auto" />

      {/* Add Sound Screen */}
      {showAddSound && (
        <AddSound
          onClose={() => setShowAddSound(false)}
          onSelectSound={(sound) => setSelectedSound(sound)}
        />
      )}

      {/* Edit Clip Screen */}
      {showEditClipScreen && (
        <EditClipScreen
          onClose={handleCloseEditClipScreen}
          onNext={handleNextFromEditClip}
          onVideoEditsChange={handleVideoEditsChange}
          initialVideoEdits={videoEdits}
          initialTrimStart={videoTrimStart}
          initialTrimEnd={videoTrimEnd}
          selectedSound={selectedSound}
          onSelectSound={setSelectedSound}
          isRaceMode={selectedMode === 'race'}
          isNominateMode={selectedMode === 'nominate'}
          raceName={raceName}
          onRaceNameChange={setRaceName}
          raceDeadline={raceDeadline}
          onRaceDeadlineChange={setRaceDeadline}
          raceType={raceType}
          onRaceTypeChange={setRaceType}
          winMethod={winMethod}
          onWinMethodChange={setWinMethod}
          selectedExistingRace={selectedExistingRace}
          onSelectedExistingRaceChange={setSelectedExistingRace}
          recordedVideoUrl={recordedVideoUrl}
          recordedVideoBase64={recordedVideoBase64}
          isMirrored={recordedWithFrontCamera}
          videoPlaylist={videoPlaylist}
          isConversationMode={isConversationMode}
          conversationUser={conversationUser}
          taggedUser={selectedTag}
          getContactDisplayName={getContactDisplayName}
          textOverlays={textOverlays}
          setTextOverlays={setTextOverlays}
          onSend={(recipients) => {
            console.log('Sending to:', recipients)
            onSendToConversation?.(recordedVideoUrl, recordedWithFrontCamera)
          }}
          onCompleteToScoreboard={() => {
            // Close edit screen and show sent confirmation
            setShowEditClipScreen(false)
            setShowSentConfirmation(true)
            // Hide confirmation after animation
            setTimeout(() => {
              setShowSentConfirmation(false)
            }, 1500)
          }}
          onSaveDraft={() => {
            saveToDrafts(recordedVideoUrl, recordedWithFrontCamera)
            setShowSentConfirmation(true)
            setTimeout(() => setShowSentConfirmation(false), 1500)
            handleCloseEditClipScreen()
          }}
          currentMode={selectedMode}
          onModeChange={setSelectedMode}
          quotedReel={loadedQuotedReel}
          isFromDraft={isLoadedFromDraft}
          isFromDeviceMedia={isFromDeviceMedia}
          deviceMediaType={deviceMediaType}
          selfieSize={selfieSize}
          setSelfieSize={setSelfieSize}
          selfiePosition={selfiePosition}
          setSelfiePosition={setSelfiePosition}
          showSelfieOverlay={showSelfieOverlay}
          setShowSelfieOverlay={setShowSelfieOverlay}
          isBackgrounded={showPostScreen}
        />
      )}

      {/* Post Screen */}
      {showPostScreen && (
        <PostScreen
          onClose={handleClosePostScreen}
          onPost={handlePost}
          onDraftSaved={handleDraftSavedFromPostScreen}
          isRaceMode={selectedMode === 'race'}
          isNominateMode={selectedMode === 'nominate'}
          raceName={raceName}
          raceDeadline={raceDeadline}
          recordedVideoUrl={recordedVideoUrl}
          recordedVideoBase64={recordedVideoBase64}
          isMirrored={recordedWithFrontCamera}
          showSelfieCam={showSelfieCam}
          taggedUser={selectedTag}
          getContactDisplayName={getContactDisplayName}
          textOverlays={textOverlays}
          userParty={userParty}
          userRacesFollowing={userRacesFollowing}
          userRacesCompeting={userRacesCompeting}
          conversations={conversations}
          isQuoteNomination={!!loadedQuotedReel}
          quotedReel={loadedQuotedReel}
          selfieSize={selfieSize}
          selfiePosition={selfiePosition}
          showSelfieOverlay={showSelfieOverlay}
          trimStart={videoTrimStart}
          trimEnd={videoTrimEnd}
          selectedSound={selectedSound}
          videoEdits={videoEdits}
          videoPlaylist={videoPlaylist}
        />
      )}

      {/* Posting loading overlay */}
      {isPosting && (
        <div className="posting-overlay">
          <div className="posting-overlay-content">
            <div className="posting-ring">
              <svg viewBox="0 0 60 60">
                <circle cx="30" cy="30" r="26" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                <circle cx="30" cy="30" r="26" fill="none" stroke="url(#posting-grad)" strokeWidth="3" strokeLinecap="round" strokeDasharray="120 164" className="posting-ring-arc" />
                <defs>
                  <linearGradient id="posting-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00F2EA" />
                    <stop offset="100%" stopColor="#FF2A55" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="posting-steps">
              <span className={`posting-step ${postingStep >= 0 ? 'active' : ''} ${postingStep > 0 ? 'done' : ''}`}>Preparing</span>
              {videoPlaylist && videoPlaylist.length > 1 && (
                <span className={`posting-step ${postingStep >= 1 ? 'active' : ''} ${postingStep > 1 ? 'done' : ''}`}>Combining clips</span>
              )}
              <span className={`posting-step ${postingStep >= 2 ? 'active' : ''} ${postingStep > 2 ? 'done' : ''}`}>Publishing</span>
            </div>
          </div>
        </div>
      )}

      {/* Party Creation Flow */}
      {showPartyCreationFlow && (
        <PartyCreationFlow
          onClose={handleClosePartyCreationFlow}
          onComplete={handlePartyCreated}
          recordedVideoUrl={recordedVideoUrl}
          recordedVideoBase64={recordedVideoBase64}
          isMirrored={recordedWithFrontCamera}
          currentUserId={currentUserId}
          conversations={conversations}
        />
      )}

      {/* Selfie Cam - Rendered last to appear on top of all screens (hidden during tag flow, post screen, and edit clip screen) */}
      {selectedMode === 'nominate' && showSelfieCam && recordedVideoUrl && !showTagFlow && !showPostScreen && !showEditClipScreen && (
        <div className={`create-selfie-cam ${isRecording ? 'recording' : ''}`}>
          <button className="selfie-cam-remove" onClick={() => setShowSelfieCam(false)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <video
            ref={selfieVideoRef}
            className={`selfie-cam-video ${recordedWithFrontCamera ? 'mirrored' : ''}`}
            src={recordedVideoUrl}
            autoPlay
            loop
            muted
            playsInline
          />
        </div>
      )}

    </div>
  )
}

export default CreateScreen
