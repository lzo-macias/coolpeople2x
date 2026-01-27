/**
 * Messages Module Validation Schemas
 */

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Send Message
// -----------------------------------------------------------------------------

export const sendMessageSchema = z.object({
  body: z.object({
    receiverId: z.string().uuid('Invalid receiver ID'),
    content: z
      .string()
      .min(1, 'Message cannot be empty')
      .max(2000, 'Message must be at most 2000 characters')
      .trim(),
  }),
});

// -----------------------------------------------------------------------------
// User ID Param (for conversation with specific user)
// -----------------------------------------------------------------------------

export const conversationUserParamSchema = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID'),
  }),
});

// -----------------------------------------------------------------------------
// Message ID Param
// -----------------------------------------------------------------------------

export const messageIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid message ID'),
  }),
});

// -----------------------------------------------------------------------------
// Cursor Query (cursor-based pagination)
// -----------------------------------------------------------------------------

export const cursorQuerySchema = z.object({
  query: z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().positive().max(50).default(20),
  }),
});
