import { expect, Locator, Page } from '@playwright/test';
import { TA_SEL } from './ta.selectors';
import fs from 'fs';

export const TA_URL_FILE = '.auth/ta-url.txt';

export class TAPage {
  constructor(readonly page: Page) {
    page.on('dialog', (d) => d.accept().catch(() => {}));
  }

  /**
   * Opens the Travelling Allowance Claim form directly. Login and the
   * General -> Individual -> Claims -> Travelling Allowance path are done once in tests/ta.setup.ts.
   */
  async goto() {
    const url = process.env.TA_PATH || (fs.existsSync(TA_URL_FILE) ? fs.readFileSync(TA_URL_FILE, 'utf8').trim() : '');
    if (!url) throw new Error('TA URL not found - the pre-condition setup (login + General -> Claims -> TA) did not run');
    await this.page.goto(url);
    await expect(this.page.locator(TA_SEL.pageHeading).first(), 'TA form did not open - re-run the setup').toBeVisible();
    // Employee details load asynchronously; wait so later field changes are not overwritten
    await expect(this.$(TA_SEL.empId)).not.toHaveValue('', { timeout: 20_000 });
  }

  $ = (sel: string) => this.page.locator(sel);

  // ---------- locators ----------
  requestFor = (who: 'Self' | 'Guest') => this.page.locator(TA_SEL.requestFor, { hasText: who });
  journeyAmount = (i = 0) => this.$(TA_SEL.journey.amount(i));
  accommodationAmount = (i = 0) => this.$(TA_SEL.accommodationAmount(i));
  otherAmount = (i = 0) => this.$(TA_SEL.otherExpensesAmount(i));
  perDiemAmount = (i = 0) => this.$(TA_SEL.perDiem.amountPerDay(i));
  perDiemTotal = (i = 0) => this.$(TA_SEL.perDiem.total(i));
  paymentAmount = (i = 0) => this.$(TA_SEL.paymentAmount(i));
  get gross() { return this.$(TA_SEL.grossAmount); }
  get advance() { return this.$(TA_SEL.advanceReceived); }
  get net() { return this.$(TA_SEL.netAmount); }
  get journeyRows() { return this.$(TA_SEL.journeyRows); }
  get alertTitle() { return this.$(TA_SEL.alertTitle); }
  get alertText() { return this.$(TA_SEL.alertText); }
  fieldError = (fieldId: string) => this.$(TA_SEL.fieldError(fieldId));

  // ---------- actions ----------
  /** Types like a user and tabs out so blur formatting and totals fire. */
  async typeAmount(field: Locator, value: string | number) {
    await field.click();
    await field.fill('');
    await field.pressSequentially(String(value), { delay: 20 });
    await field.press('Tab');
  }

  /** Date fields are flatpickr inputs (not typeable): set them through the picker API. */
  async setDate(sel: string, value: string) {
    await this.$(sel).evaluate((el, v) => (el as any)._flatpickr.setDate(v, true), value);
  }

  /** Options of a Vueform combobox, scoped to that field (other lists stay in the DOM). */
  options(comboId: string) {
    return this.page.locator(`[id="${comboId}-multiselect-options"] [role="option"]`);
  }

  async optionTexts(comboId: string): Promise<string[]> {
    return (await this.options(comboId).allTextContents()).map((t) => t.trim()).filter(Boolean);
  }

  async choose(comboId: string, label: string | RegExp) {
    await this.page.locator(`[id="${comboId}"]`).click();
    await this.options(comboId).filter({ hasText: label }).first().click();
  }

  async addJourney() {
    const before = await this.journeyRows.count();
    await this.page.getByText('Add Journey Details', { exact: true }).click();
    await expect(this.journeyRows).toHaveCount(before + 1);
  }

  async removeLastJourney() {
    const before = await this.journeyRows.count();
    await this.$(TA_SEL.journeyRemove).last().click();
    await expect(this.journeyRows).toHaveCount(before - 1);
  }

  async closeAlert() {
    await this.$(TA_SEL.alertOk).click();
    await expect(this.alertTitle).toBeHidden();
  }

  /** Fills one complete journey row + payment row + declaration (the fields Submit requires). */
  async fillMinimumClaim(tag: string, amount: number) {
    const j = TA_SEL.journey;
    await this.$(j.departurePlace(0)).fill('Gandhinagar');
    await this.setDate(j.departureDate(0), '2026-09-01 08:00');
    await this.$(j.arrivalPlace(0)).fill('Ahmedabad');
    await this.setDate(j.arrivalDate(0), '2026-09-01 10:00');
    await this.choose(j.mode(0), 'Rail');
    await this.typeAmount(this.journeyAmount(0), amount);
    await this.$(TA_SEL.paymentName(0)).fill(tag);
    await this.typeAmount(this.paymentAmount(0), amount);
    await this.$(TA_SEL.declaration).check();
  }

  async save() {
    await this.$(TA_SEL.save).click();
  }
}
