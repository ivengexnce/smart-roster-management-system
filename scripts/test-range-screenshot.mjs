import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = 'D:\\github_repos\\smart-roster-management-system\\public\\screenshots';

async function capture() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

  // 1. Log in as Operations Manager
  const opsBtn = await page.waitForSelector('button[title*="Operations Manager"]');
  await opsBtn.click();
  await page.waitForFunction(() => document.body.innerText.includes('OPERATIONS MANAGER SCOPE'));

  // 2. Capture Company Master Matrix with Range Slices
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_master_matrix_range_slices.png') });
  console.log('Saved 06_master_matrix_range_slices.png');

  // 3. Click "Manage Staff" to open the Employee Management & Preview Modal
  const manageStaffBtn = await page.waitForSelector('button[title*="Manage Staff"]');
  await manageStaffBtn.click();
  await page.waitForFunction(() => document.body.innerText.includes('EMPLOYEE MANAGEMENT & RANGE DIRECTORY'));

  // 4. Capture the Employee Management & Range Preview Modal
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_employee_management_preview_modal.png') });
  console.log('Saved 07_employee_management_preview_modal.png');

  await browser.close();
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
