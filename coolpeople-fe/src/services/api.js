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
    if (result.token) {
      setAuthToken(result.token);
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
    body: JSON.stringify({ userId }),
  }),
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

  leaveRace: (raceId) => apiFetch(`/api/races/${raceId}/compete`, {
    method: 'DELETE',
  }),

  getCompetitors: (raceId) => apiFetch(`/api/races/${raceId}/competitors`),

  getScoreboard: (raceId, options = {}) => {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit);
    if (options.cursor) params.append('cursor', options.cursor);
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
};

// =============================================================================
// Parties API
// =============================================================================

export const partiesApi = {
  getParty: (partyId) => apiFetch(`/api/parties/${partyId}`),

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

  joinParty: (partyId) => apiFetch(`/api/parties/${partyId}/join`, {
    method: 'POST',
  }),

  leaveParty: (partyId) => apiFetch(`/api/parties/${partyId}/leave`, {
    method: 'POST',
  }),

  followParty: (partyId) => apiFetch(`/api/parties/${partyId}/follow`, {
    method: 'POST',
  }),

  unfollowParty: (partyId) => apiFetch(`/api/parties/${partyId}/follow`, {
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

  deleteMessage: (messageId) => apiFetch(`/api/messages/${messageId}`, {
    method: 'DELETE',
  }),
};

// =============================================================================
// Points API
// =============================================================================

export const pointsApi = {
  getSparkline: (ledgerId) => apiFetch(`/api/points/sparkline/${ledgerId}`),
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
    params.append('q', query);
    if (options.type) params.append('type', options.type);
    if (options.cursor) params.append('cursor', options.cursor);
    return apiFetch(`/api/search?${params.toString()}`);
  },
};

// =============================================================================
// Favorites API
// =============================================================================

export const favoritesApi = {
  getFavorites: () => apiFetch('/api/favorites'),

  addFavorite: (data) => apiFetch('/api/favorites', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  removeFavorite: (favoriteId) => apiFetch(`/api/favorites/${favoriteId}`, {
    method: 'DELETE',
  }),
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
};
