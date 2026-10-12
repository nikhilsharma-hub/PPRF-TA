import { test as setup } from '@playwright/test';
import fs from 'fs';
import { TA_SEL } from '../pages/ta.selectors';
import { TA_URL_FILE } from '../pages/ta.page';
import { login, formFrameUrl } from '../utils/login';

/**
 * PRE-CONDITION ONLY - not a test case.
 * 1. Log in as rnd.ja
 * 2. Open the form: General -> Individual -> Claims -> Travelling Allowance
 * 3. Save the form URL, so every TA test starts directly on the form.
 */
setup('pre-condition: log in as rnd.ja and open General > Claims > Travelling Allowance', async ({ page }) => {
  fs.mkdirSync('.auth', { recursive: true });

  await login(page);

  await page.locator(TA_SEL.nav.generalMenu).click();
  await page.locator(TA_SEL.nav.individual).first().click();
  await page.locator(TA_SEL.nav.taLink).first().click();
  const formUrl = await formFrameUrl(page, TA_SEL.pageHeading, 'Travelling Allowance');

  fs.writeFileSync(TA_URL_FILE, formUrl);
  await page.context().storageState({ path: '.auth/rnd.ja.json' });
});
