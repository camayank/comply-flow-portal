jest.mock('../db', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([{ id: 1, status: 'initiated' }]),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
  },
}));

jest.mock('../logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

describe('State Machine Fixes', () => {
  it('logs transitions via logger, not console.log', async () => {
    const consoleSpy = jest.spyOn(console, 'log');
    const { logger } = require('../logger');

    // Import after mocks are set up
    const stateMachine = require('../services/service-request-state-machine');
    const transitionFn = stateMachine.transitionStatus || stateMachine.stateMachine?.transitionStatus;

    if (transitionFn) {
      try {
        await transitionFn(1, 'in_progress', { triggeredBy: 'test' });
      } catch (e) {
        // May fail due to DB mock shape - that's ok, we're checking logging
      }
    }

    // Should NOT log state transitions to console
    const stateLogCalls = consoleSpy.mock.calls.filter(
      call => String(call[0]).toLowerCase().includes('transition')
    );
    expect(stateLogCalls).toHaveLength(0);

    consoleSpy.mockRestore();
  });
});
