import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

// Runs against a server without Supabase configuration. This verifies the honest
// setup state and route protection; authenticated flows need a configured project.
const browser = await chromium.launch({
  channel: process.platform === 'win32' ? 'msedge' : 'chromium',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
try {
  await page.goto('http://localhost:3000/dashboard');
  await page.getByRole('heading', { name: 'Vamos conectar sua operação.' }).waitFor();
  if (!page.url().endsWith('/setup')) throw Error('Protected route did not redirect to setup');
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/setup-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/setup-mobile.png', fullPage: true });
  if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth))
    throw Error('Mobile horizontal overflow');
  if (errors.length) throw Error(errors.join('\n'));
  console.log('Browser smoke passed: setup redirect, desktop/mobile layout, no client errors.');
} finally {
  await browser.close();
}
