import { Locator, Page } from '@playwright/test';
import { SEL } from '../pages/selectors';

/** Works for native <select> (incl. hidden select behind select2) and simple custom dropdowns. */
export async function chooseOption(page: Page, field: Locator, opt: { index?: number; label?: string }) {
  const tag = await field.evaluate((e) => e.tagName.toLowerCase());
  if (tag === 'select') {
    if (opt.label) await field.selectOption({ label: opt.label }, { force: true });
    else await field.selectOption({ index: opt.index ?? 1 }, { force: true });
    await field.dispatchEvent('change');
    return;
  }
  await field.click();
  const options = page.locator(SEL.dropdownOption).filter({ hasNotText: /^\s*-Select-\s*$/ });
  if (opt.label) await options.filter({ hasText: opt.label }).first().click();
  else await options.nth((opt.index ?? 1) - 1).click();
}
