import type { Express, Response } from "express";
import { db } from './db';
import {
  supportTickets,
  ticketMessages,
  users,
  insertSupportTicketSchema,
  insertTicketMessageSchema
} from '@shared/schema';
import { eq, desc, and, count, sql } from 'drizzle-orm';
import {
  sessionAuthMiddleware,
  requireRole,
  USER_ROLES,
  type AuthenticatedRequest
} from './rbac-middleware';
import { generateTicketId } from './services/id-generator';

// Client-only access middleware
const requireClientAccess = [sessionAuthMiddleware, requireRole(USER_ROLES.CLIENT)] as const;

// Generate ticket number using centralized ID generator
async function generateTicketNumber(): Promise<string> {
  return generateTicketId();
}

// Calculate ticket age
function calculateTicketAge(createdAt: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - createdAt.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  } else {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${diffMinutes} min${diffMinutes > 1 ? 's' : ''}`;
  }
}

export function registerClientSupportRoutes(app: Express) {

  // GET /api/client/support/tickets - Get all tickets for authenticated client
  app.get('/api/client/support/tickets', ...requireClientAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { status } = req.query;

      let conditions = [eq(supportTickets.clientId, userId)];
      if (status && status !== 'all') {
        conditions.push(eq(supportTickets.status, status as string));
      }

      const tickets = await db.select()
        .from(supportTickets)
        .where(and(...conditions))
        .orderBy(desc(supportTickets.createdAt));

      const ticketsWithAge = tickets.map(ticket => ({
        ...ticket,
        age: calculateTicketAge(new Date(ticket.createdAt!))
      }));

      res.json(ticketsWithAge);
    } catch (error) {
      console.error('Error fetching client tickets:', error);
      res.status(500).json({ error: 'Failed to fetch tickets' });
    }
  });

  // GET /api/client/support/tickets/:id - Get single ticket with messages
  app.get('/api/client/support/tickets/:id', ...requireClientAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const ticketId = parseInt(req.params.id);

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Fetch ticket - ensure it belongs to the client
      const [ticket] = await db.select()
        .from(supportTickets)
        .where(and(
          eq(supportTickets.id, ticketId),
          eq(supportTickets.clientId, userId)
        ))
        .limit(1);

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      // Fetch messages (excluding internal notes)
      const messages = await db.select({
        id: ticketMessages.id,
        message: ticketMessages.message,
        messageType: ticketMessages.messageType,
        isInternal: ticketMessages.isInternal,
        createdAt: ticketMessages.createdAt,
        authorId: ticketMessages.authorId,
      })
        .from(ticketMessages)
        .where(
          and(
            eq(ticketMessages.ticketId, ticketId),
            eq(ticketMessages.isInternal, false) // Clients can't see internal notes
          )
        )
        .orderBy(ticketMessages.createdAt);

      // Get author names for messages
      const messagesWithAuthors = await Promise.all(
        messages.map(async (msg) => {
          if (msg.authorId) {
            const [author] = await db.select({ fullName: users.fullName })
              .from(users)
              .where(eq(users.id, msg.authorId))
              .limit(1);
            return {
              ...msg,
              authorName: msg.authorId === userId ? 'You' : (author?.fullName || 'Support Team')
            };
          }
          return { ...msg, authorName: 'System' };
        })
      );

      res.json({
        ...ticket,
        age: calculateTicketAge(new Date(ticket.createdAt!)),
        messages: messagesWithAuthors
      });
    } catch (error) {
      console.error('Error fetching ticket details:', error);
      res.status(500).json({ error: 'Failed to fetch ticket details' });
    }
  });

  // POST /api/client/support/tickets - Create new ticket
  app.post('/api/client/support/tickets', ...requireClientAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { subject, description, category, priority } = req.body;

      if (!subject || !description || !category) {
        return res.status(400).json({ error: 'Subject, description, and category are required' });
      }

      // Get client name
      const [user] = await db.select({ fullName: users.fullName })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      const ticketNumber = await generateTicketNumber();

      const [newTicket] = await db.insert(supportTickets)
        .values({
          ticketNumber,
          clientId: userId,
          clientName: user?.fullName || 'Unknown',
          subject,
          description,
          category: category || 'general',
          priority: priority || 'medium',
          status: 'open',
          slaStatus: 'on_track',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Add initial message from client
      await db.insert(ticketMessages)
        .values({
          ticketId: newTicket.id,
          authorId: userId,
          message: description,
          messageType: 'client_reply',
          isInternal: false,
          createdAt: new Date(),
        });

      res.status(201).json({
        ...newTicket,
        age: 'Just now'
      });
    } catch (error) {
      console.error('Error creating ticket:', error);
      res.status(500).json({ error: 'Failed to create ticket' });
    }
  });

  // POST /api/client/support/tickets/:id/messages - Add message to ticket
  app.post('/api/client/support/tickets/:id/messages', ...requireClientAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const ticketId = parseInt(req.params.id);

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { message } = req.body;
      if (!message || !message.trim()) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // Verify ticket belongs to client
      const [ticket] = await db.select()
        .from(supportTickets)
        .where(and(
          eq(supportTickets.id, ticketId),
          eq(supportTickets.clientId, userId)
        ))
        .limit(1);

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      if (ticket.status === 'closed') {
        return res.status(400).json({ error: 'Cannot add message to closed ticket' });
      }

      // Add message
      const [newMessage] = await db.insert(ticketMessages)
        .values({
          ticketId,
          authorId: userId,
          message: message.trim(),
          messageType: 'client_reply',
          isInternal: false,
          createdAt: new Date(),
        })
        .returning();

      // Update ticket - if resolved, set back to in_progress
      if (ticket.status === 'resolved') {
        await db.update(supportTickets)
          .set({
            status: 'in_progress',
            updatedAt: new Date(),
          })
          .where(eq(supportTickets.id, ticketId));
      } else {
        await db.update(supportTickets)
          .set({ updatedAt: new Date() })
          .where(eq(supportTickets.id, ticketId));
      }

      res.status(201).json({
        ...newMessage,
        authorName: 'You'
      });
    } catch (error) {
      console.error('Error adding message:', error);
      res.status(500).json({ error: 'Failed to add message' });
    }
  });

  // POST /api/client/support/tickets/:id/satisfaction - Submit satisfaction rating
  app.post('/api/client/support/tickets/:id/satisfaction', ...requireClientAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const ticketId = parseInt(req.params.id);

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { rating, comment } = req.body;

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
      }

      // Verify ticket belongs to client and is resolved
      const [ticket] = await db.select()
        .from(supportTickets)
        .where(and(
          eq(supportTickets.id, ticketId),
          eq(supportTickets.clientId, userId)
        ))
        .limit(1);

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      if (ticket.status !== 'resolved' && ticket.status !== 'closed') {
        return res.status(400).json({ error: 'Can only rate resolved or closed tickets' });
      }

      if (ticket.satisfactionRating) {
        return res.status(400).json({ error: 'Ticket has already been rated' });
      }

      // Update ticket with satisfaction rating
      await db.update(supportTickets)
        .set({
          satisfactionRating: rating,
          satisfactionComment: comment || null,
          updatedAt: new Date(),
        })
        .where(eq(supportTickets.id, ticketId));

      res.json({ success: true, rating, comment });
    } catch (error) {
      console.error('Error submitting satisfaction rating:', error);
      res.status(500).json({ error: 'Failed to submit rating' });
    }
  });

  console.log('Client Support routes registered');
}
