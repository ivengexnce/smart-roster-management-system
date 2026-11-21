/**
 * Automated Verification: Employee Management, Range Slicing & Detail Preview Test Suite
 * Author: Meet Maru (meetmaru@datastraw.io)
 * Project: Datastraw Tech Internship Assessment
 */

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('========================================================================');
  console.log('  TEST SUITE: EMPLOYEE MANAGEMENT, RANGE SLICING & DETAIL PREVIEW');
  console.log('  Author: Meet Maru (meetmaru@datastraw.io)');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // Test 1: Reset benchmark data
    console.log('[Phase 1: Seed Benchmark Data]');
    const seedRes = await fetch(`${BASE_URL}/api/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monthYear: '2026-11' }),
    });
    const seedData = await seedRes.json();
    assert(seedData.success, 'Benchmark data seeded with 30 employees');

    // Test 2: Range slicing 1-10 (Pod Alpha)
    console.log('\n[Phase 2: Range Slicing Verification]');
    const r1Res = await fetch(`${BASE_URL}/api/employees?rangeStart=1&rangeEnd=10`);
    const r1Data = await r1Res.json();
    assert(r1Data.success, 'GET /api/employees?rangeStart=1&rangeEnd=10 succeeded');
    assert(r1Data.employees.length === 10, `Range 1-10 returned exactly 10 employees (got ${r1Data.employees.length})`);
    assert(r1Data.employees[0].employeeCode === 'E01', `First employee is E01 (got ${r1Data.employees[0]?.employeeCode})`);
    assert(r1Data.employees[9].employeeCode === 'E10', `Tenth employee is E10 (got ${r1Data.employees[9]?.employeeCode})`);

    // Test 3: Range slicing 11-20 (Pod Beta)
    const r2Res = await fetch(`${BASE_URL}/api/employees?rangeStart=11&rangeEnd=20`);
    const r2Data = await r2Res.json();
    assert(r2Data.employees.length === 10, `Range 11-20 returned exactly 10 employees (got ${r2Data.employees.length})`);
    assert(r2Data.employees[0].employeeCode === 'E11', `Eleventh employee is E11 (got ${r2Data.employees[0]?.employeeCode})`);
    assert(r2Data.employees[9].employeeCode === 'E20', `Twentieth employee is E20 (got ${r2Data.employees[9]?.employeeCode})`);

    // Test 4: Range slicing 21-30 (Pod Gamma)
    const r3Res = await fetch(`${BASE_URL}/api/employees?rangeStart=21&rangeEnd=30`);
    const r3Data = await r3Res.json();
    assert(r3Data.employees.length === 10, `Range 21-30 returned exactly 10 employees (got ${r3Data.employees.length})`);
    assert(r3Data.employees[0].employeeCode === 'E21', `Twenty-first employee is E21 (got ${r3Data.employees[0]?.employeeCode})`);
    assert(r3Data.employees[9].employeeCode === 'E30', `Thirtieth employee is E30 (got ${r3Data.employees[9]?.employeeCode})`);

    // Test 5: Full Range (All 30 employees)
    const allRes = await fetch(`${BASE_URL}/api/employees`);
    const allData = await allRes.json();
    assert(allData.employees.length === 30, `Unfiltered employee list returns all 30 personnel (got ${allData.employees.length})`);

    // Test 6: Verify Detailed Preview Attributes
    console.log('\n[Phase 3: Employee Detail Preview Verification]');
    const e01 = allData.employees[0];
    assert(e01.fullName.includes('Rahul Sharma'), `E01 fullName contains Rahul Sharma (got ${e01.fullName})`);
    assert(e01.podName === 'Pod Alpha', `E01 pod is Pod Alpha (got ${e01.podName})`);
    assert(Array.isArray(e01.qualifiedProcessIds) && e01.qualifiedProcessIds.length >= 2, `E01 has multi-process qualifications: ${e01.qualifiedProcessIds.join(', ')}`);
    assert(typeof e01.weeklyOffPreference === 'number', `E01 has weeklyOffPreference number: ${e01.weeklyOffPreference}`);

    // Test 7: RBAC Gating on Creation
    console.log('\n[Phase 4: RBAC Gating on Workforce Management]');
    const empCreateBlock = await fetch(`${BASE_URL}/api/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeCode: 'E99',
        fullName: 'Unauthorized Worker',
        email: 'unauth@datastraw.io',
        podId: 'pod-alpha',
        actorRole: 'EMPLOYEE',
      }),
    });
    assert(empCreateBlock.status === 403, `Employee role blocked from creating personnel (HTTP ${empCreateBlock.status})`);

    // Test 8: RBAC Gating on Deletion
    const empDeleteBlock = await fetch(`${BASE_URL}/api/employees?id=${e01.id}&actorRole=EMPLOYEE`, {
      method: 'DELETE',
    });
    assert(empDeleteBlock.status === 403, `Employee role blocked from deleting personnel (HTTP ${empDeleteBlock.status})`);

    // Test 9: Operations Manager Adds Employee (E31)
    console.log('\n[Phase 5: Operations Manager CRUD Operations]');
    const createRes = await fetch(`${BASE_URL}/api/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeCode: 'E31',
        fullName: 'Rohan Varma',
        email: 'rohan.varma@datastraw.io',
        phone: '+91 98765 43210',
        podId: 'pod-alpha',
        weeklyOffPreference: 2,
        qualifiedProcessIds: ['proc-cs', 'proc-ndr'],
        actorRole: 'OPERATIONS_MANAGER',
      }),
    });
    const createData = await createRes.json();
    assert(createData.success, `Manager added employee E31 (Rohan Varma): ${createData.message}`);
    assert(createData.totalEmployees === 31, `Total employee count updated to 31 (got ${createData.totalEmployees})`);
    const newEmpId = createData.employee.id;

    // Test 10: Verify Preview of Newly Added Employee
    const verifyAddRes = await fetch(`${BASE_URL}/api/employees?search=E31`);
    const verifyAddData = await verifyAddRes.json();
    assert(verifyAddData.employees.length === 1, 'Search for E31 returned exactly 1 match');
    assert(verifyAddData.employees[0].fullName === 'Rohan Varma', 'Newly added employee details match');
    assert(verifyAddData.employees[0].phone === '+91 98765 43210', 'Phone number matches');

    // Test 11: Operations Manager Updates Employee (E31)
    const updateRes = await fetch(`${BASE_URL}/api/employees`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: newEmpId,
        fullName: 'Rohan Varma (Promoted Senior)',
        email: 'rohan.senior@datastraw.io',
        podId: 'pod-beta',
        weeklyOffPreference: 3,
        qualifiedProcessIds: ['proc-cs', 'proc-ndr', 'proc-acc'],
        status: 'ACTIVE',
        actorRole: 'OPERATIONS_MANAGER',
      }),
    });
    const updateData = await updateRes.json();
    assert(updateData.success, `Manager updated employee E31: ${updateData.message}`);
    assert(updateData.employee.fullName === 'Rohan Varma (Promoted Senior)', 'Employee name updated');
    assert(updateData.employee.podName === 'Pod Beta', 'Employee transferred to Pod Beta');
    assert(updateData.employee.qualifiedProcessIds.length === 3, 'Qualifications expanded to 3 processes');

    // Test 12: Operations Manager Deletes Employee (E31)
    const deleteRes = await fetch(`${BASE_URL}/api/employees?id=${newEmpId}&actorRole=OPERATIONS_MANAGER`, {
      method: 'DELETE',
    });
    const deleteData = await deleteRes.json();
    assert(deleteData.success, `Manager deleted employee E31: ${deleteData.message}`);
    assert(deleteData.totalEmployees === 30, `Total employee count restored to 30 (got ${deleteData.totalEmployees})`);

    // Final check
    const verifyDeleteRes = await fetch(`${BASE_URL}/api/employees?search=E31`);
    const verifyDeleteData = await verifyDeleteRes.json();
    assert(verifyDeleteData.employees.length === 0, 'E31 no longer exists in employee directory');

    console.log('\n========================================================================');
    console.log(`  RESULTS: ${passed} PASSED / ${failed} FAILED`);
    console.log('========================================================================\n');

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Test Execution Exception:', err);
    process.exit(1);
  }
}

runTests();
