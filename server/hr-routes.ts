import { Request, Response } from 'express';
import { db } from './db';
import {
  operationsTeam, employeeSkills, skillsMaster, trainingPrograms, trainingEnrollments,
  performanceReviews, employeeGoals, attendanceRecords, leaveTypes, leaveBalances,
  leaveApplications, careerPaths, careerProgress, workloadMetrics, teamMetrics
} from '../shared/schema';
import { eq, and, or, desc, asc, sql, inArray, count, avg, sum, gte, lte } from 'drizzle-orm';
import {
  sessionAuthMiddleware,
  requireMinimumRole,
  USER_ROLES,
  AuthenticatedRequest
} from './rbac-middleware';

// ============================================================================
// EMPLOYEE MANAGEMENT ROUTES
// ============================================================================

export function registerHRRoutes(app: any) {
  // Apply authentication to all HR routes
  app.use('/api/hr', sessionAuthMiddleware);
  
  // ========== EMPLOYEE DIRECTORY ==========
  
  // Get all employees with comprehensive info
  app.get('/api/hr/employees', async (req: Request, res: Response) => {
    try {
      const { department, role, active = 'true', search, sortBy = 'name', order = 'asc' } = req.query;
      
      let whereConditions: any[] = [];
      
      if (department) {
        whereConditions.push(eq(operationsTeam.department, department as string));
      }
      
      if (role) {
        whereConditions.push(eq(operationsTeam.role, role as string));
      }
      
      if (active !== 'all') {
        whereConditions.push(eq(operationsTeam.isActive, active === 'true'));
      }
      
      if (search) {
        whereConditions.push(
          or(
            sql`${operationsTeam.name} ILIKE ${`%${search}%`}`,
            sql`${operationsTeam.email} ILIKE ${`%${search}%`}`,
            sql`${operationsTeam.employeeId} ILIKE ${`%${search}%`}`
          )
        );
      }
      
      const employees = await db.select({
        id: operationsTeam.id,
        employeeId: operationsTeam.employeeId,
        name: operationsTeam.name,
        email: operationsTeam.email,
        phone: operationsTeam.phone,
        department: operationsTeam.department,
        role: operationsTeam.role,
        joiningDate: operationsTeam.joiningDate,
        specialization: operationsTeam.specialization,
        workloadCapacity: operationsTeam.workloadCapacity,
        currentWorkload: operationsTeam.currentWorkload,
        performanceRating: operationsTeam.performanceRating,
        targetAchievement: operationsTeam.targetAchievement,
        managerId: operationsTeam.managerId,
        isActive: operationsTeam.isActive,
      })
      .from(operationsTeam)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(order === 'desc' ? desc(operationsTeam[sortBy as keyof typeof operationsTeam._.columns]) : asc(operationsTeam[sortBy as keyof typeof operationsTeam._.columns]));
      
      // Get skills count for each employee
      const employeesWithSkills = await Promise.all(employees.map(async (employee) => {
        const [skillsCount] = await db.select({ 
          count: sql<number>`count(*)::int` 
        })
        .from(employeeSkills)
        .where(eq(employeeSkills.employeeId, employee.id));
        
        return {
          ...employee,
          skillsCount: skillsCount.count
        };
      }));
      
      res.json(employeesWithSkills);
    } catch (error) {
      console.error('Error fetching employees:', error);
      res.status(500).json({ error: 'Failed to fetch employees' });
    }
  });
  
  // Get single employee details
  app.get('/api/hr/employees/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const [employee] = await db.select()
        .from(operationsTeam)
        .where(eq(operationsTeam.id, parseInt(id)));
      
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      
      res.json(employee);
    } catch (error) {
      console.error('Error fetching employee:', error);
      res.status(500).json({ error: 'Failed to fetch employee' });
    }
  });
  
  // Create new employee
  app.post('/api/hr/employees', async (req: Request, res: Response) => {
    try {
      const employeeData = req.body;
      
      // Generate employee ID
      const lastEmployee = await db.select({ employeeId: operationsTeam.employeeId })
        .from(operationsTeam)
        .orderBy(desc(operationsTeam.id))
        .limit(1);
      
      let nextId = 1;
      if (lastEmployee.length > 0) {
        const lastIdNumber = parseInt(lastEmployee[0].employeeId.replace('EMP', ''));
        nextId = lastIdNumber + 1;
      }
      
      const newEmployeeId = `EMP${nextId.toString().padStart(3, '0')}`;
      
      const [newEmployee] = await db.insert(operationsTeam)
        .values({
          ...employeeData,
          employeeId: newEmployeeId
        })
        .returning();
      
      res.json(newEmployee);
    } catch (error) {
      console.error('Error creating employee:', error);
      res.status(500).json({ error: 'Failed to create employee' });
    }
  });
  
  // Update employee
  app.put('/api/hr/employees/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const [updatedEmployee] = await db.update(operationsTeam)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(operationsTeam.id, parseInt(id)))
        .returning();
      
      if (!updatedEmployee) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      
      res.json(updatedEmployee);
    } catch (error) {
      console.error('Error updating employee:', error);
      res.status(500).json({ error: 'Failed to update employee' });
    }
  });

  // Delete (soft delete) employee
  app.delete('/api/hr/employees/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Soft delete - set isActive to false instead of hard delete
      const [employee] = await db.update(operationsTeam)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(operationsTeam.id, parseInt(id)))
        .returning();

      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      res.json({
        success: true,
        message: 'Employee deactivated successfully',
        employee,
      });
    } catch (error) {
      console.error('Error deleting employee:', error);
      res.status(500).json({ error: 'Failed to delete employee' });
    }
  });

  // ========== SKILLS MANAGEMENT ==========
  
  // Get employee skills
  app.get('/api/hr/employees/:id/skills', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const skills = await db.select({
        id: employeeSkills.id,
        skillCategory: employeeSkills.skillCategory,
        skillName: employeeSkills.skillName,
        proficiencyLevel: employeeSkills.proficiencyLevel,
        experienceYears: employeeSkills.experienceYears,
        certificationLevel: employeeSkills.certificationLevel,
        isVerified: employeeSkills.isVerified,
        lastAssessed: employeeSkills.lastAssessed,
        targetProficiency: employeeSkills.targetProficiency,
        developmentPlan: employeeSkills.developmentPlan
      })
      .from(employeeSkills)
      .where(eq(employeeSkills.employeeId, parseInt(id)))
      .orderBy(asc(employeeSkills.skillCategory), asc(employeeSkills.skillName));
      
      res.json(skills);
    } catch (error) {
      console.error('Error fetching employee skills:', error);
      res.status(500).json({ error: 'Failed to fetch employee skills' });
    }
  });
  
  // Add skill to employee
  app.post('/api/hr/employees/:id/skills', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const skillData = req.body;
      
      const [newSkill] = await db.insert(employeeSkills)
        .values({
          employeeId: parseInt(id),
          ...skillData
        })
        .returning();
      
      res.json(newSkill);
    } catch (error) {
      console.error('Error adding skill:', error);
      res.status(500).json({ error: 'Failed to add skill' });
    }
  });
  
  // Update employee skill
  app.put('/api/hr/skills/:skillId', async (req: Request, res: Response) => {
    try {
      const { skillId } = req.params;
      const updateData = req.body;
      
      const [updatedSkill] = await db.update(employeeSkills)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(employeeSkills.id, parseInt(skillId)))
        .returning();
      
      res.json(updatedSkill);
    } catch (error) {
      console.error('Error updating skill:', error);
      res.status(500).json({ error: 'Failed to update skill' });
    }
  });
  
  // Get skills master list
  app.get('/api/hr/skills/master', async (req: Request, res: Response) => {
    try {
      const { category, search } = req.query;
      
      let whereConditions: any[] = [eq(skillsMaster.isActive, true)];
      
      if (category) {
        whereConditions.push(eq(skillsMaster.category, category as string));
      }
      
      if (search) {
        whereConditions.push(
          sql`${skillsMaster.skillName} ILIKE ${`%${search}%`}`
        );
      }
      
      const skills = await db.select()
        .from(skillsMaster)
        .where(and(...whereConditions))
        .orderBy(asc(skillsMaster.category), asc(skillsMaster.skillName));
      
      res.json(skills);
    } catch (error) {
      console.error('Error fetching skills master:', error);
      res.status(500).json({ error: 'Failed to fetch skills master' });
    }
  });
  
  // ========== TRAINING PROGRAMS ==========
  
  // Get all training programs
  app.get('/api/hr/training/programs', async (req: Request, res: Response) => {
    try {
      const { category, level, format, active = 'true' } = req.query;
      
      let whereConditions: any[] = [];
      
      if (category) {
        whereConditions.push(eq(trainingPrograms.category, category as string));
      }
      
      if (level) {
        whereConditions.push(eq(trainingPrograms.level, level as string));
      }
      
      if (format) {
        whereConditions.push(eq(trainingPrograms.format, format as string));
      }
      
      if (active !== 'all') {
        whereConditions.push(eq(trainingPrograms.isActive, active === 'true'));
      }
      
      const programs = await db.select()
        .from(trainingPrograms)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc(trainingPrograms.createdAt));
      
      res.json(programs);
    } catch (error) {
      console.error('Error fetching training programs:', error);
      res.status(500).json({ error: 'Failed to fetch training programs' });
    }
  });
  
  // Create training program
  app.post('/api/hr/training/programs', async (req: Request, res: Response) => {
    try {
      const programData = req.body;
      
      // Generate program code
      const category = programData.category.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
      const count = await db.select({ count: sql<number>`count(*)::int` })
        .from(trainingPrograms);
      
      const programCode = `${category}${(count[0].count + 1).toString().padStart(3, '0')}`;
      
      const [newProgram] = await db.insert(trainingPrograms)
        .values({
          ...programData,
          programCode
        })
        .returning();
      
      res.json(newProgram);
    } catch (error) {
      console.error('Error creating training program:', error);
      res.status(500).json({ error: 'Failed to create training program' });
    }
  });
  
  // Enroll employee in training
  app.post('/api/hr/training/enroll', async (req: Request, res: Response) => {
    try {
      const { employeeId, programId, startDate, isPriority } = req.body;
      
      // Check if already enrolled
      const existing = await db.select()
        .from(trainingEnrollments)
        .where(and(
          eq(trainingEnrollments.employeeId, employeeId),
          eq(trainingEnrollments.programId, programId),
          inArray(trainingEnrollments.status, ['enrolled', 'in_progress'])
        ));
      
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Employee already enrolled in this program' });
      }
      
      const [enrollment] = await db.insert(trainingEnrollments)
        .values({
          employeeId,
          programId,
          startDate: startDate ? new Date(startDate) : null,
          isPriority: isPriority || false
        })
        .returning();
      
      res.json(enrollment);
    } catch (error) {
      console.error('Error enrolling in training:', error);
      res.status(500).json({ error: 'Failed to enroll in training' });
    }
  });
  
  // Get employee training enrollments
  app.get('/api/hr/employees/:id/training', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const enrollments = await db.select({
        id: trainingEnrollments.id,
        programId: trainingEnrollments.programId,
        programTitle: trainingPrograms.title,
        programCategory: trainingPrograms.category,
        enrollmentDate: trainingEnrollments.enrollmentDate,
        startDate: trainingEnrollments.startDate,
        completionDate: trainingEnrollments.completionDate,
        status: trainingEnrollments.status,
        progress: trainingEnrollments.progress,
        assessmentScore: trainingEnrollments.assessmentScore,
        certificationIssued: trainingEnrollments.certificationIssued,
        isPriority: trainingEnrollments.isPriority
      })
      .from(trainingEnrollments)
      .innerJoin(trainingPrograms, eq(trainingEnrollments.programId, trainingPrograms.id))
      .where(eq(trainingEnrollments.employeeId, parseInt(id)))
      .orderBy(desc(trainingEnrollments.enrollmentDate));
      
      res.json(enrollments);
    } catch (error) {
      console.error('Error fetching training enrollments:', error);
      res.status(500).json({ error: 'Failed to fetch training enrollments' });
    }
  });
  
  // Update training progress
  app.put('/api/hr/training/enrollments/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const [updated] = await db.update(trainingEnrollments)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(trainingEnrollments.id, parseInt(id)))
        .returning();
      
      res.json(updated);
    } catch (error) {
      console.error('Error updating training enrollment:', error);
      res.status(500).json({ error: 'Failed to update training enrollment' });
    }
  });
  
  // ========== PERFORMANCE MANAGEMENT ==========
  
  // Get employee performance reviews
  app.get('/api/hr/employees/:id/reviews', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const reviews = await db.select()
        .from(performanceReviews)
        .where(eq(performanceReviews.employeeId, parseInt(id)))
        .orderBy(desc(performanceReviews.startDate));
      
      res.json(reviews);
    } catch (error) {
      console.error('Error fetching performance reviews:', error);
      res.status(500).json({ error: 'Failed to fetch performance reviews' });
    }
  });
  
  // Create performance review
  app.post('/api/hr/reviews', async (req: Request, res: Response) => {
    try {
      const reviewData = req.body;
      
      const [newReview] = await db.insert(performanceReviews)
        .values(reviewData)
        .returning();
      
      res.json(newReview);
    } catch (error) {
      console.error('Error creating performance review:', error);
      res.status(500).json({ error: 'Failed to create performance review' });
    }
  });
  
  // Update performance review
  app.put('/api/hr/reviews/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const [updated] = await db.update(performanceReviews)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(performanceReviews.id, parseInt(id)))
        .returning();
      
      res.json(updated);
    } catch (error) {
      console.error('Error updating performance review:', error);
      res.status(500).json({ error: 'Failed to update performance review' });
    }
  });
  
  // Get employee goals
  app.get('/api/hr/employees/:id/goals', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, goalType } = req.query;
      
      let whereConditions = [eq(employeeGoals.employeeId, parseInt(id))];
      
      if (status) {
        whereConditions.push(eq(employeeGoals.status, status as string));
      }
      
      if (goalType) {
        whereConditions.push(eq(employeeGoals.goalType, goalType as string));
      }
      
      const goals = await db.select()
        .from(employeeGoals)
        .where(and(...whereConditions))
        .orderBy(desc(employeeGoals.createdAt));
      
      res.json(goals);
    } catch (error) {
      console.error('Error fetching employee goals:', error);
      res.status(500).json({ error: 'Failed to fetch employee goals' });
    }
  });
  
  // Create employee goal
  app.post('/api/hr/goals', async (req: Request, res: Response) => {
    try {
      const goalData = req.body;
      
      const [newGoal] = await db.insert(employeeGoals)
        .values(goalData)
        .returning();
      
      res.json(newGoal);
    } catch (error) {
      console.error('Error creating goal:', error);
      res.status(500).json({ error: 'Failed to create goal' });
    }
  });
  
  // Update goal progress
  app.put('/api/hr/goals/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const [updated] = await db.update(employeeGoals)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(employeeGoals.id, parseInt(id)))
        .returning();
      
      res.json(updated);
    } catch (error) {
      console.error('Error updating goal:', error);
      res.status(500).json({ error: 'Failed to update goal' });
    }
  });
  
  // ========== ATTENDANCE MANAGEMENT ==========
  
  // Get employee attendance
  app.get('/api/hr/employees/:id/attendance', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { startDate, endDate, status } = req.query;
      
      let whereConditions = [eq(attendanceRecords.employeeId, parseInt(id))];
      
      if (startDate) {
        whereConditions.push(gte(attendanceRecords.attendanceDate, new Date(startDate as string)));
      }
      
      if (endDate) {
        whereConditions.push(lte(attendanceRecords.attendanceDate, new Date(endDate as string)));
      }
      
      if (status) {
        whereConditions.push(eq(attendanceRecords.status, status as string));
      }
      
      const attendance = await db.select()
        .from(attendanceRecords)
        .where(and(...whereConditions))
        .orderBy(desc(attendanceRecords.attendanceDate));
      
      res.json(attendance);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      res.status(500).json({ error: 'Failed to fetch attendance' });
    }
  });
  
  // Mark attendance
  app.post('/api/hr/attendance', async (req: Request, res: Response) => {
    try {
      const attendanceData = req.body;
      
      // Check if attendance already exists for this date
      const existing = await db.select()
        .from(attendanceRecords)
        .where(and(
          eq(attendanceRecords.employeeId, attendanceData.employeeId),
          eq(attendanceRecords.attendanceDate, new Date(attendanceData.attendanceDate))
        ));
      
      if (existing.length > 0) {
        // Update existing record
        const [updated] = await db.update(attendanceRecords)
          .set({
            ...attendanceData,
            updatedAt: new Date()
          })
          .where(eq(attendanceRecords.id, existing[0].id))
          .returning();
        
        res.json(updated);
      } else {
        // Create new record
        const [newRecord] = await db.insert(attendanceRecords)
          .values(attendanceData)
          .returning();
        
        res.json(newRecord);
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      res.status(500).json({ error: 'Failed to mark attendance' });
    }
  });
  
  // ========== LEAVE MANAGEMENT ==========
  
  // Get leave types
  app.get('/api/hr/leave/types', async (req: Request, res: Response) => {
    try {
      const leaveTypesData = await db.select()
        .from(leaveTypes)
        .where(eq(leaveTypes.isActive, true))
        .orderBy(asc(leaveTypes.typeName));
      
      res.json(leaveTypesData);
    } catch (error) {
      console.error('Error fetching leave types:', error);
      res.status(500).json({ error: 'Failed to fetch leave types' });
    }
  });
  
  // Get employee leave balance
  app.get('/api/hr/employees/:id/leave/balance', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { year = new Date().getFullYear() } = req.query;
      
      const balances = await db.select({
        id: leaveBalances.id,
        leaveTypeId: leaveBalances.leaveTypeId,
        typeName: leaveTypes.typeName,
        totalAllocated: leaveBalances.totalAllocated,
        utilized: leaveBalances.utilized,
        pending: leaveBalances.pending,
        available: leaveBalances.available,
        carriedForward: leaveBalances.carriedForward
      })
      .from(leaveBalances)
      .innerJoin(leaveTypes, eq(leaveBalances.leaveTypeId, leaveTypes.id))
      .where(and(
        eq(leaveBalances.employeeId, parseInt(id)),
        eq(leaveBalances.year, parseInt(year as string))
      ));
      
      res.json(balances);
    } catch (error) {
      console.error('Error fetching leave balance:', error);
      res.status(500).json({ error: 'Failed to fetch leave balance' });
    }
  });
  
  // Apply for leave
  app.post('/api/hr/leave/apply', async (req: Request, res: Response) => {
    try {
      const leaveData = req.body;
      
      // Generate application number
      const count = await db.select({ count: sql<number>`count(*)::int` })
        .from(leaveApplications);
      
      const applicationNumber = `LA${new Date().getFullYear()}${(count[0].count + 1).toString().padStart(4, '0')}`;
      
      const [application] = await db.insert(leaveApplications)
        .values({
          ...leaveData,
          applicationNumber
        })
        .returning();
      
      res.json(application);
    } catch (error) {
      console.error('Error applying for leave:', error);
      res.status(500).json({ error: 'Failed to apply for leave' });
    }
  });
  
  // Get leave applications
  app.get('/api/hr/employees/:id/leave/applications', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, year } = req.query;
      
      let whereConditions = [eq(leaveApplications.employeeId, parseInt(id))];
      
      if (status) {
        whereConditions.push(eq(leaveApplications.status, status as string));
      }
      
      if (year) {
        whereConditions.push(
          sql`EXTRACT(YEAR FROM ${leaveApplications.fromDate}) = ${parseInt(year as string)}`
        );
      }
      
      const applications = await db.select({
        id: leaveApplications.id,
        applicationNumber: leaveApplications.applicationNumber,
        leaveTypeId: leaveApplications.leaveTypeId,
        typeName: leaveTypes.typeName,
        fromDate: leaveApplications.fromDate,
        toDate: leaveApplications.toDate,
        totalDays: leaveApplications.totalDays,
        reason: leaveApplications.reason,
        status: leaveApplications.status,
        appliedDate: leaveApplications.appliedDate,
        approvedDate: leaveApplications.approvedDate,
        rejectionReason: leaveApplications.rejectionReason
      })
      .from(leaveApplications)
      .innerJoin(leaveTypes, eq(leaveApplications.leaveTypeId, leaveTypes.id))
      .where(and(...whereConditions))
      .orderBy(desc(leaveApplications.appliedDate));
      
      res.json(applications);
    } catch (error) {
      console.error('Error fetching leave applications:', error);
      res.status(500).json({ error: 'Failed to fetch leave applications' });
    }
  });
  
  // Approve/Reject leave
  app.put('/api/hr/leave/applications/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, rejectionReason, approvedBy } = req.body;
      
      const updateData: any = {
        status,
        updatedAt: new Date()
      };
      
      if (status === 'approved') {
        updateData.approvedBy = approvedBy;
        updateData.approvedDate = new Date();
      } else if (status === 'rejected') {
        updateData.rejectionReason = rejectionReason;
      }
      
      const [updated] = await db.update(leaveApplications)
        .set(updateData)
        .where(eq(leaveApplications.id, parseInt(id)))
        .returning();
      
      res.json(updated);
    } catch (error) {
      console.error('Error updating leave application:', error);
      res.status(500).json({ error: 'Failed to update leave application' });
    }
  });
  
  // ========== ANALYTICS AND REPORTING ==========
  
  // Get team performance dashboard
  app.get('/api/hr/analytics/team-performance', async (req: Request, res: Response) => {
    try {
      const { department, period = 'monthly' } = req.query;
      
      let whereConditions: any[] = [eq(operationsTeam.isActive, true)];
      
      if (department) {
        whereConditions.push(eq(operationsTeam.department, department as string));
      }
      
      // Get team overview
      const teamOverview = await db.select({
        totalEmployees: sql<number>`count(*)::int`,
        averagePerformance: sql<number>`AVG(${operationsTeam.performanceRating})`,
        averageWorkload: sql<number>`AVG(${operationsTeam.currentWorkload})`,
        averageCapacity: sql<number>`AVG(${operationsTeam.workloadCapacity})`
      })
      .from(operationsTeam)
      .where(and(...whereConditions));
      
      // Get department breakdown
      const departmentBreakdown = await db.select({
        department: operationsTeam.department,
        count: sql<number>`count(*)::int`,
        avgPerformance: sql<number>`AVG(${operationsTeam.performanceRating})`
      })
      .from(operationsTeam)
      .where(eq(operationsTeam.isActive, true))
      .groupBy(operationsTeam.department);
      
      // Get recent performance reviews
      const recentReviews = await db.select({
        count: sql<number>`count(*)::int`,
        avgRating: sql<number>`AVG(${performanceReviews.overallRating})`
      })
      .from(performanceReviews)
      .where(gte(performanceReviews.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
      
      res.json({
        overview: teamOverview[0],
        departmentBreakdown,
        recentReviews: recentReviews[0]
      });
    } catch (error) {
      console.error('Error fetching team performance analytics:', error);
      res.status(500).json({ error: 'Failed to fetch team performance analytics' });
    }
  });
  
  // Get skills gap analysis
  app.get('/api/hr/analytics/skills-gap', async (req: Request, res: Response) => {
    try {
      const { department } = req.query;
      
      // Get most common skills
      const topSkills = await db.select({
        skillName: employeeSkills.skillName,
        skillCategory: employeeSkills.skillCategory,
        employeeCount: sql<number>`count(DISTINCT ${employeeSkills.employeeId})::int`,
        avgProficiency: sql<number>`AVG(${employeeSkills.proficiencyLevel})`
      })
      .from(employeeSkills)
      .groupBy(employeeSkills.skillName, employeeSkills.skillCategory)
      .orderBy(sql`count(DISTINCT ${employeeSkills.employeeId}) DESC`)
      .limit(20);
      
      // Get skills with low proficiency
      const skillsNeedingImprovement = await db.select({
        skillName: employeeSkills.skillName,
        skillCategory: employeeSkills.skillCategory,
        employeeCount: sql<number>`count(*)::int`,
        avgProficiency: sql<number>`AVG(${employeeSkills.proficiencyLevel})`
      })
      .from(employeeSkills)
      .where(lte(employeeSkills.proficiencyLevel, 2))
      .groupBy(employeeSkills.skillName, employeeSkills.skillCategory)
      .having(sql`count(*) >= 2`)
      .orderBy(sql`count(*) DESC`);
      
      res.json({
        topSkills,
        skillsNeedingImprovement
      });
    } catch (error) {
      console.error('Error fetching skills gap analysis:', error);
      res.status(500).json({ error: 'Failed to fetch skills gap analysis' });
    }
  });
  
  // Get training effectiveness
  app.get('/api/hr/analytics/training-effectiveness', async (req: Request, res: Response) => {
    try {
      const trainingStats = await db.select({
        totalPrograms: sql<number>`count(DISTINCT ${trainingPrograms.id})::int`,
        totalEnrollments: sql<number>`count(*)::int`,
        completedTraining: sql<number>`count(CASE WHEN ${trainingEnrollments.status} = 'completed' THEN 1 END)::int`,
        avgScore: sql<number>`AVG(${trainingEnrollments.assessmentScore})`,
        avgProgress: sql<number>`AVG(${trainingEnrollments.progress})`
      })
      .from(trainingEnrollments)
      .innerJoin(trainingPrograms, eq(trainingEnrollments.programId, trainingPrograms.id));
      
      // Programs by completion rate
      const programEffectiveness = await db.select({
        programTitle: trainingPrograms.title,
        category: trainingPrograms.category,
        enrollments: sql<number>`count(*)::int`,
        completed: sql<number>`count(CASE WHEN ${trainingEnrollments.status} = 'completed' THEN 1 END)::int`,
        avgScore: sql<number>`AVG(${trainingEnrollments.assessmentScore})`
      })
      .from(trainingEnrollments)
      .innerJoin(trainingPrograms, eq(trainingEnrollments.programId, trainingPrograms.id))
      .groupBy(trainingPrograms.id, trainingPrograms.title, trainingPrograms.category)
      .having(sql`count(*) >= 2`)
      .orderBy(sql`count(CASE WHEN ${trainingEnrollments.status} = 'completed' THEN 1 END) DESC`);
      
      res.json({
        overview: trainingStats[0],
        programEffectiveness
      });
    } catch (error) {
      console.error('Error fetching training effectiveness:', error);
      res.status(500).json({ error: 'Failed to fetch training effectiveness' });
    }
  });
  
  console.log('✅ HR Management routes registered');
}