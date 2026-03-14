import { calculateSlaDeadline } from '../services/pipeline/guards/sla-guard';

const mockAddBusinessHours = jest.fn().mockImplementation((start: Date, hours: number) => {
  return new Date(start.getTime() + hours * 60 * 60 * 1000);
});

jest.mock('../services/sla-service', () => ({
  slaService: { addBusinessHours: mockAddBusinessHours },
}));

describe('SLA Guard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calculates deadline with priority multiplier', async () => {
    const start = new Date('2026-03-16T04:30:00.000Z');
    const deadline = await calculateSlaDeadline(start, 48, 'HIGH');
    expect(deadline).toBeInstanceOf(Date);
    // HIGH = 0.5x multiplier, so 48 * 0.5 = 24 hours
    expect(mockAddBusinessHours).toHaveBeenCalledWith(start, 24);
  });

  it('applies correct priority multipliers', async () => {
    const start = new Date('2026-03-16T04:30:00.000Z');
    const critical = await calculateSlaDeadline(start, 48, 'CRITICAL');
    const normal = await calculateSlaDeadline(start, 48, 'NORMAL');
    expect(critical.getTime()).toBeLessThan(normal.getTime());
  });

  it('defaults to 1.0 multiplier for unknown priority', async () => {
    const start = new Date('2026-03-16T04:30:00.000Z');
    await calculateSlaDeadline(start, 48, 'UNKNOWN');
    expect(mockAddBusinessHours).toHaveBeenCalledWith(start, 48);
  });
});
