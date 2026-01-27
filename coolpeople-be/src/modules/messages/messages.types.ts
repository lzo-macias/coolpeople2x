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
// Message Response
// -----------------------------------------------------------------------------

export interface MessageResponse {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  readAt: Date | null;
  createdAt: Date;
}

// -----------------------------------------------------------------------------
// Conversation Response
// -----------------------------------------------------------------------------

export interface ConversationResponse {
  otherUser: ConversationUser;
  lastMessage: MessageResponse;
  unreadCount: number;
}

// -----------------------------------------------------------------------------
// Send Message Request
// -----------------------------------------------------------------------------

export interface SendMessageRequest {
  receiverId: string;
  content: string;
}
