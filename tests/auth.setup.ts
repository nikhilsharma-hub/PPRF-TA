import { test as setup, expect } from '@playwright/test';
import fs from 'fs';
import { SEL } from '../pages/selectors';
import { PPRF_URL_FILE } from '../pages/pprf.page';

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
  await page.goto(process.env.LOGIN_PATH || '/');
  await page.locator(SEL.login.username).first().fill(process.env.PPRF_USER || 'rnd.ja');
  await page.locator(SEL.login.password).first().fill(process.env.PPRF_PASSWORD || '');
  await page.locator(SEL.login.submit).first().click();
  await expect(page.locator(SEL.loggedInUser).first()).toBeVisible({ timeout: 30_000 });

    // 2. Path to the form: MM -> Individual -> STORES -> PPRF
  await page.locator(SEL.nav.mmMenu).first().click();
  const individual = page.locator(SEL.nav.individual).first();
  if (await individual.isVisible().catch(() => false)) await individual.click();
  await page.locator(SEL.nav.pprfLink).first().click();
  // The IPAS shell may load the form in an iframe: keep the URL of whichever frame shows it,
  // so tests open the form directly and their page locators work.
  let formUrl = '';
  await expect.poll(async () => {
    for (const f of page.frames()) {
      if (await f.locator(SEL.pageHeading).count().catch(() => 0)) return (formUrl = f.url());
    }
    return '';
  }, { message: 'PPRF form did not open', timeout: 30_000 }).not.toBe('');

  // 3. Save for the tests
  fs.writeFileSync(PPRF_URL_FILE, formUrl);
  await page.context().storageState({ path: AUTH_FILE });
});
