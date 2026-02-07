/**
 * Parties Module Validation Schemas
 */

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Party ID Param
// -----------------------------------------------------------------------------

export const partyIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid party ID'),
  }),
});

// -----------------------------------------------------------------------------
// Party Handle Param (for lookup by handle)
// -----------------------------------------------------------------------------

export const partyHandleParamSchema = z.object({
  params: z.object({
    handle: z.string().min(1, 'Handle is required'),
  }),
});

// -----------------------------------------------------------------------------
// Party + Member Params
// -----------------------------------------------------------------------------

export const partyMemberParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid party ID'),
    userId: z.string().uuid('Invalid user ID'),
  }),
});

// -----------------------------------------------------------------------------
// Party + Join Request Params
// -----------------------------------------------------------------------------

export const joinRequestParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid party ID'),
    requestId: z.string().uuid('Invalid request ID'),
  }),
});

// -----------------------------------------------------------------------------
// Chat Message Params
// -----------------------------------------------------------------------------

export const chatMessageParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid party ID'),
    messageId: z.string().uuid('Invalid message ID'),
  }),
});

// -----------------------------------------------------------------------------
// Chat Reaction Params
// -----------------------------------------------------------------------------

export const chatReactionParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid party ID'),
    messageId: z.string().uuid('Invalid message ID'),
    emoji: z.string().min(1),
  }),
});

// -----------------------------------------------------------------------------
// Create Party
// -----------------------------------------------------------------------------

const validPermissions = ['view', 'post', 'chat', 'invite', 'moderate', 'admin'] as const;

export const createPartySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(50, 'Name must be at most 50 characters'),
    handle: z.string()
      .min(3, 'Handle must be at least 3 characters')
      .max(30, 'Handle must be at most 30 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Handle can only contain letters, numbers, and underscores'),
    description: z.string().max(500).optional(),
    avatarUrl: z.string().optional().nullable(),
    bannerUrl: z.string().optional().nullable(),
    isPrivate: z.boolean().default(false),
    chatMode: z.enum(['OPEN', 'ADMIN_ONLY', 'CYCLE']).default('OPEN'),
    groupChatId: z.string().uuid('Invalid groupchat ID').optional(), // Convert existing groupchat to party chat
  }),
});

// -----------------------------------------------------------------------------
// Update Party
// -----------------------------------------------------------------------------

export const updatePartySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid party ID'),
  }),
  body: z.object({
    name: z.string().min(1).max(50).optional(),
    handle: z.string()
      .min(3)
      .max(30)
      .regex(/^[a-zA-Z0-9_]+$/, 'Handle can only contain letters, numbers, and underscores')
      .optional(),
    description: z.string().max(500).optional(),
    avatarUrl: z.string().optional().nullable(),
    bannerUrl: z.string().optional().nullable(),
    isPrivate: z.boolean().optional(),
    chatMode: z.enum(['OPEN', 'ADMIN_ONLY', 'CYCLE']).optional(),
  }),
});

// -----------------------------------------------------------------------------
// List Parties Query
// -----------------------------------------------------------------------------

export const listPartiesQuerySchema = z.object({
  query: z.object({
    search: z.string().optional(),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().positive().max(50).default(20),
  }),
});

// -----------------------------------------------------------------------------
// List Members Query
// -----------------------------------------------------------------------------

export const listMembersQuerySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid party ID'),
  }),
  query: z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().positive().max(50).default(20),
  }),
});

// -----------------------------------------------------------------------------
// Update Member Permissions
// -----------------------------------------------------------------------------

export const updateMemberPermissionsSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid party ID'),
    userId: z.string().uuid('Invalid user ID'),
  }),
  body: z.object({
    permissions: z.array(z.enum(validPermissions)).min(1, 'Must include at least one permission'),
  }),
});

// -----------------------------------------------------------------------------
// Send Chat Message
// -----------------------------------------------------------------------------

export const sendMessageSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid party ID'),
  }),
  body: z.object({
    content: z.string().min(1).max(2000, 'Message must be at most 2000 characters'),
    metadata: z.record(z.unknown()).optional(),
  }),
});

// -----------------------------------------------------------------------------
// Chat Messages Query
// -----------------------------------------------------------------------------

export const chatMessagesQuerySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid party ID'),
  }),
  query: z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().positive().max(100).default(50),
  }),
});

// -----------------------------------------------------------------------------
// Add Reaction
// -----------------------------------------------------------------------------

export const addReactionSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid party ID'),
    messageId: z.string().uuid('Invalid message ID'),
  }),
  body: z.object({
    emoji: z.string().min(1).max(10, 'Invalid emoji'),
  }),
});
