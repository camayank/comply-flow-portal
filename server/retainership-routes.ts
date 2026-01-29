import { Router, Request, Response } from 'express';
import { db } from './db';
import { businessEntities, services, serviceRequests, payments } from '@shared/schema';
import { eq, and, gte, lte, sql, count, sum, desc } from 'drizzle-orm';

const router = Router();

// In-memory retainership data (would be database table in production)
let retainershipPlans = [
  {
    id: 1,
    name: 'Starter',
    description: 'Essential compliance for new businesses',
    monthlyPrice: 4999,
    annualPrice: 49990,
    features: [
      'GST Returns (Monthly)',
      'Basic Compliance Tracking',
      'Document Storage (5GB)',
      'Email Support',
      'Compliance Calendar'
    ],
    limits: {
      services: 5,
      storage: 5,
      users: 1
    },
    recommended: false,
    popular: false
  },
  {
    id: 2,
    name: 'Growth',
    description: 'Complete compliance for growing businesses',
    monthlyPrice: 9999,
    annualPrice: 99990,
    features: [
      'All Starter Features',
      'TDS Returns',
      'ROC Annual Filing',
      'Priority Support',
      'Document Storage (25GB)',
      'Compliance Reminders',
      'Dedicated Account Manager'
    ],
    limits: {
      services: 15,
      storage: 25,
      users: 3
    },
    recommended: true,
    popular: true
  },
  {
    id: 3,
    name: 'Enterprise',
    description: 'Full-service compliance for established businesses',
    monthlyPrice: 24999,
    annualPrice: 249990,
    features: [
      'All Growth Features',
      'Income Tax Filing',
      'Secretarial Services',
      'Audit Support',
      'Unlimited Storage',
      '24/7 Priority Support',
      'Custom Integrations',
      'Multi-entity Support',
      'API Access'
    ],
    limits: {
      services: -1, // unlimited
      storage: -1,
      users: 10
    },
    recommended: false,
    popular: false
  }
];

let subscriptions: any[] = [
  {
    id: 1,
    entityId: 1,
    entityName: 'Acme Corporation',
    planId: 2,
    planName: 'Growth',
    billingCycle: 'annual',
    status: 'active',
    startDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    currentPeriodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    currentPeriodEnd: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000).toISOString(),
    nextBillingDate: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000).toISOString(),
    amount: 99990,
    autoRenew: true,
    usedServices: 8,
    usedStorage: 12.5,
    paymentMethod: 'card_ending_4242',
    createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()
  }
];

let invoices: any[] = [
  {
    id: 1,
    subscriptionId: 1,
    invoiceNumber: 'INV-2026-0001',
    amount: 99990,
    status: 'paid',
    dueDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    paidAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    items: [
      { description: 'Growth Plan - Annual Subscription', amount: 99990, quantity: 1 }
    ]
  }
];

let nextSubscriptionId = 2;
let nextInvoiceId = 2;

// ============================================================================
// RETAINERSHIP PLANS ROUTES
// ============================================================================

// Get all available plans
router.get('/plans', async (req: Request, res: Response) => {
  try {
    res.json({
      plans: retainershipPlans,
      currency: 'INR',
      savingsOnAnnual: '17%'
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get plan details
router.get('/plans/:id', async (req: Request, res: Response) => {
  try {
    const plan = retainershipPlans.find(p => p.id === Number(req.params.id));
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Get included services details
    const includedServices = await db.select()
      .from(services)
      .where(eq(services.isActive, true))
      .limit(plan.limits.services > 0 ? plan.limits.services : 50);

    res.json({
      plan,
      includedServices,
      comparison: getComparisonWithOtherPlans(plan.id)
    });
  } catch (error) {
    console.error('Error fetching plan details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Compare plans
router.get('/plans/compare', async (req: Request, res: Response) => {
  try {
    const featureMatrix = buildFeatureMatrix();

    res.json({
      plans: retainershipPlans.map(p => ({
        id: p.id,
        name: p.name,
        monthlyPrice: p.monthlyPrice,
        annualPrice: p.annualPrice
      })),
      featureMatrix
    });
  } catch (error) {
    console.error('Error comparing plans:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// SUBSCRIPTION MANAGEMENT ROUTES
// ============================================================================

// Get subscription for entity
router.get('/subscription/:entityId', async (req: Request, res: Response) => {
  try {
    const subscription = subscriptions.find(s => s.entityId === Number(req.params.entityId));

    if (!subscription) {
      return res.json({ hasSubscription: false, availablePlans: retainershipPlans });
    }

    const plan = retainershipPlans.find(p => p.id === subscription.planId);

    res.json({
      hasSubscription: true,
      subscription,
      plan,
      usage: {
        services: {
          used: subscription.usedServices,
          limit: plan?.limits.services || 0,
          percentage: plan?.limits.services && plan.limits.services > 0
            ? Math.round((subscription.usedServices / plan.limits.services) * 100)
            : 0
        },
        storage: {
          used: subscription.usedStorage,
          limit: plan?.limits.storage || 0,
          percentage: plan?.limits.storage && plan.limits.storage > 0
            ? Math.round((subscription.usedStorage / plan.limits.storage) * 100)
            : 0
        }
      },
      daysRemaining: calculateDaysRemaining(subscription.currentPeriodEnd)
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new subscription
router.post('/subscription', async (req: Request, res: Response) => {
  try {
    const { entityId, entityName, planId, billingCycle, paymentMethod } = req.body;

    const plan = retainershipPlans.find(p => p.id === planId);
    if (!plan) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const existingSubscription = subscriptions.find(s => s.entityId === entityId && s.status === 'active');
    if (existingSubscription) {
      return res.status(400).json({ error: 'Active subscription already exists' });
    }

    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === 'annual') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const newSubscription = {
      id: nextSubscriptionId++,
      entityId,
      entityName,
      planId,
      planName: plan.name,
      billingCycle,
      status: 'active',
      startDate: now.toISOString(),
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      nextBillingDate: periodEnd.toISOString(),
      amount: billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice,
      autoRenew: true,
      usedServices: 0,
      usedStorage: 0,
      paymentMethod,
      createdAt: now.toISOString()
    };

    subscriptions.push(newSubscription);

    // Create invoice
    const invoice = {
      id: nextInvoiceId++,
      subscriptionId: newSubscription.id,
      invoiceNumber: `INV-${new Date().getFullYear()}-${String(nextInvoiceId - 1).padStart(4, '0')}`,
      amount: newSubscription.amount,
      status: 'pending',
      dueDate: now.toISOString(),
      items: [
        {
          description: `${plan.name} Plan - ${billingCycle === 'annual' ? 'Annual' : 'Monthly'} Subscription`,
          amount: newSubscription.amount,
          quantity: 1
        }
      ]
    };
    invoices.push(invoice);

    res.status(201).json({
      subscription: newSubscription,
      invoice
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update subscription (upgrade/downgrade)
router.patch('/subscription/:id', async (req: Request, res: Response) => {
  try {
    const subscriptionIndex = subscriptions.findIndex(s => s.id === Number(req.params.id));
    if (subscriptionIndex === -1) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const { planId, billingCycle, autoRenew } = req.body;

    if (planId !== undefined) {
      const newPlan = retainershipPlans.find(p => p.id === planId);
      if (!newPlan) {
        return res.status(400).json({ error: 'Invalid plan' });
      }
      subscriptions[subscriptionIndex].planId = planId;
      subscriptions[subscriptionIndex].planName = newPlan.name;
      subscriptions[subscriptionIndex].amount = billingCycle === 'annual' || subscriptions[subscriptionIndex].billingCycle === 'annual'
        ? newPlan.annualPrice
        : newPlan.monthlyPrice;
    }

    if (billingCycle !== undefined) {
      subscriptions[subscriptionIndex].billingCycle = billingCycle;
      const plan = retainershipPlans.find(p => p.id === subscriptions[subscriptionIndex].planId);
      if (plan) {
        subscriptions[subscriptionIndex].amount = billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice;
      }
    }

    if (autoRenew !== undefined) {
      subscriptions[subscriptionIndex].autoRenew = autoRenew;
    }

    res.json(subscriptions[subscriptionIndex]);
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel subscription
router.post('/subscription/:id/cancel', async (req: Request, res: Response) => {
  try {
    const subscriptionIndex = subscriptions.findIndex(s => s.id === Number(req.params.id));
    if (subscriptionIndex === -1) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const { reason, immediate } = req.body;

    if (immediate) {
      subscriptions[subscriptionIndex].status = 'cancelled';
      subscriptions[subscriptionIndex].cancelledAt = new Date().toISOString();
    } else {
      subscriptions[subscriptionIndex].status = 'pending_cancellation';
      subscriptions[subscriptionIndex].autoRenew = false;
    }

    subscriptions[subscriptionIndex].cancellationReason = reason;

    res.json({
      message: immediate ? 'Subscription cancelled immediately' : 'Subscription will be cancelled at end of billing period',
      subscription: subscriptions[subscriptionIndex]
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// INVOICE ROUTES
// ============================================================================

// Get invoices for entity
router.get('/invoices/:entityId', async (req: Request, res: Response) => {
  try {
    const subscription = subscriptions.find(s => s.entityId === Number(req.params.entityId));
    if (!subscription) {
      return res.json({ invoices: [] });
    }

    const entityInvoices = invoices.filter(i => i.subscriptionId === subscription.id);

    res.json({
      invoices: entityInvoices,
      totalPaid: entityInvoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0),
      totalPending: entityInvoices.filter(i => i.status === 'pending').reduce((sum, i) => sum + i.amount, 0)
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single invoice
router.get('/invoice/:id', async (req: Request, res: Response) => {
  try {
    const invoice = invoices.find(i => i.id === Number(req.params.id));
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Pay invoice
router.post('/invoice/:id/pay', async (req: Request, res: Response) => {
  try {
    const invoiceIndex = invoices.findIndex(i => i.id === Number(req.params.id));
    if (invoiceIndex === -1) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    invoices[invoiceIndex].status = 'paid';
    invoices[invoiceIndex].paidAt = new Date().toISOString();

    res.json({
      message: 'Payment successful',
      invoice: invoices[invoiceIndex]
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// USAGE TRACKING ROUTES
// ============================================================================

// Get usage details
router.get('/usage/:entityId', async (req: Request, res: Response) => {
  try {
    const subscription = subscriptions.find(s => s.entityId === Number(req.params.entityId));
    if (!subscription) {
      return res.status(404).json({ error: 'No active subscription' });
    }

    const plan = retainershipPlans.find(p => p.id === subscription.planId);

    // Get actual service usage from database
    const serviceCount = await db.select({ count: count() })
      .from(serviceRequests)
      .where(
        and(
          eq(serviceRequests.businessEntityId, Number(req.params.entityId)),
          gte(serviceRequests.createdAt, new Date(subscription.currentPeriodStart))
        )
      );

    res.json({
      subscription: {
        id: subscription.id,
        plan: plan?.name,
        billingCycle: subscription.billingCycle,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd
      },
      usage: {
        services: {
          used: serviceCount[0]?.count || 0,
          limit: plan?.limits.services || 0,
          remaining: plan?.limits.services && plan.limits.services > 0
            ? Math.max(0, plan.limits.services - (serviceCount[0]?.count || 0))
            : -1
        },
        storage: {
          used: subscription.usedStorage,
          limit: plan?.limits.storage || 0,
          remaining: plan?.limits.storage && plan.limits.storage > 0
            ? Math.max(0, plan.limits.storage - subscription.usedStorage)
            : -1
        },
        users: {
          used: 1, // Would count from actual user table
          limit: plan?.limits.users || 0
        }
      },
      overages: {
        hasOverage: false,
        chargesThisPeriod: 0
      }
    });
  } catch (error) {
    console.error('Error fetching usage:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Dashboard stats for retainership
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
    const totalMRR = activeSubscriptions.reduce((sum, s) => {
      return sum + (s.billingCycle === 'annual' ? s.amount / 12 : s.amount);
    }, 0);

    res.json({
      totalSubscriptions: subscriptions.length,
      activeSubscriptions: activeSubscriptions.length,
      monthlyRecurringRevenue: Math.round(totalMRR),
      annualRecurringRevenue: Math.round(totalMRR * 12),
      byPlan: {
        starter: activeSubscriptions.filter(s => s.planId === 1).length,
        growth: activeSubscriptions.filter(s => s.planId === 2).length,
        enterprise: activeSubscriptions.filter(s => s.planId === 3).length
      },
      churnRate: '2.5%',
      avgRevenuePerUser: Math.round(totalMRR / (activeSubscriptions.length || 1))
    });
  } catch (error) {
    console.error('Error fetching retainership stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper functions
function calculateDaysRemaining(periodEnd: string): number {
  const end = new Date(periodEnd);
  const now = new Date();
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

function getComparisonWithOtherPlans(currentPlanId: number) {
  return retainershipPlans
    .filter(p => p.id !== currentPlanId)
    .map(p => ({
      id: p.id,
      name: p.name,
      priceDifference: retainershipPlans.find(cp => cp.id === currentPlanId)
        ? p.monthlyPrice - (retainershipPlans.find(cp => cp.id === currentPlanId)?.monthlyPrice || 0)
        : 0,
      additionalFeatures: p.features.filter(f =>
        !retainershipPlans.find(cp => cp.id === currentPlanId)?.features.includes(f)
      )
    }));
}

function buildFeatureMatrix() {
  const allFeatures = new Set<string>();
  retainershipPlans.forEach(p => p.features.forEach(f => allFeatures.add(f)));

  return Array.from(allFeatures).map(feature => ({
    feature,
    starter: retainershipPlans[0].features.includes(feature),
    growth: retainershipPlans[1].features.includes(feature),
    enterprise: retainershipPlans[2].features.includes(feature)
  }));
}

export default router;
