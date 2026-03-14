import { generateInvoiceData } from '../services/invoice-generator';

jest.mock('../db', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    onConflictDoNothing: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([{ id: 1 }]),
  },
}));

describe('Invoice Generator Fixes', () => {
  const db = require('../db').db;

  beforeEach(() => jest.clearAllMocks());

  it('calculates IGST for interstate (entity state != company state)', async () => {
    db.limit
      .mockResolvedValueOnce([{ id: 1, amount: '10000', serviceRequestId: 100, paymentMethod: 'online', createdAt: new Date(), paymentStatus: 'completed', transactionId: 'TX1', paidAt: new Date() }])
      .mockResolvedValueOnce([{ id: 100, businessEntityId: 200, serviceName: 'GST Return', serviceType: 'GST' }])
      .mockResolvedValueOnce([{ id: 200, companyName: 'TestCo', state: 'Maharashtra', clientId: 'C1', contactPerson: null, contactEmail: null, gstin: null, pan: null, registeredAddress: null }]);

    process.env.COMPANY_STATE = 'Karnataka';
    const data = await generateInvoiceData(1);

    expect(data).not.toBeNull();
    expect(data!.igst).toBeGreaterThan(0);
    expect(data!.cgst).toBe(0);
    expect(data!.sgst).toBe(0);
  });

  it('calculates CGST+SGST for intrastate (same state)', async () => {
    db.limit
      .mockResolvedValueOnce([{ id: 1, amount: '10000', serviceRequestId: 100, paymentMethod: 'online', createdAt: new Date(), paymentStatus: 'completed', transactionId: 'TX1', paidAt: new Date() }])
      .mockResolvedValueOnce([{ id: 100, businessEntityId: 200, serviceName: 'GST Return', serviceType: 'GST' }])
      .mockResolvedValueOnce([{ id: 200, companyName: 'TestCo', state: 'Karnataka', clientId: 'C1', contactPerson: null, contactEmail: null, gstin: null, pan: null, registeredAddress: null }]);

    process.env.COMPANY_STATE = 'Karnataka';
    const data = await generateInvoiceData(1);

    expect(data).not.toBeNull();
    expect(data!.cgst).toBeGreaterThan(0);
    expect(data!.sgst).toBeGreaterThan(0);
    expect(data!.igst).toBe(0);
  });

  it('uses COMPANY_STATE env var for interstate determination', async () => {
    db.limit
      .mockResolvedValueOnce([{ id: 1, amount: '5000', serviceRequestId: 100, paymentMethod: 'online', createdAt: new Date(), paymentStatus: 'completed', transactionId: 'TX2', paidAt: new Date() }])
      .mockResolvedValueOnce([{ id: 100, businessEntityId: 200, serviceName: 'ROC Filing', serviceType: 'ROC' }])
      .mockResolvedValueOnce([{ id: 200, companyName: 'MumCo', state: 'Maharashtra', clientId: 'C2', contactPerson: null, contactEmail: null, gstin: null, pan: null, registeredAddress: null }]);

    process.env.COMPANY_STATE = 'Maharashtra';
    const data = await generateInvoiceData(1);

    expect(data).not.toBeNull();
    // Same state = intrastate
    expect(data!.cgst).toBeGreaterThan(0);
    expect(data!.sgst).toBeGreaterThan(0);
    expect(data!.igst).toBe(0);
  });

  it('treats empty client state as intrastate', async () => {
    db.limit
      .mockResolvedValueOnce([{ id: 1, amount: '5000', serviceRequestId: 100, paymentMethod: 'online', createdAt: new Date(), paymentStatus: 'completed', transactionId: 'TX3', paidAt: new Date() }])
      .mockResolvedValueOnce([{ id: 100, businessEntityId: 200, serviceName: 'GST Return', serviceType: 'GST' }])
      .mockResolvedValueOnce([{ id: 200, companyName: 'NoCo', state: '', clientId: 'C3', contactPerson: null, contactEmail: null, gstin: null, pan: null, registeredAddress: null }]);

    process.env.COMPANY_STATE = 'Karnataka';
    const data = await generateInvoiceData(1);

    expect(data).not.toBeNull();
    // Empty state = intrastate (not interstate)
    expect(data!.cgst).toBeGreaterThan(0);
    expect(data!.sgst).toBeGreaterThan(0);
    expect(data!.igst).toBe(0);
  });
});
