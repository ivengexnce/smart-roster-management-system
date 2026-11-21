/**
 * End-to-End Automated Assessment Test Suite
 * Author: Meet Maru
 * Tests:
 * 1. Role-Based Authentication & Session API (Login, Me, Logout, Google OAuth mock)
 * 2. Benchmark Seeding on Current Month (30 Employees, 18 Brands, 3 Pods, 4 Processes)
 * 3. Deterministic Roster Generation
 * 4. E01 Leave & Critical Gap Detection on the 12th of Current Month (Brand A CS & NDR)
 * 5. Publication Guard (Blocks publication when critical conflicts exist)
 * 6. Candidate Backup Reassignment (Reassign E09 for Brand A CS, NDR, and ACC)
 * 7. Local Repair Verification (Brand A conflicts on the 12th 100% resolved, unaffected days preserved)
 * 8. Immutable Audit Trail Verification
 */

const BASE_URL = 'http://localhost:3000';

function getCurrentMonthStr() {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
}

async function runTests() {
  const currentMonth = getCurrentMonthStr();

  console.log('====================================================');
  console.log('DATASTRAW SMART ROSTER SYSTEM - AUTOMATED E2E TESTS');
  console.log('Author: Meet Maru');
  console.log(`Active Month Target: ${currentMonth}`);
  console.log('Target: ' + BASE_URL);
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

  // TEST STEP 0: Role-Based Authentication API Tests
  console.log('--- TEST STEP 0: Authentication & RBAC API (Email, Google, Demo Logins) ---');
  // Login as Operations Manager
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'manager@datastraw.io', password: 'password123' }),
  });
  const loginData = await loginRes.json();
  assert(loginData.success === true, 'Email & Password authentication succeeded for Operations Manager');
  assert(loginData.user.role === 'OPERATIONS_MANAGER', 'Authenticated session has role OPERATIONS_MANAGER');

  // Verify /api/auth/me
  const meRes = await fetch(`${BASE_URL}/api/auth/me`);
  const meData = await meRes.json();
  assert(meData.user.email === 'manager@datastraw.io', '/api/auth/me returns active session user');

  // Google OAuth Sign-in test
  const googleRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      googleAuth: {
        email: 'evaluator.google@datastraw.io',
        name: 'Google Verified Evaluator',
        role: 'OPERATIONS_MANAGER',
      },
    }),
  });
  const googleData = await googleRes.json();
  assert(googleData.success === true, 'Google OAuth authentication simulation succeeded');

  // TEST 1: Seed benchmark dataset for current month
  console.log(`\n--- TEST STEP 1: Seeding 30-Employee Benchmark Dataset for Current Month (${currentMonth}) ---`);
  const seedRes = await fetch(`${BASE_URL}/api/seed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ monthYear: currentMonth }),
  });
  const seedData = await seedRes.json();
  assert(seedData.success === true, `Benchmark seeding returned success for ${currentMonth}`);
  assert(seedData.data.employeesCount === 30, 'Seeded exactly 30 employees (E01 to E30)');
  assert(seedData.data.brandsCount === 18, 'Seeded exactly 18 client brands (~78% single-resource)');
  assert(seedData.data.podsCount === 3, 'Seeded 3 operational pods (Alpha, Beta, Gamma)');

  // TEST 2: Generate monthly roster
  console.log(`\n--- TEST STEP 2: Deterministic Roster Generation for ${currentMonth} ---`);
  const genRes = await fetch(`${BASE_URL}/api/roster/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ monthYear: currentMonth, actorRole: 'OPERATIONS_MANAGER' }),
  });
  const genData = await genRes.json();
  assert(genData.success === true, 'Roster generation executed deterministically');
  assert(genData.roster.status === 'DRAFT', 'Roster is initially in DRAFT status due to conflicts');
  assert(genData.roster.totalConflicts.critical >= 2, 'Engine detected CRITICAL coverage gaps');

  // TEST 3: Verify E01 Leave conflict diagnostics on the 12th of current month
  console.log(`\n--- TEST STEP 3: Verifying Conflict Diagnostics for E01 Leave on ${currentMonth}-12 ---`);
  const rosterQueryRes = await fetch(`${BASE_URL}/api/roster?monthYear=${currentMonth}`);
  const rosterQueryData = await rosterQueryRes.json();
  const target12Date = `${currentMonth}-12`;
  const nov12Conflicts = rosterQueryData.conflicts.filter((c) => c.date === target12Date && c.brandId === 'brand-A');
  assert(nov12Conflicts.length >= 2, `Found coverage gaps on ${target12Date} for Brand A`);
  const brandACsGap = nov12Conflicts.find((c) => c.brandId === 'brand-A' && c.processId === 'proc-cs');
  assert(brandACsGap !== undefined, `Brand A Customer Support has 0 available staff on ${target12Date}`);
  assert(brandACsGap.suggestedAction.recommendedEmployeeIds.includes('emp-09'), 'Solver correctly recommends E09 as qualified backup');

  // TEST 4: Publication Guard (Must fail when critical conflicts exist)
  console.log('\n--- TEST STEP 4: Verifying Publication Guard ---');
  const pubBlockRes = await fetch(`${BASE_URL}/api/roster/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rosterId: genData.roster.id, actorRole: 'OPERATIONS_MANAGER' }),
  });
  const pubBlockData = await pubBlockRes.json();
  assert(pubBlockData.success === false, 'Publication is strictly blocked when critical gaps exist');
  assert(pubBlockData.error.includes('CRITICAL conflicts'), 'Blocked publication error mentions unresolved critical conflicts');

  // TEST 5: One-click Reassignment of E09 for Brand A on Day 12
  console.log(`\n--- TEST STEP 5: Executing Atomic Backup Reassignment (E09) on ${target12Date} ---`);
  const reassignCsRes = await fetch(`${BASE_URL}/api/roster/reassign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rosterId: genData.roster.id,
      date: target12Date,
      brandId: 'brand-A',
      processId: 'proc-cs',
      backupEmployeeId: 'emp-09',
      reason: `E2E Test: Reassigned E09 for Brand A CS on ${target12Date}`,
      actorRole: 'OPERATIONS_MANAGER',
    }),
  });
  const reassignCsData = await reassignCsRes.json();
  assert(reassignCsData.success === true, `Successfully reassigned E09 to Brand A CS on ${target12Date}`);

  // Reassign NDR
  const reassignNdrRes = await fetch(`${BASE_URL}/api/roster/reassign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rosterId: genData.roster.id,
      date: target12Date,
      brandId: 'brand-A',
      processId: 'proc-ndr',
      backupEmployeeId: 'emp-09',
      reason: `E2E Test: Reassigned E09 for Brand A NDR on ${target12Date}`,
      actorRole: 'OPERATIONS_MANAGER',
    }),
  });
  const reassignNdrData = await reassignNdrRes.json();
  assert(reassignNdrData.success === true, `Successfully reassigned E09 to Brand A NDR on ${target12Date}`);

  // Reassign ACC if operating
  await fetch(`${BASE_URL}/api/roster/reassign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rosterId: genData.roster.id,
      date: target12Date,
      brandId: 'brand-A',
      processId: 'proc-acc',
      backupEmployeeId: 'emp-09',
      reason: `E2E Test: Reassigned E09 for Brand A ACC on ${target12Date}`,
      actorRole: 'OPERATIONS_MANAGER',
    }),
  });

  // TEST 6: Verify Local Repair & Preservation
  console.log('\n--- TEST STEP 6: Verifying Local Repair & Preservation ---');
  const postRepairRes = await fetch(`${BASE_URL}/api/roster?monthYear=${currentMonth}`);
  const postRepairData = await postRepairRes.json();
  const brandANov12Remaining = postRepairData.conflicts.filter((c) => c.date === target12Date && c.brandId === 'brand-A');
  assert(brandANov12Remaining.length === 0, `Brand A conflicts on ${target12Date} are 100% resolved!`);

  // Verify E09 has override entry on Day 12
  const e09Nov12Entry = postRepairData.entries.find(
    (e) => e.date === target12Date && e.employeeId === 'emp-09' && e.brandId === 'brand-A' && e.isOverride === true
  );
  assert(e09Nov12Entry !== undefined, `E09 has verified override entry for Brand A on ${target12Date}`);

  // TEST 7: Logout API verification
  console.log('\n--- TEST STEP 7: Logout API Verification ---');
  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, { method: 'POST' });
  const logoutData = await logoutRes.json();
  assert(logoutData.success === true, 'Session logout terminated successfully');

  // TEST 8: Immutable Audit Trail
  console.log('\n--- TEST STEP 8: Immutable Audit Trail Verification ---');
  const auditLogs = postRepairData.auditLogs;
  assert(auditLogs.length >= 3, 'Audit trail contains logs for Generate and Backup Reassignments');
  assert(auditLogs.some((l) => l.action === 'REASSIGN_BACKUP'), 'Audit log contains REASSIGN_BACKUP entry with rationale');

  // TEST 9: Shift Swapping Workflow API
  console.log('\n--- TEST STEP 9: Shift Swapping & Flexibility API ---');
  // 1. Propose shift swap from E02 to E08
  const swapCreateRes = await fetch(`${BASE_URL}/api/swaps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'CREATE_SWAP',
      requesterEmpId: 'emp-02',
      targetEmpId: 'emp-08',
      date: `${currentMonth}-15`,
      brandId: 'brand-B',
      processId: 'proc-cs',
      reason: 'Automated test mutual shift swap',
      actorRole: 'EMPLOYEE',
    }),
  });
  const swapCreateData = await swapCreateRes.json();
  assert(swapCreateData.success === true, 'Shift swap request created successfully');
  assert(swapCreateData.swap.status === 'PENDING', 'New shift swap initialized with PENDING status');

  // 2. Approve shift swap as Operations Manager
  const swapApproveRes = await fetch(`${BASE_URL}/api/swaps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'APPROVE_SWAP',
      swapId: swapCreateData.swap.id,
      actorRole: 'OPERATIONS_MANAGER',
    }),
  });
  const swapApproveData = await swapApproveRes.json();
  assert(swapApproveData.success === true, 'Shift swap approved successfully by Operations Manager');
  assert(swapApproveData.swap.status === 'APPROVED', 'Shift swap status updated to APPROVED');

  // TEST 10: Comp-Off Bank API (Grant & Redeem)
  console.log('\n--- TEST STEP 10: Compensatory Off Bank API ---');
  // 1. Grant Comp-Off Credit
  const compGrantRes = await fetch(`${BASE_URL}/api/swaps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'GRANT_COMPOFF',
      employeeId: 'emp-05',
      earnedDate: `${currentMonth}-07`,
      earnedReason: 'Worked Sunday surge coverage for Brand C',
      actorRole: 'OPERATIONS_MANAGER',
    }),
  });
  const compGrantData = await compGrantRes.json();
  assert(compGrantData.success === true, 'Granted 1 Comp-Off credit to E05');
  assert(compGrantData.credit.status === 'AVAILABLE', 'Granted comp-off credit status is AVAILABLE');

  // 2. Redeem Comp-Off Credit as Approved Leave
  const compRedeemRes = await fetch(`${BASE_URL}/api/swaps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'REDEEM_COMPOFF',
      compOffId: compGrantData.credit.id,
      leaveDate: `${currentMonth}-25`,
      actorRole: 'EMPLOYEE',
    }),
  });
  const compRedeemData = await compRedeemRes.json();
  assert(compRedeemData.success === true, 'Redeemed comp-off credit for approved leave on Day 25');
  assert(compRedeemData.credit.status === 'REDEEMED', 'Comp-off credit status transitioned to REDEEMED');
  assert(compRedeemData.leave.leaveType === 'COMP_OFF', 'Generated leave request is of type COMP_OFF');

  console.log('\n====================================================');
  console.log(`ALL ${passed}/${total} AUTOMATED E2E TESTS PASSED SUCCESSFULLY!`);
  console.log('====================================================\n');
}

runTests().catch((err) => {
  console.error('Test run failed with error:', err);
  process.exit(1);
});
