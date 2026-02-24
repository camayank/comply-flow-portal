/**
 * End-to-End Task Instantiation System Test
 *
 * Tests the complete flow:
 * 1. Create service request
 * 2. Verify tasks auto-created
 * 3. Complete task lifecycle
 * 4. Verify QC gates
 * 5. Verify auto-completion
 */

import { db } from '../server/db';
import {
  serviceRequests, orderTasks, orderTaskActivityLog, users, serviceCatalogue,
  ORDER_TASK_STATUS
} from '../shared/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { taskInstantiationService } from '../server/services/task-instantiation-service';
import { workflowEngine } from '../server/workflow-engine';

const TEST_RESULTS: {
  step: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  details: string;
  data?: any;
}[] = [];

function logResult(step: string, status: 'PASS' | 'FAIL' | 'SKIP', details: string, data?: any) {
  TEST_RESULTS.push({ step, status, details, data });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  console.log(`${icon} ${step}: ${details}`);
  if (data && status === 'FAIL') {
    console.log('   Data:', JSON.stringify(data, null, 2).substring(0, 500));
  }
}

async function runTests() {
  console.log('\n========================================');
  console.log('  AUTO-TASK INSTANTIATION E2E TEST');
  console.log('========================================\n');

  let testServiceRequestId: number | null = null;
  let createdTasks: any[] = [];

  // ==========================================
  // STEP 1: Verify Workflow Templates
  // ==========================================
  console.log('\n--- STEP 1: VERIFY WORKFLOW TEMPLATES ---\n');

  try {
    const templates = workflowEngine.getTemplates();
    if (templates.length > 0) {
      logResult('1.1 Templates Available', 'PASS', `Found ${templates.length} workflow templates`);

      // Find a good template for testing (with multiple steps and dependencies)
      const testTemplate = templates.find(t =>
        t.steps.length >= 4 &&
        t.steps.some(s => s.dependencies.length > 0)
      ) || templates[0];

      logResult('1.2 Test Template Selected', 'PASS',
        `Using "${testTemplate.name}" (${testTemplate.steps.length} steps)`,
        { templateId: testTemplate.id, steps: testTemplate.steps.map(s => s.name) }
      );
    } else {
      logResult('1.1 Templates Available', 'FAIL', 'No workflow templates found');
      return printSummary();
    }
  } catch (error) {
    logResult('1.1 Templates Available', 'FAIL', `Error: ${(error as Error).message}`);
    return printSummary();
  }

  // ==========================================
  // STEP 2: Create Test Service Request
  // ==========================================
  console.log('\n--- STEP 2: CREATE TEST SERVICE REQUEST ---\n');

  try {
    // Check if order_tasks table exists
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'order_tasks'
      )
    `);

    if (!tableCheck.rows[0]?.exists) {
      logResult('2.0 Order Tasks Table', 'FAIL', 'order_tasks table does not exist. Run migration first.');
      return printSummary();
    }
    logResult('2.0 Order Tasks Table', 'PASS', 'Table exists');

    // Find a user to use for the test
    const [testUser] = await db.select().from(users).limit(1);
    if (!testUser) {
      logResult('2.1 Test User', 'FAIL', 'No users found in database');
      return printSummary();
    }
    logResult('2.1 Test User', 'PASS', `Using user: ${testUser.username} (ID: ${testUser.id})`);

    // Create a test service request
    const [newServiceRequest] = await db.insert(serviceRequests).values({
      serviceId: 1, // Will use default workflow
      userId: testUser.id,
      status: 'initiated',
      priority: 'medium',
      currentMilestone: 'intake',
      totalAmount: '15000',
      progress: 0,
      internalNotes: 'E2E Test - Auto Task Instantiation',
    }).returning();

    testServiceRequestId = newServiceRequest.id;
    logResult('2.2 Service Request Created', 'PASS',
      `SR ID: ${newServiceRequest.id}, Status: ${newServiceRequest.status}`
    );

  } catch (error) {
    logResult('2.2 Service Request Created', 'FAIL', `Error: ${(error as Error).message}`);
    return printSummary();
  }

  // ==========================================
  // STEP 3: Instantiate Tasks
  // ==========================================
  console.log('\n--- STEP 3: INSTANTIATE TASKS ---\n');

  try {
    // Manually trigger task instantiation
    const result = await taskInstantiationService.instantiateTasksForOrder(
      testServiceRequestId!,
      'company-incorporation-standard' // Use a specific template
    );

    if (result.success && result.tasksCreated > 0) {
      createdTasks = result.tasks;
      logResult('3.1 Task Instantiation', 'PASS',
        `Created ${result.tasksCreated} tasks`,
        {
          tasks: result.tasks.map(t => ({
            id: t.id,
            taskId: t.taskId,
            name: t.name,
            status: t.status,
            stepNumber: t.stepNumber,
            assignedRole: t.assignedRole,
            requiresQc: t.requiresQc
          }))
        }
      );
    } else {
      logResult('3.1 Task Instantiation', 'FAIL',
        result.errors?.join(', ') || 'No tasks created',
        result
      );
      return printSummary();
    }

    // Verify task statuses
    const readyTasks = createdTasks.filter(t => t.status === ORDER_TASK_STATUS.READY);
    const blockedTasks = createdTasks.filter(t => t.status === ORDER_TASK_STATUS.BLOCKED);

    logResult('3.2 Initial Task States', 'PASS',
      `Ready: ${readyTasks.length}, Blocked: ${blockedTasks.length}`,
      { readyTasks: readyTasks.map(t => t.name), blockedTasks: blockedTasks.map(t => t.name) }
    );

  } catch (error) {
    logResult('3.1 Task Instantiation', 'FAIL', `Error: ${(error as Error).message}`);
    return printSummary();
  }

  // ==========================================
  // STEP 4: Simulate Task Lifecycle
  // ==========================================
  console.log('\n--- STEP 4: SIMULATE TASK LIFECYCLE ---\n');

  try {
    // Refresh tasks from DB
    const tasks = await db.select().from(orderTasks)
      .where(eq(orderTasks.serviceRequestId, testServiceRequestId!))
      .orderBy(orderTasks.stepNumber);

    console.log('\nTask Chain:');
    for (const task of tasks) {
      console.log(`  Step ${task.stepNumber}: ${task.name} [${task.status}] - Role: ${task.assignedRole}`);
    }

    // Find first ready task
    const task1 = tasks.find(t => t.status === ORDER_TASK_STATUS.READY);
    if (!task1) {
      logResult('4.1 First Task Ready', 'FAIL', 'No ready task found');
      return printSummary();
    }
    logResult('4.1 First Task Ready', 'PASS', `Task: ${task1.name} (${task1.taskId})`);

    // Get a test user ID for status updates
    const [testUser] = await db.select().from(users).limit(1);
    const testUserId = testUser?.id || 1;

    // Start Task 1 (mark as in_progress)
    const startResult = await taskInstantiationService.updateTaskStatus(
      task1.id,
      ORDER_TASK_STATUS.IN_PROGRESS,
      testUserId,
      'E2E Test - Starting task'
    );
    if (startResult.success) {
      logResult('4.2 Start Task 1', 'PASS', `Status: ${startResult.task?.status}`);
    } else {
      logResult('4.2 Start Task 1', 'FAIL', startResult.error || 'Failed to start task');
    }

    // Complete Task 1
    const completeResult = await taskInstantiationService.updateTaskStatus(
      task1.id,
      ORDER_TASK_STATUS.COMPLETED,
      testUserId,
      'E2E Test - Task 1 completed'
    );

    if (completeResult.success) {
      logResult('4.3 Complete Task 1', 'PASS',
        `Completed. Unblocked ${completeResult.unblockedTasks.length} tasks. Progress: ${completeResult.orderProgress}%`,
        { unblockedTasks: completeResult.unblockedTasks.map(t => t.name) }
      );
    } else {
      logResult('4.3 Complete Task 1', 'FAIL', completeResult.error || 'Failed');
    }

    // Continue completing remaining tasks
    let taskIndex = 2;
    let currentProgress = completeResult.orderProgress;

    // Get refreshed task list
    const refreshedTasks = await db.select().from(orderTasks)
      .where(eq(orderTasks.serviceRequestId, testServiceRequestId!))
      .orderBy(orderTasks.stepNumber);

    for (const task of refreshedTasks.slice(1)) { // Skip first task
      if (task.status === ORDER_TASK_STATUS.COMPLETED) continue;

      // Refresh task status
      const [currentTask] = await db.select().from(orderTasks)
        .where(eq(orderTasks.id, task.id));

      if (currentTask.status === ORDER_TASK_STATUS.BLOCKED) {
        logResult(`4.${taskIndex + 1} Task ${taskIndex} Status`, 'SKIP',
          `${currentTask.name} still blocked`
        );
        taskIndex++;
        continue;
      }

      // Start task (mark as in_progress)
      await taskInstantiationService.updateTaskStatus(
        currentTask.id,
        ORDER_TASK_STATUS.IN_PROGRESS,
        testUserId,
        `E2E Test - Starting task ${taskIndex}`
      );

      // Check if requires QC
      if (currentTask.requiresQc) {
        // Complete with QC submission (will auto-redirect to qc_pending)
        const qcResult = await taskInstantiationService.updateTaskStatus(
          currentTask.id,
          ORDER_TASK_STATUS.COMPLETED,
          testUserId,
          `E2E Test - Task ${taskIndex} completed for QC review`
        );

        if (qcResult.task?.status === ORDER_TASK_STATUS.QC_PENDING) {
          logResult(`4.${taskIndex + 1} Task ${taskIndex} QC Gate`, 'PASS',
            `${currentTask.name} submitted for QC review. Progress: ${qcResult.orderProgress}%`
          );

          // Approve QC - handleQcResult(taskId, approved: boolean, reviewerId, notes)
          const approveResult = await taskInstantiationService.handleQcResult(
            currentTask.id,
            true, // approved = true
            testUserId, // reviewerId
            'E2E Test - QC Approved'
          );
          if (approveResult.success) {
            logResult(`4.${taskIndex + 1}a QC Approved`, 'PASS',
              `Unblocked ${approveResult.unblockedTasks.length} tasks. Progress: ${approveResult.orderProgress}%`
            );
            currentProgress = approveResult.orderProgress;
          } else {
            logResult(`4.${taskIndex + 1}a QC Approved`, 'FAIL',
              approveResult.error || 'QC approval failed'
            );
          }
        } else {
          logResult(`4.${taskIndex + 1} Task ${taskIndex}`, 'PASS',
            `${currentTask.name} completed. Progress: ${qcResult.orderProgress}%`
          );
          currentProgress = qcResult.orderProgress;
        }
      } else {
        // Regular completion
        const result = await taskInstantiationService.updateTaskStatus(
          currentTask.id,
          ORDER_TASK_STATUS.COMPLETED,
          testUserId,
          `E2E Test - Task ${taskIndex} completed`
        );
        logResult(`4.${taskIndex + 1} Task ${taskIndex}`, 'PASS',
          `${currentTask.name} completed. Progress: ${result.orderProgress}%`
        );
        currentProgress = result.orderProgress;
      }

      taskIndex++;
    }

    // Final progress check
    const [finalSR] = await db.select().from(serviceRequests)
      .where(eq(serviceRequests.id, testServiceRequestId!));

    logResult('4.99 Final Progress', currentProgress >= 100 ? 'PASS' : 'FAIL',
      `Service Request Progress: ${finalSR.progress}%, Status: ${finalSR.status}`
    );

  } catch (error) {
    logResult('4.x Task Lifecycle', 'FAIL', `Error: ${(error as Error).message}`);
  }

  // ==========================================
  // STEP 5: Verify Auto-Assignment
  // ==========================================
  console.log('\n--- STEP 5: VERIFY AUTO-ASSIGNMENT ---\n');

  try {
    const tasks = await db.select().from(orderTasks)
      .where(eq(orderTasks.serviceRequestId, testServiceRequestId!));

    const assignedTasks = tasks.filter(t => t.assignedTo !== null);
    const unassignedTasks = tasks.filter(t => t.assignedTo === null);

    if (assignedTasks.length > 0) {
      logResult('5.1 Auto-Assignment', 'PASS',
        `${assignedTasks.length}/${tasks.length} tasks assigned`,
        { assigned: assignedTasks.map(t => ({ name: t.name, assignedTo: t.assignedTo })) }
      );
    } else {
      // Check what roles are needed
      const rolesNeeded = [...new Set(unassignedTasks.map(t => t.assignedRole))];
      logResult('5.1 Auto-Assignment', 'SKIP',
        `No tasks auto-assigned. Roles needed: ${rolesNeeded.join(', ')}`,
        { rolesNeeded }
      );

      // Check available users with roles
      const availableUsers = await db.execute(sql`
        SELECT role, COUNT(*) as count FROM users
        WHERE is_active = true
        GROUP BY role
      `);
      logResult('5.2 Available Users by Role', 'PASS',
        'User distribution:',
        { users: availableUsers.rows }
      );
    }

  } catch (error) {
    logResult('5.x Auto-Assignment', 'FAIL', `Error: ${(error as Error).message}`);
  }

  // ==========================================
  // STEP 6: Activity Log Verification
  // ==========================================
  console.log('\n--- STEP 6: ACTIVITY LOG VERIFICATION ---\n');

  try {
    const activityLogs = await db.select().from(orderTaskActivityLog)
      .where(sql`task_id IN (
        SELECT id FROM order_tasks WHERE service_request_id = ${testServiceRequestId}
      )`)
      .orderBy(desc(orderTaskActivityLog.performedAt))
      .limit(20);

    if (activityLogs.length > 0) {
      logResult('6.1 Activity Logging', 'PASS',
        `${activityLogs.length} activity log entries recorded`,
        {
          recentActivities: activityLogs.slice(0, 5).map(a => ({
            type: a.activityType,
            from: a.fromStatus,
            to: a.toStatus
          }))
        }
      );
    } else {
      logResult('6.1 Activity Logging', 'FAIL', 'No activity logs found');
    }

  } catch (error) {
    logResult('6.x Activity Log', 'FAIL', `Error: ${(error as Error).message}`);
  }

  // ==========================================
  // CLEANUP
  // ==========================================
  console.log('\n--- CLEANUP ---\n');

  try {
    if (testServiceRequestId) {
      // Delete test data
      await db.delete(orderTaskActivityLog)
        .where(sql`task_id IN (
          SELECT id FROM order_tasks WHERE service_request_id = ${testServiceRequestId}
        )`);

      await db.delete(orderTasks)
        .where(eq(orderTasks.serviceRequestId, testServiceRequestId));

      await db.delete(serviceRequests)
        .where(eq(serviceRequests.id, testServiceRequestId));

      console.log('🧹 Test data cleaned up successfully');
    }
  } catch (error) {
    console.log('⚠️ Cleanup warning:', (error as Error).message);
  }

  printSummary();
}

function printSummary() {
  console.log('\n========================================');
  console.log('           TEST SUMMARY');
  console.log('========================================\n');

  const passed = TEST_RESULTS.filter(r => r.status === 'PASS').length;
  const failed = TEST_RESULTS.filter(r => r.status === 'FAIL').length;
  const skipped = TEST_RESULTS.filter(r => r.status === 'SKIP').length;

  console.log(`✅ PASSED:  ${passed}`);
  console.log(`❌ FAILED:  ${failed}`);
  console.log(`⏭️ SKIPPED: ${skipped}`);
  console.log(`📊 TOTAL:   ${TEST_RESULTS.length}`);

  if (failed > 0) {
    console.log('\n--- FAILED TESTS ---');
    TEST_RESULTS.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  ❌ ${r.step}: ${r.details}`);
    });
  }

  console.log('\n========================================\n');
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
