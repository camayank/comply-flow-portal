import { Router, Request, Response } from 'express';
import { db } from './db';
import { 
  supportTickets, 
  responseTemplates, 
  ticketMessages, 
  ticketAssignments,
  users,
  insertSupportTicketSchema,
  insertResponseTemplateSchema,
  insertTicketMessageSchema
} from '../shared/schema';
import { eq, desc, and, or, sql, count } from 'drizzle-orm';

const router = Router();

async function generateTicketNumber(): Promise<string> {
  const lastTicket = await db.select({ ticketNumber: supportTickets.ticketNumber })
    .from(supportTickets)
    .orderBy(desc(supportTickets.id))
    .limit(1);
  
  if (lastTicket.length === 0) {
    return 'T00001';
  }
  
  const lastNumber = parseInt(lastTicket[0].ticketNumber.substring(1));
  const newNumber = lastNumber + 1;
  return `T${newNumber.toString().padStart(5, '0')}`;
}

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const openTickets = await db.select({ count: count() })
      .from(supportTickets)
      .where(eq(supportTickets.status, 'open'));

    const inProgressTickets = await db.select({ count: count() })
      .from(supportTickets)
      .where(eq(supportTickets.status, 'in_progress'));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const resolvedToday = await db.select({ count: count() })
      .from(supportTickets)
      .where(
        and(
          eq(supportTickets.status, 'resolved'),
          sql`${supportTickets.resolvedAt} >= ${today.toISOString()}`
        )
      );

    const avgResponseTime = await db.select({
      avg: sql<number>`AVG(EXTRACT(EPOCH FROM (${supportTickets.firstRespondedAt} - ${supportTickets.createdAt})) / 60)`
    })
    .from(supportTickets)
    .where(sql`${supportTickets.firstRespondedAt} IS NOT NULL`);

    const avgMinutes = Math.round(avgResponseTime[0]?.avg || 0);
    const hours = Math.floor(avgMinutes / 60);
    const minutes = avgMinutes % 60;

    res.json({
      openTickets: openTickets[0]?.count || 0,
      inProgressTickets: inProgressTickets[0]?.count || 0,
      resolvedToday: resolvedToday[0]?.count || 0,
      avgResponseTime: `${hours}h ${minutes}m`
    });
  } catch (error) {
    console.error('Error fetching customer service stats:', error);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
});

router.get('/tickets', async (req: Request, res: Response) => {
  try {
    const { status, priority, assignedTo } = req.query;
    
    let conditions = [];
    if (status) conditions.push(eq(supportTickets.status, status as string));
    if (priority) conditions.push(eq(supportTickets.priority, priority as string));
    if (assignedTo) conditions.push(eq(supportTickets.assignedTo, parseInt(assignedTo as string)));

    const tickets = await db.select()
      .from(supportTickets)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(supportTickets.createdAt));

    const ticketsWithAge = tickets.map(ticket => {
      const created = new Date(ticket.createdAt!);
      const now = new Date();
      const diffMs = now.getTime() - created.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);
      
      let age;
      if (diffDays > 0) {
        age = `${diffDays} day${diffDays > 1 ? 's' : ''}`;
      } else {
        age = `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
      }

      return { ...ticket, age };
    });

    res.json(ticketsWithAge);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ message: 'Failed to fetch tickets' });
  }
});

router.get('/tickets/:id', async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id);
    
    const ticket = await db.select()
      .from(supportTickets)
      .where(eq(supportTickets.id, ticketId))
      .limit(1);

    if (ticket.length === 0) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const messages = await db.select()
      .from(ticketMessages)
      .where(eq(ticketMessages.ticketId, ticketId))
      .orderBy(ticketMessages.createdAt);

    res.json({
      ticket: ticket[0],
      messages
    });
  } catch (error) {
    console.error('Error fetching ticket details:', error);
    res.status(500).json({ message: 'Failed to fetch ticket details' });
  }
});

router.post('/tickets', async (req: Request, res: Response) => {
  try {
    const ticketNumber = await generateTicketNumber();
    
    const now = new Date();
    const resolutionDue = new Date(now);
    const slaHours = req.body.resolutionSlaHours || 24;
    resolutionDue.setHours(resolutionDue.getHours() + slaHours);

    const firstResponseDue = new Date(now);
    firstResponseDue.setHours(firstResponseDue.getHours() + 2);

    const validatedData = insertSupportTicketSchema.parse({
      ...req.body,
      ticketNumber,
      firstResponseDue,
      resolutionDue,
      resolutionSlaHours: slaHours
    });

    const [newTicket] = await db.insert(supportTickets)
      .values(validatedData)
      .returning();

    res.status(201).json(newTicket);
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ message: 'Failed to create ticket' });
  }
});

router.patch('/tickets/:id', async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id);
    const updates: any = { ...req.body, updatedAt: new Date() };

    if (updates.status === 'in_progress' && !updates.firstRespondedAt) {
      updates.firstRespondedAt = new Date();
    }

    if (updates.status === 'resolved' && !updates.resolvedAt) {
      updates.resolvedAt = new Date();
      updates.resolvedBy = req.user?.id;
    }

    if (updates.status === 'closed' && !updates.closedAt) {
      updates.closedAt = new Date();
      updates.closedBy = req.user?.id;
    }

    const [updatedTicket] = await db.update(supportTickets)
      .set(updates)
      .where(eq(supportTickets.id, ticketId))
      .returning();

    res.json(updatedTicket);
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ message: 'Failed to update ticket' });
  }
});

router.post('/tickets/:id/assign', async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id);
    const { assignedTo, reason } = req.body;

    const ticket = await db.select()
      .from(supportTickets)
      .where(eq(supportTickets.id, ticketId))
      .limit(1);

    if (ticket.length === 0) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const previousAssignee = ticket[0].assignedTo;

    await db.insert(ticketAssignments).values({
      ticketId,
      assignedFrom: previousAssignee,
      assignedTo,
      assignedBy: req.user?.id || 1,
      reason
    });

    const [updatedTicket] = await db.update(supportTickets)
      .set({
        assignedTo,
        assignedBy: req.user?.id || 1,
        assignedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(supportTickets.id, ticketId))
      .returning();

    res.json(updatedTicket);
  } catch (error) {
    console.error('Error assigning ticket:', error);
    res.status(500).json({ message: 'Failed to assign ticket' });
  }
});

router.post('/tickets/:id/messages', async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id);
    
    const validatedData = insertTicketMessageSchema.parse({
      ticketId,
      message: req.body.message,
      messageType: req.body.messageType || 'reply',
      authorId: req.user?.id || 1,
      authorName: req.user?.fullName || 'Customer Service',
      authorRole: req.user?.role || 'customer_service',
      isInternal: req.body.isInternal || false,
      templateUsed: req.body.templateUsed
    });

    const [newMessage] = await db.insert(ticketMessages)
      .values(validatedData)
      .returning();

    if (req.body.templateUsed) {
      await db.update(responseTemplates)
        .set({
          usageCount: sql`${responseTemplates.usageCount} + 1`,
          lastUsed: new Date()
        })
        .where(eq(responseTemplates.id, req.body.templateUsed));
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Error creating ticket message:', error);
    res.status(500).json({ message: 'Failed to create message' });
  }
});

router.get('/templates', async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    
    const conditions = [eq(responseTemplates.isActive, true)];
    if (category) {
      conditions.push(eq(responseTemplates.category, category as string));
    }

    const templates = await db.select()
      .from(responseTemplates)
      .where(and(...conditions))
      .orderBy(desc(responseTemplates.usageCount));

    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ message: 'Failed to fetch templates' });
  }
});

router.post('/templates', async (req: Request, res: Response) => {
  try {
    const validatedData = insertResponseTemplateSchema.parse({
      ...req.body,
      createdBy: req.user?.id || 1
    });

    const [newTemplate] = await db.insert(responseTemplates)
      .values(validatedData)
      .returning();

    res.status(201).json(newTemplate);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ message: 'Failed to create template' });
  }
});

router.patch('/templates/:id', async (req: Request, res: Response) => {
  try {
    const templateId = parseInt(req.params.id);
    const updates = { ...req.body, updatedAt: new Date() };

    const [updatedTemplate] = await db.update(responseTemplates)
      .set(updates)
      .where(eq(responseTemplates.id, templateId))
      .returning();

    res.json(updatedTemplate);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ message: 'Failed to update template' });
  }
});

router.post('/tickets/:id/satisfaction', async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id);
    const { rating, comment } = req.body;

    const [updatedTicket] = await db.update(supportTickets)
      .set({
        satisfactionRating: rating,
        satisfactionComment: comment,
        ratedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(supportTickets.id, ticketId))
      .returning();

    res.json(updatedTicket);
  } catch (error) {
    console.error('Error recording satisfaction rating:', error);
    res.status(500).json({ message: 'Failed to record rating' });
  }
});

router.get('/satisfaction-stats', async (req: Request, res: Response) => {
  try {
    const avgRating = await db.select({
      avg: sql<number>`AVG(${supportTickets.satisfactionRating})`
    })
    .from(supportTickets)
    .where(sql`${supportTickets.satisfactionRating} IS NOT NULL`);

    const totalRatings = await db.select({ count: count() })
      .from(supportTickets)
      .where(sql`${supportTickets.satisfactionRating} IS NOT NULL`);

    const ratingDistribution = await db.select({
      rating: supportTickets.satisfactionRating,
      count: count()
    })
    .from(supportTickets)
    .where(sql`${supportTickets.satisfactionRating} IS NOT NULL`)
    .groupBy(supportTickets.satisfactionRating);

    res.json({
      averageRating: parseFloat((avgRating[0]?.avg || 0).toFixed(1)),
      totalRatings: totalRatings[0]?.count || 0,
      distribution: ratingDistribution
    });
  } catch (error) {
    console.error('Error fetching satisfaction stats:', error);
    res.status(500).json({ message: 'Failed to fetch satisfaction stats' });
  }
});

router.get('/cs-team', async (req: Request, res: Response) => {
  try {
    const csTeam = await db.select({
      id: users.id,
      fullName: users.fullName,
      username: users.username,
      email: users.email
    })
    .from(users)
    .where(eq(users.role, 'customer_service'));

    res.json(csTeam);
  } catch (error) {
    console.error('Error fetching CS team:', error);
    res.status(500).json({ message: 'Failed to fetch CS team' });
  }
});

export default router;
