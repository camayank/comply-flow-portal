/**
 * Messaging API Routes
 *
 * Endpoints for message threads and conversations
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { eq, and, desc, lt, sql, not, inArray } from 'drizzle-orm';
import {
  messageThreads,
  messageThreadParticipants,
  messages,
  messageReadReceipts,
} from '../db/schema/messaging';
import { users } from '../db/schema/users';
import { notificationHub } from '../services/notifications';
import { authenticate } from '../middleware/auth';

const router = Router();

// ============================================
// MESSAGE THREADS
// ============================================

/**
 * GET /api/messages/threads
 * Get user's message threads
 */
router.get('/threads', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { status = 'active', limit = '20', offset = '0' } = req.query;

    // Get threads user is part of
    const participations = await db.query.messageThreadParticipants.findMany({
      where: and(
        eq(messageThreadParticipants.userId, userId),
        status !== 'all' ? eq(messageThreadParticipants.isArchived, status === 'archived') : undefined
      ),
      with: {
        thread: true,
      },
      orderBy: desc(messageThreadParticipants.id),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    // Enrich threads with last message and unread count
    const enrichedThreads = await Promise.all(
      participations.map(async (p) => {
        // Get last message
        const lastMessage = await db.query.messages.findFirst({
          where: and(
            eq(messages.threadId, p.threadId),
            eq(messages.isDeleted, false)
          ),
          orderBy: desc(messages.createdAt),
          with: {
            sender: {
              columns: { id: true, fullName: true },
            },
          },
        });

        // Get unread count
        const unreadCountResult = await db.select({ count: sql<number>`count(*)` })
          .from(messages)
          .where(and(
            eq(messages.threadId, p.threadId),
            eq(messages.isDeleted, false),
            p.lastReadAt
              ? sql`${messages.createdAt} > ${p.lastReadAt}`
              : sql`1=1`,
            not(eq(messages.senderId, userId))
          ));

        // Get participants
        const participants = await db.query.messageThreadParticipants.findMany({
          where: eq(messageThreadParticipants.threadId, p.threadId),
          with: {
            user: {
              columns: { id: true, fullName: true, email: true },
            },
          },
        });

        return {
          id: p.thread.id,
          subject: p.thread.subject,
          type: p.thread.type,
          status: p.thread.status,
          priority: p.thread.priority,
          lastMessageAt: p.thread.lastMessageAt,
          messageCount: p.thread.messageCount,
          lastMessage: lastMessage ? {
            id: lastMessage.id,
            content: lastMessage.content.substring(0, 100),
            senderId: lastMessage.senderId,
            senderName: lastMessage.sender?.fullName,
            createdAt: lastMessage.createdAt,
          } : null,
          unreadCount: unreadCountResult[0]?.count || 0,
          participants: participants.map(pp => ({
            id: pp.user?.id,
            name: pp.user?.fullName,
            email: pp.user?.email,
            role: pp.role,
          })),
          isArchived: p.isArchived,
          isMuted: p.isMuted,
          isPinned: p.isPinned,
        };
      })
    );

    // Sort: pinned first, then by last message
    enrichedThreads.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime();
    });

    res.json(enrichedThreads);
  } catch (error) {
    console.error('Get threads error:', error);
    res.status(500).json({ error: 'Failed to fetch message threads' });
  }
});

/**
 * POST /api/messages/threads
 * Create a new message thread
 */
router.post('/threads', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { subject, type = 'internal', participantIds, initialMessage, entityType, entityId } = req.body;

    if (!participantIds || participantIds.length === 0) {
      return res.status(400).json({ error: 'At least one participant is required' });
    }

    // Create thread
    const [thread] = await db.insert(messageThreads).values({
      subject,
      type,
      entityType,
      entityId,
      createdBy: userId,
      lastMessageAt: new Date(),
    }).returning();

    // Add creator as participant
    await db.insert(messageThreadParticipants).values({
      threadId: thread.id,
      userId,
      role: 'owner',
      lastReadAt: new Date(),
    });

    // Add other participants
    for (const participantId of participantIds) {
      if (participantId !== userId) {
        await db.insert(messageThreadParticipants).values({
          threadId: thread.id,
          userId: participantId,
          role: 'member',
        });
      }
    }

    // Add initial message if provided
    if (initialMessage) {
      await db.insert(messages).values({
        threadId: thread.id,
        senderId: userId,
        content: initialMessage,
      });

      await db.update(messageThreads)
        .set({ messageCount: 1 })
        .where(eq(messageThreads.id, thread.id));

      // Notify participants
      for (const participantId of participantIds) {
        if (participantId !== userId) {
          await notificationHub.send({
            userId: participantId,
            type: 'new_message',
            channels: ['in_app', 'push'],
            subject: `New message: ${subject || 'No subject'}`,
            content: initialMessage.substring(0, 100),
            referenceType: 'message_thread',
            referenceId: thread.id,
          });
        }
      }
    }

    res.status(201).json(thread);
  } catch (error) {
    console.error('Create thread error:', error);
    res.status(500).json({ error: 'Failed to create message thread' });
  }
});

/**
 * GET /api/messages/threads/:id
 * Get a specific thread
 */
router.get('/threads/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const threadId = parseInt(req.params.id);

    // Verify participation
    const participation = await db.query.messageThreadParticipants.findFirst({
      where: and(
        eq(messageThreadParticipants.threadId, threadId),
        eq(messageThreadParticipants.userId, userId)
      ),
    });

    if (!participation) {
      return res.status(403).json({ error: 'Not a participant of this thread' });
    }

    const thread = await db.query.messageThreads.findFirst({
      where: eq(messageThreads.id, threadId),
    });

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    // Get participants
    const participants = await db.query.messageThreadParticipants.findMany({
      where: eq(messageThreadParticipants.threadId, threadId),
      with: {
        user: {
          columns: { id: true, fullName: true, email: true },
        },
      },
    });

    res.json({
      ...thread,
      participants: participants.map(p => ({
        id: p.user?.id,
        name: p.user?.fullName,
        email: p.user?.email,
        role: p.role,
        lastReadAt: p.lastReadAt,
      })),
      userSettings: {
        isArchived: participation.isArchived,
        isMuted: participation.isMuted,
        isPinned: participation.isPinned,
      },
    });
  } catch (error) {
    console.error('Get thread error:', error);
    res.status(500).json({ error: 'Failed to fetch thread' });
  }
});

// ============================================
// MESSAGES
// ============================================

/**
 * GET /api/messages/threads/:id/messages
 * Get messages in a thread
 */
router.get('/threads/:id/messages', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const threadId = parseInt(req.params.id);
    const { limit = '50', before } = req.query;

    // Verify participation
    const participation = await db.query.messageThreadParticipants.findFirst({
      where: and(
        eq(messageThreadParticipants.threadId, threadId),
        eq(messageThreadParticipants.userId, userId)
      ),
    });

    if (!participation) {
      return res.status(403).json({ error: 'Not a participant of this thread' });
    }

    // Build conditions
    const conditions = [
      eq(messages.threadId, threadId),
      eq(messages.isDeleted, false),
    ];

    if (before) {
      conditions.push(lt(messages.createdAt, new Date(before as string)));
    }

    // Get messages
    const messageList = await db.query.messages.findMany({
      where: and(...conditions),
      with: {
        sender: {
          columns: { id: true, fullName: true, email: true },
        },
      },
      orderBy: desc(messages.createdAt),
      limit: parseInt(limit as string),
    });

    // Update last read
    await db.update(messageThreadParticipants)
      .set({ lastReadAt: new Date() })
      .where(and(
        eq(messageThreadParticipants.threadId, threadId),
        eq(messageThreadParticipants.userId, userId)
      ));

    // Return in chronological order
    res.json(messageList.reverse());
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

/**
 * POST /api/messages/threads/:id/messages
 * Send a message
 */
router.post('/threads/:id/messages', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const user = (req as any).user;
    const threadId = parseInt(req.params.id);
    const { content, attachments, replyToId } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Verify participation
    const participation = await db.query.messageThreadParticipants.findFirst({
      where: and(
        eq(messageThreadParticipants.threadId, threadId),
        eq(messageThreadParticipants.userId, userId)
      ),
    });

    if (!participation) {
      return res.status(403).json({ error: 'Not a participant of this thread' });
    }

    // Create message
    const [message] = await db.insert(messages).values({
      threadId,
      senderId: userId,
      content: content.trim(),
      attachments: attachments || [],
      replyToId,
    }).returning();

    // Update thread
    await db.update(messageThreads)
      .set({
        lastMessageAt: new Date(),
        messageCount: sql`${messageThreads.messageCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(messageThreads.id, threadId));

    // Update sender's last read
    await db.update(messageThreadParticipants)
      .set({ lastReadAt: new Date() })
      .where(and(
        eq(messageThreadParticipants.threadId, threadId),
        eq(messageThreadParticipants.userId, userId)
      ));

    // Notify other participants
    const otherParticipants = await db.query.messageThreadParticipants.findMany({
      where: and(
        eq(messageThreadParticipants.threadId, threadId),
        not(eq(messageThreadParticipants.userId, userId)),
        eq(messageThreadParticipants.isMuted, false)
      ),
    });

    for (const participant of otherParticipants) {
      await notificationHub.send({
        userId: participant.userId,
        type: 'new_message',
        channels: ['in_app', 'push'],
        subject: `New message from ${user.fullName || 'Someone'}`,
        content: content.substring(0, 100),
        data: {
          threadId,
          messageId: message.id,
          senderName: user.fullName,
        },
        referenceType: 'message',
        referenceId: message.id,
      });
    }

    res.status(201).json({
      ...message,
      sender: {
        id: userId,
        fullName: user.fullName,
      },
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

/**
 * PUT /api/messages/threads/:threadId/messages/:messageId
 * Edit a message
 */
router.put('/threads/:threadId/messages/:messageId', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const messageId = parseInt(req.params.messageId);
    const { content } = req.body;

    // Get original message
    const original = await db.query.messages.findFirst({
      where: eq(messages.id, messageId),
    });

    if (!original) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (original.senderId !== userId) {
      return res.status(403).json({ error: 'Can only edit your own messages' });
    }

    // Update message
    const [updated] = await db.update(messages)
      .set({
        content,
        isEdited: true,
        editedAt: new Date(),
        originalContent: original.isEdited ? original.originalContent : original.content,
      })
      .where(eq(messages.id, messageId))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ error: 'Failed to edit message' });
  }
});

/**
 * DELETE /api/messages/threads/:threadId/messages/:messageId
 * Delete a message
 */
router.delete('/threads/:threadId/messages/:messageId', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const messageId = parseInt(req.params.messageId);

    // Get message
    const message = await db.query.messages.findFirst({
      where: eq(messages.id, messageId),
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.senderId !== userId) {
      return res.status(403).json({ error: 'Can only delete your own messages' });
    }

    // Soft delete
    await db.update(messages)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: userId,
      })
      .where(eq(messages.id, messageId));

    res.json({ success: true });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// ============================================
// THREAD ACTIONS
// ============================================

/**
 * POST /api/messages/threads/:id/archive
 * Archive a thread
 */
router.post('/threads/:id/archive', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const threadId = parseInt(req.params.id);

    await db.update(messageThreadParticipants)
      .set({ isArchived: true })
      .where(and(
        eq(messageThreadParticipants.threadId, threadId),
        eq(messageThreadParticipants.userId, userId)
      ));

    res.json({ success: true });
  } catch (error) {
    console.error('Archive thread error:', error);
    res.status(500).json({ error: 'Failed to archive thread' });
  }
});

/**
 * POST /api/messages/threads/:id/unarchive
 * Unarchive a thread
 */
router.post('/threads/:id/unarchive', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const threadId = parseInt(req.params.id);

    await db.update(messageThreadParticipants)
      .set({ isArchived: false })
      .where(and(
        eq(messageThreadParticipants.threadId, threadId),
        eq(messageThreadParticipants.userId, userId)
      ));

    res.json({ success: true });
  } catch (error) {
    console.error('Unarchive thread error:', error);
    res.status(500).json({ error: 'Failed to unarchive thread' });
  }
});

/**
 * POST /api/messages/threads/:id/mute
 * Toggle mute status
 */
router.post('/threads/:id/mute', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const threadId = parseInt(req.params.id);
    const { muted } = req.body;

    await db.update(messageThreadParticipants)
      .set({ isMuted: muted !== false })
      .where(and(
        eq(messageThreadParticipants.threadId, threadId),
        eq(messageThreadParticipants.userId, userId)
      ));

    res.json({ success: true });
  } catch (error) {
    console.error('Mute thread error:', error);
    res.status(500).json({ error: 'Failed to mute thread' });
  }
});

/**
 * POST /api/messages/threads/:id/pin
 * Toggle pin status
 */
router.post('/threads/:id/pin', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const threadId = parseInt(req.params.id);
    const { pinned } = req.body;

    await db.update(messageThreadParticipants)
      .set({ isPinned: pinned !== false })
      .where(and(
        eq(messageThreadParticipants.threadId, threadId),
        eq(messageThreadParticipants.userId, userId)
      ));

    res.json({ success: true });
  } catch (error) {
    console.error('Pin thread error:', error);
    res.status(500).json({ error: 'Failed to pin thread' });
  }
});

export default router;
