# DigiComply Platform - Feature Completion Implementation Plan

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SHARED INFRASTRUCTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Email     │  │    SMS      │  │  WhatsApp   │  │   Push (FCM)        │ │
│  │  Service    │  │   Service   │  │   Service   │  │    Service          │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
│         └────────────────┴────────────────┴────────────────────┘            │
│                                    │                                         │
│                         ┌──────────▼──────────┐                             │
│                         │  Notification Queue  │                             │
│                         │   (Bull + Redis)     │                             │
│                         └──────────┬──────────┘                             │
│                                    │                                         │
│  ┌─────────────┐  ┌───────────────┴───────────────┐  ┌─────────────────┐   │
│  │   Cloud     │  │      Database Layer            │  │   OCR/AI        │   │
│  │  Storage    │  │  (PostgreSQL + Drizzle ORM)   │  │   Services      │   │
│  │   (GCS)     │  └───────────────────────────────┘  └─────────────────┘   │
│  └─────────────┘                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
              ┌─────▼─────┐    ┌──────▼──────┐   ┌─────▼─────┐
              │  Feature   │    │  Feature    │   │  Feature  │
              │  Module 1  │    │  Module 2   │   │  Module N │
              └───────────┘    └─────────────┘   └───────────┘
```

---

## Phase 1: Core Infrastructure (Foundation)

### 1.1 Notification Service Hub

**Why First:** 12 of 25 features depend on notifications (email, SMS, push).

```
server/services/notifications/
├── index.ts                    # Service hub - routes to appropriate channel
├── channels/
│   ├── email.service.ts        # SMTP/SendGrid/SES integration
│   ├── sms.service.ts          # Twilio/MSG91 integration
│   ├── whatsapp.service.ts     # WhatsApp Business API
│   └── push.service.ts         # Firebase FCM
├── templates/
│   ├── email/
│   │   ├── otp.html
│   │   ├── welcome.html
│   │   ├── proposal.html
│   │   ├── service-update.html
│   │   └── compliance-reminder.html
│   └── sms/
│       ├── otp.txt
│       └── status-update.txt
├── processors/
│   ├── notification.processor.ts
│   ├── escalation.processor.ts
│   └── report.processor.ts
└── types.ts
```

**Implementation:**

```typescript
// server/services/notifications/index.ts
export class NotificationHub {
  private emailService: EmailService;
  private smsService: SMSService;
  private whatsappService: WhatsAppService;
  private pushService: PushService;

  async send(notification: NotificationPayload): Promise<NotificationResult> {
    const results: NotificationResult[] = [];

    // Get user preferences
    const prefs = await this.getUserPreferences(notification.userId);

    // Route to appropriate channels based on priority and preferences
    if (notification.channels.includes('email') && prefs.email) {
      results.push(await this.emailService.send(notification));
    }
    if (notification.channels.includes('sms') && prefs.sms) {
      results.push(await this.smsService.send(notification));
    }
    // ... etc

    // Log to notifications table
    await this.logNotification(notification, results);

    return this.aggregateResults(results);
  }
}
```

**Database Schema Addition:**

```typescript
// server/db/schema/notifications.ts
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  type: varchar('type', { length: 50 }), // otp, welcome, status_update, reminder
  channel: varchar('channel', { length: 20 }), // email, sms, whatsapp, push
  status: varchar('status', { length: 20 }), // pending, sent, delivered, failed
  payload: jsonb('payload'),
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
  failureReason: text('failure_reason'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const notificationPreferences = pgTable('notification_preferences', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).unique(),
  emailEnabled: boolean('email_enabled').default(true),
  smsEnabled: boolean('sms_enabled').default(true),
  pushEnabled: boolean('push_enabled').default(false),
  whatsappEnabled: boolean('whatsapp_enabled').default(false),
  quietHoursStart: time('quiet_hours_start'),
  quietHoursEnd: time('quiet_hours_end'),
  categories: jsonb('categories'), // {compliance: true, marketing: false, ...}
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

**Modules Affected:**
- Client Portal: OTP verification, service updates, compliance reminders
- Agent Portal: Lead notifications, commission alerts
- Operations: Escalation alerts, SLA warnings
- Admin: System alerts, audit notifications

---

### 1.2 Cloud Storage Service

**Why Second:** Document management is core to compliance platform.

```
server/services/storage/
├── index.ts                    # Storage service hub
├── providers/
│   ├── gcs.provider.ts         # Google Cloud Storage
│   ├── s3.provider.ts          # AWS S3 (alternative)
│   └── local.provider.ts       # Local filesystem (dev only)
├── document-manager.ts         # High-level document operations
└── types.ts
```

**Implementation:**

```typescript
// server/services/storage/index.ts
export class StorageService {
  private provider: IStorageProvider;

  constructor() {
    this.provider = this.initializeProvider();
  }

  private initializeProvider(): IStorageProvider {
    const providerType = process.env.STORAGE_PROVIDER || 'local';

    switch (providerType) {
      case 'gcs':
        return new GCSProvider({
          bucketId: process.env.GCS_BUCKET_ID!,
          credentials: JSON.parse(process.env.GCS_CREDENTIALS || '{}'),
        });
      case 's3':
        return new S3Provider({
          bucket: process.env.AWS_S3_BUCKET!,
          region: process.env.AWS_REGION!,
        });
      default:
        return new LocalProvider({
          basePath: process.env.LOCAL_STORAGE_PATH || './uploads',
        });
    }
  }

  async upload(file: UploadedFile, options: UploadOptions): Promise<StoredFile> {
    // Validate file type and size
    this.validateFile(file, options);

    // Generate secure path
    const path = this.generatePath(options.category, file.originalName);

    // Upload to provider
    const result = await this.provider.upload(file.buffer, path, {
      contentType: file.mimetype,
      metadata: options.metadata,
    });

    // Create database record
    const document = await db.insert(documents).values({
      fileName: file.originalName,
      storagePath: result.path,
      storageProvider: this.provider.name,
      fileSize: file.size,
      mimeType: file.mimetype,
      uploadedBy: options.userId,
      category: options.category,
      entityType: options.entityType,
      entityId: options.entityId,
    }).returning();

    return document[0];
  }

  async getSignedUrl(documentId: number, expiresInMinutes = 60): Promise<string> {
    const doc = await db.query.documents.findFirst({
      where: eq(documents.id, documentId),
    });

    if (!doc) throw new NotFoundError('Document not found');

    return this.provider.getSignedUrl(doc.storagePath, expiresInMinutes);
  }
}
```

**Database Schema Addition:**

```typescript
// server/db/schema/documents.ts
export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  fileName: varchar('file_name', { length: 255 }),
  storagePath: varchar('storage_path', { length: 500 }),
  storageProvider: varchar('storage_provider', { length: 20 }),
  fileSize: integer('file_size'),
  mimeType: varchar('mime_type', { length: 100 }),
  checksum: varchar('checksum', { length: 64 }), // SHA256
  uploadedBy: integer('uploaded_by').references(() => users.id),
  category: varchar('category', { length: 50 }), // kyc, service_doc, deliverable
  entityType: varchar('entity_type', { length: 50 }), // service_request, agent, client
  entityId: integer('entity_id'),
  isDeleted: boolean('is_deleted').default(false),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

**Modules Affected:**
- Client Portal: Document upload, document vault
- Agent Portal: KYC documents, client documents
- Operations: Service request documents, deliverables
- QC: Document review, verification

---

### 1.3 OTP Service

**Critical for:** Client registration, login, sensitive operations.

```
server/services/auth/
├── otp.service.ts              # OTP generation, validation, rate limiting
├── otp.types.ts
└── otp.templates.ts
```

**Implementation:**

```typescript
// server/services/auth/otp.service.ts
export class OTPService {
  private readonly OTP_LENGTH = 6;
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly MAX_ATTEMPTS = 3;
  private readonly COOLDOWN_MINUTES = 15;

  async generateAndSend(
    identifier: string, // email or phone
    purpose: 'registration' | 'login' | 'password_reset' | 'verification'
  ): Promise<{ success: boolean; expiresAt: Date }> {
    // Check rate limiting
    const recentAttempts = await this.getRecentAttempts(identifier, purpose);
    if (recentAttempts >= this.MAX_ATTEMPTS) {
      throw new RateLimitError(`Too many OTP requests. Try again in ${this.COOLDOWN_MINUTES} minutes.`);
    }

    // Generate secure OTP
    const otp = this.generateSecureOTP();
    const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

    // Store OTP (hashed)
    await db.insert(otpCodes).values({
      identifier,
      purpose,
      codeHash: await bcrypt.hash(otp, 10),
      expiresAt,
      attempts: 0,
    });

    // Send via appropriate channel
    const isEmail = identifier.includes('@');
    if (isEmail) {
      await notificationHub.send({
        type: 'otp',
        channels: ['email'],
        to: identifier,
        data: { otp, purpose, expiresInMinutes: this.OTP_EXPIRY_MINUTES },
      });
    } else {
      await notificationHub.send({
        type: 'otp',
        channels: ['sms'],
        to: identifier,
        data: { otp, purpose },
      });
    }

    return { success: true, expiresAt };
  }

  async verify(
    identifier: string,
    purpose: string,
    code: string
  ): Promise<{ valid: boolean; reason?: string }> {
    const otpRecord = await db.query.otpCodes.findFirst({
      where: and(
        eq(otpCodes.identifier, identifier),
        eq(otpCodes.purpose, purpose),
        eq(otpCodes.isUsed, false),
        gt(otpCodes.expiresAt, new Date())
      ),
      orderBy: desc(otpCodes.createdAt),
    });

    if (!otpRecord) {
      return { valid: false, reason: 'OTP expired or not found' };
    }

    if (otpRecord.attempts >= this.MAX_ATTEMPTS) {
      return { valid: false, reason: 'Maximum attempts exceeded' };
    }

    const isValid = await bcrypt.compare(code, otpRecord.codeHash);

    if (!isValid) {
      // Increment attempts
      await db.update(otpCodes)
        .set({ attempts: otpRecord.attempts + 1 })
        .where(eq(otpCodes.id, otpRecord.id));

      return { valid: false, reason: 'Invalid OTP' };
    }

    // Mark as used
    await db.update(otpCodes)
      .set({ isUsed: true, usedAt: new Date() })
      .where(eq(otpCodes.id, otpRecord.id));

    return { valid: true };
  }

  private generateSecureOTP(): string {
    return crypto.randomInt(100000, 999999).toString();
  }
}
```

**Database Schema Addition:**

```typescript
// server/db/schema/otp.ts
export const otpCodes = pgTable('otp_codes', {
  id: serial('id').primaryKey(),
  identifier: varchar('identifier', { length: 255 }), // email or phone
  purpose: varchar('purpose', { length: 50 }),
  codeHash: varchar('code_hash', { length: 255 }),
  attempts: integer('attempts').default(0),
  isUsed: boolean('is_used').default(false),
  usedAt: timestamp('used_at'),
  expiresAt: timestamp('expires_at'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

**Modules Affected:**
- Client Portal: Registration, login, password reset
- Agent Portal: Registration, sensitive operations
- All Portals: Two-factor authentication

---

## Phase 2: User Module Completion

### 2.1 Client Portal Module

```
client/src/features/client-portal/
├── pages/
│   ├── Dashboard.tsx           # Fix: Real financial metrics
│   ├── Profile.tsx             # Fix: Real wallet, referrals
│   ├── ComplianceCalendar.tsx  # Fix: Real compliance data
│   └── NotificationPrefs.tsx   # Fix: Persist to DB
├── hooks/
│   ├── useWallet.ts            # New: Wallet operations
│   ├── useReferrals.ts         # New: Referral tracking
│   └── useNotificationPrefs.ts # Fix: Real API calls
└── components/
    └── ...
```

#### 2.1.1 Client Wallet System

**Database Schema:**

```typescript
// server/db/schema/wallet.ts
export const wallets = pgTable('wallets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).unique(),
  balance: decimal('balance', { precision: 12, scale: 2 }).default('0'),
  currency: varchar('currency', { length: 3 }).default('INR'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const walletTransactions = pgTable('wallet_transactions', {
  id: serial('id').primaryKey(),
  walletId: integer('wallet_id').references(() => wallets.id),
  type: varchar('type', { length: 20 }), // credit, debit, refund, referral_bonus
  amount: decimal('amount', { precision: 12, scale: 2 }),
  balanceAfter: decimal('balance_after', { precision: 12, scale: 2 }),
  description: text('description'),
  referenceType: varchar('reference_type', { length: 50 }), // payment, service_request, referral
  referenceId: integer('reference_id'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

**API Routes:**

```typescript
// server/routes/wallet.ts
router.get('/api/client/wallet', authenticate, async (req, res) => {
  const wallet = await db.query.wallets.findFirst({
    where: eq(wallets.userId, req.user.id),
  });

  if (!wallet) {
    // Create wallet on first access
    const [newWallet] = await db.insert(wallets)
      .values({ userId: req.user.id })
      .returning();
    return res.json({ balance: 0, transactions: [] });
  }

  const transactions = await db.query.walletTransactions.findMany({
    where: eq(walletTransactions.walletId, wallet.id),
    orderBy: desc(walletTransactions.createdAt),
    limit: 20,
  });

  res.json({
    balance: parseFloat(wallet.balance),
    currency: wallet.currency,
    transactions,
  });
});
```

#### 2.1.2 Referral System

**Database Schema:**

```typescript
// server/db/schema/referrals.ts
export const referralCodes = pgTable('referral_codes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).unique(),
  code: varchar('code', { length: 20 }).unique(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const referrals = pgTable('referrals', {
  id: serial('id').primaryKey(),
  referrerId: integer('referrer_id').references(() => users.id),
  referredId: integer('referred_id').references(() => users.id),
  referralCodeId: integer('referral_code_id').references(() => referralCodes.id),
  status: varchar('status', { length: 20 }), // pending, converted, rewarded
  rewardAmount: decimal('reward_amount', { precision: 10, scale: 2 }),
  rewardPaidAt: timestamp('reward_paid_at'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

#### 2.1.3 Compliance Calendar (Real Data)

```typescript
// server/routes/client.ts - Fix compliance calendar
router.get('/api/v1/client/compliance-calendar', authenticate, async (req, res) => {
  const userId = req.user.id;

  // Get client's active services
  const activeServices = await db.query.serviceRequests.findMany({
    where: and(
      eq(serviceRequests.clientId, userId),
      inArray(serviceRequests.status, ['active', 'in_progress', 'completed'])
    ),
    with: {
      service: true,
    },
  });

  // Get compliance obligations based on services
  const obligations = await db.query.complianceObligations.findMany({
    where: inArray(
      complianceObligations.serviceId,
      activeServices.map(s => s.serviceId)
    ),
  });

  // Get upcoming deadlines
  const upcomingDeadlines = await db.query.complianceDeadlines.findMany({
    where: and(
      eq(complianceDeadlines.clientId, userId),
      gte(complianceDeadlines.dueDate, new Date()),
      lte(complianceDeadlines.dueDate, addDays(new Date(), 90))
    ),
    orderBy: asc(complianceDeadlines.dueDate),
  });

  res.json({
    obligations,
    upcomingDeadlines,
    summary: {
      total: upcomingDeadlines.length,
      thisWeek: upcomingDeadlines.filter(d => isThisWeek(d.dueDate)).length,
      thisMonth: upcomingDeadlines.filter(d => isThisMonth(d.dueDate)).length,
    },
  });
});
```

---

### 2.2 Agent Portal Module

```
client/src/features/agent/
├── pages/
│   ├── KYC.tsx                 # Fix: Real upload, storage, verification
│   ├── Disputes.tsx            # Fix: Real SR numbers
│   └── ...
├── hooks/
│   ├── useKYC.ts               # Fix: Real file upload
│   └── ...
└── components/
    └── ...
```

#### 2.2.1 Agent KYC System (Complete Implementation)

**Database Schema:**

```typescript
// server/db/schema/agent-kyc.ts
export const agentKycDocuments = pgTable('agent_kyc_documents', {
  id: serial('id').primaryKey(),
  agentId: integer('agent_id').references(() => users.id),
  documentType: varchar('document_type', { length: 50 }), // pan, aadhaar, bank_proof, address_proof
  documentId: integer('document_id').references(() => documents.id),
  documentNumber: varchar('document_number', { length: 100 }), // encrypted
  verificationStatus: varchar('verification_status', { length: 20 }), // pending, verified, rejected
  verifiedBy: integer('verified_by').references(() => users.id),
  verifiedAt: timestamp('verified_at'),
  rejectionReason: text('rejection_reason'),
  expiryDate: date('expiry_date'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const agentKycStatus = pgTable('agent_kyc_status', {
  id: serial('id').primaryKey(),
  agentId: integer('agent_id').references(() => users.id).unique(),
  overallStatus: varchar('overall_status', { length: 20 }), // not_started, in_progress, under_review, approved, rejected
  submittedAt: timestamp('submitted_at'),
  reviewedAt: timestamp('reviewed_at'),
  reviewedBy: integer('reviewed_by').references(() => users.id),
  remarks: text('remarks'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

**API Implementation:**

```typescript
// server/routes/agent-kyc.ts
router.post('/api/agent/kyc/documents', authenticate, upload.single('file'), async (req, res) => {
  const { documentType, documentNumber } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Upload to cloud storage
  const storedFile = await storageService.upload(file, {
    category: 'kyc',
    entityType: 'agent',
    entityId: req.user.id,
    userId: req.user.id,
  });

  // Encrypt document number
  const encryptedDocNumber = await encryptionService.encrypt(documentNumber);

  // Create KYC document record
  const [kycDoc] = await db.insert(agentKycDocuments).values({
    agentId: req.user.id,
    documentType,
    documentId: storedFile.id,
    documentNumber: encryptedDocNumber,
    verificationStatus: 'pending',
  }).returning();

  // Update overall KYC status
  await this.updateOverallKycStatus(req.user.id);

  // Queue for verification (OCR + manual review)
  await queueManager.addJob('kyc_verification', {
    kycDocumentId: kycDoc.id,
    documentType,
  });

  res.json({
    success: true,
    document: {
      id: kycDoc.id,
      documentType,
      status: 'pending',
      uploadedAt: kycDoc.createdAt,
    },
  });
});
```

---

### 2.3 Operations Module

```
client/src/features/operations/
├── pages/
│   ├── PerformanceMetrics.tsx  # Fix: Real calculations
│   ├── Escalations.tsx         # Fix: Correct route paths
│   └── ...
└── ...
```

#### 2.3.1 Performance Metrics (Real Calculations)

```typescript
// server/routes/operations.ts - Fix performance metrics
router.get('/api/operations/performance', authenticate, async (req, res) => {
  const { teamId, startDate, endDate } = req.query;

  // Get completed work items in date range
  const completedItems = await db.query.serviceRequests.findMany({
    where: and(
      teamId ? eq(serviceRequests.assignedTeamId, parseInt(teamId)) : undefined,
      eq(serviceRequests.status, 'completed'),
      gte(serviceRequests.completedAt, new Date(startDate)),
      lte(serviceRequests.completedAt, new Date(endDate))
    ),
  });

  // Calculate real average completion time
  const avgCompletionTime = completedItems.length > 0
    ? completedItems.reduce((sum, item) => {
        const duration = differenceInHours(item.completedAt, item.createdAt);
        return sum + duration;
      }, 0) / completedItems.length
    : 0;

  // Get quality scores from QC reviews
  const qcReviews = await db.query.qcReviews.findMany({
    where: inArray(
      qcReviews.serviceRequestId,
      completedItems.map(i => i.id)
    ),
  });

  const avgQualityScore = qcReviews.length > 0
    ? qcReviews.reduce((sum, r) => sum + r.score, 0) / qcReviews.length
    : 0;

  // Calculate SLA compliance
  const slaCompliant = completedItems.filter(item => {
    const sla = getSLAForService(item.serviceId);
    return differenceInHours(item.completedAt, item.createdAt) <= sla.targetHours;
  }).length;

  const slaComplianceRate = completedItems.length > 0
    ? (slaCompliant / completedItems.length) * 100
    : 0;

  // Historical trend (last 12 weeks)
  const weeklyTrend = await calculateWeeklyTrend(teamId, 12);

  res.json({
    avgCompletionTime: Math.round(avgCompletionTime),
    avgQualityScore: parseFloat(avgQualityScore.toFixed(1)),
    slaComplianceRate: parseFloat(slaComplianceRate.toFixed(1)),
    totalCompleted: completedItems.length,
    weeklyTrend,
  });
});
```

---

### 2.4 Admin/Super-Admin Module

```
client/src/features/super-admin/
├── pages/
│   ├── Analytics.tsx           # Fix: Real analytics endpoint
│   ├── Services.tsx            # Fix: Real CRUD endpoints
│   └── ...
└── ...
```

#### 2.4.1 Super Admin Analytics

```typescript
// server/routes/super-admin.ts - Add analytics endpoint
router.get('/api/super-admin/analytics', authenticate, requireRole('super_admin'), async (req, res) => {
  const { period = '12months' } = req.query;

  // Revenue data
  const revenueData = await db.execute(sql`
    SELECT
      DATE_TRUNC('month', created_at) as month,
      SUM(amount) as revenue,
      COUNT(*) as transaction_count
    FROM payments
    WHERE status = 'completed'
      AND created_at >= NOW() - INTERVAL '12 months'
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY month
  `);

  // User growth
  const userGrowth = await db.execute(sql`
    SELECT
      DATE_TRUNC('month', created_at) as month,
      COUNT(*) as new_users,
      SUM(COUNT(*)) OVER (ORDER BY DATE_TRUNC('month', created_at)) as cumulative_users
    FROM users
    WHERE created_at >= NOW() - INTERVAL '12 months'
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY month
  `);

  // Service distribution
  const serviceDistribution = await db.execute(sql`
    SELECT
      sc.name as service_name,
      COUNT(sr.id) as request_count,
      ROUND(COUNT(sr.id) * 100.0 / SUM(COUNT(sr.id)) OVER (), 2) as percentage
    FROM service_requests sr
    JOIN services_catalog sc ON sr.service_id = sc.id
    WHERE sr.created_at >= NOW() - INTERVAL '12 months'
    GROUP BY sc.name
    ORDER BY request_count DESC
    LIMIT 10
  `);

  // Top performing agents
  const topAgents = await db.execute(sql`
    SELECT
      u.id,
      u.full_name as name,
      COUNT(sr.id) as completed_services,
      AVG(qc.score) as avg_quality_score,
      SUM(c.amount) as total_commission
    FROM users u
    JOIN service_requests sr ON sr.assigned_to = u.id
    LEFT JOIN qc_reviews qc ON qc.service_request_id = sr.id
    LEFT JOIN commissions c ON c.agent_id = u.id
    WHERE u.role = 'agent'
      AND sr.status = 'completed'
      AND sr.completed_at >= NOW() - INTERVAL '12 months'
    GROUP BY u.id, u.full_name
    ORDER BY completed_services DESC
    LIMIT 10
  `);

  res.json({
    revenue: {
      data: revenueData.rows,
      total: revenueData.rows.reduce((sum, r) => sum + parseFloat(r.revenue), 0),
      growth: calculateGrowth(revenueData.rows),
    },
    users: {
      data: userGrowth.rows,
      total: userGrowth.rows[userGrowth.rows.length - 1]?.cumulative_users || 0,
      growth: calculateGrowth(userGrowth.rows, 'new_users'),
    },
    services: serviceDistribution.rows,
    topAgents: topAgents.rows,
  });
});
```

#### 2.4.2 Super Admin Services CRUD

```typescript
// server/routes/super-admin.ts - Add services CRUD
router.get('/api/super-admin/services', authenticate, requireRole('super_admin'), async (req, res) => {
  const services = await db.query.servicesCatalog.findMany({
    orderBy: asc(servicesCatalog.name),
  });

  const stats = await db.execute(sql`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE is_active = true) as active,
      COUNT(*) FILTER (WHERE is_active = false) as inactive
    FROM services_catalog
  `);

  res.json({
    services,
    stats: stats.rows[0],
  });
});

router.post('/api/super-admin/services', authenticate, requireRole('super_admin'), async (req, res) => {
  const { name, category, basePrice, description, slaHours, isActive } = req.body;

  const [service] = await db.insert(servicesCatalog).values({
    name,
    category,
    basePrice,
    description,
    slaHours,
    isActive: isActive ?? true,
    createdBy: req.user.id,
  }).returning();

  // Log audit
  await auditLog('service_created', req.user.id, { serviceId: service.id, name });

  res.status(201).json(service);
});

router.put('/api/super-admin/services/:id', authenticate, requireRole('super_admin'), async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const [updated] = await db.update(servicesCatalog)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(servicesCatalog.id, parseInt(id)))
    .returning();

  await auditLog('service_updated', req.user.id, { serviceId: id, changes: updates });

  res.json(updated);
});

router.post('/api/super-admin/services/:id/toggle', authenticate, requireRole('super_admin'), async (req, res) => {
  const { id } = req.params;

  const service = await db.query.servicesCatalog.findFirst({
    where: eq(servicesCatalog.id, parseInt(id)),
  });

  const [updated] = await db.update(servicesCatalog)
    .set({ isActive: !service.isActive, updatedAt: new Date() })
    .where(eq(servicesCatalog.id, parseInt(id)))
    .returning();

  await auditLog('service_toggled', req.user.id, { serviceId: id, isActive: updated.isActive });

  res.json(updated);
});
```

---

### 2.5 Messaging Module (New)

```
server/routes/messaging.ts       # New: Complete messaging backend
client/src/features/messaging/
├── pages/
│   ├── MessageCenter.tsx        # Fix: Remove mock fallback
│   └── NotificationCenter.tsx   # Fix: Remove mock fallback
└── hooks/
    ├── useMessages.ts           # Fix: Real API calls
    └── useNotifications.ts      # Fix: Real API calls
```

**Database Schema:**

```typescript
// server/db/schema/messaging.ts
export const messageThreads = pgTable('message_threads', {
  id: serial('id').primaryKey(),
  subject: varchar('subject', { length: 255 }),
  type: varchar('type', { length: 20 }), // support, internal, client_communication
  status: varchar('status', { length: 20 }), // active, archived, closed
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const messageThreadParticipants = pgTable('message_thread_participants', {
  id: serial('id').primaryKey(),
  threadId: integer('thread_id').references(() => messageThreads.id),
  userId: integer('user_id').references(() => users.id),
  lastReadAt: timestamp('last_read_at'),
  isArchived: boolean('is_archived').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  threadId: integer('thread_id').references(() => messageThreads.id),
  senderId: integer('sender_id').references(() => users.id),
  content: text('content'),
  attachments: jsonb('attachments'),
  isEdited: boolean('is_edited').default(false),
  editedAt: timestamp('edited_at'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

**API Implementation:**

```typescript
// server/routes/messaging.ts
const router = Router();

router.get('/api/messages/threads', authenticate, async (req, res) => {
  const threads = await db.query.messageThreadParticipants.findMany({
    where: eq(messageThreadParticipants.userId, req.user.id),
    with: {
      thread: {
        with: {
          messages: {
            orderBy: desc(messages.createdAt),
            limit: 1,
          },
          participants: {
            with: {
              user: {
                columns: { id: true, fullName: true, avatar: true },
              },
            },
          },
        },
      },
    },
    orderBy: desc(messageThreadParticipants.updatedAt),
  });

  const threadsWithUnread = threads.map(tp => ({
    ...tp.thread,
    unreadCount: tp.thread.messages.filter(m =>
      m.createdAt > (tp.lastReadAt || new Date(0))
    ).length,
    lastMessage: tp.thread.messages[0],
    isArchived: tp.isArchived,
  }));

  res.json(threadsWithUnread);
});

router.get('/api/messages/threads/:id/messages', authenticate, async (req, res) => {
  const { id } = req.params;
  const { limit = 50, before } = req.query;

  // Verify participation
  const participation = await db.query.messageThreadParticipants.findFirst({
    where: and(
      eq(messageThreadParticipants.threadId, parseInt(id)),
      eq(messageThreadParticipants.userId, req.user.id)
    ),
  });

  if (!participation) {
    return res.status(403).json({ error: 'Not a participant' });
  }

  const messagesResult = await db.query.messages.findMany({
    where: and(
      eq(messages.threadId, parseInt(id)),
      before ? lt(messages.createdAt, new Date(before)) : undefined
    ),
    with: {
      sender: {
        columns: { id: true, fullName: true, avatar: true },
      },
    },
    orderBy: desc(messages.createdAt),
    limit: parseInt(limit),
  });

  // Update last read
  await db.update(messageThreadParticipants)
    .set({ lastReadAt: new Date() })
    .where(and(
      eq(messageThreadParticipants.threadId, parseInt(id)),
      eq(messageThreadParticipants.userId, req.user.id)
    ));

  res.json(messagesResult.reverse());
});

router.post('/api/messages/threads/:id/messages', authenticate, async (req, res) => {
  const { id } = req.params;
  const { content, attachments } = req.body;

  // Verify participation
  const participation = await db.query.messageThreadParticipants.findFirst({
    where: and(
      eq(messageThreadParticipants.threadId, parseInt(id)),
      eq(messageThreadParticipants.userId, req.user.id)
    ),
  });

  if (!participation) {
    return res.status(403).json({ error: 'Not a participant' });
  }

  const [message] = await db.insert(messages).values({
    threadId: parseInt(id),
    senderId: req.user.id,
    content,
    attachments,
  }).returning();

  // Update thread timestamp
  await db.update(messageThreads)
    .set({ updatedAt: new Date() })
    .where(eq(messageThreads.id, parseInt(id)));

  // Notify other participants
  const otherParticipants = await db.query.messageThreadParticipants.findMany({
    where: and(
      eq(messageThreadParticipants.threadId, parseInt(id)),
      not(eq(messageThreadParticipants.userId, req.user.id))
    ),
  });

  for (const participant of otherParticipants) {
    await notificationHub.send({
      userId: participant.userId,
      type: 'new_message',
      channels: ['push', 'email'],
      data: {
        threadId: id,
        senderName: req.user.fullName,
        preview: content.substring(0, 100),
      },
    });
  }

  res.status(201).json(message);
});

export default router;
```

---

## Phase 3: External Integrations

### 3.1 Government API Integration

```
server/services/government/
├── index.ts                    # Integration hub
├── adapters/
│   ├── gst.adapter.ts          # GST Portal (via GSP)
│   ├── income-tax.adapter.ts   # Income Tax (via ERI)
│   └── mca.adapter.ts          # MCA21 Corporate filings
├── credentials-manager.ts      # Secure credential storage
└── types.ts
```

**Implementation Strategy:**

```typescript
// server/services/government/index.ts
export class GovernmentIntegrationHub {
  private gstAdapter: GSTAdapter;
  private incomeTaxAdapter: IncomeTaxAdapter;
  private mcaAdapter: MCAAdapter;

  constructor() {
    // Initialize adapters with credentials from encrypted storage
    this.initializeAdapters();
  }

  private async initializeAdapters() {
    const credentials = await this.loadCredentials();

    this.gstAdapter = new GSTAdapter({
      gspId: credentials.gsp.id,
      gspSecret: credentials.gsp.secret,
      sandbox: process.env.NODE_ENV !== 'production',
    });

    this.incomeTaxAdapter = new IncomeTaxAdapter({
      eriId: credentials.eri.id,
      eriSecret: credentials.eri.secret,
      sandbox: process.env.NODE_ENV !== 'production',
    });

    this.mcaAdapter = new MCAAdapter({
      llpinCredentials: credentials.mca,
      sandbox: process.env.NODE_ENV !== 'production',
    });
  }

  async fileGSTReturn(params: GSTReturnParams): Promise<FilingResult> {
    // Validate inputs
    this.validateGSTParams(params);

    // Generate return data
    const returnData = await this.prepareGSTReturn(params);

    // File with GST Portal
    const result = await this.gstAdapter.fileReturn(returnData);

    // Log filing
    await this.logFiling('gst', params.clientId, result);

    // Update compliance tracking
    await this.updateComplianceStatus(params.clientId, 'gst', result);

    return result;
  }

  // Similar methods for income tax and MCA filings
}
```

### 3.2 OCR/AI Document Processing

```
server/services/document-ai/
├── index.ts                    # Document AI hub
├── providers/
│   ├── textract.provider.ts    # AWS Textract
│   ├── vision.provider.ts      # Google Vision
│   └── azure-form.provider.ts  # Azure Form Recognizer
├── extractors/
│   ├── pan.extractor.ts        # PAN card data extraction
│   ├── aadhaar.extractor.ts    # Aadhaar data extraction
│   ├── gst-cert.extractor.ts   # GST certificate extraction
│   └── invoice.extractor.ts    # Invoice data extraction
└── types.ts
```

### 3.3 Digital Signature Integration

```
server/services/esign/
├── index.ts                    # ESign hub
├── providers/
│   ├── digisign.provider.ts    # DigiSign India
│   ├── emsigner.provider.ts    # emSigner
│   └── docusign.provider.ts    # DocuSign (international)
└── types.ts
```

---

## Phase 4: Database Migrations

### Migration Sequence

```typescript
// server/migrations/index.ts
export const migrations = [
  // Phase 1: Infrastructure
  '001_add_notifications_tables',
  '002_add_notification_preferences',
  '003_add_documents_table',
  '004_add_otp_codes_table',

  // Phase 2: User modules
  '005_add_wallets_tables',
  '006_add_referrals_tables',
  '007_add_agent_kyc_tables',
  '008_add_messaging_tables',
  '009_add_budget_plans_table',

  // Phase 3: Analytics
  '010_add_performance_metrics_cache',
  '011_add_analytics_aggregates',
];
```

---

## Implementation Sequence

```
Week 1-2: Phase 1 (Infrastructure)
├── Day 1-2: Notification Hub + Email Service
├── Day 3-4: SMS + WhatsApp + Push Services
├── Day 5-6: Cloud Storage Service
├── Day 7-8: OTP Service
├── Day 9-10: Queue Processors (connect to services)

Week 3-4: Phase 2 (User Modules)
├── Day 1-2: Client Wallet + Referrals
├── Day 3-4: Agent KYC (complete)
├── Day 5-6: Messaging System
├── Day 7-8: Notification Center
├── Day 9-10: Admin Analytics + Services CRUD

Week 5-6: Phase 2 Continued
├── Day 1-2: Operations Performance (real metrics)
├── Day 3-4: QC Dashboard (real data)
├── Day 5-6: HR Analytics (real data)
├── Day 7-8: Compliance Calendar (real data)
├── Day 9-10: Testing + Bug fixes

Week 7-8: Phase 3 (Integrations)
├── Day 1-3: Government API (GST)
├── Day 4-6: Government API (ITR + MCA)
├── Day 7-8: OCR Integration
├── Day 9-10: ESign Integration

Week 9-10: Phase 4 (Polish + Testing)
├── Day 1-3: Integration testing
├── Day 4-5: Load testing
├── Day 6-7: Security audit
├── Day 8-10: Documentation + Deployment
```

---

## Module-Feature Mapping

| Module | Features Affected | Priority |
|--------|-------------------|----------|
| **Client Portal** | Wallet, Referrals, Notifications, Compliance Calendar, OTP | High |
| **Agent Portal** | KYC, Commission Disputes, Notifications | High |
| **Operations** | Performance Metrics, Escalations, Messaging | Medium |
| **QC** | Delivery Handoff, Team Utilization | Medium |
| **Sales** | Proposal Sending, Lead Notifications | High |
| **Admin** | Analytics, Services CRUD | High |
| **Super Admin** | Analytics, Services, BI Dashboard | High |
| **HR** | Analytics, Payroll (new) | Low |
| **Finance** | Budget Plans | Medium |

---

## Environment Variables Required

```env
# Notification Services
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.xxxxx
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxx
TWILIO_PHONE_NUMBER=+1234567890
WHATSAPP_API_URL=https://graph.facebook.com/v17.0
WHATSAPP_ACCESS_TOKEN=xxxx
FIREBASE_PROJECT_ID=xxxx
FIREBASE_PRIVATE_KEY=xxxx

# Cloud Storage
STORAGE_PROVIDER=gcs
GCS_BUCKET_ID=digicomply-documents
GCS_CREDENTIALS={"type":"service_account",...}

# Government APIs
GSP_ID=xxxx
GSP_SECRET=xxxx
ERI_ID=xxxx
ERI_SECRET=xxxx
MCA_CREDENTIALS=xxxx

# OCR Services
AWS_ACCESS_KEY_ID=xxxx
AWS_SECRET_ACCESS_KEY=xxxx
AWS_REGION=ap-south-1

# Digital Signatures
DIGISIGN_API_KEY=xxxx
DIGISIGN_SECRET=xxxx
```

---

## Testing Strategy

1. **Unit Tests**: Each service module
2. **Integration Tests**: API endpoints with real DB
3. **E2E Tests**: User flows (registration, KYC, service request)
4. **Load Tests**: Notification throughput, file upload concurrency
