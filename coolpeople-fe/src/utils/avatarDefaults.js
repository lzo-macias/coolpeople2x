// Default avatar paths for users and parties without profile photos
export const DEFAULT_USER_AVATAR = '/default-avatar-user.svg'
export const DEFAULT_PARTY_AVATAR = '/default-avatar-party.svg'

// Returns the appropriate default avatar based on entity type
export const getDefaultAvatar = (isParty = false) =>
  isParty ? DEFAULT_PARTY_AVATAR : DEFAULT_USER_AVATAR
