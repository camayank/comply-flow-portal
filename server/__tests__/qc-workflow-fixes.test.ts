/**
 * QC Workflow Fixes Test
 *
 * Verifies that QC workflow's completeReview() routes status transitions
 * through the state machine instead of directly updating the DB.
 */

const mockTransitionStatus = jest.fn().mockResolvedValue({
  success: true,
  previousStatus: 'qc_review',
  newStatus: 'ready_for_delivery',
  message: 'Status updated',
  timestamp: new Date().toISOString(),
});

jest.mock('../services/service-request-state-machine', () => ({
  transitionStatus: mockTransitionStatus,
  SERVICE_REQUEST_STATUSES: {
    READY_FOR_DELIVERY: 'ready_for_delivery',
    IN_PROGRESS: 'in_progress',
    QC_REVIEW: 'qc_review',
    QC_APPROVED: 'qc_approved',
    QC_REJECTED: 'qc_rejected',
  },
}));

jest.mock('../db', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([{ id: 1 }]),
  },
}));

jest.mock('../logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('QC Workflow Fixes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses state machine for status transitions after QC approval', async () => {
    const { qcWorkflowService } = require('../services/qc-workflow-service');
    const dbMock = require('../db').db;

    // First db.limit call returns the review record
    dbMock.limit.mockResolvedValueOnce([{
      id: 1,
      serviceRequestId: 10,
      status: 'pending',
      reviewerId: 5,
      checklist: [
        { id: 'item1', status: 'passed', isMandatory: true, weight: 50 },
        { id: 'item2', status: 'passed', isMandatory: true, weight: 50 },
      ],
    }]);

    await qcWorkflowService.completeReview(1, 'approved', 5, { reviewNotes: 'Looks good' });

    expect(mockTransitionStatus).toHaveBeenCalledWith(
      10, // serviceRequestId from the review
      'ready_for_delivery',
      expect.objectContaining({
        triggeredBy: 'qc_workflow',
        reviewId: 1,
        decision: 'approved',
      })
    );
  });

  it('uses state machine for status transitions after QC rejection', async () => {
    const { qcWorkflowService } = require('../services/qc-workflow-service');
    const dbMock = require('../db').db;

    // Return a review with failing items so rejection is valid
    dbMock.limit.mockResolvedValueOnce([{
      id: 2,
      serviceRequestId: 20,
      status: 'pending',
      reviewerId: 5,
      checklist: [
        { id: 'item1', status: 'failed', isMandatory: true, weight: 50 },
        { id: 'item2', status: 'passed', isMandatory: false, weight: 50 },
      ],
    }]);

    await qcWorkflowService.completeReview(2, 'rejected', 5, { reviewNotes: 'Missing documents' });

    expect(mockTransitionStatus).toHaveBeenCalledWith(
      20, // serviceRequestId from the review
      'in_progress',
      expect.objectContaining({
        triggeredBy: 'qc_workflow',
        reviewId: 2,
        decision: 'rejected',
      })
    );
  });

  it('uses state machine for rework_required transitions', async () => {
    const { qcWorkflowService } = require('../services/qc-workflow-service');
    const dbMock = require('../db').db;

    dbMock.limit.mockResolvedValueOnce([{
      id: 3,
      serviceRequestId: 30,
      status: 'pending',
      reviewerId: 5,
      checklist: [
        { id: 'item1', status: 'failed', isMandatory: true, weight: 50 },
        { id: 'item2', status: 'passed', isMandatory: false, weight: 50 },
      ],
    }]);

    // For rework_required, the notification lookup query
    dbMock.limit.mockResolvedValueOnce([{ assignedTeamMember: 7 }]);

    await qcWorkflowService.completeReview(3, 'rework_required', 5, {
      reworkInstructions: 'Fix section 2',
    });

    expect(mockTransitionStatus).toHaveBeenCalledWith(
      30,
      'in_progress',
      expect.objectContaining({
        triggeredBy: 'qc_workflow',
        reviewId: 3,
        decision: 'rework_required',
      })
    );
  });

  it('does not call direct DB update for service request status', async () => {
    const { qcWorkflowService } = require('../services/qc-workflow-service');
    const dbMock = require('../db').db;

    dbMock.limit.mockResolvedValueOnce([{
      id: 1,
      serviceRequestId: 10,
      status: 'pending',
      reviewerId: 5,
      checklist: [
        { id: 'item1', status: 'passed', isMandatory: true, weight: 50 },
        { id: 'item2', status: 'passed', isMandatory: true, weight: 50 },
      ],
    }]);

    await qcWorkflowService.completeReview(1, 'approved', 5);

    // The state machine should be called instead of direct DB update for service request status
    expect(mockTransitionStatus).toHaveBeenCalled();

    // db.update should only be called once for the qualityReviews update,
    // NOT a second time for the serviceRequests status update
    expect(dbMock.update).toHaveBeenCalledTimes(1);
  });
});
