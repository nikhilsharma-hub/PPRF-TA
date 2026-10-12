import { test as base } from '@playwright/test';
import { PPRFPage } from '../pages/pprf.page';

export const test = base.extend<{ pprf: PPRFPage }>({
  pprf: async ({ page }, use) => {
    const pprf = new PPRFPage(page);
    await pprf.goto();
    await use(pprf);
  },
});
export { expect } from '@playwright/test';
