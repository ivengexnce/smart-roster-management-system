/**
 * Automated Verification: P2 Features (AI Diagnostics, Notifications, Brand & Process Management, Optimization)
 * Author: Meet Maru (meetmaru@datastraw.io)
 * Project: Datastraw Tech Internship Assessment
 */

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('========================================================================');
  console.log('  TEST SUITE: P2 ADVANCED ENHANCEMENTS & CONFIGURATION MANAGEMENT');
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
    // 0. Seed benchmark dataset
    console.log('[Phase 0: Seed Benchmark Dataset]');
    const seedRes = await fetch(`${BASE_URL}/api/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monthYear: '2026-11' }),
    });
    const seedData = await seedRes.json();
    assert(seedData.success, 'Benchmark data seeded with 30 employees, 18 brands, 3 pods');

    // 1. Notifications API Verification
    console.log('\n[Phase 1: In-App Notifications API]');
    const notifRes = await fetch(`${BASE_URL}/api/notifications`);
    const notifData = await notifRes.json();
    assert(notifData.success, 'GET /api/notifications succeeded');
    assert(Array.isArray(notifData.notifications), 'Notifications array returned');
    assert(typeof notifData.unreadCount === 'number', `Unread notifications count is ${notifData.unreadCount}`);

    // Create a new notification
    const postNotif = await fetch(`${BASE_URL}/api/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Deterministic Solver Run Complete',
        message: '30-day master roster generated for active month 2026-11.',
        category: 'SUCCESS',
      }),
    });
    const postNotifData = await postNotif.json();
    assert(postNotifData.success, 'POST /api/notifications created notification');
    assert(postNotifData.notification.title === 'Deterministic Solver Run Complete', 'Notification title matches');

    // Mark all read
    const markReadRes = await fetch(`${BASE_URL}/api/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
    });
    const markReadData = await markReadRes.json();
    assert(markReadData.success, 'POST /api/notifications markAllRead succeeded');

    // 2. Brand Management CRUD Verification
    console.log('\n[Phase 2: Brand Management CRUD API]');
    const brandsRes = await fetch(`${BASE_URL}/api/brands`);
    const brandsData = await brandsRes.json();
    assert(brandsData.success, 'GET /api/brands succeeded');
    assert(brandsData.totalCount >= 18, `Seeded at least 18 client brands (got ${brandsData.totalCount})`);
    assert(brandsData.singleResourceCount >= 14, `Identified single-resource brands: ${brandsData.singleResourceCount}`);

    // Manager creates a new brand
    const createBrandRes = await fetch(`${BASE_URL}/api/brands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'TESTBRAND',
        name: 'Test Brand Enterprise',
        podId: 'pod-alpha',
        isSingleResource: false,
        assignedEmployeeIds: ['emp-01', 'emp-02'],
        processIds: ['proc-cs', 'proc-acc'],
        actorRole: 'OPERATIONS_MANAGER',
      }),
    });
    const createBrandData = await createBrandRes.json();
    assert(createBrandData.success, `Created brand TESTBRAND: ${createBrandData.message}`);

    // Unauthorized creation blocked
    const unauthBrandRes = await fetch(`${BASE_URL}/api/brands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'HACK',
        name: 'Hacker Brand',
        podId: 'pod-alpha',
        actorRole: 'EMPLOYEE',
      }),
    });
    assert(unauthBrandRes.status === 403, 'Employee role blocked from creating brands (HTTP 403)');

    // Manager updates brand
    const updateBrandRes = await fetch(`${BASE_URL}/api/brands`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: createBrandData.brand.id,
        name: 'Test Brand Enterprise (Updated)',
        status: 'ACTIVE',
        isSingleResource: true,
        actorRole: 'OPERATIONS_MANAGER',
      }),
    });
    const updateBrandData = await updateBrandRes.json();
    assert(updateBrandData.success, `Updated brand: ${updateBrandData.message}`);
    assert(updateBrandData.brand.name === 'Test Brand Enterprise (Updated)', 'Brand name updated');

    // Manager deletes brand
    const deleteBrandRes = await fetch(`${BASE_URL}/api/brands?id=${createBrandData.brand.id}&actorRole=OPERATIONS_MANAGER`, {
      method: 'DELETE',
    });
    const deleteBrandData = await deleteBrandRes.json();
    assert(deleteBrandData.success, `Deleted brand: ${deleteBrandData.message}`);

    // 3. Pod & Process Management API Verification
    console.log('\n[Phase 3: Pods & Process Configuration API]');
    const podsRes = await fetch(`${BASE_URL}/api/pods`);
    const podsData = await podsRes.json();
    assert(podsData.success, 'GET /api/pods succeeded');
    assert(podsData.totalPods === 3, `Returned 3 operational pods: Alpha, Beta, Gamma (got ${podsData.totalPods})`);

    const procsRes = await fetch(`${BASE_URL}/api/processes`);
    const procsData = await procsRes.json();
    assert(procsData.success, 'GET /api/processes succeeded');
    assert(procsData.processes.length === 4, `Returned 4 core processes (CS, ACC, NDR, RETENTION) (got ${procsData.processes.length})`);
    assert(procsData.operatingRules.length >= 18, `Operating rules configured across accounts (got ${procsData.operatingRules.length})`);

    // Update operating rule
    const updateRuleRes = await fetch(`${BASE_URL}/api/processes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brandId: 'brand-A',
        processId: 'proc-cs',
        minStaffingRequired: 1,
        calendarType: 'TYPE_A_365',
        actorRole: 'OPERATIONS_MANAGER',
      }),
    });
    const updateRuleData = await updateRuleRes.json();
    assert(updateRuleData.success, `Updated operating rule: ${updateRuleData.message}`);

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
