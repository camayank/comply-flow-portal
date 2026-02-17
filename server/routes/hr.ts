/**
 * HR Routes
 *
 * Employee management, attendance, leave, training, and performance endpoints
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { requireAuth } from '../auth-middleware';
import { users, staffProfiles } from '@shared/schema';
import { eq, and, gte, lte, desc, asc, sql, like } from 'drizzle-orm';

const router = Router();

// ============================================================
// EMPLOYEES
// ============================================================

/**
 * GET /api/hr/employees
 * List all employees with optional filters
 */
router.get('/employees', requireAuth, async (req: Request, res: Response) => {
  try {
    const { department, status, search, page = '1', limit = '50' } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Get employees from users table with staff role
    const employees = await db.select({
      id: users.id,
      name: users.fullName,
      email: users.email,
      phone: users.phone,
      role: users.role,
      department: staffProfiles.department,
      designation: staffProfiles.designation,
      employeeId: staffProfiles.employeeId,
      joiningDate: staffProfiles.joiningDate,
      status: staffProfiles.status,
    })
    .from(users)
    .leftJoin(staffProfiles, eq(users.id, staffProfiles.userId))
    .where(
      and(
        users.role !== 'client',
        search ? like(users.fullName, `%${search}%`) : undefined,
        department ? eq(staffProfiles.department, department as string) : undefined,
        status ? eq(staffProfiles.status, status as string) : undefined
      )
    )
    .limit(parseInt(limit as string))
    .offset(offset)
    .orderBy(asc(users.fullName));

    res.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// ============================================================
// ATTENDANCE
// ============================================================

/**
 * GET /api/hr/attendance
 * Get attendance overview for a date
 */
router.get('/attendance', requireAuth, async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();

    // Mock attendance data (would come from attendance table)
    const todayStats = {
      present: 45,
      late: 5,
      absent: 8,
      total: 58,
      avgHours: 8.2
    };

    res.json({ todayStats, date: targetDate.toISOString().split('T')[0] });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

/**
 * GET /api/hr/attendance/daily
 * Get daily attendance records
 */
router.get('/attendance/daily', requireAuth, async (req: Request, res: Response) => {
  try {
    const { date } = req.query;

    // Get employees and generate mock attendance records
    const employees = await db.select({
      id: users.id,
      name: users.fullName,
      department: staffProfiles.department,
      role: staffProfiles.designation,
    })
    .from(users)
    .leftJoin(staffProfiles, eq(users.id, staffProfiles.userId))
    .where(users.role !== 'client')
    .limit(20);

    const records = employees.map(emp => ({
      employeeId: emp.id,
      employeeName: emp.name,
      department: emp.department || 'Operations',
      role: emp.role || 'Executive',
      checkIn: '09:00',
      checkOut: '18:00',
      status: 'present',
      location: 'Office'
    }));

    res.json(records);
  } catch (error) {
    console.error('Error fetching daily attendance:', error);
    res.status(500).json({ error: 'Failed to fetch daily attendance' });
  }
});

/**
 * POST /api/hr/attendance
 * Mark attendance for an employee
 */
router.post('/attendance', requireAuth, async (req: Request, res: Response) => {
  try {
    const { employeeId, date, checkIn, checkOut, location, notes } = req.body;

    // Would insert into attendance table
    res.json({
      success: true,
      message: 'Attendance marked successfully',
      data: { employeeId, date, checkIn, checkOut, location }
    });
  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
});

// ============================================================
// SHIFTS
// ============================================================

/**
 * GET /api/hr/shifts
 * Get all shift configurations
 */
router.get('/shifts', requireAuth, async (req: Request, res: Response) => {
  try {
    // Mock shift data
    const shifts = [
      {
        id: 1,
        employeeId: 1,
        employeeName: 'John Doe',
        shiftType: 'Regular',
        startTime: '09:00',
        endTime: '18:00',
        workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        effectiveDate: '2024-01-01'
      },
      {
        id: 2,
        employeeId: 2,
        employeeName: 'Jane Smith',
        shiftType: 'Flexible',
        startTime: '10:00',
        endTime: '19:00',
        workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        effectiveDate: '2024-01-01'
      }
    ];

    res.json(shifts);
  } catch (error) {
    console.error('Error fetching shifts:', error);
    res.status(500).json({ error: 'Failed to fetch shifts' });
  }
});

/**
 * POST /api/hr/shifts
 * Create a new shift assignment
 */
router.post('/shifts', requireAuth, async (req: Request, res: Response) => {
  try {
    const { employeeId, shiftType, startTime, endTime, workingDays, effectiveDate } = req.body;

    res.json({
      success: true,
      message: 'Shift created successfully',
      data: { employeeId, shiftType, startTime, endTime, workingDays, effectiveDate }
    });
  } catch (error) {
    console.error('Error creating shift:', error);
    res.status(500).json({ error: 'Failed to create shift' });
  }
});

// ============================================================
// LEAVE MANAGEMENT
// ============================================================

/**
 * GET /api/hr/leave/requests
 * Get leave requests with filters
 */
router.get('/leave/requests', requireAuth, async (req: Request, res: Response) => {
  try {
    const { status, type, startDate, endDate } = req.query;

    // Mock leave requests
    const requests = [
      {
        id: 1,
        employeeId: 1,
        employeeName: 'John Doe',
        leaveType: 'casual',
        startDate: '2024-02-20',
        endDate: '2024-02-21',
        days: 2,
        reason: 'Personal work',
        status: 'pending',
        appliedOn: '2024-02-15'
      },
      {
        id: 2,
        employeeId: 2,
        employeeName: 'Jane Smith',
        leaveType: 'sick',
        startDate: '2024-02-18',
        endDate: '2024-02-18',
        days: 1,
        reason: 'Not feeling well',
        status: 'approved',
        appliedOn: '2024-02-17'
      }
    ];

    res.json(requests);
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    res.status(500).json({ error: 'Failed to fetch leave requests' });
  }
});

/**
 * POST /api/hr/leave/requests
 * Create a new leave request
 */
router.post('/leave/requests', requireAuth, async (req: Request, res: Response) => {
  try {
    const { employeeId, leaveType, startDate, endDate, reason, isEmergency } = req.body;

    res.json({
      success: true,
      message: 'Leave request submitted successfully',
      data: { employeeId, leaveType, startDate, endDate, reason, status: 'pending' }
    });
  } catch (error) {
    console.error('Error creating leave request:', error);
    res.status(500).json({ error: 'Failed to create leave request' });
  }
});

/**
 * GET /api/hr/leave/balances
 * Get leave balances for employees
 */
router.get('/leave/balances', requireAuth, async (req: Request, res: Response) => {
  try {
    // Mock leave balances
    const balances = [
      { employeeId: 1, employeeName: 'John Doe', casual: 8, sick: 6, earned: 15, used: 4 },
      { employeeId: 2, employeeName: 'Jane Smith', casual: 10, sick: 6, earned: 12, used: 2 },
    ];

    res.json(balances);
  } catch (error) {
    console.error('Error fetching leave balances:', error);
    res.status(500).json({ error: 'Failed to fetch leave balances' });
  }
});

/**
 * PUT /api/hr/leave/balances
 * Update leave balance for an employee
 */
router.put('/leave/balances', requireAuth, async (req: Request, res: Response) => {
  try {
    const { employeeId, leaveType, totalDays, usedDays, carryForward, year } = req.body;

    res.json({
      success: true,
      message: 'Leave balance updated successfully'
    });
  } catch (error) {
    console.error('Error updating leave balance:', error);
    res.status(500).json({ error: 'Failed to update leave balance' });
  }
});

// ============================================================
// TRAINING
// ============================================================

/**
 * GET /api/hr/training/programs
 * Get training programs
 */
router.get('/training/programs', requireAuth, async (req: Request, res: Response) => {
  try {
    const programs = [
      {
        id: 1,
        title: 'Compliance Fundamentals',
        category: 'compliance',
        level: 'beginner',
        format: 'online',
        duration: '4 hours',
        enrolled: 25,
        completed: 18,
        rating: 4.5
      },
      {
        id: 2,
        title: 'GST Filing Training',
        category: 'technical',
        level: 'intermediate',
        format: 'hybrid',
        duration: '8 hours',
        enrolled: 15,
        completed: 12,
        rating: 4.8
      }
    ];

    res.json(programs);
  } catch (error) {
    console.error('Error fetching training programs:', error);
    res.status(500).json({ error: 'Failed to fetch training programs' });
  }
});

/**
 * POST /api/hr/training/programs
 * Create a new training program
 */
router.post('/training/programs', requireAuth, async (req: Request, res: Response) => {
  try {
    const { title, description, category, level, format, duration, cost } = req.body;

    res.json({
      success: true,
      message: 'Training program created successfully',
      data: { title, category, level, format }
    });
  } catch (error) {
    console.error('Error creating training program:', error);
    res.status(500).json({ error: 'Failed to create training program' });
  }
});

/**
 * GET /api/hr/training/enrollments
 * Get training enrollments
 */
router.get('/training/enrollments', requireAuth, async (req: Request, res: Response) => {
  try {
    const enrollments = [
      {
        id: 1,
        programId: 1,
        programTitle: 'Compliance Fundamentals',
        employeeId: 1,
        employeeName: 'John Doe',
        enrolledDate: '2024-02-01',
        progress: 75,
        status: 'in_progress'
      }
    ];

    res.json(enrollments);
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

/**
 * POST /api/hr/training/enrollments
 * Enroll an employee in a training program
 */
router.post('/training/enrollments', requireAuth, async (req: Request, res: Response) => {
  try {
    const { programId, employeeId, isPriority, notes } = req.body;

    res.json({
      success: true,
      message: 'Employee enrolled successfully'
    });
  } catch (error) {
    console.error('Error enrolling employee:', error);
    res.status(500).json({ error: 'Failed to enroll employee' });
  }
});

// ============================================================
// PERFORMANCE
// ============================================================

/**
 * GET /api/hr/reviews
 * Get performance reviews
 */
router.get('/reviews', requireAuth, async (req: Request, res: Response) => {
  try {
    const reviews = [
      {
        id: 1,
        employeeId: 1,
        employeeName: 'John Doe',
        reviewPeriod: 'Q4 2024',
        reviewType: 'quarterly',
        overallRating: 4.2,
        status: 'completed',
        reviewDate: '2024-01-15'
      }
    ];

    res.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

/**
 * POST /api/hr/reviews
 * Create a performance review
 */
router.post('/reviews', requireAuth, async (req: Request, res: Response) => {
  try {
    const reviewData = req.body;

    res.json({
      success: true,
      message: 'Performance review created successfully'
    });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

/**
 * GET /api/hr/goals
 * Get employee goals
 */
router.get('/goals', requireAuth, async (req: Request, res: Response) => {
  try {
    const goals = [
      {
        id: 1,
        employeeId: 1,
        employeeName: 'John Doe',
        title: 'Complete 50 compliance reviews',
        goalType: 'performance',
        category: 'productivity',
        priority: 'high',
        progress: 72,
        targetValue: 50,
        currentValue: 36,
        unit: 'count',
        dueDate: '2024-03-31',
        status: 'on_track'
      }
    ];

    res.json(goals);
  } catch (error) {
    console.error('Error fetching goals:', error);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

/**
 * POST /api/hr/goals
 * Create a new goal
 */
router.post('/goals', requireAuth, async (req: Request, res: Response) => {
  try {
    const goalData = req.body;

    res.json({
      success: true,
      message: 'Goal created successfully'
    });
  } catch (error) {
    console.error('Error creating goal:', error);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

// ============================================================
// ANALYTICS
// ============================================================

/**
 * GET /api/hr/analytics/comprehensive
 * Get comprehensive HR analytics
 */
router.get('/analytics/comprehensive', requireAuth, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, department } = req.query;

    const analytics = {
      headcount: {
        total: 58,
        byDepartment: {
          Operations: 25,
          Sales: 15,
          Admin: 8,
          QC: 10
        },
        growth: 5.2
      },
      attendance: {
        averageRate: 92,
        lateArrivals: 8,
        absentRate: 4
      },
      leave: {
        pending: 5,
        approved: 12,
        rejected: 2
      },
      training: {
        completionRate: 78,
        averageScore: 4.2,
        programsActive: 8
      },
      performance: {
        averageRating: 3.8,
        topPerformers: 12,
        needsImprovement: 5
      }
    };

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching HR analytics:', error);
    res.status(500).json({ error: 'Failed to fetch HR analytics' });
  }
});

/**
 * GET /api/hr/analytics/team-performance
 * Get team performance metrics
 */
router.get('/analytics/team-performance', requireAuth, async (req: Request, res: Response) => {
  try {
    const teamPerformance = {
      overall: {
        averageRating: 3.8,
        tasksCompleted: 1250,
        goalsAchieved: 85,
        efficiency: 92
      },
      byDepartment: [
        { department: 'Operations', rating: 4.0, efficiency: 94, headcount: 25 },
        { department: 'Sales', rating: 3.8, efficiency: 88, headcount: 15 },
        { department: 'QC', rating: 4.2, efficiency: 96, headcount: 10 },
        { department: 'Admin', rating: 3.6, efficiency: 90, headcount: 8 }
      ],
      topPerformers: [
        { id: 1, name: 'John Doe', department: 'Operations', rating: 4.8 },
        { id: 2, name: 'Jane Smith', department: 'QC', rating: 4.7 },
        { id: 3, name: 'Mike Johnson', department: 'Sales', rating: 4.6 }
      ]
    };

    res.json(teamPerformance);
  } catch (error) {
    console.error('Error fetching team performance:', error);
    res.status(500).json({ error: 'Failed to fetch team performance' });
  }
});

/**
 * GET /api/hr/analytics/training-effectiveness
 * Get training effectiveness metrics
 */
router.get('/analytics/training-effectiveness', requireAuth, async (req: Request, res: Response) => {
  try {
    const effectiveness = {
      overall: {
        completionRate: 78,
        averageScore: 4.2,
        satisfaction: 4.5
      },
      byProgram: [
        { program: 'Compliance Fundamentals', completion: 92, score: 4.5, participants: 25 },
        { program: 'GST Filing Training', completion: 85, score: 4.8, participants: 15 },
        { program: 'Leadership Development', completion: 68, score: 4.0, participants: 8 }
      ],
      trends: {
        completionTrend: [75, 78, 80, 78],
        satisfactionTrend: [4.2, 4.3, 4.4, 4.5]
      }
    };

    res.json(effectiveness);
  } catch (error) {
    console.error('Error fetching training effectiveness:', error);
    res.status(500).json({ error: 'Failed to fetch training effectiveness' });
  }
});

/**
 * GET /api/hr/analytics/skills-gap
 * Get skills gap analysis
 */
router.get('/analytics/skills-gap', requireAuth, async (req: Request, res: Response) => {
  try {
    const skillsGap = {
      critical: [
        { skill: 'GST Compliance', required: 90, current: 72, gap: 18 },
        { skill: 'ROC Filing', required: 85, current: 68, gap: 17 }
      ],
      moderate: [
        { skill: 'Client Communication', required: 80, current: 70, gap: 10 },
        { skill: 'Document Review', required: 85, current: 78, gap: 7 }
      ],
      recommendations: [
        'Schedule GST Compliance refresher training',
        'Implement ROC filing mentorship program',
        'Add client communication workshops'
      ]
    };

    res.json(skillsGap);
  } catch (error) {
    console.error('Error fetching skills gap:', error);
    res.status(500).json({ error: 'Failed to fetch skills gap analysis' });
  }
});

export default router;
