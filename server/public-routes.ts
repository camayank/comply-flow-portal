import { Router, Request, Response } from 'express';
import { db } from './db';
import {
  services,
  servicesCatalog,
  businessEntities,
  users
} from '@shared/schema';
import { eq, count, sql, desc } from 'drizzle-orm';

const router = Router();

// ============================================================================
// PUBLIC ROUTES (No Authentication Required)
// Landing pages, service catalog, and public statistics
// ============================================================================

// ============================================================================
// LANDING PAGE DATA
// ============================================================================

// Get landing page statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [clientsCount] = await db.select({ count: count() }).from(businessEntities);
    const [servicesCount] = await db.select({ count: count() }).from(servicesCatalog);

    const stats = {
      clientsServed: (clientsCount?.count || 0) + 500, // Add baseline
      servicesOffered: servicesCount?.count || 96,
      compliancesManaged: ((clientsCount?.count || 0) + 500) * 12,
      yearsExperience: 8,
      satisfaction: 98,
      teamSize: 50
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching landing stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get testimonials
router.get('/testimonials', async (req: Request, res: Response) => {
  try {
    const testimonials = [
      {
        id: 1,
        name: 'Rajesh Kumar',
        company: 'TechVentures Pvt Ltd',
        role: 'Founder & CEO',
        content: 'DigiComply has transformed how we manage compliance. Their proactive alerts and seamless document management have saved us countless hours.',
        rating: 5,
        image: null
      },
      {
        id: 2,
        name: 'Priya Sharma',
        company: 'GreenLeaf Organics LLP',
        role: 'Director',
        content: 'As a growing business, compliance was always a headache. DigiComply made it simple. The 10K scorecard helped us become investor-ready.',
        rating: 5,
        image: null
      },
      {
        id: 3,
        name: 'Amit Patel',
        company: 'BuildRight Construction',
        role: 'Managing Partner',
        content: 'The team at DigiComply is highly professional. Their tax management and GST filing services are top-notch.',
        rating: 5,
        image: null
      }
    ];

    res.json({ testimonials });
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get featured services for landing page
router.get('/featured-services', async (req: Request, res: Response) => {
  try {
    const featuredServices = [
      {
        id: 'company-incorporation',
        name: 'Company Incorporation',
        description: 'Register your Private Limited, LLP, or OPC with complete documentation',
        price: 'Starting ₹7,999',
        popular: true,
        category: 'formation'
      },
      {
        id: 'gst-registration',
        name: 'GST Registration',
        description: 'Get your GSTIN within 7 working days with full compliance support',
        price: 'Starting ₹1,999',
        popular: true,
        category: 'tax'
      },
      {
        id: 'annual-compliance',
        name: 'Annual Compliance Package',
        description: 'Complete ROC filings, annual returns, and statutory compliance',
        price: 'Starting ₹14,999/year',
        popular: true,
        category: 'compliance'
      },
      {
        id: 'trademark-registration',
        name: 'Trademark Registration',
        description: 'Protect your brand with trademark registration across all classes',
        price: 'Starting ₹5,999',
        popular: false,
        category: 'ip'
      },
      {
        id: 'accounting-bookkeeping',
        name: 'Accounting & Bookkeeping',
        description: 'Professional accounting services with monthly MIS reports',
        price: 'Starting ₹4,999/month',
        popular: false,
        category: 'finance'
      },
      {
        id: 'funding-readiness',
        name: 'Funding Readiness',
        description: 'Get investor-ready with our comprehensive due diligence package',
        price: 'Starting ₹29,999',
        popular: false,
        category: 'funding'
      }
    ];

    res.json({ services: featuredServices });
  } catch (error) {
    console.error('Error fetching featured services:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// SERVICE CATALOG (Public)
// ============================================================================

// Get full service catalog
router.get('/services', async (req: Request, res: Response) => {
  try {
    const { category, search, page = 1, limit = 20 } = req.query;

    // Try to get from servicesCatalog table first
    let catalogServices = await db.select()
      .from(servicesCatalog)
      .where(eq(servicesCatalog.isActive, true))
      .limit(100);

    // If no services in catalog, provide default service list
    if (catalogServices.length === 0) {
      catalogServices = getDefaultServiceCatalog();
    }

    // Filter by category if provided
    let filteredServices = catalogServices;
    if (category) {
      filteredServices = catalogServices.filter((s: any) =>
        s.category?.toLowerCase() === (category as string).toLowerCase()
      );
    }

    // Search filter
    if (search) {
      const searchLower = (search as string).toLowerCase();
      filteredServices = filteredServices.filter((s: any) =>
        s.name?.toLowerCase().includes(searchLower) ||
        s.description?.toLowerCase().includes(searchLower)
      );
    }

    // Pagination
    const total = filteredServices.length;
    const startIndex = (Number(page) - 1) * Number(limit);
    const paginatedServices = filteredServices.slice(startIndex, startIndex + Number(limit));

    res.json({
      services: paginatedServices,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      categories: getServiceCategories()
    });
  } catch (error) {
    console.error('Error fetching service catalog:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single service details
router.get('/services/:serviceId', async (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params;

    // Try database first
    const [service] = await db.select()
      .from(servicesCatalog)
      .where(eq(servicesCatalog.serviceKey, serviceId))
      .limit(1);

    if (service) {
      return res.json({
        ...service,
        faqs: getServiceFAQs(serviceId),
        relatedServices: getRelatedServices(serviceId),
        documents: getRequiredDocuments(serviceId)
      });
    }

    // Fallback to default catalog
    const defaultServices = getDefaultServiceCatalog();
    const defaultService = defaultServices.find((s: any) => s.serviceKey === serviceId);

    if (defaultService) {
      return res.json({
        ...defaultService,
        faqs: getServiceFAQs(serviceId),
        relatedServices: getRelatedServices(serviceId),
        documents: getRequiredDocuments(serviceId)
      });
    }

    res.status(404).json({ error: 'Service not found' });
  } catch (error) {
    console.error('Error fetching service details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get service categories
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const categories = getServiceCategories();
    res.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// PRICING PLANS
// ============================================================================

router.get('/pricing', async (req: Request, res: Response) => {
  try {
    const plans = [
      {
        id: 'starter',
        name: 'Starter',
        description: 'For new businesses getting started',
        monthlyPrice: 4999,
        annualPrice: 49990,
        features: [
          'GST Returns (Monthly)',
          'Basic Compliance Tracking',
          '5GB Document Storage',
          'Email Support',
          'Compliance Calendar'
        ],
        recommended: false
      },
      {
        id: 'growth',
        name: 'Growth',
        description: 'For growing businesses',
        monthlyPrice: 9999,
        annualPrice: 99990,
        features: [
          'Everything in Starter',
          'TDS Returns',
          'ROC Annual Filing',
          '25GB Document Storage',
          'Priority Support',
          'Dedicated Account Manager'
        ],
        recommended: true
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        description: 'For established businesses',
        monthlyPrice: 24999,
        annualPrice: 249990,
        features: [
          'Everything in Growth',
          'Income Tax Filing',
          'Secretarial Services',
          'Unlimited Storage',
          '24/7 Support',
          'Custom Integrations',
          'Multi-entity Support'
        ],
        recommended: false
      }
    ];

    res.json({ plans });
  } catch (error) {
    console.error('Error fetching pricing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// CONTACT & SUPPORT
// ============================================================================

// Submit contact form
router.post('/contact', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, company, message, type = 'inquiry' } = req.body;

    // In production, this would save to database and send notification
    const inquiry = {
      id: Date.now(),
      name,
      email,
      phone,
      company,
      message,
      type,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    // Would trigger notification to sales team
    console.log('New contact inquiry:', inquiry);

    res.status(201).json({
      success: true,
      message: 'Thank you for your inquiry. Our team will contact you within 24 hours.',
      referenceId: inquiry.id
    });
  } catch (error) {
    console.error('Error submitting contact form:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get service quote
router.post('/quote', async (req: Request, res: Response) => {
  try {
    const { services, entityType, urgency, additionalInfo } = req.body;

    // Calculate estimated quote
    let basePrice = 0;
    const selectedServices = services || [];

    selectedServices.forEach((serviceId: string) => {
      const service = getDefaultServiceCatalog().find((s: any) => s.serviceKey === serviceId);
      if (service) {
        basePrice += service.basePrice || 0;
      }
    });

    // Apply urgency multiplier
    const urgencyMultiplier = urgency === 'express' ? 1.5 : urgency === 'standard' ? 1.0 : 0.9;
    const estimatedPrice = Math.round(basePrice * urgencyMultiplier);

    const quote = {
      quoteId: `QT-${Date.now()}`,
      services: selectedServices,
      entityType,
      urgency,
      estimatedPrice,
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      generatedAt: new Date().toISOString()
    };

    res.json(quote);
  } catch (error) {
    console.error('Error generating quote:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getServiceCategories() {
  return [
    { id: 'formation', name: 'Business Formation', count: 12, icon: 'building' },
    { id: 'compliance', name: 'Statutory Compliance', count: 18, icon: 'shield' },
    { id: 'tax', name: 'Tax & GST', count: 15, icon: 'calculator' },
    { id: 'accounting', name: 'Accounting', count: 10, icon: 'file-text' },
    { id: 'ip', name: 'Intellectual Property', count: 8, icon: 'award' },
    { id: 'legal', name: 'Legal Services', count: 12, icon: 'scale' },
    { id: 'funding', name: 'Funding & Investment', count: 6, icon: 'trending-up' },
    { id: 'hr', name: 'HR & Payroll', count: 8, icon: 'users' },
    { id: 'licensing', name: 'Licenses & Permits', count: 7, icon: 'file-check' }
  ];
}

function getDefaultServiceCatalog(): any[] {
  return [
    { id: 1, serviceKey: 'pvt-ltd-incorporation', name: 'Private Limited Incorporation', category: 'formation', basePrice: 9999, periodicity: 'ONE_TIME', description: 'Complete Pvt Ltd registration with MOA, AOA, PAN, TAN' },
    { id: 2, serviceKey: 'llp-incorporation', name: 'LLP Incorporation', category: 'formation', basePrice: 7999, periodicity: 'ONE_TIME', description: 'Limited Liability Partnership registration' },
    { id: 3, serviceKey: 'opc-incorporation', name: 'OPC Incorporation', category: 'formation', basePrice: 8999, periodicity: 'ONE_TIME', description: 'One Person Company registration' },
    { id: 4, serviceKey: 'gst-registration', name: 'GST Registration', category: 'tax', basePrice: 1999, periodicity: 'ONE_TIME', description: 'GSTIN registration within 7 days' },
    { id: 5, serviceKey: 'gst-return-monthly', name: 'GST Return (Monthly)', category: 'tax', basePrice: 999, periodicity: 'MONTHLY', description: 'GSTR-1, GSTR-3B filing' },
    { id: 6, serviceKey: 'gst-annual-return', name: 'GST Annual Return', category: 'tax', basePrice: 4999, periodicity: 'ANNUAL', description: 'GSTR-9 annual return filing' },
    { id: 7, serviceKey: 'tds-return-quarterly', name: 'TDS Return (Quarterly)', category: 'tax', basePrice: 1999, periodicity: 'QUARTERLY', description: 'Form 24Q, 26Q filing' },
    { id: 8, serviceKey: 'income-tax-return', name: 'Income Tax Return', category: 'tax', basePrice: 2999, periodicity: 'ANNUAL', description: 'ITR filing for companies' },
    { id: 9, serviceKey: 'annual-compliance-pvt', name: 'Annual Compliance (Pvt Ltd)', category: 'compliance', basePrice: 14999, periodicity: 'ANNUAL', description: 'AOC-4, MGT-7, ADT-1' },
    { id: 10, serviceKey: 'annual-compliance-llp', name: 'Annual Compliance (LLP)', category: 'compliance', basePrice: 9999, periodicity: 'ANNUAL', description: 'Form 8, Form 11' },
    { id: 11, serviceKey: 'director-kyc', name: 'Director KYC', category: 'compliance', basePrice: 999, periodicity: 'ANNUAL', description: 'DIR-3 KYC filing' },
    { id: 12, serviceKey: 'trademark-registration', name: 'Trademark Registration', category: 'ip', basePrice: 5999, periodicity: 'ONE_TIME', description: 'TM registration in one class' },
    { id: 13, serviceKey: 'accounting-monthly', name: 'Monthly Accounting', category: 'accounting', basePrice: 4999, periodicity: 'MONTHLY', description: 'Bookkeeping with MIS reports' },
    { id: 14, serviceKey: 'payroll-monthly', name: 'Payroll Processing', category: 'hr', basePrice: 2999, periodicity: 'MONTHLY', description: 'Salary processing & compliance' },
    { id: 15, serviceKey: 'fssai-license', name: 'FSSAI License', category: 'licensing', basePrice: 3999, periodicity: 'ONE_TIME', description: 'Food license registration' }
  ];
}

function getServiceFAQs(serviceId: string) {
  return [
    { question: 'How long does this service take?', answer: 'Typically 7-15 working days depending on government processing times.' },
    { question: 'What documents are required?', answer: 'We will provide a complete checklist after you initiate the service.' },
    { question: 'Is there any government fee included?', answer: 'Government fees are included in the price unless specified otherwise.' }
  ];
}

function getRelatedServices(serviceId: string) {
  return ['gst-registration', 'annual-compliance-pvt', 'accounting-monthly'].filter(s => s !== serviceId);
}

function getRequiredDocuments(serviceId: string) {
  return [
    { name: 'PAN Card', mandatory: true },
    { name: 'Aadhaar Card', mandatory: true },
    { name: 'Address Proof', mandatory: true },
    { name: 'Bank Statement', mandatory: false }
  ];
}

export default router;
