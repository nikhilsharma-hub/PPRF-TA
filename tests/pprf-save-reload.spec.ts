/**
 * Section D - Save / Saved PPRF / Preview / Submit.
 * Exercises SP NPPRF_GetPPRFDetailsFromPPRFId (used when a saved PPRF is loaded).
 * Runs in serial: TC_025 creates the draft that the following tests reopen.
 */
import { test, expect } from './fixtures';
import { expectINR, inr, normalize, toNumber } from '../utils/inr';
import { PPRFPage } from '../pages/pprf.page';

test.describe.configure({ mode: 'serial' });

const DATA = {
  itemName: `AUTO-IPS54654-${Date.now()}`,
  qty: 1,
  unitPrice: 1234567.5,   // -> 12,34,567.50
  fundAmount: 2500000,    // -> 25,00,000
};
let savedLabel = '';

async function expectSavedValues(pprf: PPRFPage) {
  await expect(pprf.itemName(0)).toHaveValue(DATA.itemName);
  await expectINR(pprf.unitPrice(0), DATA.unitPrice, { strictDecimals: true });
  await expectINR(pprf.totalCost(0), DATA.unitPrice, { strictDecimals: true });
  await expectINR(pprf.grandTotal, DATA.unitPrice, { strictDecimals: true });
  await expectINR(pprf.totalFundAmount, DATA.fundAmount);
}

test.describe('D. Save / Saved PPRF / Preview / Submit', () => {
  test('TC_025 Save PPRF with lakh/crore amounts @smoke', async ({ pprf }) => {
    const before = await pprf.savedOptions();
    await pprf.fillRowDetails(0, DATA.itemName);
    await pprf.setRow(0, DATA.qty, String(DATA.unitPrice));
    await pprf.fillHeaderFields();
    await pprf.typeAmount(pprf.totalFundAmount, DATA.fundAmount);
    await pprf.save();

    await pprf.goto();
    const after = await pprf.savedOptions();
    // Chrome and Edge run in parallel on the same account: pick the new entry that holds OUR item
    for (const label of after.filter((o) => !before.includes(o))) {
      await pprf.selectSaved(label);
      if ((await pprf.itemName(0).inputValue()) === DATA.itemName) { savedLabel = label; break; }
    }
    test.info().annotations.push({ type: 'saved PPRF', description: savedLabel || 'not found' });
    expect(savedLabel, 'New entry should appear in Saved PPRF dropdown').not.toBe('');
  });

  test('TC_026 Saved PPRF reloads amounts in INR format @smoke', async ({ pprf }) => {
    test.skip(!savedLabel, 'Depends on TC_025');
    await pprf.selectSaved(savedLabel);
    await expectSavedValues(pprf);
    expect(normalize(await pprf.roundedGrandTotal.inputValue())).toMatch(/^12,34,56[78](\.00)?$/);
  });

  test('TC_027 Reloaded values exactly match saved values', async ({ pprf }) => {
    test.skip(!savedLabel, 'Depends on TC_025');
    await pprf.selectSaved(savedLabel);
    expect(toNumber(await pprf.unitPrice(0).inputValue())).toBe(DATA.unitPrice);
    expect(toNumber(await pprf.totalCost(0).inputValue())).toBe(DATA.unitPrice * DATA.qty);
    expect(toNumber(await pprf.grandTotal.inputValue())).toBe(DATA.unitPrice * DATA.qty);
    expect(toNumber(await pprf.totalFundAmount.inputValue())).toBe(DATA.fundAmount);
  });

  test('TC_028 Re-save a loaded PPRF - no double formatting', async ({ pprf }) => {
    test.skip(!savedLabel, 'Depends on TC_025');
    await pprf.selectSaved(savedLabel);
    await pprf.save();
    await pprf.goto();
    await pprf.selectSaved(savedLabel);
    await expectSavedValues(pprf);
  });

  test('TC_029 Preview shows INR format', async ({ pprf }) => {
    test.skip(!savedLabel, 'Depends on TC_025');
    await pprf.selectSaved(savedLabel);
    const preview = await pprf.openPreview();
    await expect.poll(() => PPRFPage.allText(preview)).toContain(inr(DATA.unitPrice, 0)); // 12,34,567
    const text = await PPRFPage.allText(preview);
    expect(text).toMatch(/25,00,000/);
    expect(text, 'Unformatted amount must not appear').not.toMatch(/(?<![\d,])1234567(\.5)?(?![\d,])/);
    expect(text).not.toMatch(/(?<![\d,])2500000(?![\d,])/);
  });

  test('TC_030 Submitted PPRF view shows INR format', async ({ pprf }) => {
    test.skip(process.env.RUN_SUBMIT !== 'true', 'Set RUN_SUBMIT=true to create a real submitted PPRF on staging');
    test.skip(!savedLabel, 'Depends on TC_025');
    // Committee members, Source of Funds and Supporting Documents must be filled for Submit.
    // Complete those steps here once their selectors are confirmed, then assert on the view page.
    test.fixme(true, 'Complete committee / funds / document steps for Submit');
  });

  test('TC_031 Approver view shows INR format', async () => {
    test.fixme(true, 'Manual - needs approver login');
  });

  test('TC_032 PPRF created before the fix displays correctly', async ({ pprf }) => {
    const old = process.env.OLD_PPRF_LABEL;
    test.skip(!old, 'Set OLD_PPRF_LABEL in .env');
    await pprf.selectSaved(old!);
    for (const field of [pprf.unitPrice(0), pprf.totalCost(0), pprf.grandTotal]) {
      const v = normalize(await field.inputValue());
      expect(v).toMatch(/^-?(\d{1,3}|\d{1,2}(,\d{2})*,\d{3})(\.\d{1,2})?$/);
    }
  });
});
