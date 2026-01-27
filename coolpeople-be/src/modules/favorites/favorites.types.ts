/**
 * Favorites Module Types
 */

// -----------------------------------------------------------------------------
// Favorited User Response (basic profile info)
// -----------------------------------------------------------------------------

export interface FavoritedUserResponse {
  id: string;
  favoritedUser: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    userType: string;
  };
  createdAt: Date;
}

// -----------------------------------------------------------------------------
// Favorite Response (for create)
// -----------------------------------------------------------------------------

export interface FavoriteResponse {
  id: string;
  userId: string;
  favoritedUserId: string;
  createdAt: Date;
}
