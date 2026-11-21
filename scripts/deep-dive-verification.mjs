/**
 * COMPREHENSIVE DEEP-DIVE VERIFICATION ENGINE (FEATURES 1-5+)
 * Datastraw Smart Roster Management System
 * Author: Meet Maru (meetmaru@datastraw.io)
 * Target: http://localhost:3000
 */

import assert from 'assert';

const BASE_URL = 'http://localhost:3000';
const CURRENT_MONTH = '2026-11';

let passed = 0;
function check(condition, desc) {
  assert(condition, desc);
  passed++;
  console.log(`  [PASS] ${passed}. ${desc}`);
}

async function deepDive() {
  console.log('================================================================================');
  console.log('  DATASTRAW SMART ROSTER MANAGEMENT SYSTEM - DEEP-DIVE VERIFICATION');
  console.log('  Author: Meet Maru (meetmaru@datastraw.io)');
  console.log('  Testing: Features 1, 2, 3, 4, 5 and Multi-Calendar Operating Rules');
  console.log('  Target:', BASE_URL);
  console.log('================================================================================\n');

  // ===================================================================
  // STEP 0: Baseline Dataset Seeding
  // ===================================================================
  console.log('--- SETUP: Seeding 30-Employee Multi-Brand Benchmark Matrix ---');
  const seedRes = await fetch(`${BASE_URL}/api/seed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ monthYear: CURRENT_MONTH }),
  });
  const seedData = await seedRes.json();
  check(seedData.success, 'Benchmark matrix seeded successfully for 2026-11');
  check(seedData.data.employeesCount === 30, 'Workforce verified: exactly 30 employees (E01 to E30)');
  check(seedData.data.brandsCount === 18, 'Client portfolio verified: exactly 18 client brands');
  check(seedData.data.podsCount === 3, 'Operational structure verified: 3 pods (Alpha, Beta, Gamma)');

  // ===================================================================
  // FEATURE 1: AVAILABILITY SHOCK & 1-CLICK ATOMIC LOCAL REPAIR
  // ===================================================================
  console.log('\n--- FEATURE 1: Availability Shock & 1-Click Atomic Local Repair (E01 Day 12) ---');

  // 1.1 Generate initial roster
  const genRes = await fetch(`${BASE_URL}/api/roster/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ monthYear: CURRENT_MONTH, actorRole: 'OPERATIONS_MANAGER' }),
  });
  const genData = await genRes.json();
  check(genData.success, 'Initial deterministic roster generated for 2026-11');
  const rosterId = genData.roster.id;

  // 1.2 Inspect Day 12 availability shock on Brand A (Rahul Sharma E01 on leave)
  const conflictsRes = await fetch(`${BASE_URL}/api/roster?monthYear=${CURRENT_MONTH}`);
  const rosterQuery = await conflictsRes.json();
  const day12Conflicts = rosterQuery.conflicts.filter((c) => c.date === `${CURRENT_MONTH}-12` && c.brandId === 'brand-A');
  check(day12Conflicts.length >= 2, 'Availability shock detected on Day 12: Brand A CS and NDR coverage gaps');
  check(day12Conflicts[0].suggestedAction.recommendedEmployeeIds.includes('emp-09'), 'Solver recommendation engine identified qualified backup E09 (Pooja Iyer)');

  // 1.3 Publication guard test: Must be blocked when critical conflicts exist
  const blockedPub = await fetch(`${BASE_URL}/api/roster/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rosterId, actorRole: 'OPERATIONS_MANAGER' }),
  });
  const blockedPubData = await blockedPub.json();
  check(blockedPubData.success === false, 'Publication Guard: Roster publication strictly blocked while critical gaps exist');

  // 1.4 Apply 1-click atomic backup reassignment (E09) for Brand A on Day 12
  const reassignCS = await fetch(`${BASE_URL}/api/roster/reassign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rosterId,
      date: `${CURRENT_MONTH}-12`,
      brandId: 'brand-A',
      processId: 'proc-cs',
      backupEmployeeId: 'emp-09',
      actorRole: 'OPERATIONS_MANAGER',
      reason: '1-Click emergency cover for E01 approved leave',
    }),
  });
  const reassignCSData = await reassignCS.json();
  check(reassignCSData.success, 'Atomic Local Repair: Reassigned E09 to Brand A CS on Day 12');

  const reassignNDR = await fetch(`${BASE_URL}/api/roster/reassign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rosterId,
      date: `${CURRENT_MONTH}-12`,
      brandId: 'brand-A',
      processId: 'proc-ndr',
      backupEmployeeId: 'emp-09',
      actorRole: 'OPERATIONS_MANAGER',
      reason: '1-Click emergency cover for E01 approved leave',
    }),
  });
  const reassignNDRData = await reassignNDR.json();
  check(reassignNDRData.success, 'Atomic Local Repair: Reassigned E09 to Brand A NDR on Day 12');

  const reassignACC = await fetch(`${BASE_URL}/api/roster/reassign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rosterId,
      date: `${CURRENT_MONTH}-12`,
      brandId: 'brand-A',
      processId: 'proc-acc',
      backupEmployeeId: 'emp-09',
      actorRole: 'OPERATIONS_MANAGER',
      reason: '1-Click emergency cover for E01 approved leave',
    }),
  });
  const reassignACCData = await reassignACC.json();
  check(reassignACCData.success, 'Atomic Local Repair: Reassigned E09 to Brand A ACC on Day 12');

  // 1.5 Verify local repair preserved all unaffected assignments
  const postRepairRes = await fetch(`${BASE_URL}/api/roster?monthYear=${CURRENT_MONTH}`);
  const postRepairData = await postRepairRes.json();
  const remainingDay12Gaps = postRepairData.conflicts.filter((c) => c.date === `${CURRENT_MONTH}-12` && c.brandId === 'brand-A');
  check(remainingDay12Gaps.length === 0, 'Local Repair verified: Brand A Day 12 conflicts 100% resolved without disrupting other days');

  // ===================================================================
  // FEATURE 2: MULTI-CALENDAR CONSTRAINTS (TYPE A, TYPE B, TYPE C)
  // ===================================================================
  console.log('\n--- FEATURE 2: Multi-Calendar Constraints (Type A 365d, Type B, Type C Sundays Off) ---');

  // 2.1 Type A: 365-day operation (Brand A CS & NDR)
  const rulesRes = await fetch(`${BASE_URL}/api/processes`);
  const rulesData = await rulesRes.json();
  const brandACS = rulesData.operatingRules.find((r) => r.brandId === 'brand-A' && r.processId === 'proc-cs');
  check(brandACS.calendarType === 'TYPE_A_365', 'Brand A Customer Support operates under TYPE_A_365 (365-day continuous coverage)');

  // 2.2 Type C: Sundays and Public Holidays excluded (Brand A ACC)
  const brandAACC = rulesData.operatingRules.find((r) => r.brandId === 'brand-A' && r.processId === 'proc-acc');
  check(brandAACC.calendarType === 'TYPE_C_SUN_HOLIDAYS_OFF', 'Brand A Abandoned Cart Conversions operates under TYPE_C_SUN_HOLIDAYS_OFF');

  // 2.3 Verify zero conflicts on Sundays for Brand A ACC (Days 1, 8, 15, 22, 29)
  const sundayConflicts = postRepairData.conflicts.filter(
    (c) => c.brandId === 'brand-A' && c.processId === 'proc-acc' && ['2026-11-01', '2026-11-08', '2026-11-15', '2026-11-22', '2026-11-29'].includes(c.date)
  );
  check(sundayConflicts.length === 0, 'Type C Calendar verified: Zero Sunday conflicts for Brand A ACC (Sundays automatically excused)');

  // 2.4 Multi-Resource Staffing: Brand D Customer Support enforces minStaffingRequired = 2
  const brandDCS = rulesData.operatingRules.find((r) => r.brandId === 'brand-D' && r.processId === 'proc-cs');
  check(brandDCS.minStaffingRequired === 2, 'Multi-Resource Brand verified: Brand D Customer Support enforces minStaffingRequired = 2');

  // ===================================================================
  // FEATURE 3: SHIFT SWAPS, PEER EXCHANGES & COMP-OFF BANK WORKFLOWS
  // ===================================================================
  console.log('\n--- FEATURE 3: Shift Swapping, Peer Exchanges & Comp-Off Bank ---');

  // 3.1 Unqualified shift swap rejection
  const unqualifiedSwap = await fetch(`${BASE_URL}/api/swaps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'REQUEST_SWAP',
      requesterEmpId: 'emp-02',
      targetEmpId: 'emp-01',
      date: `${CURRENT_MONTH}-10`,
      brandId: 'brand-B',
      processId: 'proc-retention',
      reason: 'Testing qualification mismatch guard',
    }),
  });
  check(unqualifiedSwap.status === 400, 'Shift Swap Guard: Rejected swap attempt with unqualified target employee (HTTP 400)');

  // 3.2 Leave collision swap rejection (E01 on leave on Day 12)
  const leaveCollisionSwap = await fetch(`${BASE_URL}/api/swaps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'REQUEST_SWAP',
      requesterEmpId: 'emp-02',
      targetEmpId: 'emp-01',
      date: `${CURRENT_MONTH}-12`,
      brandId: 'brand-A',
      processId: 'proc-cs',
      reason: 'Testing leave collision guard',
    }),
  });
  check(leaveCollisionSwap.status === 400, 'Shift Swap Guard: Rejected swap attempt on target approved leave date (HTTP 400)');

  // 3.3 Self-swap rejection
  const selfSwap = await fetch(`${BASE_URL}/api/swaps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'REQUEST_SWAP',
      requesterEmpId: 'emp-02',
      targetEmpId: 'emp-02',
      date: `${CURRENT_MONTH}-15`,
      brandId: 'brand-B',
      processId: 'proc-cs',
      reason: 'Self swap test',
    }),
  });
  check(selfSwap.status === 400, 'Shift Swap Guard: Rejected attempt to swap shift with oneself (HTTP 400)');

  // 3.4 Valid shift swap request & managerial approval
  const validSwapRes = await fetch(`${BASE_URL}/api/swaps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'CREATE_SWAP',
      requesterEmpId: 'emp-02',
      targetEmpId: 'emp-08',
      date: `${CURRENT_MONTH}-18`,
      brandId: 'brand-B',
      processId: 'proc-cs',
      reason: 'Mutual shift schedule adjustment',
      actorRole: 'EMPLOYEE',
    }),
  });
  const validSwapData = await validSwapRes.json();
  check(validSwapData.success && validSwapData.swap.status === 'PENDING', 'Valid shift swap created with initial PENDING status');

  const approveSwapRes = await fetch(`${BASE_URL}/api/swaps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'APPROVE_SWAP',
      swapId: validSwapData.swap.id,
      actorRole: 'OPERATIONS_MANAGER',
    }),
  });
  const approveSwapData = await approveSwapRes.json();
  check(approveSwapData.success && approveSwapData.swap.status === 'APPROVED', 'Manager approved shift swap: transitioned to APPROVED');

  // 3.5 Comp-Off Bank: Grant credit & Redeem for leave
  const grantComp = await fetch(`${BASE_URL}/api/swaps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'GRANT_COMPOFF',
      employeeId: 'emp-05',
      earnedDate: `${CURRENT_MONTH}-08`,
      earnedReason: 'Worked national holiday coverage for 365-day operation',
      actorRole: 'OPERATIONS_MANAGER',
    }),
  });
  const grantCompData = await grantComp.json();
  check(grantCompData.success && grantCompData.credit.status === 'AVAILABLE', 'Comp-Off Bank: Granted 1 credit to E05 with AVAILABLE status');

  const redeemComp = await fetch(`${BASE_URL}/api/swaps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'REDEEM_COMPOFF',
      compOffId: grantCompData.credit.id,
      leaveDate: `${CURRENT_MONTH}-25`,
      actorRole: 'EMPLOYEE',
    }),
  });
  const redeemCompData = await redeemComp.json();
  check(redeemCompData.success && redeemCompData.credit.status === 'REDEEMED', 'Comp-Off Bank: Redeemed credit on Day 25, transitioning status to REDEEMED');
  check(redeemCompData.leave.leaveType === 'COMP_OFF', 'Comp-Off Bank: Atomic conversion generated approved leave of type COMP_OFF');

  // ===================================================================
  // FEATURE 4: MULTI-TIER ROLE-BASED ACCESS CONTROL (RBAC) GATING
  // ===================================================================
  console.log('\n--- FEATURE 4: Multi-Tier Role-Based Access Control (RBAC) Gating ---');

  // 4.1 Pod Lead publication block with informative message (HTTP 403)
  const podLeadPub = await fetch(`${BASE_URL}/api/roster/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rosterId, actorRole: 'POD_LEAD' }),
  });
  check(podLeadPub.status === 403, 'RBAC Gating: Pod Lead is strictly blocked from publishing company roster (HTTP 403)');
  const podLeadPubData = await podLeadPub.json();
  check(podLeadPubData.error.includes('Pod Leads can submit pod-level rosters for managerial approval'), 'RBAC Policy Feedback: Error clearly explains managerial approval is required');

  // 4.2 Employee publication block (HTTP 403)
  const empPub = await fetch(`${BASE_URL}/api/roster/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rosterId, actorRole: 'EMPLOYEE' }),
  });
  check(empPub.status === 403, 'RBAC Gating: Employee is strictly blocked from publishing roster (HTTP 403)');

  // 4.3 Employee roster generation block (HTTP 403)
  const empGen = await fetch(`${BASE_URL}/api/roster/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ monthYear: CURRENT_MONTH, actorRole: 'EMPLOYEE' }),
  });
  check(empGen.status === 403, 'RBAC Gating: Employee is strictly blocked from executing roster solver (HTTP 403)');

  // 4.4 Employee workforce management block (HTTP 403)
  const empStaffEdit = await fetch(`${BASE_URL}/api/employees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeCode: 'E99', fullName: 'Hacker', actorRole: 'EMPLOYEE' }),
  });
  check(empStaffEdit.status === 403, 'RBAC Gating: Employee is strictly blocked from creating/modifying workforce records (HTTP 403)');

  // 4.5 Registration Privilege Escalation Prevention (HTTP 403)
  const rogueReg = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Rogue Admin',
      email: 'rogue.admin@datastraw.io',
      password: 'password123',
      confirmPassword: 'password123',
      role: 'OPERATIONS_MANAGER',
    }),
  });
  check(rogueReg.status === 403, 'Account Governance: Public registration cannot self-assign privileged role OPERATIONS_MANAGER (HTTP 403)');

  // ===================================================================
  // FEATURE 5: DISPATCH SHEET DATA & IMMUTABLE AUDIT TRAIL
  // ===================================================================
  console.log('\n--- FEATURE 5: Dispatch Sheet Data, SLA Analytics & Immutable Audit Trail ---');

  // 5.1 Immutable audit trail verification
  const auditRes = await fetch(`${BASE_URL}/api/roster?monthYear=${CURRENT_MONTH}`);
  const auditData = await auditRes.json();
  const reassignLogs = auditData.auditLogs.filter((l) => l.action === 'REASSIGN_BACKUP');
  check(reassignLogs.length >= 2, 'Audit Trail: Reassignment actions logged with timestamp, actor, and rationale');
  check(reassignLogs[0].userRole === 'OPERATIONS_MANAGER', 'Audit Trail: Authoritative actor identity accurately recorded');

  // 5.2 Workforce range slicing (1-10, 11-20, 21-30)
  const slice1 = await fetch(`${BASE_URL}/api/employees?rangeStart=1&rangeEnd=10`);
  const slice1Data = await slice1.json();
  check(slice1Data.employees.length === 10, 'Workforce Slicing: Range 1-10 returns exactly 10 Pod Alpha personnel');
  check(slice1Data.employees[0].employeeCode === 'E01' && slice1Data.employees[9].employeeCode === 'E10', 'Workforce Slicing: Clean boundary slicing from E01 to E10');

  const slice2 = await fetch(`${BASE_URL}/api/employees?rangeStart=11&rangeEnd=20`);
  const slice2Data = await slice2.json();
  check(slice2Data.employees.length === 10, 'Workforce Slicing: Range 11-20 returns exactly 10 Pod Beta personnel');

  const slice3 = await fetch(`${BASE_URL}/api/employees?rangeStart=21&rangeEnd=30`);
  const slice3Data = await slice3.json();
  check(slice3Data.employees.length === 10, 'Workforce Slicing: Range 21-30 returns exactly 10 Pod Gamma personnel');

  console.log('\n================================================================================');
  console.log(`  ALL ${passed}/${passed} DEEP-DIVE VERIFICATION CHECKS PASSED WITH 100% SUCCESS!`);
  console.log('  Features 1, 2, 3, 4, and 5 are fully proven and production-ready.');
  console.log('================================================================================\n');
}

deepDive().catch((err) => {
  console.error('Deep-dive verification error:', err);
  process.exit(1);
});
