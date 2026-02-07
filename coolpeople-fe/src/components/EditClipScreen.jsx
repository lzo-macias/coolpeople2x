import { useState, useRef, useEffect, useCallback } from 'react'
import AddSound from './AddSound'
import { racesApi, messagesApi, usersApi, searchApi, groupchatsApi, partiesApi, favoritesApi } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import '../styling/EditClipScreen.css'

function EditClipScreen({ onClose, onNext, selectedSound, onSelectSound, isRaceMode, isNominateMode, raceName, onRaceNameChange, raceDeadline, onRaceDeadlineChange, raceType, onRaceTypeChange, winMethod, onWinMethodChange, selectedExistingRace, onSelectedExistingRaceChange, recordedVideoUrl, recordedVideoBase64, isMirrored, isConversationMode, conversationUser, onSend, taggedUser, getContactDisplayName, textOverlays, setTextOverlays, onCompleteToScoreboard, onSaveDraft, currentMode, onModeChange, quotedReel, isFromDraft }) {
  const { user: authUser } = useAuth()
  const [showAddSound, setShowAddSound] = useState(false)
  const videoRef = useRef(null)
  const [fetchedPlatformUsers, setFetchedPlatformUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const searchTimeoutRef = useRef(null)

  // Selfie overlay visibility (for drafts - can be deleted/restored)
  const [showSelfieOverlay, setShowSelfieOverlay] = useState(true)

  // Reset selfie overlay visibility when video URL changes (new draft loaded)
  useEffect(() => {
    setShowSelfieOverlay(true)
    setUndoStack([])
  }, [recordedVideoUrl])

  // Undo history for reversible actions
  const [undoStack, setUndoStack] = useState([])

  const pushUndo = (action) => {
    setUndoStack(prev => [...prev, action])
  }

  const handleUndo = () => {
    if (undoStack.length === 0) return
    const lastAction = undoStack[undoStack.length - 1]

    // Restore based on action type
    if (lastAction.type === 'deleteSelfie') {
      setShowSelfieOverlay(true)
    } else if (lastAction.type === 'deleteText') {
      setTextOverlays(prev => [...prev, lastAction.data])
    }

    setUndoStack(prev => prev.slice(0, -1))
  }

  const handleDeleteSelfie = () => {
    pushUndo({ type: 'deleteSelfie' })
    setShowSelfieOverlay(false)
  }

  // Restart video from beginning when screen mounts or video URL changes
  useEffect(() => {
    if (videoRef.current && recordedVideoUrl) {
      videoRef.current.currentTime = 0
      videoRef.current.play().catch(() => {})
    }
    // Cleanup - pause when unmounting
    return () => {
      if (videoRef.current) {
        videoRef.current.pause()
      }
    }
  }, [recordedVideoUrl])
  const [isEditingRace, setIsEditingRace] = useState(false)
  // raceType, winMethod, selectedExistingRace come from props now
  const setRaceType = onRaceTypeChange || (() => {})
  const setWinMethod = onWinMethodChange || (() => {})
  const setSelectedExistingRace = onSelectedExistingRaceChange || (() => {})
  const [forceNewRace, setForceNewRace] = useState(false) // Track if user clicked "new" to create new race
  const [showUserPanel, setShowUserPanel] = useState(false)
  const [selectedRecipients, setSelectedRecipients] = useState([])
  const [sendMode, setSendMode] = useState('separate') // 'separate' or 'together'
  const [userSource, setUserSource] = useState('platform') // 'platform' or 'contacts'
  const [sendTogether, setSendTogether] = useState(false)
  const [userSearchQuery, setUserSearchQuery] = useState('')

  // Initialize selected recipients with conversation user when panel opens
  const initializePanel = () => {
    if (conversationUser && !selectedRecipients.find(u => u.id === conversationUser.id)) {
      setSelectedRecipients([conversationUser])
    }
    setShowUserPanel(true)
  }

  // Fetch real contacts (DM users + following + groupchats) for the panel
  const fetchPanelUsers = useCallback(async () => {
    if (!authUser?.id) return
    setLoadingUsers(true)
    try {
      const users = []
      const seenIds = new Set()

      // 1. Fetch recent DM conversations (skip party chats - they're fetched separately)
      try {
        const conversationsRes = await messagesApi.getConversations()
        if (conversationsRes.data) {
          conversationsRes.data.forEach(conv => {
            // Skip party chat conversations - parties are added in step 4
            if (conv.isPartyChat || conv.partyId) return
            const otherUser = conv.otherUser
            if (otherUser && !seenIds.has(otherUser.id)) {
              seenIds.add(otherUser.id)
              users.push({
                id: otherUser.id,
                username: otherUser.handle || otherUser.username || otherUser.displayName || 'user',
                avatar: otherUser.avatarUrl || otherUser.avatar || `https://i.pravatar.cc/40?u=${otherUser.id}`,
                type: 'user',
              })
            }
          })
        }
      } catch (e) {
        console.warn('Failed to fetch conversations for panel:', e)
      }

      // 2. Fetch ALL following (paginate through every page)
      try {
        let cursor = undefined
        let hasMore = true
        while (hasMore) {
          const followingRes = await usersApi.getFollowing(authUser.id, cursor)
          const followingList = Array.isArray(followingRes.data) ? followingRes.data : followingRes.data?.following
          if (followingList && followingList.length > 0) {
            followingList.forEach(f => {
              const followedUser = f.following || f
              if (followedUser && !seenIds.has(followedUser.id)) {
                seenIds.add(followedUser.id)
                users.push({
                  id: followedUser.id,
                  username: followedUser.handle || followedUser.username || followedUser.displayName || 'user',
                  avatar: followedUser.avatarUrl || followedUser.avatar || `https://i.pravatar.cc/40?u=${followedUser.id}`,
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
        console.warn('Failed to fetch following for panel:', e)
      }

      // 3. Fetch groupchats (with member lists)
      try {
        const gcRes = await groupchatsApi.getAll()
        if (gcRes.data) {
          gcRes.data.forEach(gc => {
            // Party-linked groupchats: add as party type so they route to party chat endpoint
            if (gc.partyId || gc.party) {
              const pid = `party-${gc.partyId || gc.party?.id}`
              if (!seenIds.has(pid)) {
                seenIds.add(pid)
                users.push({
                  id: pid,
                  partyId: gc.partyId || gc.party?.id,
                  groupChatId: gc.id,
                  username: gc.party?.name || gc.name || 'Party',
                  avatar: gc.party?.avatarUrl || gc.avatarUrl || `https://i.pravatar.cc/40?u=${pid}`,
                  type: 'party',
                  members: gc.members || [],
                })
              }
            } else {
              // Regular groupchats (not party-linked)
              const gcId = `group-${gc.id}`
              if (!seenIds.has(gcId)) {
                seenIds.add(gcId)
                // Use custom name if set, otherwise list member names
                const otherMembers = (gc.members || []).filter(m => m.id !== authUser?.id)
                const memberNames = otherMembers.map(m => m.username || m.displayName || 'user').join(', ')
                users.push({
                  id: gcId,
                  groupChatId: gc.id,
                  username: gc.name || memberNames || 'Group chat',
                  avatar: gc.avatarUrl || gc.members?.[0]?.avatarUrl || `https://i.pravatar.cc/40?u=group-${gc.id}`,
                  type: 'group',
                  members: gc.members || [],
                })
              }
            }
          })
        }
      } catch (e) {
        console.warn('Failed to fetch groupchats for panel:', e)
      }

      // 4. Fetch user's parties (only ones with chat permission)
      try {
        const partiesRes = await partiesApi.listParties()
        const partiesList = Array.isArray(partiesRes.data) ? partiesRes.data : partiesRes.data?.parties || []
        if (partiesList.length > 0) {
          partiesList.forEach(p => {
            if (!p.isMember) return
            const perms = p.myPermissions || []
            const canChat = perms.includes('chat') || perms.includes('admin') || perms.includes('leader')
            if (!canChat) return

            const pid = `party-${p.id}`
            if (!seenIds.has(pid)) {
              seenIds.add(pid)
              users.push({
                id: pid,
                partyId: p.id,
                username: p.name || p.handle || 'Party',
                avatar: p.avatarUrl || `https://i.pravatar.cc/40?u=party-${p.id}`,
                type: 'party',
              })
            }
          })
        }
      } catch (e) {
        console.warn('Failed to fetch parties for panel:', e)
      }

      // 5. Fetch favorited users
      try {
        const favRes = await favoritesApi.getFavorites()
        const favList = favRes.favorites || favRes.data?.favorites || []
        favList.forEach(fav => {
          const favUser = fav.favoritedUser || fav
          if (favUser && !seenIds.has(favUser.id)) {
            seenIds.add(favUser.id)
            users.push({
              id: favUser.id,
              username: favUser.handle || favUser.username || favUser.displayName || 'user',
              avatar: favUser.avatarUrl || favUser.avatar || `https://i.pravatar.cc/40?u=${favUser.id}`,
              type: 'user',
            })
          }
        })
      } catch (e) {
        console.warn('Failed to fetch favorites for panel:', e)
      }

      setFetchedPlatformUsers(users)
    } catch (error) {
      console.error('Error fetching panel users:', error)
    } finally {
      setLoadingUsers(false)
    }
  }, [authUser?.id])

  // Fetch users when panel opens
  useEffect(() => {
    if (showUserPanel && fetchedPlatformUsers.length === 0) {
      fetchPanelUsers()
    }
  }, [showUserPanel, fetchedPlatformUsers.length, fetchPanelUsers])

  const platformUsers = fetchedPlatformUsers

  // Debounced search for users/parties/groupchats across the app
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

    if (!userSearchQuery || userSearchQuery.length < 2) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await searchApi.search(userSearchQuery, { limit: 20 })
        const results = []
        const seenIds = new Set()

        if (res.data) {
          if (res.data.users) {
            res.data.users.forEach(u => {
              if (!seenIds.has(u.id)) {
                seenIds.add(u.id)
                results.push({
                  id: u.id,
                  username: u.handle || u.username || u.displayName || 'user',
                  avatar: u.avatarUrl || u.avatar || `https://i.pravatar.cc/40?u=${u.id}`,
                  type: 'user',
                })
              }
            })
          }
          // Fetch parties with permissions via listParties (search API doesn't include myPermissions)
          try {
            const partiesRes = await partiesApi.listParties(userSearchQuery)
            const partiesList = Array.isArray(partiesRes.data) ? partiesRes.data : partiesRes.data?.parties || []
            if (partiesList.length > 0) {
              partiesList.forEach(p => {
                if (!p.isMember) return
                const perms = p.myPermissions || []
                const canChat = perms.includes('chat') || perms.includes('admin') || perms.includes('leader')
                if (!canChat) return

                const pid = `party-${p.id}`
                if (!seenIds.has(pid)) {
                  seenIds.add(pid)
                  results.push({
                    id: pid,
                    partyId: p.id,
                    username: p.name || p.handle || 'Party',
                    avatar: p.avatarUrl || `https://i.pravatar.cc/40?u=party-${p.id}`,
                    type: 'party',
                  })
                }
              })
            }
          } catch (e) {
            console.warn('Failed to search parties:', e)
          }
        }

        // Also filter local groupchats by search query
        const query = userSearchQuery.toLowerCase()
        fetchedPlatformUsers
          .filter(u => u.type === 'group' && u.username.toLowerCase().includes(query))
          .forEach(gc => {
            if (!seenIds.has(gc.id)) {
              seenIds.add(gc.id)
              results.push(gc)
            }
          })

        setSearchResults(results)
      } catch (e) {
        console.warn('User search failed:', e)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current) }
  }, [userSearchQuery, fetchedPlatformUsers])

  // Show search results when searching, otherwise show fetched contacts
  const getAvailableUsers = () => {
    if (userSearchQuery.trim().length >= 2) return searchResults

    const baseList = conversationUser
      ? [conversationUser, ...platformUsers.filter(u => u.id !== conversationUser.id)]
      : platformUsers
    return baseList
  }

  const availableUsers = getAvailableUsers()

  const toggleRecipient = (user) => {
    setSelectedRecipients(prev =>
      prev.find(u => u.id === user.id)
        ? prev.filter(u => u.id !== user.id)
        : [...prev, user]
    )
  }

  const isSelected = (user) => selectedRecipients.find(u => u.id === user.id)

  // Gather all unique member IDs from selected parties, groupchats, and users
  const collectAllMemberIds = async (recipients) => {
    const allMemberIds = new Set()

    for (const r of recipients) {
      if (r.type === 'party' && r.partyId) {
        // Fetch party members
        try {
          const membersRes = await partiesApi.getMembers(r.partyId)
          if (membersRes.data?.members) {
            membersRes.data.members.forEach(m => allMemberIds.add(m.userId))
          } else if (Array.isArray(membersRes.data)) {
            membersRes.data.forEach(m => allMemberIds.add(m.userId || m.id))
          }
        } catch (e) {
          console.warn('Failed to fetch party members for:', r.username, e)
        }
      } else if (r.type === 'group') {
        // Use member list already on the groupchat object
        if (r.members?.length > 0) {
          r.members.forEach(m => allMemberIds.add(m.id))
        } else if (r.groupChatId) {
          // Fallback: fetch groupchat details for members
          try {
            const gcRes = await groupchatsApi.get(r.groupChatId)
            if (gcRes.data?.members) {
              gcRes.data.members.forEach(m => allMemberIds.add(m.id))
            }
          } catch (e) {
            console.warn('Failed to fetch groupchat members for:', r.username, e)
          }
        }
      } else {
        // Individual user
        allMemberIds.add(r.id)
      }
    }

    // Remove current user from the set (API will add them as creator)
    if (authUser?.id) allMemberIds.delete(authUser.id)

    return [...allMemberIds]
  }

  const handleSend = async () => {
    const recipients = selectedRecipients.length > 0
      ? selectedRecipients
      : conversationUser ? [conversationUser] : []

    if (recipients.length === 0) return

    setIsSending(true)
    try {
      // Use base64 for persistence (blob URLs are session-only)
      const videoUrl = recordedVideoBase64 || recordedVideoUrl || ''
      const videoMetadata = {
        type: 'video',
        videoUrl: videoUrl,
        isMirrored: isMirrored || false,
      }

      if (sendTogether) {
        // Parties get sent separately (party chat), everything else grouped into one groupchat
        // Also check partyId as fallback in case type wasn't set properly
        const partyRecipients = recipients.filter(u => u.type === 'party' || u.partyId)
        const nonPartyRecipients = recipients.filter(u => u.type !== 'party' && !u.partyId)

        // Send to each party individually via party chat
        for (const party of partyRecipients) {
          try {
            if (party.groupChatId) {
              // Party converted from groupchat - send via groupchat API (same table the conversation reads from)
              await groupchatsApi.sendMessage(party.groupChatId, 'Sent a video', videoMetadata)
            } else {
              await partiesApi.sendChatMessage(party.partyId, 'Sent a video', videoMetadata)
            }
            console.log('Sent video to party chat:', party.username)
          } catch (e) {
            console.error('Failed to send to party:', party.username, e)
          }
        }

        // Group all non-party recipients into one groupchat
        if (nonPartyRecipients.length > 0) {
          try {
            const allMemberIds = await collectAllMemberIds(nonPartyRecipients)
            if (allMemberIds.length > 0) {
              const gcRes = await groupchatsApi.create(allMemberIds)
              if (gcRes.data?.id) {
                await groupchatsApi.sendMessage(gcRes.data.id, 'Sent a video', videoMetadata)
                console.log('Sent video to combined group chat:', gcRes.data.id, 'with', allMemberIds.length, 'members')
              }
            }
          } catch (e) {
            console.error('Failed to create combined group chat / send:', e)
          }
        }
      } else {
        // Send separately to each recipient
        // Also check partyId/groupChatId as fallback in case type wasn't set properly
        const partyRecipients = recipients.filter(u => u.type === 'party' || u.partyId)
        const groupRecipients = recipients.filter(u => (u.type === 'group' || u.groupChatId) && !u.partyId)
        const userRecipients = recipients.filter(u => (u.type === 'user' || (!u.type)) && !u.partyId && !u.groupChatId)

        // Send to parties via party chat
        for (const party of partyRecipients) {
          try {
            if (party.groupChatId) {
              // Party converted from groupchat - send via groupchat API (same table the conversation reads from)
              await groupchatsApi.sendMessage(party.groupChatId, 'Sent a video', videoMetadata)
            } else {
              await partiesApi.sendChatMessage(party.partyId, 'Sent a video', videoMetadata)
            }
            console.log('Sent video to party chat:', party.username)
          } catch (e) {
            console.error('Failed to send to party:', party.username, e)
          }
        }

        // Send to existing groupchats
        for (const gc of groupRecipients) {
          try {
            await groupchatsApi.sendMessage(gc.groupChatId, 'Sent a video', videoMetadata)
            console.log('Sent video to groupchat:', gc.username)
          } catch (e) {
            console.error('Failed to send to groupchat:', gc.username, e)
          }
        }

        // Send to individual users via DM
        for (const user of userRecipients) {
          try {
            await messagesApi.sendMessage({
              receiverId: user.id,
              content: 'Sent a video',
              metadata: videoMetadata,
            })
            console.log('Sent video to user:', user.username)
          } catch (e) {
            console.error('Failed to send to user:', user.username, e)
          }
        }
      }
    } catch (error) {
      console.error('Send error:', error)
    } finally {
      setIsSending(false)
    }
  }
  const [pillPosition, setPillPosition] = useState({ x: 20, y: null }) // y: null means use default bottom position
  const [isDragging, setIsDragging] = useState(false)
  const raceInputRef = useRef(null)
  const pillRef = useRef(null)
  const dragStartRef = useRef({ x: 0, y: 0, pillX: 0, pillY: 0 })

  // Tag dragging state
  const [tagPosition, setTagPosition] = useState({ x: 20, y: null })
  const [isTagDragging, setIsTagDragging] = useState(false)
  const tagRef = useRef(null)
  const tagDragStartRef = useRef({ x: 0, y: 0, tagX: 0, tagY: 0 })

  // Text overlay state (textOverlays and setTextOverlays come from props)
  const [showTextEditor, setShowTextEditor] = useState(false)
  const [currentText, setCurrentText] = useState('')
  const [editingTextId, setEditingTextId] = useState(null)
  const [draggingTextId, setDraggingTextId] = useState(null)
  const textDragStartRef = useRef({ x: 0, y: 0, textX: 0, textY: 0 })

  // Mention picker state
  const [showMentionPicker, setShowMentionPicker] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionSource, setMentionSource] = useState('platform')
  const [mentionSearchResults, setMentionSearchResults] = useState([])
  const [isMentionSearching, setIsMentionSearching] = useState(false)
  const [selectedMentionUser, setSelectedMentionUser] = useState(null)
  const [mentionMeta, setMentionMeta] = useState([]) // tracks {username, type: 'tag'|'nominate', userId}
  const mentionSearchTimeoutRef = useRef(null)

  // Reuse fetched platform users for mentions (users + parties)
  const mentionPlatformUsers = fetchedPlatformUsers.map(u => ({
    id: u.id,
    username: u.username,
    name: u.username,
    avatar: u.avatar,
    type: u.type || 'user',
  }))

  const mentionContactUsers = []

  // Fetch users when mention picker opens
  useEffect(() => {
    if (showMentionPicker && fetchedPlatformUsers.length === 0) {
      fetchPanelUsers()
    }
  }, [showMentionPicker, fetchedPlatformUsers.length, fetchPanelUsers])

  // Debounced live search for mention picker - finds ANY user or party on the platform
  useEffect(() => {
    if (!showMentionPicker || mentionSource !== 'platform' || !mentionQuery.trim()) {
      setMentionSearchResults([])
      setIsMentionSearching(false)
      return
    }

    setIsMentionSearching(true)
    if (mentionSearchTimeoutRef.current) {
      clearTimeout(mentionSearchTimeoutRef.current)
    }

    mentionSearchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = []
        const seenIds = new Set()

        // Search users
        const usersRes = await searchApi.search(mentionQuery.trim(), { type: 'users', limit: 20 })
        if (usersRes.data?.users) {
          usersRes.data.users.forEach(u => {
            if (!seenIds.has(u.id)) {
              seenIds.add(u.id)
              results.push({
                id: u.id,
                username: u.username || u.displayName || 'user',
                name: u.displayName || u.username || 'User',
                avatar: u.avatarUrl || `https://i.pravatar.cc/40?u=${u.id}`,
                type: 'user',
              })
            }
          })
        }

        // Search parties
        const partiesRes = await searchApi.search(mentionQuery.trim(), { type: 'parties', limit: 20 })
        if (partiesRes.data?.parties) {
          partiesRes.data.parties.forEach(p => {
            if (!seenIds.has(`party-${p.id}`)) {
              seenIds.add(`party-${p.id}`)
              results.push({
                id: p.id,
                username: p.handle || p.name,
                name: p.name,
                avatar: p.avatarUrl || `https://i.pravatar.cc/40?u=${p.id}`,
                type: 'party',
              })
            }
          })
        }

        setMentionSearchResults(results)
      } catch (e) {
        console.warn('Mention search failed:', e)
      } finally {
        setIsMentionSearching(false)
      }
    }, 300)

    return () => {
      if (mentionSearchTimeoutRef.current) {
        clearTimeout(mentionSearchTimeoutRef.current)
      }
    }
  }, [mentionQuery, mentionSource, showMentionPicker])

  // Existing races from backend
  const [existingRaces, setExistingRaces] = useState([])
  const [racesLoading, setRacesLoading] = useState(false)

  // Fetch races from backend
  useEffect(() => {
    const fetchRaces = async () => {
      setRacesLoading(true)
      try {
        const response = await racesApi.listRaces()
        const races = response.data || response.races || []
        setExistingRaces(races)
      } catch (error) {
        console.error('Failed to fetch races:', error)
        setExistingRaces([])
      } finally {
        setRacesLoading(false)
      }
    }
    fetchRaces()
  }, [])

  // Race picker state
  const [showRacePicker, setShowRacePicker] = useState(false)
  const [showCustomCalendar, setShowCustomCalendar] = useState(false)
  const racePickerInputRef = useRef(null)

  // Custom calendar state
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedHour, setSelectedHour] = useState(12)
  const [selectedMinute, setSelectedMinute] = useState(0)
  const [selectedAmPm, setSelectedAmPm] = useState('PM')

  // Deadline preset options
  const deadlinePresets = [
    { label: '24 hours', hours: 24 },
    { label: '3 days', hours: 72 },
    { label: '1 week', hours: 168 },
    { label: '2 weeks', hours: 336 },
    { label: '1 month', hours: 720 },
    { label: '3 months', hours: 2160 },
    { label: '6 months', hours: 4320 },
    { label: '1 year', hours: 8760 },
  ]

  const setDeadlineFromPreset = (hours) => {
    const deadline = new Date()
    deadline.setHours(deadline.getHours() + hours)
    onRaceDeadlineChange(deadline.toISOString().slice(0, 16))
    // Auto-close if race name is already set
    if (raceName?.trim()) {
      setShowRacePicker(false)
    }
  }

  const openDeadlinePicker = () => {
    // Initialize calendar with current deadline or now
    if (raceDeadline) {
      const date = new Date(raceDeadline)
      setCalendarDate(new Date(date.getFullYear(), date.getMonth(), 1))
      setSelectedDate(date)
      let hours = date.getHours()
      setSelectedAmPm(hours >= 12 ? 'PM' : 'AM')
      setSelectedHour(hours % 12 || 12)
      setSelectedMinute(date.getMinutes())
    } else {
      const now = new Date()
      setCalendarDate(new Date(now.getFullYear(), now.getMonth(), 1))
      setSelectedDate(null)
      setSelectedHour(12)
      setSelectedMinute(0)
      setSelectedAmPm('PM')
    }
    setShowCustomCalendar(true)
  }

  // Calendar helpers
  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrevMonth = new Date(year, month, 0).getDate()

    const days = []

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ day: daysInPrevMonth - i, currentMonth: false, prevMonth: true })
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, currentMonth: true })
    }

    // Next month days
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, currentMonth: false, nextMonth: true })
    }

    return days
  }

  const isToday = (day) => {
    if (!day.currentMonth) return false
    const today = new Date()
    return day.day === today.getDate() &&
           calendarDate.getMonth() === today.getMonth() &&
           calendarDate.getFullYear() === today.getFullYear()
  }

  const isDaySelected = (day) => {
    if (!day.currentMonth || !selectedDate) return false
    return day.day === selectedDate.getDate() &&
           calendarDate.getMonth() === selectedDate.getMonth() &&
           calendarDate.getFullYear() === selectedDate.getFullYear()
  }

  const isPast = (day) => {
    if (!day.currentMonth) return true
    const date = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day.day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  const selectDay = (day) => {
    if (!day.currentMonth || isPast(day)) return
    setSelectedDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day.day))
  }

  const prevMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))
  }

  const confirmDeadline = () => {
    if (!selectedDate) return
    let hours = selectedHour
    if (selectedAmPm === 'PM' && hours !== 12) hours += 12
    if (selectedAmPm === 'AM' && hours === 12) hours = 0

    const deadline = new Date(selectedDate)
    deadline.setHours(hours, selectedMinute, 0, 0)
    onRaceDeadlineChange(deadline.toISOString().slice(0, 16))
    setShowCustomCalendar(false)
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December']

  const formatDeadlineDisplay = (deadline) => {
    if (!deadline) return null
    const date = new Date(deadline)
    const options = { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }
    return date.toLocaleDateString('en-US', options)
  }

  const getFilteredRaces = () => {
    if (!raceName || !raceName.trim()) return existingRaces
    const query = raceName.toLowerCase()
    return existingRaces.filter(race =>
      race.title?.toLowerCase().includes(query)
    )
  }

  const handleSelectRace = (race) => {
    onRaceNameChange(race.title)
    setSelectedExistingRace(race) // Track that user selected an existing race
    setShowRacePicker(false) // Close panel immediately - just targeting this race
  }

  const handleConcludeRace = () => {
    // For existing races, just need the name selected
    // For new races, need name AND deadline
    if (selectedExistingRace) {
      setShowRacePicker(false)
    } else if (raceName?.trim() && raceDeadline) {
      setShowRacePicker(false)
    }
  }

  // Check if user is creating a new race (no existing races match OR user clicked "new")
  const filteredRaces = getFilteredRaces()
  const isCreatingNewRace = raceName?.trim() && (filteredRaces.length === 0 || forceNewRace)

  // Can conclude if: selected existing race OR (creating new with name + deadline)
  const canConcludeRace = selectedExistingRace || (isCreatingNewRace && raceName?.trim() && raceDeadline)

  const openRacePicker = () => {
    setShowRacePicker(true)
    setTimeout(() => {
      if (racePickerInputRef.current) {
        racePickerInputRef.current.focus()
      }
    }, 100)
  }

  const getFilteredMentionUsers = () => {
    const query = mentionQuery.toLowerCase()
    if (mentionSource === 'platform') {
      // When searching, use live API search results
      if (query.trim()) {
        return mentionSearchResults
      }
      // When not searching, show all pre-fetched users & parties
      return mentionPlatformUsers
    }
    // Contacts
    return mentionContactUsers.filter(user => {
      const searchStr = (user.username || user.name || user.phone || '').toLowerCase()
      return searchStr.includes(query)
    })
  }

  const handleSelectMention = (user) => {
    // Step 1: Select the user, show tag/nominate options
    setSelectedMentionUser(user)
  }

  const handleMentionType = (mentionType) => {
    // mentionType: 'tag' (bold white) or 'nominate' (gradient)
    const username = selectedMentionUser.username || selectedMentionUser.name || selectedMentionUser.phone
    // Replace the trailing @ with the mention marker
    const mentionMarker = `@${username}`
    const newText = currentText.replace(/@$/, '') + mentionMarker + ' '
    setCurrentText(newText)

    // Store mention metadata in text overlays so we can render styled mentions
    // We track mentions as part of the text overlay data
    setMentionMeta(prev => [...prev, { username, type: mentionType, userId: selectedMentionUser.id }])

    setShowMentionPicker(false)
    setMentionQuery('')
    setSelectedMentionUser(null)
  }

  // Auto-focus input when editing
  useEffect(() => {
    if (isEditingRace && raceInputRef.current) {
      raceInputRef.current.focus()
    }
  }, [isEditingRace])

  // Drag handlers
  const handleDragStart = (clientX, clientY) => {
    if (isEditingRace) return
    const pill = pillRef.current
    if (!pill) return

    const rect = pill.getBoundingClientRect()
    const parentRect = pill.parentElement.getBoundingClientRect()

    setIsDragging(true)
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      pillX: rect.left - parentRect.left,
      pillY: rect.top - parentRect.top
    }
  }

  const handleDragMove = (clientX, clientY) => {
    if (!isDragging) return

    const deltaX = clientX - dragStartRef.current.x
    const deltaY = clientY - dragStartRef.current.y

    setPillPosition({
      x: dragStartRef.current.pillX + deltaX,
      y: dragStartRef.current.pillY + deltaY
    })
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  // Mouse events
  const handleMouseDown = (e) => {
    e.preventDefault()
    handleDragStart(e.clientX, e.clientY)
  }

  // Touch events
  const handleTouchStart = (e) => {
    const touch = e.touches[0]
    handleDragStart(touch.clientX, touch.clientY)
  }

  const handleTouchMove = (e) => {
    const touch = e.touches[0]
    handleDragMove(touch.clientX, touch.clientY)
  }

  // Global mouse move/up listeners
  useEffect(() => {
    const handleMouseMove = (e) => handleDragMove(e.clientX, e.clientY)
    const handleMouseUp = () => handleDragEnd()

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  // Tag drag handlers
  const handleTagDragStart = (clientX, clientY) => {
    const tag = tagRef.current
    if (!tag) return

    const rect = tag.getBoundingClientRect()
    const parentRect = tag.parentElement.getBoundingClientRect()

    setIsTagDragging(true)
    tagDragStartRef.current = {
      x: clientX,
      y: clientY,
      tagX: rect.left - parentRect.left,
      tagY: rect.top - parentRect.top
    }
  }

  const handleTagDragMove = (clientX, clientY) => {
    if (!isTagDragging) return

    const deltaX = clientX - tagDragStartRef.current.x
    const deltaY = clientY - tagDragStartRef.current.y

    setTagPosition({
      x: tagDragStartRef.current.tagX + deltaX,
      y: tagDragStartRef.current.tagY + deltaY
    })
  }

  const handleTagDragEnd = () => {
    setIsTagDragging(false)
  }

  // Tag mouse/touch events
  const handleTagMouseDown = (e) => {
    e.preventDefault()
    handleTagDragStart(e.clientX, e.clientY)
  }

  const handleTagTouchStart = (e) => {
    const touch = e.touches[0]
    handleTagDragStart(touch.clientX, touch.clientY)
  }

  const handleTagTouchMove = (e) => {
    const touch = e.touches[0]
    handleTagDragMove(touch.clientX, touch.clientY)
  }

  // Global listeners for tag dragging
  useEffect(() => {
    const handleMouseMove = (e) => handleTagDragMove(e.clientX, e.clientY)
    const handleMouseUp = () => handleTagDragEnd()

    if (isTagDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isTagDragging])

  // Text overlay handlers
  const handleAddText = () => {
    setCurrentText('')
    setEditingTextId(null)
    setShowTextEditor(true)
  }

  const handleSaveText = () => {
    if (currentText.trim()) {
      if (editingTextId) {
        setTextOverlays(prev => prev.map(t =>
          t.id === editingTextId ? { ...t, text: currentText, mentions: mentionMeta.length > 0 ? [...mentionMeta] : (t.mentions || []) } : t
        ))
      } else {
        const newText = {
          id: Date.now(),
          text: currentText,
          x: 100,
          y: 300,
          mentions: [...mentionMeta],
        }
        setTextOverlays(prev => [...prev, newText])
      }
    }
    setShowTextEditor(false)
    setCurrentText('')
    setEditingTextId(null)
    setMentionMeta([])
    setShowMentionPicker(false)
    setMentionQuery('')
    setSelectedMentionUser(null)
  }

  // Render text with styled mentions
  const renderTextWithMentions = (text, mentions) => {
    if (!mentions || mentions.length === 0) return text
    // Build regex to match all @username mentions
    const parts = []
    let remaining = text
    // Sort mentions by position in text (find each @username)
    for (const mention of mentions) {
      const marker = `@${mention.username}`
      const idx = remaining.indexOf(marker)
      if (idx === -1) continue
      // Push text before mention
      if (idx > 0) parts.push({ text: remaining.slice(0, idx), type: 'plain' })
      // Push the mention
      parts.push({ text: marker, type: mention.type, username: mention.username })
      remaining = remaining.slice(idx + marker.length)
    }
    // Push any remaining text
    if (remaining) parts.push({ text: remaining, type: 'plain' })
    if (parts.length === 0) return text
    return parts.map((part, i) => {
      if (part.type === 'nominate') {
        return <span key={i} className="mention-nominate">{part.text}</span>
      } else if (part.type === 'tag') {
        return <span key={i} className="mention-tag">{part.text}</span>
      }
      return <span key={i}>{part.text}</span>
    })
  }

  // Text drag handlers
  const handleTextDragStart = (textId, clientX, clientY) => {
    const textEl = document.getElementById(`text-overlay-${textId}`)
    if (!textEl) return

    const rect = textEl.getBoundingClientRect()
    const parentRect = textEl.parentElement.getBoundingClientRect()

    setDraggingTextId(textId)
    textDragStartRef.current = {
      x: clientX,
      y: clientY,
      textX: rect.left - parentRect.left,
      textY: rect.top - parentRect.top
    }
  }

  const handleTextDragMove = (clientX, clientY) => {
    if (!draggingTextId) return

    const deltaX = clientX - textDragStartRef.current.x
    const deltaY = clientY - textDragStartRef.current.y

    setTextOverlays(prev => prev.map(t =>
      t.id === draggingTextId
        ? { ...t, x: textDragStartRef.current.textX + deltaX, y: textDragStartRef.current.textY + deltaY }
        : t
    ))
  }

  const handleTextDragEnd = () => {
    setDraggingTextId(null)
  }

  // Global listeners for text dragging
  useEffect(() => {
    const handleMouseMove = (e) => handleTextDragMove(e.clientX, e.clientY)
    const handleMouseUp = () => handleTextDragEnd()

    if (draggingTextId) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [draggingTextId])

  const canProceed = !isRaceMode || selectedExistingRace || (raceName?.trim()?.length > 0 && raceDeadline)

  // Debug logging for quote nomination rendering
  console.log('EditClipScreen render:', {
    hasQuotedReel: !!quotedReel,
    hasRecordedVideoUrl: !!recordedVideoUrl,
    recordedVideoUrlLength: recordedVideoUrl?.length,
    showSelfieOverlay,
    isFromDraft
  })

  return (
    <div className="edit-clip-screen">
      {/* Video Preview */}
      <div className="edit-clip-preview">
        {/* Main Video */}
        {quotedReel?.videoUrl ? (
          <video
            src={quotedReel.videoUrl}
            className="edit-clip-video quoted-main"
            autoPlay
            loop
            playsInline
          />
        ) : quotedReel?.thumbnail ? (
          <div
            className="edit-clip-video quoted-main"
            style={{
              backgroundImage: `url(${quotedReel.thumbnail})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              width: '100%',
              height: '100%'
            }}
          />
        ) : recordedVideoUrl ? (
          <video
            ref={videoRef}
            src={recordedVideoUrl}
            className={`edit-clip-video ${isMirrored ? 'mirrored' : ''}`}
            autoPlay
            loop
            playsInline
            crossOrigin="anonymous"
          />
        ) : (
          <img
            src="https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=800&fit=crop"
            alt="Clip preview"
          />
        )}

        {/* Selfie Overlay - shows in nominate mode or when there's a quoted reel */}
        {(isNominateMode || quotedReel) && recordedVideoUrl && showSelfieOverlay && (
          <div className="edit-clip-selfie-overlay">
            {isFromDraft && (
              <button className="selfie-overlay-delete" onClick={handleDeleteSelfie}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
            <video
              src={recordedVideoUrl}
              className="edit-clip-selfie-video"
              autoPlay
              loop
              muted
              playsInline
            />
          </div>
        )}
      </div>

      {/* Top Controls */}
      <div className="edit-clip-top">
        <button className="edit-clip-close" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <button className="edit-clip-sound-btn" onClick={() => setShowAddSound(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
          <span>{selectedSound ? selectedSound.name : 'add sound'}</span>
        </button>

        <div className="edit-clip-side-controls">
          <button className="edit-clip-side-btn" onClick={() => {
            if (onSaveDraft) {
              onSaveDraft()
            } else {
              onClose()
            }
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
          </button>
          <button className="edit-clip-side-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          </button>
          <button className="edit-clip-side-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </button>
          <button className="edit-clip-side-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </button>
          <button className="edit-clip-side-btn" onClick={handleAddText}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="4 7 4 4 20 4 20 7" />
              <line x1="9" y1="20" x2="15" y2="20" />
              <line x1="12" y1="4" x2="12" y2="20" />
            </svg>
          </button>

          {/* Undo Button - only shown when there's something to undo */}
          {undoStack.length > 0 && (
            <button className="edit-clip-side-btn undo-btn" onClick={handleUndo}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 7v6h6" />
                <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.36 2.64L3 13" />
              </svg>
            </button>
          )}

          {/* Mode Switch Buttons - Race and Party only */}
          {currentMode !== 'race' && onModeChange && (
            <button
              className="edit-clip-side-btn mode-btn race-mode"
              onClick={() => onModeChange('race')}
              title="Switch to Race"
            >
              <span className="mode-btn-text">Race</span>
            </button>
          )}
          {currentMode !== 'party' && onModeChange && (
            <button
              className="edit-clip-side-btn mode-btn party-mode"
              onClick={() => onModeChange('party')}
              title="Switch to Party"
            >
              <span className="mode-btn-text">Party</span>
            </button>
          )}
        </div>
      </div>

      {/* Race Name Pill - only shown in race mode */}
      {isRaceMode && (
        <div
          ref={pillRef}
          className={`edit-clip-race-pill-wrapper ${isDragging ? 'dragging' : ''}`}
          style={pillPosition.y !== null ? {
            left: pillPosition.x,
            top: pillPosition.y,
            bottom: 'auto'
          } : {
            left: pillPosition.x
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleDragEnd}
        >
          <button
            className={`race-pill-display ${!raceName ? 'empty' : ''}`}
            onClick={() => !isDragging && openRacePicker()}
          >
            <span className="race-pill-dot"></span>
            <span className="race-pill-text">
              {raceName || 'Tap to name race'}
            </span>
            <svg className="race-pill-edit-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        </div>
      )}

      {/* Tagged User Display - draggable, only shown in nominate mode with a tagged user */}
      {isNominateMode && taggedUser && (
        <div
          ref={tagRef}
          className={`edit-clip-tag-display ${isTagDragging ? 'dragging' : ''}`}
          style={tagPosition.y !== null ? {
            left: tagPosition.x,
            top: tagPosition.y,
            bottom: 'auto'
          } : {
            left: tagPosition.x
          }}
          onMouseDown={handleTagMouseDown}
          onTouchStart={handleTagTouchStart}
          onTouchMove={handleTagTouchMove}
          onTouchEnd={handleTagDragEnd}
        >
          <span className="edit-clip-tag-at">@</span>
          <span className="edit-clip-tag-name">
            {taggedUser.username || (getContactDisplayName ? getContactDisplayName(taggedUser) : taggedUser.phone)}
          </span>
        </div>
      )}

      {/* Text Overlays - draggable */}
      {textOverlays?.map(textItem => (
        <div
          key={textItem.id}
          id={`text-overlay-${textItem.id}`}
          className={`edit-clip-text-overlay ${draggingTextId === textItem.id ? 'dragging' : ''}`}
          style={{ left: textItem.x, top: textItem.y }}
          onMouseDown={(e) => {
            e.preventDefault()
            handleTextDragStart(textItem.id, e.clientX, e.clientY)
          }}
          onTouchStart={(e) => {
            const touch = e.touches[0]
            handleTextDragStart(textItem.id, touch.clientX, touch.clientY)
          }}
          onTouchMove={(e) => {
            const touch = e.touches[0]
            handleTextDragMove(touch.clientX, touch.clientY)
          }}
          onTouchEnd={handleTextDragEnd}
          onDoubleClick={() => {
            setCurrentText(textItem.text)
            setEditingTextId(textItem.id)
            setMentionMeta(textItem.mentions || [])
            setShowMentionPicker(false)
            setMentionQuery('')
            setSelectedMentionUser(null)
            setShowTextEditor(true)
          }}
        >
          <span className="edit-clip-text-content">{renderTextWithMentions(textItem.text, textItem.mentions)}</span>
        </div>
      ))}

      {/* Text Editor Modal */}
      {showTextEditor && (
        <div className="text-editor-overlay" onClick={handleSaveText}>
          <button className="text-editor-conclude" onClick={handleSaveText}>
            conclude
          </button>
          <div className={`text-editor-input-wrapper ${showMentionPicker ? 'hidden' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="text-editor-styled-overlay" aria-hidden="true">
              {renderTextWithMentions(currentText, mentionMeta)}
            </div>
            <textarea
              className="text-editor-input"
              value={currentText}
              onChange={(e) => {
                const value = e.target.value
                const cursorPos = e.target.selectionStart
                setCurrentText(value)
                // Check if @ was just typed (character before cursor is @)
                if (value.length > currentText.length && cursorPos > 0 && value[cursorPos - 1] === '@') {
                  setShowMentionPicker(true)
                }
              }}
              autoFocus
            />
          </div>

          {/* Mention Picker - shows when @ is typed */}
          {showMentionPicker && (
            <div className="text-editor-mention-picker" onClick={(e) => e.stopPropagation()}>
              {!selectedMentionUser ? (
                <>
                  <div className="mention-picker-header">
                    <span className="mention-picker-at">@</span>
                    <input
                      type="text"
                      className="mention-picker-search"
                      placeholder="search to tag someone"
                      value={mentionQuery}
                      onChange={(e) => setMentionQuery(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="mention-picker-toggle">
                    <button
                      className={`mention-toggle-btn ${mentionSource === 'platform' ? 'active' : ''}`}
                      onClick={() => setMentionSource('platform')}
                    >
                      On Platform
                    </button>
                    <button
                      className={`mention-toggle-btn ${mentionSource === 'contacts' ? 'active' : ''}`}
                      onClick={() => setMentionSource('contacts')}
                    >
                      Contacts
                    </button>
                  </div>
                  <div className="mention-picker-list">
                    {isMentionSearching && mentionQuery.trim() && (
                      <div className="mention-searching-indicator">Searching...</div>
                    )}
                    {getFilteredMentionUsers().map(user => (
                      <div
                        key={`${user.type || 'user'}-${user.id}`}
                        className="mention-picker-item"
                        onClick={() => handleSelectMention(user)}
                      >
                        <div className="mention-avatar-wrapper">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="mention-item-avatar" />
                          ) : (
                            <div className="mention-item-avatar-placeholder">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                              </svg>
                            </div>
                          )}
                          {user.type === 'party' && (
                            <span className="mention-party-badge">
                              <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                              </svg>
                            </span>
                          )}
                        </div>
                        <div className="mention-item-info">
                          <span className="mention-item-name">
                            {user.username || user.name || user.phone}
                            {user.type === 'party' && <span className="mention-party-label">Party</span>}
                          </span>
                        </div>
                      </div>
                    ))}
                    {!isMentionSearching && mentionQuery.trim() && getFilteredMentionUsers().length === 0 && (
                      <div className="mention-no-results">No users or parties found</div>
                    )}
                  </div>
                  <button className="mention-picker-close" onClick={() => { setShowMentionPicker(false); setSelectedMentionUser(null) }}>
                    Cancel
                  </button>
                </>
              ) : (
                <div
                  className="mention-type-screen"
                  onTouchStart={(e) => { e.currentTarget._swipeX = e.touches[0].clientX }}
                  onTouchEnd={(e) => {
                    const diff = e.changedTouches[0].clientX - (e.currentTarget._swipeX || 0)
                    if (diff > 60) setSelectedMentionUser(null)
                  }}
                  onWheel={(e) => { if (e.deltaX < -30) setSelectedMentionUser(null) }}
                >
                  {/* Selected user display */}
                  <div className="mention-picker-selected-header">How do you want to @?</div>
                  <div className="mention-picker-list">
                    <div className="mention-picker-item selected">
                      <div className="mention-avatar-wrapper">
                        {selectedMentionUser.avatar ? (
                          <img src={selectedMentionUser.avatar} alt={selectedMentionUser.name} className="mention-item-avatar" />
                        ) : (
                          <div className="mention-item-avatar-placeholder">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                          </div>
                        )}
                        {selectedMentionUser.type === 'party' && (
                          <span className="mention-party-badge">
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                              <circle cx="9" cy="7" r="4" />
                              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                          </span>
                        )}
                      </div>
                      <div className="mention-item-info">
                        <span className="mention-item-name">
                          {selectedMentionUser.username || selectedMentionUser.name || selectedMentionUser.phone}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mention-type-actions">
                    <button className="mention-type-btn mention-type-tag" onClick={() => handleMentionType('tag')}>
                      <span className="mention-type-preview mention-type-preview-tag">@{selectedMentionUser.username || selectedMentionUser.name}</span>
                      <span className="mention-type-label">tag</span>
                    </button>
                    <button className="mention-type-btn mention-type-nominate" onClick={() => handleMentionType('nominate')}>
                      <span className="mention-type-preview mention-type-preview-nominate">@{selectedMentionUser.username || selectedMentionUser.name}</span>
                      <span className="mention-type-label">nominate</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Bottom */}
      <div className="edit-clip-bottom">
        {isConversationMode ? (
          <>
            <button
              className="edit-clip-add-btn"
              onClick={initializePanel}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <button className="edit-clip-send-btn" onClick={handleSend}>
              send
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </>
        ) : (
          <>
            <button className="edit-clip-drafts-btn" onClick={() => {
              if (onSaveDraft) {
                onSaveDraft()
              } else {
                onClose()
              }
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              <span>drafts</span>
            </button>
            <button
              className={`edit-clip-story-btn ${!canProceed ? 'disabled' : ''}`}
              disabled={!canProceed}
              onClick={() => onCompleteToScoreboard?.()}
            >
              <img
                src="https://i.pravatar.cc/40?img=3"
                alt="Profile"
                className="edit-clip-story-avatar"
              />
              <span>your story</span>
            </button>
            <button className="edit-clip-send-friends-btn" onClick={() => setShowUserPanel(true)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <button className={`edit-clip-next-btn ${!canProceed ? 'disabled' : ''}`} onClick={onNext} disabled={!canProceed}>
              next
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Add Sound Screen */}
      {showAddSound && (
        <AddSound
          onClose={() => setShowAddSound(false)}
          onSelectSound={(sound) => {
            onSelectSound?.(sound)
            setShowAddSound(false)
          }}
        />
      )}

      {/* User Selection Panel */}
      {showUserPanel && (
        <div className="user-panel-overlay" onClick={() => { setShowUserPanel(false); setUserSearchQuery(''); }}>
          <div className="user-panel" onClick={(e) => e.stopPropagation()}>
            {/* Search Bar */}
            <div className="user-panel-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            <div className="user-panel-list">
              {(loadingUsers && availableUsers.length === 0) || isSearching ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
                  {isSearching ? 'Searching...' : 'Loading...'}
                </div>
              ) : availableUsers.length === 0 && userSearchQuery.length >= 2 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
                  No results for "{userSearchQuery}"
                </div>
              ) : (
                availableUsers.map(user => (
                  <div key={user.id} className="user-panel-item">
                    <img src={user.avatar} alt={user.username} />
                    <span>{user.type === 'party' ? `${user.username}` : user.username}</span>
                    <button
                      className={`user-panel-send-btn ${isSelected(user) ? 'sent' : ''}`}
                      onClick={() => toggleRecipient(user)}
                    >
                      {isSelected(user) ? 'Sent' : 'Send'}
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Send Together Button */}
            <button
              className={`user-panel-send-together ${sendTogether ? 'active' : ''}`}
              onClick={() => setSendTogether(!sendTogether)}
            >
              {sendTogether && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
              Send together
            </button>

            <button
              className={`user-panel-done ${selectedRecipients.length > 0 ? 'active' : ''}`}
              disabled={isSending}
              onClick={async () => {
                if (videoRef.current) {
                  videoRef.current.pause()
                }
                await handleSend()
                setShowUserPanel(false)
                setUserSearchQuery('')
                if (onCompleteToScoreboard) {
                  onCompleteToScoreboard()
                }
              }}
            >
              {isSending ? 'Sending...' : 'Complete'}
            </button>
          </div>
        </div>
      )}

      {/* Race Picker Slide-up */}
      {showRacePicker && (
        <div className="race-picker-overlay" onClick={() => setShowRacePicker(false)}>
          <div className="race-picker-panel" onClick={(e) => e.stopPropagation()}>
            <div className="race-picker-header">
              <span className="race-picker-title">Select or Create Race</span>
              <button
                className={`race-picker-conclude ${!canConcludeRace ? 'disabled' : ''}`}
                onClick={handleConcludeRace}
                disabled={!canConcludeRace}
              >
                conclude
              </button>
            </div>

            <div className="race-picker-input-row">
              <div className="race-picker-input-container">
                <span className="race-picker-dot"></span>
                <input
                  ref={racePickerInputRef}
                  type="text"
                  className="race-picker-input"
                  placeholder="Search or type new race name..."
                  value={raceName}
                  onChange={(e) => {
                    onRaceNameChange(e.target.value)
                    setSelectedExistingRace(null) // Clear selection when user types
                    setForceNewRace(false) // Reset force new when user types
                  }}
                  maxLength={40}
                />
              </div>
              {!forceNewRace && (
                <button
                  className="race-picker-new-btn"
                  onClick={() => setForceNewRace(true)}
                  disabled={!raceName?.trim()}
                >
                  new
                </button>
              )}
            </div>

            {/* Only show race type and deadline when creating a NEW race */}
            {isCreatingNewRace && (
              <>
            {/* Race Type Toggle - Party or User */}
            <div className="race-type-section">
              <span className="race-type-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                Candidate Type *
              </span>
              <div className="race-type-toggle">
                <button
                  className={`race-type-btn ${raceType === 'user' ? 'active' : ''}`}
                  onClick={() => setRaceType('user')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  User
                </button>
                <button
                  className={`race-type-btn ${raceType === 'party' ? 'active' : ''}`}
                  onClick={() => setRaceType('party')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  Party
                </button>
              </div>
            </div>

            {/* Win Method Toggle - Ballot or Points */}
            <div className="race-win-section">
              <span className="race-win-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                Win Method *
              </span>
              <div className="race-win-toggle">
                <button
                  className={`race-win-btn ${winMethod === 'points' ? 'active' : ''}`}
                  onClick={() => setWinMethod('points')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                    <polyline points="17 6 23 6 23 12" />
                  </svg>
                  Points
                </button>
                <button
                  className={`race-win-btn ${winMethod === 'ballot' ? 'active' : ''}`}
                  onClick={() => setWinMethod('ballot')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 11l3 3L22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                  Ballot
                </button>
              </div>
            </div>

            {/* Deadline Picker */}
            <div className="race-deadline-section">
              <span className="race-deadline-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Race Deadline *
              </span>

              {/* Preset buttons */}
              <div className="race-deadline-presets">
                {deadlinePresets.map(preset => (
                  <button
                    key={preset.hours}
                    className="race-deadline-preset"
                    onClick={() => setDeadlineFromPreset(preset.hours)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Selected deadline display - clicks open custom calendar */}
              <div
                className={`race-deadline-display ${raceDeadline ? 'has-value' : ''}`}
                onClick={openDeadlinePicker}
              >
                {raceDeadline ? (
                  <>
                    <span className="deadline-value">{formatDeadlineDisplay(raceDeadline)}</span>
                    <button
                      className="deadline-clear"
                      onClick={(e) => { e.stopPropagation(); onRaceDeadlineChange(null); }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </>
                ) : (
                  <span className="deadline-placeholder">or pick custom date & time</span>
                )}
                <svg className="deadline-calendar" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
            </div>
              </>
            )}

            {!forceNewRace && (
              <div className="race-picker-list">
                {racesLoading ? (
                  <div className="race-picker-empty">Loading races...</div>
                ) : filteredRaces.length === 0 ? (
                  <div className="race-picker-empty">No races found. Create a new one above.</div>
                ) : (
                  filteredRaces.map(race => (
                    <div
                      key={race.id}
                      className="race-picker-item"
                      onClick={() => handleSelectRace(race)}
                    >
                      <div className="race-picker-item-info">
                        <span className="race-picker-item-name">{race.title}</span>
                        <span className="race-picker-item-meta">{race.competitorCount || 0} competitors</span>
                      </div>
                      <div className="race-picker-item-right">
                        <div className="race-picker-item-type">
                          {race.raceType === 'PARTY_VS_PARTY' ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                              <circle cx="9" cy="7" r="4" />
                              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                          )}
                          <span>{race.raceType === 'PARTY_VS_PARTY' ? 'Party' : 'User'}</span>
                        </div>
                        {race.endDate && (
                          <span className="race-picker-item-deadline">
                            {new Date(race.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Calendar Picker */}
      {showCustomCalendar && (
        <div className="custom-calendar-overlay" onClick={() => setShowCustomCalendar(false)}>
          <div className="custom-calendar-panel" onClick={(e) => e.stopPropagation()}>
            <div className="custom-calendar-header">
              <button className="calendar-nav-btn" onClick={prevMonth}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <span className="calendar-month-year">
                {monthNames[calendarDate.getMonth()]} {calendarDate.getFullYear()}
              </span>
              <button className="calendar-nav-btn" onClick={nextMonth}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>

            <div className="custom-calendar-weekdays">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <span key={i} className="calendar-weekday">{d}</span>
              ))}
            </div>

            <div className="custom-calendar-days">
              {getDaysInMonth(calendarDate).map((day, i) => (
                <button
                  key={i}
                  className={`calendar-day ${!day.currentMonth ? 'other-month' : ''} ${isToday(day) ? 'today' : ''} ${isDaySelected(day) ? 'selected' : ''} ${isPast(day) ? 'past' : ''}`}
                  onClick={() => selectDay(day)}
                  disabled={isPast(day)}
                >
                  {day.day}
                </button>
              ))}
            </div>

            {/* Time Picker */}
            <div className="custom-calendar-time">
              <span className="time-label">Time</span>
              <div className="time-picker">
                <select
                  className="time-select"
                  value={selectedHour}
                  onChange={(e) => setSelectedHour(parseInt(e.target.value))}
                >
                  {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(h => (
                    <option key={h} value={h}>{h.toString().padStart(2, '0')}</option>
                  ))}
                </select>
                <span className="time-colon">:</span>
                <select
                  className="time-select"
                  value={selectedMinute}
                  onChange={(e) => setSelectedMinute(parseInt(e.target.value))}
                >
                  {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => (
                    <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                  ))}
                </select>
                <div className="time-ampm">
                  <button
                    className={`ampm-btn ${selectedAmPm === 'AM' ? 'active' : ''}`}
                    onClick={() => setSelectedAmPm('AM')}
                  >
                    AM
                  </button>
                  <button
                    className={`ampm-btn ${selectedAmPm === 'PM' ? 'active' : ''}`}
                    onClick={() => setSelectedAmPm('PM')}
                  >
                    PM
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="custom-calendar-actions">
              <button className="calendar-cancel-btn" onClick={() => setShowCustomCalendar(false)}>
                Cancel
              </button>
              <button
                className={`calendar-confirm-btn ${!selectedDate ? 'disabled' : ''}`}
                onClick={confirmDeadline}
                disabled={!selectedDate}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EditClipScreen
