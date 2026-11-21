/**
 * LIVE WORKSPACE & RBAC VERIFICATION SCRIPT
 * Target: http://localhost:3000
 * Author: Meet Maru (meetmaru@datastraw.io)
 */

import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:3000';

async function verifyLocalhost() {
  console.log('Connecting headless Chrome to verify http://localhost:3000...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1600,1000'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000 });

  // 1. Visit Login Gateway
  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'public/screenshots/review_01_gateway_roles.png' });
  console.log('1. Captured: review_01_gateway_roles.png');

  // 2. Click Register tab to verify fields
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate((el) => el.innerText, btn);
    if (text.includes('New Registration')) {
      await btn.click();
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: 'public/screenshots/review_02_registration_governance.png' });
  console.log('2. Captured: review_02_registration_governance.png');

  // 3. Switch back to Quick Role and login as Operations Manager
  const buttons2 = await page.$$('button');
  for (const btn of buttons2) {
    const text = await page.evaluate((el) => el.innerText, btn);
    if (text.includes('Quick Demo Access')) {
      await btn.click();
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 400));
  const buttons3 = await page.$$('button');
  for (const btn of buttons3) {
    const text = await page.evaluate((el) => el.innerText, btn);
    if (text.includes('Enter as Operations Manager')) {
      await btn.click();
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: 'public/screenshots/review_03_ops_manager_dashboard.png' });
  console.log('3. Captured: review_03_ops_manager_dashboard.png');

  // 4. Logout and login as Pod Lead
  const buttons4 = await page.$$('button');
  for (const btn of buttons4) {
    const text = await page.evaluate((el) => el.innerText, btn);
    if (text.trim() === 'Logout') {
      await btn.click();
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 800));
  const buttons5 = await page.$$('button');
  for (const btn of buttons5) {
    const text = await page.evaluate((el) => el.innerText, btn);
    if (text.includes('Enter as Pod Lead')) {
      await btn.click();
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: 'public/screenshots/review_04_pod_lead_workspace.png' });
  console.log('4. Captured: review_04_pod_lead_workspace.png');

  // 5. Logout and login as Employee
  const buttons6 = await page.$$('button');
  for (const btn of buttons6) {
    const text = await page.evaluate((el) => el.innerText, btn);
    if (text.trim() === 'Logout') {
      await btn.click();
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 800));
  const buttons7 = await page.$$('button');
  for (const btn of buttons7) {
    const text = await page.evaluate((el) => el.innerText, btn);
    if (text.includes('Enter as Employee')) {
      await btn.click();
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: 'public/screenshots/review_05_employee_workspace.png' });
  console.log('5. Captured: review_05_employee_workspace.png');

  // 6. In Employee workspace, open Leave Requests modal
  const buttons8 = await page.$$('button');
  for (const btn of buttons8) {
    const text = await page.evaluate((el) => el.innerText, btn);
    if (text.includes('My Leaves')) {
      await btn.click();
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: 'public/screenshots/review_06_employee_leaves_modal.png' });
  console.log('6. Captured: review_06_employee_leaves_modal.png');

  await browser.close();
  console.log('\n--- VERIFICATION COMPLETE: ALL 6 REVIEW SCREENSHOTS GENERATED! ---');
}

verifyLocalhost().catch((err) => {
  console.error('Verification error:', err);
  process.exit(1);
});
