import { runComplianceGuard } from '../services/pipeline/guards/compliance-guard';

jest.mock('../db', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn(),
  },
}));

jest.mock('../compliance-state-engine', () => ({
  stateEngine: {
    calculateEntityState: jest.fn(),
  },
}));

describe('Compliance Guard', () => {
  const db = require('../db').db;
  const { stateEngine } = require('../compliance-state-engine');

  beforeEach(() => jest.clearAllMocks());

  it('returns GREEN for entity with good compliance', async () => {
    db.limit.mockResolvedValueOnce([{ id: 1, complianceInitialized: true }]);
    stateEngine.calculateEntityState.mockResolvedValueOnce({ overallState: 'GREEN', riskScore: 10 });

    const result = await runComplianceGuard(1);
    expect(result.state).toBe('GREEN');
    expect(result.metadata).toEqual({});
    expect(stateEngine.calculateEntityState).toHaveBeenCalledWith(1);
  });

  it('returns AMBER with warning metadata', async () => {
    db.limit.mockResolvedValueOnce([{ id: 1, complianceInitialized: true }]);
    stateEngine.calculateEntityState.mockResolvedValueOnce({ overallState: 'AMBER', riskScore: 45 });

    const result = await runComplianceGuard(1);
    expect(result.state).toBe('AMBER');
    expect(result.metadata).toEqual({ compliance_warning: true });
  });

  it('returns UNINITIALIZED for entity without compliance init', async () => {
    db.limit.mockResolvedValueOnce([{ id: 1, complianceInitialized: false }]);

    const result = await runComplianceGuard(1);
    expect(result.state).toBe('UNINITIALIZED');
    expect(result.metadata).toEqual({ compliance_uninitialized: true });
    expect(stateEngine.calculateEntityState).not.toHaveBeenCalled();
  });

  it('returns GREEN for missing entity', async () => {
    db.limit.mockResolvedValueOnce([]);

    const result = await runComplianceGuard(999);
    expect(result.state).toBe('GREEN');
  });
});
