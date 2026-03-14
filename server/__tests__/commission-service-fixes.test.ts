import { commissionService } from '../services/commission-service';

jest.mock('../db', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn(),
    leftJoin: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
  },
}));

jest.mock('../services/wallet-service', () => ({
  walletService: { debit: jest.fn().mockResolvedValue({ success: true }) },
}));

describe('Commission Service Fixes', () => {
  it('uses agent actual tier for clawback rule lookup, not hardcoded silver', async () => {
    const spy = jest.spyOn(commissionService as any, 'findApplicableRule')
      .mockResolvedValue({ basePercentage: '10', clawbackRules: { percentage: 50 } });

    jest.spyOn(commissionService, 'calculateCommission')
      .mockResolvedValue({ baseCommission: 1000, volumeBonus: 0, totalCommission: 1000, appliedRule: null, breakdown: { saleAmount: 10000, basePercentage: 10, volumeBonusPercentage: 0, agentTier: 'gold' } });

    // Mock the agent lookup to return 'gold' tier
    const db = require('../db').db;
    db.limit.mockResolvedValueOnce([{ tier: 'gold' }]);

    await commissionService.applyClawback(10, 10000, 'SR cancelled');

    // Should NOT be called with hardcoded 'silver' — should use 'gold'
    expect(spy).toHaveBeenCalledWith('gold');
    expect(spy).not.toHaveBeenCalledWith('silver');
  });
});
