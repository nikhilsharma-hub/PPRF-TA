import { test as setup } from '@playwright/test';
import fs from 'fs';
import { SEL } from '../pages/selectors';
import { PPRF_URL_FILE } from '../pages/pprf.page';
import { login, formFrameUrl } from '../utils/login';

const AUTH_FILE = '.auth/rnd.ja.json';

/**
 * PRE-CONDITION ONLY - not a test case and not reported in the Excel test report.
 * 1. Log in as rnd.ja
 * 2. Open the form: MM -> Individual -> STORES -> PPRF
 * 3. Save the session and the PPRF form URL, so every test starts directly on the form.
 */
setup('pre-condition: log in as rnd.ja and open MM > PPRF', async ({ page }) => {
  fs.mkdirSync('.auth', { recursive: true });

  // 1. Login
  await login(page);

  // 2. Path to the form: MM -> Individual -> STORES -> PPRF
  await page.locator(SEL.nav.mmMenu).first().click();
  const individual = page.locator(SEL.nav.individual).first();
  if (await individual.isVisible().catch(() => false)) await individual.click();
  await page.locator(SEL.nav.pprfLink).first().click();
  const formUrl = await formFrameUrl(page, SEL.pageHeading, 'PPRF');

  // 3. Save for the tests
  fs.writeFileSync(PPRF_URL_FILE, formUrl);
  await page.context().storageState({ path: AUTH_FILE });
});
