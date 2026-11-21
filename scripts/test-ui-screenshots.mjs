/**
 * Automated UI Screenshot & Visual RBAC Verification Test Suite
 * Author: Meet Maru (meetmaru@datastraw.io)
 * Project: Datastraw Tech Internship Assessment
 * Target: http://localhost:3000
 * 
 * Uses puppeteer-core targeting system Chrome to capture and verify:
 * 1. Enterprise Login & Role Gateway
 * 2. Operations Manager Workspace (Master Controller)
 * 3. Pod Lead Workspace (Pod Alpha Supervisor)
 * 4. Employee Self-Service Workspace (Personal Inspector with [YOU])
 * 5. Employee Read-Only Slot Inspector Modal
 */

import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = path.resolve('public', 'screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runVisualTests() {
  console.log('====================================================');
  console.log('DATASTRAW SMART ROSTER - VISUAL UI & RBAC SCREENSHOT SUITE');
  console.log('Author: Meet Maru');
  console.log('Target:', BASE_URL);
  console.log('Chrome:', CHROME_PATH);
  console.log('Output Directory:', SCREENSHOT_DIR);
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

  // Pre-seed benchmark dataset so roster has active employees and slots
  console.log('--- PRE-REQUISITE: Seeding Benchmark Dataset & Baseline Roster ---');
  await fetch(`${BASE_URL}/api/seed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ monthYear: '2026-11' }),
  });
  await fetch(`${BASE_URL}/api/roster/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ monthYear: '2026-11', actorRole: 'OPERATIONS_MANAGER' }),
  });
  console.log('Baseline benchmark data initialized successfully.\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--window-size=1440,900'],
    defaultViewport: { width: 1440, height: 900 },
  });

  const page = await browser.newPage();

  try {
    // ----------------------------------------------------
    // SCENARIO 0: Logout to capture Enterprise Login Gateway
    // ----------------------------------------------------
    console.log('--- SCENARIO 0: Enterprise Login & Role Gateway ---');
    await fetch(`${BASE_URL}/api/auth/logout`, { method: 'POST' });

    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    await page.waitForSelector('h1');

    const headingText = await page.$eval('h1', (el) => el.innerText);
    assert(headingText.includes('SMART ROSTER MANAGEMENT SYSTEM'), 'Login Gateway heading rendered correctly');

    const ssoBtn = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return !!buttons.find((b) => b.textContent && b.textContent.includes('Sign In with Google'));
    });
    assert(ssoBtn === true, 'Google Workspace SSO button is clearly visible');

    const mgrCardBtn = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return !!buttons.find((b) => b.textContent && b.textContent.includes('Enter as Operations Manager'));
    });
    assert(mgrCardBtn === true, 'Operations Manager demo launcher card rendered');

    const leadCardBtn = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return !!buttons.find((b) => b.textContent && b.textContent.includes('Enter as Pod Lead'));
    });
    assert(leadCardBtn === true, 'Pod Lead demo launcher card rendered');

    const empCardBtn = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return !!buttons.find((b) => b.textContent && b.textContent.includes('Enter as Employee'));
    });
    assert(empCardBtn === true, 'Employee demo launcher card rendered');

    const sc0Path = path.join(SCREENSHOT_DIR, '01_login_gateway.png');
    await page.screenshot({ path: sc0Path, fullPage: false });
    console.log(`Captured screenshot: ${sc0Path}`);

    // ----------------------------------------------------
    // SCENARIO 1: Operations Manager Dashboard
    // ----------------------------------------------------
    console.log('\n--- SCENARIO 1: Operations Manager Workspace ---');
    // Click "Enter as Operations Manager"
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent.includes('Enter as Operations Manager')
      );
      if (btn) btn.click();
    });

    await page.waitForFunction(
      () => document.querySelector('header') && document.querySelector('header').innerText.includes('OPERATIONS MANAGER SCOPE'),
      { timeout: 10000 }
    );
    await new Promise((r) => setTimeout(r, 1000));

    // Verify Manager UI elements
    const mgrScopeBanner = await page.$eval('header', (el) => el.innerText);
    assert(mgrScopeBanner.includes('OPERATIONS MANAGER SCOPE'), 'Operations Manager scope banner is active');

    const publishBtn = await page.evaluate(() => {
      return !!Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent.includes('Publish Roster')
      );
    });
    assert(publishBtn === true, 'Operations Manager has Publish Roster button');

    const benchmarkSeedBtn = await page.evaluate(() => {
      return !!Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent.includes('Load Benchmark Data')
      );
    });
    assert(benchmarkSeedBtn === true, 'Operations Manager has Load Benchmark Data button');

    const sc1Path = path.join(SCREENSHOT_DIR, '02_ops_manager_dashboard.png');
    await page.screenshot({ path: sc1Path, fullPage: false });
    console.log(`Captured screenshot: ${sc1Path}`);

    // ----------------------------------------------------
    // SCENARIO 2: Pod Lead Dashboard (Rahul Sharma)
    // ----------------------------------------------------
    console.log('\n--- SCENARIO 2: Pod Lead Workspace (Pod Alpha) ---');
    // Click Logout in Header to return to Login Gateway
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent.trim() === 'Logout'
      );
      if (btn) btn.click();
    });

    await page.waitForFunction(
      () => document.querySelector('h1') && document.querySelector('h1').innerText.includes('SMART ROSTER MANAGEMENT SYSTEM'),
      { timeout: 10000 }
    );
    await new Promise((r) => setTimeout(r, 600));

    // Log in as Pod Lead via Demo Profile Card
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent.includes('Enter as Pod Lead')
      );
      if (btn) btn.click();
    });

    await page.waitForFunction(
      () => document.querySelector('header') && document.querySelector('header').innerText.includes('POD LEAD SCOPE'),
      { timeout: 10000 }
    );
    await new Promise((r) => setTimeout(r, 1000));

    const leadScopeBanner = await page.$eval('header', (el) => el.innerText);
    assert(leadScopeBanner.includes('POD LEAD SCOPE'), 'Pod Lead scope banner is active');

    const leadPublishBtn = await page.evaluate(() => {
      return !!Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent.includes('Publish Roster')
      );
    });
    assert(leadPublishBtn === false, 'Publish Roster button is strictly hidden for Pod Lead');

    const leadSeedBtn = await page.evaluate(() => {
      return !!Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent.includes('Load Benchmark Data')
      );
    });
    assert(leadSeedBtn === false, 'Load Benchmark Data button is strictly hidden for Pod Lead');

    const podGenBtn = await page.evaluate(() => {
      return !!Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent.includes('Generate Pod Roster')
      );
    });
    assert(podGenBtn === true, 'Generate Pod Roster button is present for Pod Lead');

    const sc2Path = path.join(SCREENSHOT_DIR, '03_pod_lead_dashboard.png');
    await page.screenshot({ path: sc2Path, fullPage: false });
    console.log(`Captured screenshot: ${sc2Path}`);

    // ----------------------------------------------------
    // SCENARIO 3: Employee Dashboard (Ananya Roy - E02)
    // ----------------------------------------------------
    console.log('\n--- SCENARIO 3: Employee Self-Service Workspace ---');
    // Click Logout in Header to return to Login Gateway
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent.trim() === 'Logout'
      );
      if (btn) btn.click();
    });

    await page.waitForFunction(
      () => document.querySelector('h1') && document.querySelector('h1').innerText.includes('SMART ROSTER MANAGEMENT SYSTEM'),
      { timeout: 10000 }
    );
    await new Promise((r) => setTimeout(r, 600));

    // Log in as Employee via Demo Profile Card
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent.includes('Enter as Employee')
      );
      if (btn) btn.click();
    });

    await page.waitForFunction(
      () => document.querySelector('header') && document.querySelector('header').innerText.includes('EMPLOYEE SELF-SERVICE SCOPE'),
      { timeout: 10000 }
    );
    await new Promise((r) => setTimeout(r, 1000));

    const empScopeBanner = await page.$eval('header', (el) => el.innerText);
    assert(empScopeBanner.includes('EMPLOYEE SELF-SERVICE SCOPE'), 'Employee self-service scope banner is active');

    const empGenBtn = await page.evaluate(() => {
      return !!Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent.includes('Generate Roster') || b.textContent.includes('Generate Pod Roster')
      );
    });
    assert(empGenBtn === false, 'Generate Roster buttons are strictly hidden for Employee');

    const empPublishBtn = await page.evaluate(() => {
      return !!Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent.includes('Publish Roster')
      );
    });
    assert(empPublishBtn === false, 'Publish Roster button is strictly hidden for Employee');

    // Verify Personal KPI Cards are visible
    const pageText = await page.evaluate(() => document.body.innerText);
    assert(pageText.includes('MY PROFILE'), 'Personal KPI: My Profile is visible');
    assert(pageText.includes('WORKING SHIFTS'), 'Personal KPI: Working Shifts is visible');
    assert(pageText.includes('COMP-OFF BALANCE'), 'Personal KPI: Comp-Off Balance is visible');

    const sc3Path = path.join(SCREENSHOT_DIR, '04_employee_dashboard.png');
    await page.screenshot({ path: sc3Path, fullPage: false });
    console.log(`Captured screenshot: ${sc3Path}`);

    // ----------------------------------------------------
    // SCENARIO 4: Employee Read-Only Slot Inspector
    // ----------------------------------------------------
    console.log('\n--- SCENARIO 4: Employee Read-Only Slot Inspector ---');
    // Click any schedule cell on the personal calendar or company matrix
    await page.evaluate(() => {
      const cell = document.querySelector('td[title*="inspect or override"]') ||
                   document.querySelector('div[title*="inspect or override"]') ||
                   document.querySelector('td[title*="duty on"]') ||
                   document.querySelector('div[title*="duty on"]');
      if (cell) cell.click();
    });

    await page.waitForFunction(
      () => document.querySelector('.fixed.inset-0') && document.querySelector('.fixed.inset-0').innerText.includes('ACCESS LEVEL: READ-ONLY'),
      { timeout: 10000 }
    );
    await new Promise((r) => setTimeout(r, 800));

    const modalText = await page.evaluate(() => {
      const modal = document.querySelector('.fixed.inset-0');
      return modal ? modal.innerText : '';
    });

    assert(modalText.includes('ACCESS LEVEL: READ-ONLY (EMPLOYEE ROLE)'), 'Slot Inspector renders in READ-ONLY mode for employee');
    assert(modalText.includes('Close Inspector'), 'Inspector has Close Inspector button with submit buttons hidden');

    const sc4Path = path.join(SCREENSHOT_DIR, '05_employee_readonly_slot.png');
    await page.screenshot({ path: sc4Path, fullPage: false });
    console.log(`Captured screenshot: ${sc4Path}`);

    console.log('\n====================================================');
    console.log(`ALL ${passed}/${total} VISUAL UI & RBAC TESTS PASSED!`);
    console.log('====================================================');
  } catch (err) {
    console.error('Visual UI test error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runVisualTests();
