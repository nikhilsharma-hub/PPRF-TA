import { expect, Page } from '@playwright/test';
import { SEL } from '../pages/selectors';

/** Logs in as the staging account from .env (default rnd.ja). Shared by every *.setup.ts. */
export async function login(page: Page) {
  await page.goto(process.env.LOGIN_PATH || '/');
  await page.locator(SEL.login.username).first().fill(process.env.PPRF_USER || 'rnd.ja');
  await page.locator(SEL.login.password).first().fill(process.env.PPRF_PASSWORD || '');
  await page.locator(SEL.login.submit).first().click();
  await expect(page.locator(SEL.loggedInUser).first()).toBeVisible({ timeout: 30_000 });
}

/**
 * The IPAS shell loads forms in an iframe. Returns the URL of whichever frame shows `heading`,
 * so tests can open the form directly and their page locators work.
 */
export async function formFrameUrl(page: Page, heading: string, name: string): Promise<string> {
  let url = '';
  await expect.poll(async () => {
    for (const f of page.frames()) {
      if (await f.locator(heading).count().catch(() => 0)) return (url = f.url());
    }
    return '';
  }, { message: `${name} form did not open`, timeout: 30_000 }).not.toBe('');
  return url;
}
