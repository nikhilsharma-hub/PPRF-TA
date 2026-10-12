import { expect, Locator, Page } from '@playwright/test';
import { SEL } from './selectors';
import { chooseOption } from '../utils/dropdown';
import fs from 'fs';

export const PPRF_URL_FILE = '.auth/pprf-url.txt';

export class PPRFPage {
  constructor(readonly page: Page) {
    // Accept any confirm()/alert() the app raises (e.g. "Are you sure you want to save?")
    page.on('dialog', (d) => d.accept().catch(() => {}));
  }

  /**
   * Opens the PPRF form directly. Login and the MM -> STORES -> PPRF path are done once
   * in tests/auth.setup.ts (pre-condition, not tested); tests only work on the form.
   */
  async goto() {
    const url = process.env.PPRF_PATH || (fs.existsSync(PPRF_URL_FILE) ? fs.readFileSync(PPRF_URL_FILE, 'utf8').trim() : '');
    if (!url) throw new Error('PPRF URL not found - the pre-condition setup (login + MM -> PPRF) did not run');
    await this.page.goto(url);
    await expect(this.page.locator(SEL.pageHeading).first(), 'PPRF form did not open - re-run the setup').toBeVisible();
  }

  // ---------- locators ----------
  itemName = (i = 0) => this.page.locator(SEL.itemName).nth(i);
  description = (i = 0) => this.page.locator(SEL.itemDescription).nth(i);
  quantity = (i = 0) => this.page.locator(SEL.quantity).nth(i);
  unitPrice = (i = 0) => this.page.locator(SEL.unitPrice).nth(i);
  totalCost = (i = 0) => this.unitPrice(i).locator(SEL.totalCostFromUnitPrice);
  get grandTotal() { return this.page.locator(SEL.grandTotal); }
  get roundedGrandTotal() { return this.page.locator(SEL.roundedGrandTotal); }
  get totalFundAmount() { return this.page.locator(SEL.totalFundAmount); }
  get savedPprf() { return this.page.locator(SEL.savedPprf); }
  get employeeId() { return this.page.locator(SEL.employeeId); }
  validation(text: RegExp) { return this.page.locator(SEL.validationMessage).filter({ hasText: text }); }

  // ---------- actions ----------
  /** Types like a user and tabs out so blur/keyup formatting fires. */
  async typeAmount(field: Locator, value: string | number) {
    await field.click();
    await field.fill('');
    await field.pressSequentially(String(value), { delay: 20 });
    await field.press('Tab');
  }

  async setRow(i: number, qty: number | string, price: number | string) {
    await this.typeAmount(this.quantity(i), qty);
    await this.typeAmount(this.unitPrice(i), price);
  }

  /** Fills the non-amount mandatory fields of an item row. */
  async fillRowDetails(i: number, name: string) {
    await this.itemName(i).fill(name);
    await this.description(i).fill(`Automation test item for IPS-54654 - ${name}`);
    for (const n of [1, 2, 3]) {
      await chooseOption(this.page, this.itemName(i).locator(SEL.rowSelect(n)), { index: 1 });
    }
  }

  async addItem() {
    const before = await this.page.locator(SEL.itemName).count();
    await this.page.getByText('Add Another Item', { exact: true }).click();
    await expect(this.page.locator(SEL.itemName)).toHaveCount(before + 1);
  }

  async removeLastItem() {
    const before = await this.page.locator(SEL.itemName).count();
    await this.page.locator(SEL.removeItem).last().click();
    await expect(this.page.locator(SEL.itemName)).toHaveCount(before - 1);
  }

  async fillHeaderFields() {
    await this.page.locator(SEL.purpose).fill('Automation test - IPS-54654 INR format verification');
    await this.page.locator(SEL.siteReadyYes).check({ force: true });
  }

  async save() {
    await this.page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(this.page.locator(SEL.successMessage).first()).toBeVisible({ timeout: 20_000 });
  }

  async submit() {
    await this.page.getByRole('button', { name: 'Submit', exact: true }).click();
  }

  async savedOptions(): Promise<string[]> {
    // Vueform combobox: open it, read the visible options, close it
    await this.savedPprf.click();
    await this.page.waitForTimeout(1_000);
    const texts = await this.page.locator(SEL.dropdownOption).allTextContents();
    await this.savedPprf.press('Escape');
    return texts.map((t) => t.trim()).filter((t) => t && !/^-?select-?$/i.test(t));
  }

  async selectSaved(label: string) {
    await chooseOption(this.page, this.savedPprf, { label });
    await expect.poll(async () => (await this.unitPrice(0).inputValue()).trim(), { timeout: 15_000 }).not.toBe('');
  }

  /** Opens Preview; returns the popup if one opens, otherwise the same page. */
  async openPreview(): Promise<Page> {
    const popup = this.page.context().waitForEvent('page', { timeout: 5_000 }).catch(() => null);
    await this.page.getByRole('button', { name: 'Preview', exact: true }).click();
    const target = (await popup) ?? this.page;
    await target.waitForLoadState();
    return target;
  }

  /** Visible text + all input values of a page (preview screens often render inputs). */
  static async allText(p: Page): Promise<string> {
    const body = await p.locator('body').innerText();
    const values = await p.locator('input, textarea').evaluateAll((els) =>
      els.map((e) => (e as HTMLInputElement).value),
    );
    return `${body}\n${values.join('\n')}`;
  }
}
