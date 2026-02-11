/**
 * API Service Layer
 * Connects frontend to CoolPeople backend
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Store auth token
let authToken = null;

export const setAuthToken = (token) => {
  authToken = token;
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
};

export const getAuthToken = () => {
  if (!authToken) {
    authToken = localStorage.getItem('authToken');
  }
  return authToken;
};

// Base fetch wrapper with auth
const apiFetch = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  // Handle 204 No Content responses (no body to parse)
  if (response.status === 204) {
    return { success: true };
  }

  return response.json();
};

// Upload wrapper for multipart/form-data (no Content-Type — browser sets boundary)
const apiUpload = async (endpoint, formData) => {
  const token = getAuthToken();
  const headers = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Upload failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
};

// =============================================================================
// Auth API
// =============================================================================

export const authApi = {
  register: (data) => apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  login: async (data) => {
    const result = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    // Backend returns { success: true, data: { user, token } }
    const token = result.data?.token || result.token;
    if (token) {
      setAuthToken(token);
    }
    return result;
  },

  googleAuth: (data) => apiFetch('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  appleAuth: (data) => apiFetch('/api/auth/apple', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  me: () => apiFetch('/api/auth/me'),

  logout: () => {
    setAuthToken(null);
  },
};

// =============================================================================
// Users API
// =============================================================================

export const usersApi = {
  getUser: (userId) => apiFetch(`/api/users/${userId}`),

  updateUser: (userId, data) => apiFetch(`/api/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  followUser: (userId) => apiFetch(`/api/users/${userId}/follow`, {
    method: 'POST',
  }),

  unfollowUser: (userId) => apiFetch(`/api/users/${userId}/follow`, {
    method: 'DELETE',
  }),

  getFollowers: (userId, cursor) => apiFetch(`/api/users/${userId}/followers${cursor ? `?cursor=${cursor}` : ''}`),

  getFollowing: (userId, cursor) => apiFetch(`/api/users/${userId}/following${cursor ? `?cursor=${cursor}` : ''}`),

  becomeCandidate: (userId) => apiFetch(`/api/users/${userId}/become-candidate`, {
    method: 'POST',
    body: JSON.stringify({ acceptTerms: true }),
  }),

  revertToParticipant: (userId) => apiFetch(`/api/users/${userId}/revert-participant`, {
    method: 'POST',
  }),

  grantMediaAccess: (userId) => apiFetch(`/api/users/${userId}/media-access`, {
    method: 'POST',
  }),

  // Device contacts (synced from phone)
  getContacts: (userId) => apiFetch(`/api/users/${userId}/contacts`),

  syncContacts: (userId, contacts) => apiFetch(`/api/users/${userId}/contacts/sync`, {
    method: 'POST',
    body: JSON.stringify({ contacts }),
  }),
};

// =============================================================================
// Reels API
// =============================================================================

export const reelsApi = {
  getFeed: (options = {}) => {
    const params = new URLSearchParams();
    if (options.cursor) params.append('cursor', options.cursor);
    if (options.limit) params.append('limit', options.limit);
    const query = params.toString();
    return apiFetch(`/api/reels/feed${query ? `?${query}` : ''}`);
  },

  getReel: (reelId) => apiFetch(`/api/reels/${reelId}`),

  getUserReels: (userId, cursor) => apiFetch(`/api/reels/user/${userId}${cursor ? `?cursor=${cursor}` : ''}`),

  getUserReposts: (userId, cursor) => apiFetch(`/api/reels/user/${userId}/reposts${cursor ? `?cursor=${cursor}` : ''}`),

  getUserActivity: (userId) => apiFetch(`/api/reels/user/${userId}/activity`),

  getUserTaggedReels: (userId, cursor) => apiFetch(`/api/reels/user/${userId}/tagged${cursor ? `?cursor=${cursor}` : ''}`),

  getPartyReels: (partyId, cursor) => apiFetch(`/api/reels/party/${partyId}${cursor ? `?cursor=${cursor}` : ''}`),

  createReel: (data) => apiFetch('/api/reels', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  deleteReel: (reelId) => apiFetch(`/api/reels/${reelId}`, {
    method: 'DELETE',
  }),

  likeReel: (reelId) => apiFetch(`/api/reels/${reelId}/like`, {
    method: 'POST',
  }),

  unlikeReel: (reelId) => apiFetch(`/api/reels/${reelId}/like`, {
    method: 'DELETE',
  }),

  saveReel: (reelId) => apiFetch(`/api/reels/${reelId}/save`, {
    method: 'POST',
  }),

  unsaveReel: (reelId) => apiFetch(`/api/reels/${reelId}/save`, {
    method: 'DELETE',
  }),

  shareReel: (reelId) => apiFetch(`/api/reels/${reelId}/share`, {
    method: 'POST',
  }),

  repostReel: (reelId) => apiFetch(`/api/reels/${reelId}/repost`, {
    method: 'POST',
  }),

  unrepostReel: (reelId) => apiFetch(`/api/reels/${reelId}/repost`, {
    method: 'DELETE',
  }),

  recordView: (reelId, data) => apiFetch(`/api/reels/${reelId}/view`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  hideReel: (reelId, reason) => apiFetch(`/api/reels/${reelId}/hide`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  }),

  hideUser: (userId) => apiFetch('/api/reels/hide-user', {
    method: 'POST',
    body: JSON.stringify({ hiddenUserId: userId }),
  }),

  combineVideos: (formData) => apiUpload('/api/reels/combine-videos', formData),

  // Sound endpoints
  saveSound: (soundId) => apiFetch(`/api/reels/sounds/${soundId}/save`, {
    method: 'POST',
  }),

  unsaveSound: (soundId) => apiFetch(`/api/reels/sounds/${soundId}/save`, {
    method: 'DELETE',
  }),

  getReelsBySound: (soundId, cursor) => apiFetch(`/api/reels/sound/${soundId}${cursor ? `?cursor=${cursor}` : ''}`),
};

// =============================================================================
// Comments API
// =============================================================================

export const commentsApi = {
  getComments: (reelId, cursor) => apiFetch(`/api/reels/${reelId}/comments${cursor ? `?cursor=${cursor}` : ''}`),

  addComment: (reelId, data) => apiFetch(`/api/reels/${reelId}/comments`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  deleteComment: (reelId, commentId) => apiFetch(`/api/reels/${reelId}/comments/${commentId}`, {
    method: 'DELETE',
  }),

  likeComment: (reelId, commentId) => apiFetch(`/api/reels/${reelId}/comments/${commentId}/like`, {
    method: 'POST',
  }),

  unlikeComment: (reelId, commentId) => apiFetch(`/api/reels/${reelId}/comments/${commentId}/like`, {
    method: 'DELETE',
  }),
};

// =============================================================================
// Stories API
// =============================================================================

export const storiesApi = {
  getFeed: () => apiFetch('/api/stories/feed'),

  getUserStories: (userId) => apiFetch(`/api/stories/user/${userId}`),

  getStory: (storyId) => apiFetch(`/api/stories/${storyId}`),

  createStory: (data) => apiFetch('/api/stories', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  deleteStory: (storyId) => apiFetch(`/api/stories/${storyId}`, {
    method: 'DELETE',
  }),

  viewStory: (storyId) => apiFetch(`/api/stories/${storyId}/view`, {
    method: 'POST',
  }),
};

// =============================================================================
// Races API
// =============================================================================

export const racesApi = {
  listRaces: (options = {}) => {
    const params = new URLSearchParams();
    if (options.type) params.append('type', options.type);
    if (options.cursor) params.append('cursor', options.cursor);
    const query = params.toString();
    return apiFetch(`/api/races${query ? `?${query}` : ''}`);
  },

  getRace: (raceId) => apiFetch(`/api/races/${raceId}`),

  createRace: (data) => apiFetch('/api/races', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  updateRace: (raceId, data) => apiFetch(`/api/races/${raceId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  deleteRace: (raceId) => apiFetch(`/api/races/${raceId}`, {
    method: 'DELETE',
  }),

  followRace: (raceId) => apiFetch(`/api/races/${raceId}/follow`, {
    method: 'POST',
  }),

  unfollowRace: (raceId) => apiFetch(`/api/races/${raceId}/follow`, {
    method: 'DELETE',
  }),

  competeInRace: (raceId) => apiFetch(`/api/races/${raceId}/compete`, {
    method: 'POST',
  }),

  enterPartyInRace: (raceId, partyId) => apiFetch(`/api/races/${raceId}/compete/party`, {
    method: 'POST',
    body: JSON.stringify({ partyId }),
  }),

  canEnterPartyInRace: (raceId, partyId) => apiFetch(`/api/races/${raceId}/compete/party/can-enter?partyId=${partyId}`),

  leaveRace: (raceId) => apiFetch(`/api/races/${raceId}/compete`, {
    method: 'DELETE',
  }),

  getCompetitors: (raceId) => apiFetch(`/api/races/${raceId}/competitors`),

  getScoreboard: (raceId, options = {}) => {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit);
    if (options.cursor) params.append('cursor', options.cursor);
    if (options.period) params.append('period', options.period);
    const query = params.toString();
    return apiFetch(`/api/races/${raceId}/scoreboard${query ? `?${query}` : ''}`);
  },

  nominateCandidate: (raceId, data) => apiFetch(`/api/races/${raceId}/nominate`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  getUserNominations: (userId) => apiFetch(`/api/races/users/${userId}/nominations`),

  getBallotStatus: (raceId) => apiFetch(`/api/races/${raceId}/ballot`),

  submitBallot: (raceId, data) => apiFetch(`/api/races/${raceId}/ballot`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  updateBallot: (raceId, data) => apiFetch(`/api/races/${raceId}/ballot`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  getBallotResults: (raceId) => apiFetch(`/api/races/${raceId}/ballot/results`),

  // Boost a competitor (user or party) directly in a race (toggles on/off)
  boostCompetitor: (raceId, data) => apiFetch(`/api/races/${raceId}/boost`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Get user's boost status in a race (what they've nominated)
  getBoostStatus: (raceId) => apiFetch(`/api/races/${raceId}/boosts`),
};

// =============================================================================
// Parties API
// =============================================================================

export const partiesApi = {
  // List parties with optional search and pagination
  listParties: (search, cursor, limit = 50) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (cursor) params.append('cursor', cursor);
    if (limit) params.append('limit', limit.toString());
    return apiFetch(`/api/parties?${params.toString()}`);
  },

  getParty: (partyId) => apiFetch(`/api/parties/${partyId}`),

  getPartyByHandle: (handle) => apiFetch(`/api/parties/by-handle/${encodeURIComponent(handle)}`),

  // Check if party name or handle is available
  checkName: (name, handle) => {
    const params = new URLSearchParams();
    if (name) params.append('name', name);
    if (handle) params.append('handle', handle);
    return apiFetch(`/api/parties/check-name?${params.toString()}`);
  },

  // Clean up orphaned parties (maintenance)
  cleanupOrphaned: () => apiFetch('/api/parties/cleanup-orphaned', {
    method: 'POST',
  }),

  getFullProfile: (partyId) => apiFetch(`/api/parties/${partyId}/profile`),

  createParty: (data) => apiFetch('/api/parties', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  updateParty: (partyId, data) => apiFetch(`/api/parties/${partyId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  deleteParty: (partyId) => apiFetch(`/api/parties/${partyId}`, {
    method: 'DELETE',
  }),

  getMembers: (partyId, cursor) => apiFetch(`/api/parties/${partyId}/members${cursor ? `?cursor=${cursor}` : ''}`),

  updateMemberPermissions: (partyId, userId, permissions) => apiFetch(`/api/parties/${partyId}/members/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ permissions }),
  }),

  removeMember: (partyId, userId) => apiFetch(`/api/parties/${partyId}/members/${userId}`, {
    method: 'DELETE',
  }),

  // Ban operations
  banMember: (partyId, userId, reason) => apiFetch(`/api/parties/${partyId}/bans/${userId}`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  }),

  unbanMember: (partyId, userId) => apiFetch(`/api/parties/${partyId}/bans/${userId}`, {
    method: 'DELETE',
  }),

  getBannedMembers: (partyId, cursor) => apiFetch(`/api/parties/${partyId}/bans${cursor ? `?cursor=${cursor}` : ''}`),

  getFollowers: (partyId, cursor) => apiFetch(`/api/parties/${partyId}/followers${cursor ? `?cursor=${cursor}` : ''}`),

  getRaces: (partyId) => apiFetch(`/api/parties/${partyId}/races`),

  getReviews: (partyId, cursor) => apiFetch(`/api/parties/${partyId}/reviews${cursor ? `?cursor=${cursor}` : ''}`),

  joinParty: (partyId, options = {}) => apiFetch(`/api/parties/${partyId}/join`, {
    method: 'POST',
    body: JSON.stringify(options),
  }),

  leaveParty: (partyId) => apiFetch(`/api/parties/${partyId}/leave`, {
    method: 'DELETE',
  }),

  followParty: (partyId) => apiFetch(`/api/parties/${partyId}/follow`, {
    method: 'POST',
  }),

  unfollowParty: (partyId) => apiFetch(`/api/parties/${partyId}/follow`, {
    method: 'DELETE',
  }),

  // Party Group Chat
  getChatMessages: (partyId, cursor) => apiFetch(`/api/parties/${partyId}/chat/messages${cursor ? `?cursor=${cursor}` : ''}`),

  sendChatMessage: (partyId, content, metadata) => apiFetch(`/api/parties/${partyId}/chat/messages`, {
    method: 'POST',
    body: JSON.stringify({ content, ...(metadata && { metadata }) }),
  }),

  deleteChatMessage: (partyId, messageId) => apiFetch(`/api/parties/${partyId}/chat/messages/${messageId}`, {
    method: 'DELETE',
  }),

  addChatReaction: (partyId, messageId, emoji) => apiFetch(`/api/parties/${partyId}/chat/messages/${messageId}/reactions`, {
    method: 'POST',
    body: JSON.stringify({ emoji }),
  }),

  removeChatReaction: (partyId, messageId, emoji) => apiFetch(`/api/parties/${partyId}/chat/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`, {
    method: 'DELETE',
  }),
};

// =============================================================================
// Messages API
// =============================================================================

export const messagesApi = {
  getConversations: (cursor) => apiFetch(`/api/messages/conversations${cursor ? `?cursor=${cursor}` : ''}`),

  getMessagesWithUser: (userId, cursor) => apiFetch(`/api/messages/conversations/${userId}${cursor ? `?cursor=${cursor}` : ''}`),

  sendMessage: (data) => apiFetch('/api/messages', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  markConversationRead: (userId) => apiFetch(`/api/messages/conversations/${userId}/read`, {
    method: 'POST',
  }),

  markConversationUnread: (userId, count = 5) => apiFetch(`/api/messages/conversations/${userId}/unread`, {
    method: 'POST',
    body: JSON.stringify({ count }),
  }),

  pinConversation: (userId) => apiFetch(`/api/messages/conversations/${userId}/pin`, {
    method: 'POST',
  }),

  unpinConversation: (userId) => apiFetch(`/api/messages/conversations/${userId}/pin`, {
    method: 'DELETE',
  }),

  muteConversation: (userId) => apiFetch(`/api/messages/conversations/${userId}/mute`, {
    method: 'POST',
  }),

  unmuteConversation: (userId) => apiFetch(`/api/messages/conversations/${userId}/mute`, {
    method: 'DELETE',
  }),

  hideConversation: (userId) => apiFetch(`/api/messages/conversations/${userId}/hide`, {
    method: 'POST',
  }),

  unhideConversation: (userId) => apiFetch(`/api/messages/conversations/${userId}/hide`, {
    method: 'DELETE',
  }),

  deleteConversation: (userId) => apiFetch(`/api/messages/conversations/${userId}`, {
    method: 'DELETE',
  }),

  deleteMessage: (messageId) => apiFetch(`/api/messages/${messageId}`, {
    method: 'DELETE',
  }),

  addReaction: (messageId, emoji) => apiFetch(`/api/messages/${messageId}/reactions`, {
    method: 'POST',
    body: JSON.stringify({ emoji }),
  }),

  removeReaction: (messageId, emoji) => apiFetch(`/api/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`, {
    method: 'DELETE',
  }),
};

// =============================================================================
// Points API
// =============================================================================

export const pointsApi = {
  getSparkline: (ledgerId, period) => apiFetch(`/api/points/sparkline/${ledgerId}${period ? `?period=${period}` : ''}`),

  // Get pending points for PARTICIPANT users (points accumulated until they opt-in)
  getPendingPoints: () => apiFetch('/api/points/pending'),
};

// =============================================================================
// Notifications API
// =============================================================================

export const notificationsApi = {
  getNotifications: (cursor) => apiFetch(`/api/notifications${cursor ? `?cursor=${cursor}` : ''}`),

  markAsRead: (notificationId) => apiFetch(`/api/notifications/${notificationId}/read`, {
    method: 'POST',
  }),

  markAllAsRead: () => apiFetch('/api/notifications/read-all', {
    method: 'POST',
  }),
};

// =============================================================================
// Search API
// =============================================================================

export const searchApi = {
  search: (query, options = {}) => {
    const params = new URLSearchParams();
    params.append('q', query || '');
    if (options.type) params.append('type', options.type);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.cursor) params.append('cursor', options.cursor);
    return apiFetch(`/api/search?${params.toString()}`);
  },
};

// =============================================================================
// Favorites API
// =============================================================================

export const favoritesApi = {
  getFavorites: (cursor) => apiFetch(`/api/me/favorites${cursor ? `?cursor=${cursor}` : ''}`),

  addFavorite: (userId) => apiFetch(`/api/users/${userId}/favorite`, {
    method: 'POST',
  }),

  removeFavorite: (userId) => apiFetch(`/api/users/${userId}/favorite`, {
    method: 'DELETE',
  }),

  // Check if a specific user is favorited
  isFavorited: async (userId) => {
    const response = await apiFetch('/api/me/favorites');
    return response.favorites?.some(f => f.favoritedUser.id === userId) || false;
  },
};

// =============================================================================
// Reviews API
// =============================================================================

export const reviewsApi = {
  getUserReviews: (userId, cursor) => apiFetch(`/api/users/${userId}/reviews${cursor ? `?cursor=${cursor}` : ''}`),

  createReview: (userId, data) => apiFetch(`/api/users/${userId}/reviews`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  deleteReview: (reviewId) => apiFetch(`/api/reviews/${reviewId}`, {
    method: 'DELETE',
  }),
};

// =============================================================================
// Icebreakers API
// =============================================================================

export const icebreakersApi = {
  getUserIcebreakers: (userId) => apiFetch(`/api/users/${userId}/icebreakers`),

  updateIcebreakers: (userId, data) => apiFetch(`/api/users/${userId}/icebreakers`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  getPartyIcebreakers: (partyId) => apiFetch(`/api/parties/${partyId}/icebreakers`),

  updatePartyIcebreakers: (partyId, data) => apiFetch(`/api/parties/${partyId}/icebreakers`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
};

// =============================================================================
// Groupchats API (User-created groupchats)
// =============================================================================

export const groupchatsApi = {
  // Create a new groupchat (or get existing one with same members)
  create: (memberIds, name) => apiFetch('/api/groupchats', {
    method: 'POST',
    body: JSON.stringify({ memberIds, name }),
  }),

  // Get all groupchats for current user
  getAll: () => apiFetch('/api/groupchats'),

  // Find existing groupchat by members
  findByMembers: (memberIds) => apiFetch('/api/groupchats/find-by-members', {
    method: 'POST',
    body: JSON.stringify({ memberIds }),
  }),

  // Get a specific groupchat
  get: (groupChatId) => apiFetch(`/api/groupchats/${groupChatId}`),

  // Get messages for a groupchat
  getMessages: (groupChatId, cursor) => apiFetch(`/api/groupchats/${groupChatId}/messages${cursor ? `?cursor=${cursor}` : ''}`),

  // Send a message to a groupchat
  sendMessage: (groupChatId, content, metadata) => apiFetch(`/api/groupchats/${groupChatId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content, ...(metadata && { metadata }) }),
  }),

  // Pin a groupchat
  pin: (groupChatId) => apiFetch(`/api/groupchats/${groupChatId}/pin`, { method: 'POST' }),

  // Unpin a groupchat
  unpin: (groupChatId) => apiFetch(`/api/groupchats/${groupChatId}/pin`, { method: 'DELETE' }),

  // Mute a groupchat
  mute: (groupChatId) => apiFetch(`/api/groupchats/${groupChatId}/mute`, { method: 'POST' }),

  // Unmute a groupchat
  unmute: (groupChatId) => apiFetch(`/api/groupchats/${groupChatId}/mute`, { method: 'DELETE' }),

  // Hide a groupchat
  hide: (groupChatId) => apiFetch(`/api/groupchats/${groupChatId}/hide`, { method: 'POST' }),

  // Unhide a groupchat
  unhide: (groupChatId) => apiFetch(`/api/groupchats/${groupChatId}/hide`, { method: 'DELETE' }),

  // Leave/delete a groupchat
  leave: (groupChatId) => apiFetch(`/api/groupchats/${groupChatId}`, { method: 'DELETE' }),

  // Add members to a groupchat
  addMembers: (groupChatId, memberIds) => apiFetch(`/api/groupchats/${groupChatId}/members`, {
    method: 'POST',
    body: JSON.stringify({ memberIds }),
  }),

  // Get suggested users to add to a groupchat (followers, previously messaged)
  getSuggestedUsers: (groupChatId, search) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    const query = params.toString();
    const path = groupChatId
      ? `/api/groupchats/${groupChatId}/suggested-users`
      : '/api/groupchats/suggested-users';
    return apiFetch(`${path}${query ? `?${query}` : ''}`);
  },

  // Update groupchat settings (name, avatar)
  update: (groupChatId, data) => apiFetch(`/api/groupchats/${groupChatId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
};

// =============================================================================
// Reports API
// =============================================================================

export const reportsApi = {
  // Create a report
  create: (data) => apiFetch('/api/reports', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Convenience method for reporting a reel
  reportReel: (reelId, reason, description) => apiFetch('/api/reports', {
    method: 'POST',
    body: JSON.stringify({
      targetType: 'REEL',
      targetId: reelId,
      reason,
      description,
    }),
  }),

  // Convenience method for reporting a user
  reportUser: (userId, reason, description) => apiFetch('/api/reports', {
    method: 'POST',
    body: JSON.stringify({
      targetType: 'USER',
      targetId: userId,
      reason,
      description,
    }),
  }),
};

// =============================================================================
// Export all APIs
// =============================================================================

export default {
  auth: authApi,
  users: usersApi,
  reels: reelsApi,
  comments: commentsApi,
  stories: storiesApi,
  races: racesApi,
  parties: partiesApi,
  messages: messagesApi,
  points: pointsApi,
  notifications: notificationsApi,
  search: searchApi,
  favorites: favoritesApi,
  reviews: reviewsApi,
  icebreakers: icebreakersApi,
  groupchats: groupchatsApi,
  reports: reportsApi,
};
