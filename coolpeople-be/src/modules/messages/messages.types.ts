/**
 * Messages Module Types
 */

// -----------------------------------------------------------------------------
// Conversation User Info
// -----------------------------------------------------------------------------

export interface ConversationUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

// -----------------------------------------------------------------------------
// Message Reaction
// -----------------------------------------------------------------------------

export interface MessageReaction {
  emoji: string;
  count: number;
  reacted: boolean; // Whether the current user has reacted with this emoji
}

// -----------------------------------------------------------------------------
// Message Response
// -----------------------------------------------------------------------------

export interface MessageResponse {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  metadata?: Record<string, unknown> | null;
  readAt: Date | null;
  createdAt: Date;
  reactions?: MessageReaction[];
}

// -----------------------------------------------------------------------------
// Conversation Response
// -----------------------------------------------------------------------------

export interface ConversationResponse {
  id?: string; // Optional - used for party chats
  partyId?: string; // Optional - set for party group chats
  isPartyChat?: boolean; // Optional - true for party group chats
  joinedAt?: Date; // Optional - when user joined the party (for sorting new party chats)
  otherUser: ConversationUser;
  lastMessage: MessageResponse;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  isHidden: boolean;
}

// -----------------------------------------------------------------------------
// Send Message Request
// -----------------------------------------------------------------------------

export interface SendMessageRequest {
  receiverId: string;
  content: string;
  metadata?: Record<string, unknown>;
}
