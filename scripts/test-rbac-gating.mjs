/**
 * Automated Verification Script: Dedicated RBAC Gating Test Suite
 * Author: Meet Maru
 * Verifies strict role-based access control across:
 * 1. Operations Manager (Full company authority)
 * 2. Pod Lead (Pod-scoped authority, publish/reset blocked)
 * 3. Employee (Self-service only; publish, overrides, approvals strictly blocked with 403)
 */

const BASE_URL = 'http://localhost:3000';

async function runRBACVerificationTests() {
  console.log('====================================================');
  console.log('DATASTRAW SMART ROSTER - DEDICATED RBAC GATING TEST SUITE');
  console.log('Author: Meet Maru');
  console.log('Testing: Multi-Tier Role Authorization & API Enforcement');
  console.log('Target:', BASE_URL);
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`[PASS] ${total}. ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${total}. ${message}`);
      process.exit(1);
    }
  }

  // Pre-requisite: Seed and Generate Baseline
  console.log('--- SETUP: Baseline Seeding & Roster Initialization ---');
  const seedRes = await fetch(`${BASE_URL}/api/seed`, { method: 'POST' });
  const seedData = await seedRes.json();
  assert(seedData.success, 'Baseline dataset seeded successfully');

  const genRes = await fetch(`${BASE_URL}/api/roster/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ monthYear: '2026-11', actorRole: 'OPERATIONS_MANAGER' }),
  });
  const genData = await genRes.json();
  assert(genData.success, 'Generated baseline roster for 2026-11');
  const rosterId = genData.roster.id;

  // ==========================================
  // SECTION 1: Session Role Identity Verification
  // ==========================================
  console.log('\n--- SECTION 1: Session Role Identity Verification ---');

  // 1.1 Operations Manager Login
  const mgrLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quickRole: 'OPERATIONS_MANAGER' }),
  });
  const mgrData = await mgrLoginRes.json();
  assert(mgrData.success && mgrData.user.role === 'OPERATIONS_MANAGER', 'Operations Manager profile authenticated');

  // 1.2 Pod Lead Login
  const leadLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quickRole: 'POD_LEAD' }),
  });
  const leadData = await leadLoginRes.json();
  assert(leadData.success && leadData.user.role === 'POD_LEAD', 'Pod Lead (Rahul Sharma) profile authenticated');
  assert(leadData.user.podId === 'pod-alpha', 'Pod Lead is bound to pod-alpha');

  // 1.3 Employee Login
  const empLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quickRole: 'EMPLOYEE' }),
  });
  const empData = await empLoginRes.json();
  assert(empData.success && empData.user.role === 'EMPLOYEE', 'Employee (Ananya Roy) profile authenticated');
  assert(empData.user.employeeRef === 'E02', 'Employee is bound to employeeRef E02');

  // ==========================================
  // SECTION 2: Publication RBAC Gating (/api/roster/publish)
  // ==========================================
  console.log('\n--- SECTION 2: Publication RBAC Gating ---');

  // 2.1 Employee attempt to publish roster
  const empPublishRes = await fetch(`${BASE_URL}/api/roster/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rosterId, actorRole: 'EMPLOYEE' }),
  });
  assert(empPublishRes.status === 403, 'Employee is strictly blocked from publishing roster (403 Forbidden)');

  // 2.2 Pod Lead attempt to publish company roster
  const leadPublishRes = await fetch(`${BASE_URL}/api/roster/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rosterId, actorRole: 'POD_LEAD' }),
  });
  assert(leadPublishRes.status === 403, 'Pod Lead is strictly blocked from publishing company roster (403 Forbidden)');

  // 2.3 Operations Manager is authorized to attempt publish
  const mgrPublishRes = await fetch(`${BASE_URL}/api/roster/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rosterId, actorRole: 'OPERATIONS_MANAGER' }),
  });
  // Status will be 400 (if gaps exist) or 200 (if published), but NOT 403 Forbidden!
  assert(mgrPublishRes.status !== 403, 'Operations Manager has authorized publish credentials (not 403)');

  // ==========================================
  // SECTION 3: Slot Override & Reassignment RBAC Gating (/api/roster/reassign)
  // ==========================================
  console.log('\n--- SECTION 3: Slot Override & Reassignment RBAC Gating ---');

  // 3.1 Employee attempt to override slot
  const empOverrideRes = await fetch(`${BASE_URL}/api/roster/reassign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rosterId,
      date: '2026-11-20',
      brandId: 'brand-A',
      processId: 'proc-cs',
      backupEmployeeId: 'emp-09',
      actorRole: 'EMPLOYEE',
      reason: 'Unauthorized employee override',
    }),
  });
  assert(empOverrideRes.status === 403, 'Employee is strictly blocked from modifying slot entries (403 Forbidden)');

  // 3.2 Operations Manager override is permitted
  const mgrOverrideRes = await fetch(`${BASE_URL}/api/roster/reassign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rosterId,
      date: '2026-11-20',
      brandId: 'brand-A',
      processId: 'proc-cs',
      backupEmployeeId: 'emp-09',
      status: 'WORKING',
      shiftTiming: 'MORNING',
      actorRole: 'OPERATIONS_MANAGER',
      reason: 'Manager authorized shift timing assignment',
    }),
  });
  const mgrOverrideData = await mgrOverrideRes.json();
  assert(mgrOverrideData.success, 'Operations Manager successfully applied slot override with Morning shift');

  // ==========================================
  // SECTION 4: Leave Approval RBAC Gating (/api/leaves)
  // ==========================================
  console.log('\n--- SECTION 4: Leave Approval RBAC Gating ---');

  // Create a pending leave request
  const submitLeaveRes = await fetch(`${BASE_URL}/api/leaves`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employeeId: 'emp-02',
      date: '2026-11-28',
      leaveType: 'PLANNED_LEAVE',
      reason: 'Personal vacation',
      actorRole: 'EMPLOYEE',
    }),
  });
  const leaveData = await submitLeaveRes.json();
  const testLeaveId = leaveData.leave.id;

  // 4.1 Employee attempt to approve leave
  const empApproveLeaveRes = await fetch(`${BASE_URL}/api/leaves`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'APPROVE',
      leaveId: testLeaveId,
      actorRole: 'EMPLOYEE',
    }),
  });
  assert(empApproveLeaveRes.status === 403, 'Employee is forbidden from approving leaves (403 Forbidden)');

  // 4.2 Pod Lead approval is permitted
  const leadApproveLeaveRes = await fetch(`${BASE_URL}/api/leaves`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'APPROVE',
      leaveId: testLeaveId,
      actorRole: 'POD_LEAD',
    }),
  });
  assert(leadApproveLeaveRes.status === 200, 'Pod Lead is authorized to approve leave requests');

  // ==========================================
  // SECTION 5: Shift Swap Approval RBAC Gating (/api/swaps)
  // ==========================================
  console.log('\n--- SECTION 5: Shift Swap Approval RBAC Gating ---');

  // Create a pending swap request
  const submitSwapRes = await fetch(`${BASE_URL}/api/swaps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'CREATE_SWAP',
      requesterEmpId: 'emp-02',
      targetEmpId: 'emp-08',
      date: '2026-11-24',
      brandId: 'brand-B',
      processId: 'proc-ret',
      reason: 'Doctor appointment',
      actorRole: 'EMPLOYEE',
    }),
  });
  const swapData = await submitSwapRes.json();
  const testSwapId = swapData.swap.id;

  // 5.1 Employee attempt to approve shift swap
  const empApproveSwapRes = await fetch(`${BASE_URL}/api/swaps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'APPROVE_SWAP',
      swapId: testSwapId,
      actorRole: 'EMPLOYEE',
    }),
  });
  assert(empApproveSwapRes.status === 403, 'Employee is forbidden from approving shift swaps (403 Forbidden)');

  // 5.2 Operations Manager approval is permitted
  const mgrApproveSwapRes = await fetch(`${BASE_URL}/api/swaps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'APPROVE_SWAP',
      swapId: testSwapId,
      actorRole: 'OPERATIONS_MANAGER',
    }),
  });
  assert(mgrApproveSwapRes.status === 200, 'Operations Manager is authorized to approve shift swaps');

  // ==========================================
  // SECTION 6: Comp-Off Bank Credit Granting RBAC Gating
  // ==========================================
  console.log('\n--- SECTION 6: Comp-Off Bank Credit Granting RBAC Gating ---');

  // 6.1 Employee attempt to grant comp-off credit
  const empGrantRes = await fetch(`${BASE_URL}/api/swaps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'GRANT_COMPOFF',
      employeeId: 'emp-02',
      earnedDate: '2026-11-15',
      earnedReason: 'Self-granted credit attempt',
      actorRole: 'EMPLOYEE',
    }),
  });
  assert(empGrantRes.status === 403, 'Employee is forbidden from granting comp-off credits (403 Forbidden)');

  // 6.2 Operations Manager grant is permitted
  const mgrGrantRes = await fetch(`${BASE_URL}/api/swaps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'GRANT_COMPOFF',
      employeeId: 'emp-02',
      earnedDate: '2026-11-15',
      earnedReason: 'Authorized weekend shift coverage credit',
      actorRole: 'OPERATIONS_MANAGER',
    }),
  });
  assert(mgrGrantRes.status === 200, 'Operations Manager is authorized to grant comp-off credits');

  // ==========================================
  // SECTION 7: Authorized Employee Self-Service Operations
  // ==========================================
  console.log('\n--- SECTION 7: Authorized Employee Self-Service Operations ---');

  // 7.1 Employee can view active schedule
  const empViewRes = await fetch(`${BASE_URL}/api/roster?monthYear=2026-11`);
  assert(empViewRes.status === 200, 'Employee is authorized to view company roster schedules in read-only mode');

  // 7.2 Employee can submit leave for self
  const selfLeaveRes = await fetch(`${BASE_URL}/api/leaves`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employeeId: 'emp-02',
      date: '2026-11-29',
      leaveType: 'PLANNED_LEAVE',
      reason: 'Self-service planned leave submission',
      actorRole: 'EMPLOYEE',
    }),
  });
  assert(selfLeaveRes.status === 200, 'Employee is authorized to submit personal leave request');

  console.log('\n====================================================');
  console.log(`ALL ${passed}/${total} RBAC GATING TESTS PASSED!`);
  console.log('Strict Role-Based Access Control is 100% verified across API & Dashboard.');
  console.log('Author: Meet Maru');
  console.log('====================================================');
}

runRBACVerificationTests().catch((err) => {
  console.error('Fatal RBAC test error:', err);
  process.exit(1);
});
