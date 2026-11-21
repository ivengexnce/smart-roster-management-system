// Edge Case Verification Test Suite
// Author: Meet Maru
// Datastraw Tech Internship Assessment

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

function getCurrentMonthStr() {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
}

const currentMonth = getCurrentMonthStr();

async function runEdgeCaseTests() {
  console.log('====================================================');
  console.log('DATASTRAW SMART ROSTER SYSTEM - EDGE CASE TEST SUITE');
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

  // 1. Seed benchmark dataset
  console.log('--- EDGE CASE 1: Baseline Seeding & Initial State ---');
  const seedRes = await fetch(`${BASE_URL}/api/seed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ monthYear: currentMonth }),
  });
  const seedData = await seedRes.json();
  assert(seedData.success === true, 'Seeded baseline dataset for current month');

  // Generate draft roster
  const genRes = await fetch(`${BASE_URL}/api/roster/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ monthYear: currentMonth }),
  });
  const genData = await genRes.json();
  assert(genData.success === true, 'Generated initial draft roster');

  // 2. Edge Case: Unqualified Swap Rejection
  console.log('\n--- EDGE CASE 2: Unqualified Shift Swap Rejection ---');
  // Find an employee not qualified for Retention (e.g. emp-08 only has CS & ACC)
  const rosterRes = await fetch(`${BASE_URL}/api/roster?monthYear=${currentMonth}`);
  const rosterData = await rosterRes.json();
  const unqualifiedEmp = rosterData.employees.find((e) => !e.qualifiedProcessIds.includes('RETENTION'));

  if (unqualifiedEmp) {
    const swapUnqualifiedRes = await fetch(`${BASE_URL}/api/swaps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'CREATE_SWAP',
        requesterEmpId: 'emp-02',
        targetEmpId: unqualifiedEmp.id,
        date: `${currentMonth}-16`,
        brandId: 'brand-B',
        processId: 'proc-retention',
        reason: 'Attempting invalid unqualified swap',
        actorRole: 'EMPLOYEE',
      }),
    });
    const swapUnqualifiedData = await swapUnqualifiedRes.json();
    assert(
      swapUnqualifiedData.success === false,
      `Rejected shift swap because target ${unqualifiedEmp.employeeCode} lacks required qualification`
    );
    assert(
      swapUnqualifiedData.error.includes('not qualified'),
      'Error message clearly explains qualification mismatch'
    );
  }

  // 3. Edge Case: Swap Rejection When Target Employee is on Approved Leave
  console.log('\n--- EDGE CASE 3: Swap Rejection on Approved Leave Collision ---');
  // E01 is on approved leave on Day 12
  const leaveCollisionSwapRes = await fetch(`${BASE_URL}/api/swaps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'CREATE_SWAP',
      requesterEmpId: 'emp-02',
      targetEmpId: 'emp-01', // E01 is on leave on Day 12
      date: `${currentMonth}-12`,
      brandId: 'brand-B',
      processId: 'proc-cs',
      reason: 'Attempting swap with someone on leave',
      actorRole: 'EMPLOYEE',
    }),
  });
  const leaveCollisionData = await leaveCollisionSwapRes.json();
  assert(
    leaveCollisionData.success === false,
    'Rejected shift swap because target employee E01 is on approved leave on that date'
  );
  assert(
    leaveCollisionData.error.includes('approved leave'),
    'Error message clearly explains leave collision'
  );

  // 4. Edge Case: RBAC Enforcement - Employee Cannot Approve Swap
  console.log('\n--- EDGE CASE 4: RBAC Unauthorized Action Gate ---');
  const rbacSwapRes = await fetch(`${BASE_URL}/api/swaps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'APPROVE_SWAP',
      swapId: 'swap-01',
      actorRole: 'EMPLOYEE', // Employee role cannot approve
    }),
  });
  const rbacData = await rbacSwapRes.json();
  assert(
    rbacData.success === false,
    'Employee role is forbidden from approving shift swaps (Requires Manager or Pod Lead)'
  );

  // 5. Edge Case: Self-Swap Rejection
  console.log('\n--- EDGE CASE 5: Self-Swap Validation ---');
  const selfSwapRes = await fetch(`${BASE_URL}/api/swaps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'CREATE_SWAP',
      requesterEmpId: 'emp-02',
      targetEmpId: 'emp-02', // Same employee
      date: `${currentMonth}-14`,
      brandId: 'brand-B',
      processId: 'proc-cs',
      reason: 'Self swap test',
      actorRole: 'EMPLOYEE',
    }),
  });
  const selfSwapData = await selfSwapRes.json();
  assert(
    selfSwapData.success === false,
    'Rejected attempt to swap shift with self'
  );

  // 6. Edge Case: Multi-Resource Brand Staffing Threshold
  console.log('\n--- EDGE CASE 6: Multi-Resource Brand D Staffing ---');
  // Brand D requires 2 CS staff. Verify operating rule requires 2
  const brandDRule = rosterData.operatingRules.find(
    (r) => r.brandId === 'brand-D' && r.processId === 'proc-cs'
  );
  assert(brandDRule !== undefined, 'Brand D Customer Support operating rule exists');
  assert(brandDRule.minStaffingRequired === 2, 'Brand D CS enforces minStaffingRequired = 2');

  // 7. Edge Case: Operating Calendar Type C Automatic Sunday Exclusion
  console.log('\n--- EDGE CASE 7: Type C Calendar Sunday Exclusions ---');
  const brandAAccRule = rosterData.operatingRules.find(
    (r) => r.brandId === 'brand-A' && r.processId === 'proc-acc'
  );
  assert(brandAAccRule !== undefined, 'Brand A ACC operating rule exists');
  assert(
    brandAAccRule.calendarType === 'TYPE_C_SUN_HOLIDAYS_OFF',
    'Brand A ACC uses TYPE_C_SUN_HOLIDAYS_OFF calendar'
  );

  // Ensure no conflicts generated on Sundays for Brand A ACC
  const accSundayConflicts = rosterData.conflicts.filter(
    (c) => c.brandId === 'brand-A' && c.processId === 'proc-acc' && new Date(c.date).getDay() === 0
  );
  assert(
    accSundayConflicts.length === 0,
    'Zero conflicts on Brand A ACC on Sundays (automatically excused by Type C calendar)'
  );

  console.log('\n====================================================');
  console.log(`ALL ${passed}/${total} ADVANCED EDGE CASES PASSED!`);
  console.log('====================================================\n');
}

runEdgeCaseTests().catch((err) => {
  console.error('Edge case test failed:', err);
  process.exit(1);
});
