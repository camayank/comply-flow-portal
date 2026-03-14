import { mapToClientStatus, CLIENT_STATUSES } from '@shared/status-mapping';

describe('Status Mapping', () => {
  it('maps INITIATED to In Progress', () => {
    expect(mapToClientStatus('INITIATED')).toBe(CLIENT_STATUSES.IN_PROGRESS);
  });

  it('maps SLA_BREACHED to Needs Attention', () => {
    expect(mapToClientStatus('SLA_BREACHED')).toBe(CLIENT_STATUSES.NEEDS_ATTENTION);
  });

  it('maps QC_APPROVED to Almost Done', () => {
    expect(mapToClientStatus('QC_APPROVED')).toBe(CLIENT_STATUSES.ALMOST_DONE);
  });

  it('maps COMPLETED to Done', () => {
    expect(mapToClientStatus('COMPLETED')).toBe(CLIENT_STATUSES.DONE);
  });

  it('maps unknown status to In Progress (safe fallback)', () => {
    expect(mapToClientStatus('UNKNOWN_STATUS')).toBe(CLIENT_STATUSES.IN_PROGRESS);
  });
});
