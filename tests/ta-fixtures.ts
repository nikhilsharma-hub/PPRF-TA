import { test as base } from '@playwright/test';
import { TAPage } from '../pages/ta.page';

export const test = base.extend<{ ta: TAPage }>({
  ta: async ({ page }, use) => {
    const ta = new TAPage(page);
    await ta.goto();
    await use(ta);
  },
});
export { expect } from '@playwright/test';
