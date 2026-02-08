import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { mockConversations } from '../data/mockData'
import { messagesApi, partiesApi, groupchatsApi } from '../services/api'
import { joinPartyRoom, leavePartyRoom, onPartyMessage } from '../services/socket'
import { initializeSocket, joinConversation, leaveConversation, onConversationMessage, onNewMessage, getSocket, onDmReactionAdded, onDmReactionRemoved } from '../services/socket'
import { useAuth } from '../contexts/AuthContext'
import CreateScreen from './CreateScreen'
import PartySettings from './PartySettings'
import ChatSettings from './ChatSettings'
import MessageReelViewer from './MessageReelViewer'
import '../styling/Conversation.css'
import '../styling/PartyCreationFlow.css'

// Audio Message Component
function AudioMessage({ src, duration }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef = useRef(null)

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100
      setProgress(progress)
      setCurrentTime(Math.floor(audioRef.current.currentTime))
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    setProgress(0)
    setCurrentTime(0)
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="audio-message">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />
      <button className="audio-play-btn" onClick={togglePlay}>
        {isPlaying ? (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        )}
      </button>
      <div className="audio-waveform">
        <div className="audio-progress" style={{ width: `${progress}%` }} />
        <div className="audio-bars">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="audio-bar"
              style={{ height: `${Math.random() * 60 + 40}%` }}
            />
          ))}
        </div>
      </div>
      <span className="audio-duration">
        {formatTime(isPlaying ? currentTime : (duration || 0))}
      </span>
    </div>
  )
}

function Conversation({ conversation, onBack, sharedConversations, setSharedConversations, onMessageSent, currentUserId, currentUserAvatar, onTrackActivity, onCreateGroupChat, onGroupChatUpdated, onPartyCreatedFromGroupchat, onOpenProfile, onOpenPartyProfile }) {
  console.log('=== Conversation component rendered ===')
  console.log('conversation:', conversation)
  console.log('conversation.user:', conversation?.user)
  console.log('currentUserId:', currentUserId)

  const { user: currentUser, updateUser, refreshUser } = useAuth()
  const [messageText, setMessageText] = useState('')
  const [showCreateScreen, setShowCreateScreen] = useState(false)
  const [localMessages, setLocalMessages] = useState(() => {
    // Initialize with messages from conversation prop if available (e.g., from PostScreen send-to)
    return conversation?.messages || []
  })
  const [fetchedMessages, setFetchedMessages] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showPartySettings, setShowPartySettings] = useState(false)

  // Wrapper for opening profiles from within settings panels
  // Closes settings + conversation so the profile overlay is visible
  const handleMemberProfileClick = (userData) => {
    setShowPartySettings(false)
    onOpenProfile?.(userData)
    onBack()
  }
  const [activeMessageId, setActiveMessageId] = useState(null)
  const [messageReactions, setMessageReactions] = useState({})
  const [replyingTo, setReplyingTo] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [conversationId, setConversationId] = useState(conversation.id)
  const [showJoinConfirmation, setShowJoinConfirmation] = useState(false)
  const [pendingInvite, setPendingInvite] = useState(null)
  const [isJoining, setIsJoining] = useState(false)
  const [canChat, setCanChat] = useState(true) // Whether user has chat permission in party
  const [convertedToParty, setConvertedToParty] = useState(null) // Party info if groupchat was converted
  const [partyName, setPartyName] = useState(conversation.party?.name || conversation.partyName || null) // Party name if groupchat converted to party
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const recordingIntervalRef = useRef(null)
  const messagesEndRef = useRef(null)
  const currentUserIdRef = useRef(currentUserId)
  const { user } = conversation
  const otherUserId = user?.id
  const otherUserIdRef = useRef(otherUserId)
  const isPartyChat = conversation.isPartyChat || conversation.isParty || false
  const partyId = conversation.partyId || null
  const isNewConversation = conversation.isNew || conversationId?.startsWith('new-')
  const isGroupChat = conversation.isGroupChat || false
  const groupChatId = conversation.groupChatId || null
  const recipients = conversation.recipients || []

  // Keep refs updated
  useEffect(() => {
    currentUserIdRef.current = currentUserId
    otherUserIdRef.current = otherUserId
  }, [currentUserId, otherUserId])

  // Combine fetched messages with locally sent messages and sort by time
  const messages = [...fetchedMessages, ...localMessages].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return timeA - timeB
  })

  // Check if a message is a party invite
  const isPartyInvite = (msg) => {
    return msg.metadata?.type === 'party_invite'
  }

  // Check if a message is a shared reel
  const isSharedReel = (msg) => {
    // Check metadata type
    if (msg.metadata?.type === 'reel') return true
    // Check top-level media fields
    if (msg.mediaUrl && msg.mediaType === 'video') return true
    // Check for video URL in metadata
    if (msg.metadata?.videoUrl) return true
    // Check for mediaUrl without explicit type (assume video if it's a video file)
    if (msg.mediaUrl && (msg.mediaUrl.includes('.mp4') || msg.mediaUrl.includes('.webm') || msg.mediaUrl.includes('.mov') || msg.mediaUrl.includes('blob:'))) return true
    return false
  }

  // Get the video URL for a message (handles both top-level and metadata)
  const getMessageVideoUrl = (msg) => {
    return msg.mediaUrl || msg.metadata?.videoUrl || msg.metadata?.thumbnail
  }

  // Render text with styled @mentions (for text overlays on shared reels)
  const renderTextWithMentions = (text, mentions) => {
    if (!mentions || mentions.length === 0) return text
    const parts = []
    let remaining = text
    for (const mention of mentions) {
      const marker = `@${mention.username}`
      const idx = remaining.indexOf(marker)
      if (idx === -1) continue
      if (idx > 0) parts.push({ text: remaining.slice(0, idx), type: 'plain' })
      parts.push({ text: marker, type: mention.type })
      remaining = remaining.slice(idx + marker.length)
    }
    if (remaining) parts.push({ text: remaining, type: 'plain' })
    if (parts.length === 0) return text
    return parts.map((part, i) => {
      if (part.type === 'nominate') return <span key={i} className="mention-nominate">{part.text}</span>
      if (part.type === 'tag') return <span key={i} className="mention-tag">{part.text}</span>
      return <span key={i}>{part.text}</span>
    })
  }

  // Track message to show in reel viewer
  const [reelViewerMessageId, setReelViewerMessageId] = useState(null)

  // Handle opening reel viewer for a message (party invite or video)
  const handleOpenReelViewer = (msg) => {
    setReelViewerMessageId(msg.id)
  }

  // Handle clicking join party button - show confirmation
  const handleJoinClick = (msg) => {
    console.log('handleJoinClick called with:', msg)
    console.log('Setting showJoinConfirmation to true')
    setPendingInvite(msg)
    setShowJoinConfirmation(true)
  }

  // Handle confirming party join
  const handleConfirmJoin = async () => {
    console.log('handleConfirmJoin called, pendingInvite:', pendingInvite)
    if (!pendingInvite) return

    setIsJoining(true)
    try {
      // First get the party ID by handle
      console.log('Fetching party by handle:', pendingInvite.metadata.partyHandle)
      const partyResponse = await partiesApi.getPartyByHandle(pendingInvite.metadata.partyHandle)
      console.log('Party response:', partyResponse)
      // API returns { data: { party: {...} } }
      const party = partyResponse.data?.party || partyResponse.party || partyResponse

      if (!party?.id) {
        console.error('Could not find party - no ID in response. Full response:', partyResponse)
        return
      }

      console.log('Found party ID:', party.id, '- calling joinParty API')
      // Join the party - pass asAdmin if this is an admin invite
      const isAdminInvite = pendingInvite.metadata?.role === 'admin'
      const joinResponse = await partiesApi.joinParty(party.id, isAdminInvite ? { asAdmin: true } : {})
      console.log('Join party response:', joinResponse)

      // Refresh user data from server to update sitewide
      await refreshUser?.()

      console.log('Successfully joined party:', pendingInvite.metadata.partyName)
      setShowJoinConfirmation(false)
      setPendingInvite(null)
      setReelViewerMessageId(null)
      setConvertedToParty(null) // Clear the conversion banner
    } catch (error) {
      console.error('Failed to join party:', error)
      console.error('Error details:', error.message, error.response)

      // Handle "Already a member" error gracefully
      if (error.message?.includes('Already a member')) {
        alert('You are already a member of this party!')
        setShowJoinConfirmation(false)
        setPendingInvite(null)
        setReelViewerMessageId(null)
        setConvertedToParty(null) // Already a member, clear the banner
      } else {
        alert(`Failed to join party: ${error.message}`)
      }
    } finally {
      setIsJoining(false)
    }
  }

  // Handle accepting a party invite from the reel viewer
  const handleAcceptInvite = (msg) => {
    console.log('Accepting party invite:', msg.metadata)
    handleJoinClick(msg)
  }

  // Fetch messages from API on mount
  useEffect(() => {
    const fetchMessages = async () => {
      // For groupchats, we need groupChatId
      // For party chats, we need a partyId; for DMs, we need user.id
      if (isGroupChat && !groupChatId) {
        setIsLoading(false)
        return
      }
      if (isPartyChat && !partyId) {
        setIsLoading(false)
        return
      }
      if (!isGroupChat && !isPartyChat && !user?.id) {
        setIsLoading(false)
        return
      }

      try {
        if (isGroupChat && groupChatId) {
          // Fetch user groupchat messages
          const response = await groupchatsApi.getMessages(groupChatId)
          const messages = response.data
          console.log('=== GROUPCHAT MESSAGES RAW ===', JSON.stringify(messages?.slice?.(0, 3)?.map(m => ({ id: m.id, content: m.content?.substring(0, 30), metadata: m.metadata }))))
          if (messages && Array.isArray(messages)) {
            // Transform groupchat messages to match expected format
            // API returns messages sorted desc, so reverse for chronological order
            const transformed = messages.map(msg => ({
              id: msg.id,
              text: msg.content,
              metadata: msg.metadata || null,
              isOwn: msg.user?.id === currentUserId,
              timestamp: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              createdAt: msg.createdAt,
              senderName: msg.user?.username || msg.user?.displayName,
              senderAvatar: msg.user?.avatarUrl,
            })).reverse()
            setFetchedMessages(transformed)

            // Check if this groupchat was converted to a party
            const partyConversionMsg = messages.find(msg =>
              msg.metadata?.type === 'party_invite'
            )
            if (partyConversionMsg && partyConversionMsg.metadata) {
              // Set the party name in the header
              setPartyName(partyConversionMsg.metadata.partyName)

              // Check if current user has already joined this party
              const convertedPartyId = partyConversionMsg.metadata.partyId
              const hasJoined = currentUser?.partyId === convertedPartyId
              if (!hasJoined) {
                // Transform to the message format expected by handleJoinClick
                const inviteMsg = {
                  id: partyConversionMsg.id,
                  text: partyConversionMsg.content,
                  metadata: partyConversionMsg.metadata,
                  isOwn: partyConversionMsg.user?.id === currentUserId,
                }
                setConvertedToParty({
                  partyId: convertedPartyId,
                  partyName: partyConversionMsg.metadata.partyName,
                  partyHandle: partyConversionMsg.metadata.partyHandle,
                  partyColor: partyConversionMsg.metadata.partyColor,
                  partyAvatar: partyConversionMsg.metadata.partyAvatar,
                  inviteMessage: inviteMsg,
                })
              }
            }
          }
        } else if (isPartyChat && partyId) {
          // Fetch party chat messages
          const response = await partiesApi.getChatMessages(partyId)
          // API returns { success: true, data: [...messages...] }
          const messages = response.data
          console.log('=== PARTY MESSAGES RAW ===', JSON.stringify(messages?.slice?.(0, 3)?.map(m => ({ id: m.id, content: m.content?.substring(0, 30), metadata: m.metadata }))))
          if (messages && Array.isArray(messages)) {
            // Transform party chat messages to match expected format
            // API returns messages sorted desc, so reverse for chronological order
            const transformed = messages.map(msg => ({
              id: msg.id,
              text: msg.content,
              metadata: msg.metadata || null,
              isOwn: msg.user?.id === currentUserId,
              timestamp: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              createdAt: msg.createdAt,
              senderName: msg.user?.username || msg.user?.displayName,
              senderAvatar: msg.user?.avatarUrl,
            })).reverse()
            setFetchedMessages(transformed)

            // Initialize reactions from party chat API response
            const reactionsMap = {}
            messages.forEach(msg => {
              if (msg.reactions && msg.reactions.length > 0) {
                reactionsMap[msg.id] = msg.reactions
              }
            })
            setMessageReactions(reactionsMap)
          }
        } else {
          // Fetch DM messages
          const response = await messagesApi.getMessagesWithUser(user.id)
          if (response.data) {
            // Transform API messages to match expected format
            // API returns messages sorted desc, so reverse for chronological order
            const transformed = response.data.map(msg => ({
              id: msg.id,
              text: msg.content,
              metadata: msg.metadata,
              isOwn: msg.senderId === currentUserId,
              timestamp: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              createdAt: msg.createdAt,
            })).reverse()
            setFetchedMessages(transformed)

            // Initialize reactions from API response
            const reactionsMap = {}
            response.data.forEach(msg => {
              if (msg.reactions && msg.reactions.length > 0) {
                reactionsMap[msg.id] = msg.reactions
              }
            })
            setMessageReactions(reactionsMap)
          }
        }
      } catch (error) {
        console.error('Failed to fetch messages:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMessages()
  }, [user?.id, currentUserId, isPartyChat, partyId, isGroupChat, groupChatId])

  // Check if current user has chat permission in party chat
  useEffect(() => {
    const checkChatPermission = async () => {
      if (!isPartyChat || !partyId || !currentUserId) {
        setCanChat(true) // DMs always allow chat
        return
      }

      try {
        const response = await partiesApi.getMembers(partyId)
        if (response.data && Array.isArray(response.data)) {
          const myMembership = response.data.find(m => m.userId === currentUserId)
          if (myMembership) {
            // Check if user has 'chat' permission or is admin/leader
            const permissions = myMembership.permissions || []
            const hasChat = permissions.includes('chat') ||
                           permissions.includes('admin') ||
                           permissions.includes('leader') ||
                           permissions.includes('moderate')
            setCanChat(hasChat)
          } else {
            setCanChat(false) // Not a member
          }
        }
      } catch (error) {
        console.error('Failed to check chat permission:', error)
        setCanChat(true) // Default to allowing chat on error
      }
    }

    checkChatPermission()
  }, [isPartyChat, partyId, currentUserId])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // Join conversation room and listen for real-time messages
  useEffect(() => {
    // For party chats, we need partyId; for groupchats we need groupChatId; for DMs, we need user.id
    if (isPartyChat && !partyId) return
    if (isGroupChat && !groupChatId) return
    if (!isGroupChat && !isPartyChat && !user?.id) return

    // Ensure socket is initialized
    initializeSocket()

    let messageHandler = null
    let partyMessageHandler = null
    let groupChatMessageHandler = null
    let connectHandler = null
    let isSetup = false

    const setupListeners = (socket) => {
      if (isSetup || !socket) return
      isSetup = true

      if (isGroupChat && groupChatId) {
        // Handler for incoming groupchat messages
        groupChatMessageHandler = (data) => {
          console.log('=== GROUPCHAT MESSAGE RECEIVED ===', data)

          // Only process messages for this groupchat
          if (data.groupChatId !== groupChatId) return

          // Skip if this message is from us (we already added it locally)
          if (data.user?.id === currentUserIdRef.current) {
            console.log('Skipping - message is from me (already added locally)')
            return
          }

          const newMsg = {
            id: data.id,
            text: data.content,
            metadata: data.metadata || null,
            isOwn: false,
            timestamp: new Date(data.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            createdAt: data.createdAt,
            senderName: data.user?.username || data.user?.displayName,
            senderAvatar: data.user?.avatarUrl,
          }

          // Check if message already exists to avoid duplicates
          setFetchedMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) {
              console.log('Skipping - duplicate message')
              return prev
            }
            console.log('Groupchat message added to fetchedMessages')
            return [...prev, newMsg]
          })
        }

        socket.on('groupchat:message', groupChatMessageHandler)
      } else if (isPartyChat && partyId) {
        // Join the party room for real-time updates
        joinPartyRoom(partyId)

        // Handler for incoming party chat messages
        partyMessageHandler = (data) => {
          console.log('=== PARTY CHAT MESSAGE RECEIVED ===', data)

          // Only process messages for this party
          if (data.partyId !== partyId) return

          const message = data.message
          if (!message) return

          // Skip if this message is from us (we already added it locally)
          if (message.senderId === currentUserIdRef.current) {
            console.log('Skipping - message is from me (already added locally)')
            return
          }

          const newMsg = {
            id: message.id,
            text: message.content,
            metadata: message.metadata || null,
            isOwn: false,
            timestamp: new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            createdAt: message.createdAt,
            senderName: message.senderUsername,
          }

          // Check if message already exists to avoid duplicates
          setFetchedMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) {
              console.log('Skipping - duplicate message')
              return prev
            }
            console.log('Party message added to fetchedMessages')
            return [...prev, newMsg]
          })
        }

        socket.on('party:message', partyMessageHandler)
      } else {
        // Join the DM conversation room for real-time updates
        joinConversation(user.id)

        // Handler for incoming DM messages
        messageHandler = (data) => {
          console.log('=== SOCKET MESSAGE RECEIVED ===', data)

          // Get sender ID from the message data - check multiple possible locations
          const senderId = data.message?.senderId || data.senderId
          const receiverId = data.message?.receiverId || data.receiverId
          const messageId = data.message?.id || data.id
          const messageContent = data.message?.content || data.content
          const messageCreatedAt = data.message?.createdAt || data.createdAt

          console.log('Message details:', { senderId, receiverId, messageId, messageContent })

          // Skip if missing required data
          if (!senderId || !messageId || !messageContent) {
            console.log('Skipping - missing required data:', { senderId, messageId, messageContent })
            return
          }

          // Use refs to get current values (avoid stale closures)
          const myUserId = currentUserIdRef.current
          const theirUserId = otherUserIdRef.current

          console.log('ID comparison:', {
            senderId,
            myUserId,
            theirUserId,
            senderIsMe: senderId === myUserId,
            senderIsOther: senderId === theirUserId,
          })

          // Skip if this message is from us (we already added it locally)
          if (senderId === myUserId) {
            console.log('Skipping - message is from me (already added locally)')
            return
          }

          // Skip if this message is not for this conversation
          // Check if either: sender is the other user, OR receiver is me (and sender is other user)
          const isForThisConversation = senderId === theirUserId ||
            (receiverId && receiverId === myUserId && senderId === theirUserId)

          if (!isForThisConversation) {
            console.log('Skipping - message not for this conversation')
            return
          }

          console.log('Adding message from other user with isOwn: false')
          const messageMetadata = data.message?.metadata || data.metadata
          const newMsg = {
            id: messageId,
            text: messageContent,
            metadata: messageMetadata,
            isOwn: false, // This is from the other user, not us
            timestamp: new Date(messageCreatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            createdAt: messageCreatedAt,
          }

          // Check if message already exists to avoid duplicates
          setFetchedMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) {
              console.log('Skipping - duplicate message')
              return prev
            }
            console.log('Message added to fetchedMessages')
            return [...prev, newMsg]
          })

          // Mark message as read since we're viewing the conversation
          messagesApi.markConversationRead(theirUserId).catch(() => {})
        }

        // Listen for both event types (conversation room and personal room)
        socket.on('conversation:message', messageHandler)
        socket.on('message:new', messageHandler)
      }
    }

    const socket = getSocket()

    if (socket?.connected) {
      // Socket already connected, set up immediately
      setupListeners(socket)
    } else if (socket) {
      // Socket exists but not connected, wait for connection
      connectHandler = () => setupListeners(getSocket())
      socket.on('connect', connectHandler)
    }

    // Also try with a delay in case socket is being initialized
    const delayedSetup = setTimeout(() => {
      const s = getSocket()
      if (s?.connected && !isSetup) {
        setupListeners(s)
      }
    }, 500)

    // Cleanup on unmount
    return () => {
      clearTimeout(delayedSetup)
      if (isPartyChat && partyId) {
        leavePartyRoom(partyId)
      } else if (!isGroupChat) {
        leaveConversation(otherUserIdRef.current)
      }
      const s = getSocket()
      if (s) {
        if (connectHandler) {
          s.off('connect', connectHandler)
        }
        if (messageHandler) {
          s.off('conversation:message', messageHandler)
          s.off('message:new', messageHandler)
        }
        if (partyMessageHandler) {
          s.off('party:message', partyMessageHandler)
        }
        if (groupChatMessageHandler) {
          s.off('groupchat:message', groupChatMessageHandler)
        }
      }
    }
  }, [otherUserId, isPartyChat, partyId, isGroupChat, groupChatId])

  // Listen for real-time reaction updates (both DM and party chat)
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handleReactionAdded = (data) => {
      const { messageId, userId: reactorId, emoji } = data

      // Skip if this is our own reaction (we already updated optimistically)
      if (reactorId === currentUserIdRef.current) return

      setMessageReactions(prev => {
        const reactions = prev[messageId] || []
        const existing = reactions.find(r => r.emoji === emoji)

        if (existing) {
          return {
            ...prev,
            [messageId]: reactions.map(r =>
              r.emoji === emoji ? { ...r, count: r.count + 1 } : r
            )
          }
        } else {
          return {
            ...prev,
            [messageId]: [...reactions, { emoji, count: 1, reacted: false }]
          }
        }
      })
    }

    const handleReactionRemoved = (data) => {
      const { messageId, userId: reactorId, emoji } = data

      // Skip if this is our own reaction (we already updated optimistically)
      if (reactorId === currentUserIdRef.current) return

      setMessageReactions(prev => {
        const reactions = prev[messageId] || []
        const existing = reactions.find(r => r.emoji === emoji)

        if (!existing) return prev

        if (existing.count <= 1) {
          return {
            ...prev,
            [messageId]: reactions.filter(r => r.emoji !== emoji)
          }
        }

        return {
          ...prev,
          [messageId]: reactions.map(r =>
            r.emoji === emoji ? { ...r, count: r.count - 1 } : r
          )
        }
      })
    }

    // Listen for both DM and party chat reaction events
    socket.on('dm:reaction:added', handleReactionAdded)
    socket.on('dm:reaction:removed', handleReactionRemoved)
    socket.on('party:reaction:added', handleReactionAdded)
    socket.on('party:reaction:removed', handleReactionRemoved)

    return () => {
      socket.off('dm:reaction:added', handleReactionAdded)
      socket.off('dm:reaction:removed', handleReactionRemoved)
      socket.off('party:reaction:added', handleReactionAdded)
      socket.off('party:reaction:removed', handleReactionRemoved)
    }
  }, [isPartyChat, user?.id, partyId])

  // Fallback avatar if none provided
  const userAvatar = currentUserAvatar || 'https://i.pravatar.cc/40?img=12'

  const reactionEmojis = ['❤️', '😂', '😮', '😢', '😡', '👍']

  const handleMessageClick = (msgId) => {
    setActiveMessageId(activeMessageId === msgId ? null : msgId)
  }

  const addReaction = async (msgId, emoji) => {
    // Skip API calls for local messages (not yet saved to database)
    const isLocalMessage = msgId.startsWith('local-')

    // Check if user already reacted with this emoji
    const current = messageReactions[msgId] || []
    const existing = current.find(r => r.emoji === emoji)
    const hasReacted = existing?.reacted

    // Optimistic update
    setMessageReactions(prev => {
      const reactions = prev[msgId] || []
      const existingReaction = reactions.find(r => r.emoji === emoji)

      if (existingReaction && existingReaction.reacted) {
        // Remove reaction
        if (existingReaction.count === 1) {
          return {
            ...prev,
            [msgId]: reactions.filter(r => r.emoji !== emoji)
          }
        }
        return {
          ...prev,
          [msgId]: reactions.map(r =>
            r.emoji === emoji ? { ...r, count: r.count - 1, reacted: false } : r
          )
        }
      } else if (existingReaction) {
        // Add to existing emoji
        return {
          ...prev,
          [msgId]: reactions.map(r =>
            r.emoji === emoji ? { ...r, count: r.count + 1, reacted: true } : r
          )
        }
      } else {
        // New reaction
        return {
          ...prev,
          [msgId]: [...reactions, { emoji, count: 1, reacted: true }]
        }
      }
    })
    setActiveMessageId(null)

    // Skip API call for local messages - they'll be synced when the message is saved
    if (isLocalMessage) {
      console.log('Skipping API call for local message reaction')
      return
    }

    // Call appropriate API based on chat type
    try {
      if (isPartyChat && partyId) {
        // Party chat reactions
        if (hasReacted) {
          await partiesApi.removeChatReaction(partyId, msgId, emoji)
        } else {
          await partiesApi.addChatReaction(partyId, msgId, emoji)
        }
      } else {
        // DM reactions
        if (hasReacted) {
          await messagesApi.removeReaction(msgId, emoji)
        } else {
          await messagesApi.addReaction(msgId, emoji)
        }
      }
    } catch (error) {
      console.error('Failed to update reaction:', error)
      // Revert optimistic update on error
      setMessageReactions(prev => ({
        ...prev,
        [msgId]: current
      }))
    }
  }

  const handleReply = (msg) => {
    setReplyingTo(msg)
    setActiveMessageId(null)
  }

  const sendMessage = async () => {
    if (!messageText.trim()) return

    const messageContent = messageText
    setMessageText('')

    console.log('=== SENDING MESSAGE ===')
    console.log('My user ID:', currentUserId)
    console.log('Is party chat:', isPartyChat)
    console.log('Is group chat:', isGroupChat)
    console.log('Recipients:', recipients)
    console.log('Party ID:', partyId)
    console.log('Receiver (other user) ID:', user?.id)
    console.log('Message content:', messageContent)

    const now = new Date()
    const newMessage = {
      id: `local-${Date.now()}`,
      text: messageContent,
      isOwn: true,
      timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: now.toISOString(),
      replyTo: replyingTo ? { id: replyingTo.id, text: replyingTo.text, username: replyingTo.isOwn ? 'You' : user?.username } : null
    }
    console.log('Adding local message with isOwn: true', newMessage)
    setLocalMessages(prev => [...prev, newMessage])
    setReplyingTo(null)

    try {
      if (isGroupChat && groupChatId) {
        // Send message to user groupchat via API
        console.log('Sending message to groupchat:', groupChatId)

        const response = await groupchatsApi.sendMessage(groupChatId, messageContent)
        console.log('Groupchat API response:', response)

        // Update the local message with the real ID from the server
        const messageData = response.data
        if (messageData?.id) {
          setLocalMessages(prev => prev.map(msg =>
            msg.id === newMessage.id ? { ...msg, id: messageData.id } : msg
          ))
        }

        // Notify parent to update the messages list
        onMessageSent?.({
          conversationId: `groupchat-${groupChatId}`,
          user: user,
          recipients: recipients,
          lastMessage: messageContent,
          lastMessageAt: new Date().toISOString(),
          isNew: isNewConversation,
          isGroupChat: true,
          groupChatId: groupChatId,
        })
      } else if (isPartyChat && partyId) {
        // Send party chat message
        const response = await partiesApi.sendChatMessage(partyId, messageContent)
        console.log('Party chat API response:', response)

        // Update the local message with the real ID from the server
        const messageData = response.data?.message || response.data
        if (messageData?.id) {
          setLocalMessages(prev => prev.map(msg =>
            msg.id === newMessage.id ? { ...msg, id: messageData.id } : msg
          ))
        }

        // Notify parent to update the messages list
        onMessageSent?.({
          conversationId: `party-${partyId}`,
          user: user,
          lastMessage: messageContent,
          lastMessageAt: new Date().toISOString(),
          isNew: false,
          isPartyChat: true,
          partyId: partyId,
        })
      } else {
        // Send DM message via API - backend expects 'receiverId' and 'content'
        const response = await messagesApi.sendMessage({
          receiverId: user.id,
          content: messageContent,
        })
        console.log('API response:', response)

        // Use the message ID as the conversation identifier, or construct from user IDs
        const messageData = response.data?.message || response.data
        const convId = messageData?.id ? `conv-${user.id}` : conversationId

        // Update the local message with the real ID from the server
        if (messageData?.id) {
          setLocalMessages(prev => prev.map(msg =>
            msg.id === newMessage.id ? { ...msg, id: messageData.id } : msg
          ))
        }

        // Update the conversation ID if this was a new conversation
        if (isNewConversation) {
          setConversationId(convId)
        }

        // Always notify parent to update the messages list
        onMessageSent?.({
          conversationId: convId,
          user: user,
          lastMessage: messageContent,
          lastMessageAt: new Date().toISOString(),
          isNew: isNewConversation,
        })

        // Also update shared conversations if available
        if (setSharedConversations) {
          setSharedConversations(prev => ({
            ...prev,
            [convId]: [...(prev[convId] || []), newMessage]
          }))
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  // Audio recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const audioUrl = URL.createObjectURL(audioBlob)

        // Send audio message
        const audioNow = new Date()
        const newMessage = {
          id: `local-${Date.now()}`,
          text: null,
          audioUrl: audioUrl,
          audioDuration: recordingTime,
          isOwn: true,
          timestamp: audioNow.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          createdAt: audioNow.toISOString(),
          replyTo: replyingTo ? { id: replyingTo.id, text: replyingTo.text, username: replyingTo.isOwn ? 'You' : user.username } : null
        }
        setLocalMessages(prev => [...prev, newMessage])
        setReplyingTo(null)

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
      setRecordingTime(0)

      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (err) {
      console.error('Error accessing microphone:', err)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      clearInterval(recordingIntervalRef.current)
    }
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      audioChunksRef.current = [] // Clear chunks so nothing is sent
      setIsRecording(false)
      clearInterval(recordingIntervalRef.current)
      setRecordingTime(0)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }
    }
  }, [])

  return (
    <div className="conversation-page">
      {/* Header */}
      <div className="conversation-header">
        <button className="conversation-back-btn" onClick={onBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="conversation-user-info">
          {isGroupChat || isPartyChat || conversation.party ? (
            // Show stacked avatars for groupchat/party
            <>
              <div
                className="conversation-avatar-group"
                onClick={() => {
                  const pName = convertedToParty?.partyName || partyName || conversation.party?.name || conversation.partyName
                  if (pName && onOpenPartyProfile) {
                    onOpenPartyProfile(pName)
                  }
                }}
                style={{ cursor: (convertedToParty?.partyName || partyName || conversation.party?.name || conversation.partyName) ? 'pointer' : 'default' }}
              >
                {recipients.slice(0, 3).map((recipient, idx) => (
                  <div
                    key={recipient.id}
                    className="conversation-avatar-stacked"
                    style={{ marginLeft: idx > 0 ? -12 : 0, zIndex: 3 - idx }}
                  >
                    <img src={recipient.avatarUrl || recipient.avatar} alt={recipient.username} />
                  </div>
                ))}
              </div>
              <span
                className="conversation-username"
                onClick={() => {
                  const pName = convertedToParty?.partyName || partyName || conversation.party?.name || conversation.partyName
                  if (pName && onOpenPartyProfile) {
                    onOpenPartyProfile(pName)
                  }
                }}
                style={{ cursor: (convertedToParty?.partyName || partyName || conversation.party?.name || conversation.partyName) ? 'pointer' : 'default' }}
              >
                {convertedToParty?.partyName || partyName || conversation.party?.name || conversation.partyName || user?.displayName || (recipients.length > 0 ? recipients.map(r => r.username || r.displayName).join(', ') : user?.username)}
              </span>
            </>
          ) : (
            // Single user
            <>
              <div
                className="conversation-avatar"
                onClick={() => onOpenProfile?.({ id: user.id, username: user.username, avatar: user.avatar, party: user.party })}
                style={{ cursor: 'pointer' }}
              >
                <img src={user.avatar} alt={user.username} />
              </div>
              <span
                className="conversation-username"
                onClick={() => onOpenProfile?.({ id: user.id, username: user.username, avatar: user.avatar, party: user.party })}
                style={{ cursor: 'pointer' }}
              >
                {user.username}
              </span>
            </>
          )}
        </div>

        <button className="conversation-menu-btn" onClick={() => setShowPartySettings(true)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>
      </div>

      {/* Party Conversion Banner - shown when groupchat is converted to party */}
      {isGroupChat && convertedToParty && (
        <div className="party-conversion-banner" style={{
          background: `linear-gradient(135deg, ${convertedToParty.partyColor || '#EC4899'}15, ${convertedToParty.partyColor || '#EC4899'}25)`,
          borderLeft: `4px solid ${convertedToParty.partyColor || '#EC4899'}`,
        }}>
          <div className="party-conversion-icon" style={{ background: convertedToParty.partyColor || '#EC4899' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="party-conversion-content">
            <div className="party-conversion-title">
              This group is now <strong style={{ color: convertedToParty.partyColor || '#EC4899' }}>{convertedToParty.partyName}</strong>
            </div>
            <div className="party-conversion-warning">
              Join the party to continue seeing messages
            </div>
          </div>
          <button
            className="party-conversion-join-btn"
            style={{ background: convertedToParty.partyColor || '#EC4899' }}
            onClick={() => handleJoinClick(convertedToParty.inviteMessage)}
          >
            Join Party
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="conversation-messages" onClick={() => setActiveMessageId(null)}>
        {isLoading ? (
          <div className="conversation-loading">
            <div className="loading-spinner" />
          </div>
        ) : messages.length === 0 ? (
          <div className="conversation-empty">
            <p>No messages yet</p>
            <span>
              {isGroupChat && recipients.length > 1
                ? `Send a message to ${recipients.length} people`
                : 'Send a message to start the conversation'
              }
            </span>
          </div>
        ) : messages.map((msg) => {
          const reactions = messageReactions[msg.id] || []
          const isActive = activeMessageId === msg.id

          // DEBUG: trace video message rendering
          if (msg.text === 'Sent a video' || msg.metadata?.type === 'video' || msg.metadata?.videoUrl) {
            console.log('=== VIDEO MSG DEBUG ===', { id: msg.id, text: msg.text, metadata: msg.metadata, isSharedReel: !!(msg.metadata?.type === 'reel' || msg.metadata?.videoUrl), hasVideoUrl: !!msg.metadata?.videoUrl })
          }

          return (
            <div
              key={msg.id}
              className={`chat-message ${msg.isOwn ? 'own' : 'other'}`}
            >
              {!msg.isOwn && (
                <div className="chat-message-avatar">
                  <img src={msg.senderAvatar || user.avatar} alt={msg.senderName || user.username} />
                </div>
              )}
              <div className="chat-bubble-wrapper">
                {/* Sender name for groupchats and party chats */}
                {(isGroupChat || isPartyChat) && !msg.isOwn && msg.senderName && (
                  <span className="chat-sender-name">{msg.senderName}</span>
                )}

                {/* Reply preview if this message is a reply */}
                {msg.replyTo && (
                  <div className="chat-reply-preview">
                    <span className="chat-reply-username">{msg.replyTo.username}</span>
                    <span className="chat-reply-text">{msg.replyTo.text?.substring(0, 50)}{msg.replyTo.text?.length > 50 ? '...' : ''}</span>
                  </div>
                )}

                {/* Reaction picker */}
                {isActive && (
                  <div className={`chat-reaction-picker ${msg.isOwn ? 'own' : 'other'}`} onClick={e => e.stopPropagation()}>
                    {reactionEmojis.map(emoji => (
                      <button
                        key={emoji}
                        className="chat-reaction-btn"
                        onClick={() => addReaction(msg.id, emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                    <button
                      className="chat-reaction-btn reply-btn"
                      onClick={() => handleReply(msg)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 14 4 9 9 4" />
                        <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
                      </svg>
                    </button>
                  </div>
                )}

                {isPartyInvite(msg) ? (
                  <div
                    className="party-invite-card"
                    onClick={(e) => { e.stopPropagation(); handleOpenReelViewer(msg); }}
                  >
                    <div className="party-invite-video">
                      {msg.metadata.partyAvatar ? (
                        <img src={msg.metadata.partyAvatar} alt={msg.metadata.partyName} />
                      ) : (
                        <div className="party-invite-placeholder">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                        </div>
                      )}
                      <div className="party-invite-overlay" />
                    </div>
                    <div className="party-invite-content">
                      {msg.metadata.role === 'admin' && (
                        <div className="party-invite-badge">Admin Invite</div>
                      )}
                      <div className="party-invite-text">
                        {msg.isOwn ? (
                          isGroupChat ? <>This group is now a party!</> : <>You invited them to join</>
                        ) : (
                          isGroupChat ? (
                            <><strong>{msg.senderName || 'Someone'}</strong> converted this group to a party</>
                          ) : (
                            <><strong>{user.username}</strong> invited you to join</>
                          )
                        )}
                      </div>
                      <div className="party-invite-name">{msg.metadata.partyName}</div>
                      <div className="party-invite-handle">@{msg.metadata.partyHandle}</div>
                      {isGroupChat && !msg.isOwn && (
                        <div className="party-invite-warning">
                          Accept the invite to continue seeing messages
                        </div>
                      )}
                      <button
                        className={`party-invite-btn ${msg.isOwn ? 'sent' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!msg.isOwn) {
                            handleJoinClick(msg);
                          }
                        }}
                        style={msg.isOwn ? { background: '#666', cursor: 'default' } : {}}
                      >
                        {msg.isOwn ? (isGroupChat ? 'Created' : 'Sent') : (msg.metadata.role === 'admin' ? 'Join as Admin' : 'Join Party')}
                      </button>
                    </div>
                  </div>
                ) : isSharedReel(msg) ? (
                  <div
                    className="shared-reel-card"
                    onClick={(e) => { e.stopPropagation(); handleOpenReelViewer(msg); }}
                  >
                    <div className="shared-reel-video">
                      <video
                        src={getMessageVideoUrl(msg)}
                        className={`shared-reel-preview ${msg.isMirrored || msg.metadata?.isMirrored ? 'mirrored' : ''}`}
                        autoPlay
                        loop
                        muted
                        playsInline
                      />
                      {/* Selfie overlay - scale from full-screen (430px) to card size (220px) */}
                      {(msg.metadata?.showSelfieOverlay) && (msg.metadata?.selfieSize) && (() => {
                        const s = 220 / 430
                        return (
                          <div
                            className="reel-selfie-overlay"
                            style={{
                              width: (msg.metadata.selfieSize.w || 120) * s,
                              height: (msg.metadata.selfieSize.h || 160) * s,
                              left: (msg.metadata.selfiePosition?.x || 16) * s,
                              top: (msg.metadata.selfiePosition?.y || 80) * s,
                            }}
                          >
                            <video
                              src={getMessageVideoUrl(msg)}
                              className={msg.metadata?.isMirrored ? 'mirrored' : ''}
                              autoPlay
                              loop
                              muted
                              playsInline
                            />
                          </div>
                        )
                      })()}
                      {/* Text overlays - scale positions from full-screen to card size */}
                      {msg.metadata?.textOverlays?.map((textItem, idx) => {
                        const s = 220 / 430
                        return (
                          <div
                            key={`msg-text-${textItem.id || idx}-${idx}`}
                            className="reel-text-overlay"
                            style={{ left: (parseFloat(textItem.x) || 0) * s, top: (parseFloat(textItem.y) || 0) * s }}
                          >
                            <span className="reel-text-content">
                              {renderTextWithMentions(textItem.text, textItem.mentions)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : msg.mediaUrl ? (
                  <div
                    className="chat-bubble media-bubble"
                    onClick={(e) => { e.stopPropagation(); handleOpenReelViewer(msg); }}
                  >
                    <video
                      src={msg.mediaUrl}
                      className={`chat-media ${msg.isMirrored ? 'mirrored' : ''}`}
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                    <div className="media-play-overlay">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="white" stroke="none">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    </div>
                  </div>
                ) : msg.audioUrl ? (
                  <div
                    className="chat-bubble audio-bubble"
                    onClick={(e) => { e.stopPropagation(); handleMessageClick(msg.id); }}
                  >
                    <AudioMessage src={msg.audioUrl} duration={msg.audioDuration} />
                  </div>
                ) : (
                  <div
                    className="chat-bubble"
                    onClick={(e) => { e.stopPropagation(); handleMessageClick(msg.id); }}
                  >
                    {msg.text}
                  </div>
                )}

                {/* Reactions display */}
                {reactions.length > 0 && (
                  <div className={`chat-reactions ${msg.isOwn ? 'own' : 'other'}`}>
                    {reactions.map(r => (
                      <span
                        key={r.emoji}
                        className={`chat-reaction-item ${r.reacted ? 'reacted' : ''}`}
                        onClick={(e) => { e.stopPropagation(); addReaction(msg.id, r.emoji); }}
                      >
                        {r.emoji}
                        {r.count > 1 && <span className="reaction-count">{r.count}</span>}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {msg.isOwn && (
                <div className="chat-message-avatar">
                  <img src={userAvatar} alt="You" />
                </div>
              )}
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview */}
      {replyingTo && (
        <div className="conversation-reply-bar">
          <div className="conversation-reply-content">
            <span className="conversation-reply-label">Replying to {replyingTo.isOwn ? 'yourself' : user.username}</span>
            <span className="conversation-reply-text">{replyingTo.text?.substring(0, 50)}{replyingTo.text?.length > 50 ? '...' : ''}</span>
          </div>
          <button className="conversation-reply-close" onClick={() => setReplyingTo(null)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Input Area - Hidden when user is muted in party chat */}
      {canChat ? (
        <div className="conversation-input-area">
          <div className="conversation-input-wrapper">
            <input
              type="text"
              placeholder="message"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              className="conversation-input"
            />
          </div>

          <button
            className={`conversation-action-btn ${isRecording ? 'recording' : ''}`}
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>

          <button className="conversation-action-btn" onClick={() => setShowCreateScreen(true)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          </button>

        {messageText.trim() && (
          <button className="conversation-send-btn" onClick={sendMessage}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        )}
        </div>
      ) : null}

      {/* Recording Overlay */}
      {isRecording && (
        <div className="recording-overlay">
          <div className="recording-indicator">
            <div className="recording-pulse" />
            <span className="recording-time">{formatTime(recordingTime)}</span>
          </div>
          <p>Release to send, swipe left to cancel</p>
          <button className="recording-cancel-btn" onClick={cancelRecording}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Cancel
          </button>
        </div>
      )}

      {/* Message Reel Viewer */}
      {reelViewerMessageId && (
        <MessageReelViewer
          messages={messages}
          initialMessageId={reelViewerMessageId}
          onClose={() => setReelViewerMessageId(null)}
          onAcceptInvite={handleAcceptInvite}
          senderUser={user}
          currentUserAvatar={userAvatar}
          onTrackActivity={onTrackActivity}
          onOpenProfile={onOpenProfile}
          onOpenPartyProfile={onOpenPartyProfile}
        />
      )}

      {showCreateScreen && createPortal(
        <div className="create-studio-overlay">
          <CreateScreen
            onClose={() => setShowCreateScreen(false)}
            isConversationMode={true}
            conversationUser={
              isPartyChat ? { ...user, type: 'party', partyId: partyId || conversation.partyId || conversation.party?.id }
              : isGroupChat ? { ...user, type: 'group', groupChatId: conversation.groupChatId, ...(conversation.partyId || conversation.party?.id ? { partyId: conversation.partyId || conversation.party?.id } : {}) }
              : user
            }
            onSendToConversation={(mediaUrl, isMirrored) => {
              // Add the sent clip as a message
              const mediaNow = new Date()
              const newMessage = {
                id: `local-${Date.now()}`,
                text: null,
                mediaUrl: mediaUrl,
                mediaType: 'video',
                isMirrored: isMirrored,
                isOwn: true,
                timestamp: mediaNow.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                createdAt: mediaNow.toISOString()
              }
              setLocalMessages(prev => [...prev, newMessage])
              setShowCreateScreen(false)
            }}
          />
        </div>,
        document.body
      )}

      {/* Show PartySettings only if user has joined the party, otherwise show ChatSettings */}
      {showPartySettings && createPortal(
        (() => {
          // Determine the party ID for this chat
          const chatPartyId = convertedToParty?.partyId || conversation.party?.id || conversation.partyId
          // Check if current user has joined this party
          const userHasJoinedParty = currentUser?.partyId && chatPartyId && currentUser.partyId === chatPartyId
          // Show PartySettings if: it's a party chat OR user has joined the converted party
          const showPartySettingsModal = isPartyChat || userHasJoinedParty

          return showPartySettingsModal ? (
            <PartySettings
              party={{
                name: convertedToParty?.partyName || partyName || conversation.party?.name || conversation.partyName || user?.username,
                avatar: convertedToParty?.partyAvatar || conversation.party?.avatarUrl || conversation.partyAvatar || user?.avatar,
                color: convertedToParty?.partyColor || conversation.party?.color || conversation.partyColor || '#EC4899'
              }}
            isAdmin={true}
            onClose={() => setShowPartySettings(false)}
            conversation={conversation}
            onOpenProfile={handleMemberProfileClick}
            onSettingsChange={(changes) => {
              // Update the conversation state if needed
              console.log('Party settings changed:', changes)
            }}
            onLeave={() => {
              // Navigate back after leaving the party
              onBack()
            }}
            onCreateGroupChat={(selectedMembers) => {
              // Close party settings and trigger groupchat creation
              setShowPartySettings(false)
              if (onCreateGroupChat) {
                onCreateGroupChat(selectedMembers)
              }
            }}
          />
        ) : (
          <ChatSettings
            chat={{
              name: isGroupChat ? (conversation.user?.displayName || recipients.map(r => r.username).join(', ')) : user.username,
              username: isGroupChat ? recipients.map(r => r.username).join(', ') : user.username,
              avatar: isGroupChat ? (conversation.user?.avatar || recipients[0]?.avatarUrl || recipients[0]?.avatar) : user.avatar,
              party: isGroupChat ? null : user.party,
            }}
            isGroupChat={isGroupChat}
            groupChatId={isGroupChat ? conversation.groupChatId : null}
            groupChatMembers={isGroupChat ? (conversation.allMembers || recipients) : null}
            groupChatCreatorId={isGroupChat ? conversation.createdById : null}
            onClose={() => setShowPartySettings(false)}
            conversation={conversation}
            onOpenProfile={handleMemberProfileClick}
            onSettingsChange={(changes) => {
              // Update the conversation state if needed
              console.log('Chat settings changed:', changes)
              if (changes.membersUpdated && isGroupChat && setSharedConversations) {
                // Refresh groupchat data to get updated members
                groupchatsApi.get(conversation.groupChatId).then(res => {
                  if (res.data) {
                    // Update the conversation in the shared list (only when prev is an array)
                    setSharedConversations(prev => {
                      if (!Array.isArray(prev)) return prev
                      return prev.map(c =>
                        c.id === conversation.id
                          ? { ...c, allMembers: res.data.members, recipients: res.data.members.filter(m => m.id !== currentUser?.id) }
                          : c
                      )
                    })
                  }
                }).catch(err => console.error('Failed to refresh members:', err))
              }
              if (changes.groupChatUpdated && isGroupChat) {
                // Update name and avatar in messages list via dedicated handler
                if (onGroupChatUpdated && conversation.groupChatId) {
                  onGroupChatUpdated(conversation.groupChatId, {
                    name: changes.name,
                    avatarUrl: changes.avatarUrl,
                  })
                }
              }
            }}
            currentUserId={currentUser?.id}
            onPartyCreated={async (partyData) => {
              console.log('Party created from groupchat:', partyData)
              if (onPartyCreatedFromGroupchat && isGroupChat) {
                // Get member IDs from the groupchat
                const memberIds = (conversation.allMembers || recipients || []).map(m => m.id)
                const result = await onPartyCreatedFromGroupchat(partyData, conversation.groupChatId, memberIds)
                if (result?.success) {
                  console.log('Party created successfully:', result.party)
                  // Update header to show party name
                  setPartyName(partyData.name)
                  // Close the settings
                  setShowPartySettings(false)
                  // Refetch messages to show the invite message sent by creator
                  setTimeout(async () => {
                    try {
                      const response = await groupchatsApi.getMessages(conversation.groupChatId)
                      const messages = response.data
                      if (messages && Array.isArray(messages)) {
                        const transformed = messages.map(msg => ({
                          id: msg.id,
                          text: msg.content,
                          metadata: msg.metadata || null,
                          isOwn: msg.user?.id === currentUser?.id,
                          timestamp: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                          createdAt: msg.createdAt,
                          senderName: msg.user?.username || msg.user?.displayName,
                          senderAvatar: msg.user?.avatarUrl,
                        })).reverse()
                        setFetchedMessages(transformed)
                      }
                    } catch (err) {
                      console.error('Failed to refetch messages after party creation:', err)
                    }
                  }, 500) // Small delay to ensure message is saved
                }
              }
            }}
          />
        )
        })(),
        document.body
      )}

      {/* Join Party Confirmation Dialog */}
      {showJoinConfirmation && pendingInvite && createPortal(
        <div className="party-confirm-overlay" style={{ zIndex: 10002 }}>
          <div className="party-confirm-dialog">
            <div className="party-confirm-icon" style={{ background: pendingInvite.metadata.partyColor || '#EC4899' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h3 className="party-confirm-title">
              Join {pendingInvite.metadata.partyName}?
            </h3>
            <p className="party-confirm-message">
              You're currently <strong>{currentUser?.party || 'Independent'}</strong>. Joining this party will change your affiliation from {currentUser?.party || 'Independent'} to <strong style={{ color: pendingInvite.metadata.partyColor || '#EC4899' }}>{pendingInvite.metadata.partyName}</strong>.
            </p>
            <div className="party-confirm-actions">
              <button
                className="party-confirm-cancel"
                onClick={() => {
                  setShowJoinConfirmation(false)
                  setPendingInvite(null)
                }}
                disabled={isJoining}
              >
                Stay {currentUser?.party || 'Independent'}
              </button>
              <button
                className="party-confirm-create"
                style={{ background: pendingInvite.metadata.partyColor || '#EC4899' }}
                onClick={handleConfirmJoin}
                disabled={isJoining}
              >
                {isJoining ? 'Joining...' : 'Join Party'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default Conversation
