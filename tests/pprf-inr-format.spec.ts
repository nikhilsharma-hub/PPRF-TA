/**
 * IPS-54654 - PPRF: amounts must be shown in Indian (INR) comma format.
 * Test titles start with the TC ID from IPS-54654_PPRF_INR_Format_Test_Report.xlsx
 * so scripts/update-excel.mjs can write the results back into the report.
 */
import { test, expect } from './fixtures';
import { expectINR, normalize, INDIAN_FORMAT } from '../utils/inr';
import { SEL } from '../pages/selectors';

// ---------------- A. Item amount fields ----------------
test.describe('A. Item amount fields', () => {
  const boundary: [string, number, string, boolean][] = [
    // id,      unit price,  expected,           smoke
    ['TC_001', 999,         '999.00',           false],
    ['TC_002', 1000,        '1,000.00',         false],
    ['TC_003', 99999,       '99,999.00',        false],
    ['TC_004', 100000,      '1,00,000.00',      true],
    ['TC_005', 1234567,     '12,34,567.00',     true],
    ['TC_006', 12345678,    '1,23,45,678.00',   true],
    ['TC_007', 123456789,   '12,34,56,789.00',  false],
  ];

  for (const [id, price, expected, smoke] of boundary) {
    test(`${id} Unit Price ${price} shows ₹ ${expected}${smoke ? ' @smoke' : ''}`, async ({ pprf }) => {
      await pprf.setRow(0, 1, price);
      await expectINR(pprf.unitPrice(0), price);
      await expectINR(pprf.totalCost(0), price);
    });
  }

  test('TC_008 Decimal value keeps 2 decimals @smoke', async ({ pprf }) => {
    await pprf.setRow(0, 1, '1234567.5');
    await expectINR(pprf.unitPrice(0), 1234567.5, { strictDecimals: true });   // 12,34,567.50
    await expectINR(pprf.totalCost(0), 1234567.5, { strictDecimals: true });
  });

  test('TC_009 Total Cost = Qty x Unit Price, formatted', async ({ pprf }) => {
    await pprf.setRow(0, 5, 25000);
    await expectINR(pprf.totalCost(0), 125000);                               // 1,25,000.00
  });

  test('TC_010 Total Cost reformats when Quantity changes', async ({ pprf }) => {
    await pprf.setRow(0, 5, 25000);
    await expectINR(pprf.totalCost(0), 125000);
    await pprf.typeAmount(pprf.quantity(0), 50);
    await expectINR(pprf.totalCost(0), 1250000);                              // 12,50,000.00
  });

  test('TC_011 Zero value shows 0.00 without stray comma', async ({ pprf }) => {
    await pprf.setRow(0, 1, 0);
    await expectINR(pprf.unitPrice(0), 0);
  });

  test('TC_012 Editing an already formatted value', async ({ pprf }) => {
    await pprf.setRow(0, 1, 100000);
    await expectINR(pprf.unitPrice(0), 100000);
    await pprf.typeAmount(pprf.unitPrice(0), 250000);
    await expectINR(pprf.unitPrice(0), 250000);                               // 2,50,000.00
    await expectINR(pprf.totalCost(0), 250000);
  });

  test('TC_013 Pasting a value that already has commas', async ({ pprf, page }) => {
    await pprf.typeAmount(pprf.quantity(0), 1);
    const price = pprf.unitPrice(0);
    await price.click();
    await price.fill('');
    await page.evaluate(() => navigator.clipboard?.writeText('1,00,000').catch(() => {}));
    await price.evaluate((el: HTMLInputElement) => {
      // Simulate a paste that works regardless of clipboard permissions
      el.value = '1,00,000';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await price.press('Tab');
    const shown = normalize(await price.inputValue());
    const total = normalize(await pprf.totalCost(0).inputValue());
    test.info().annotations.push({ type: 'observed', description: `unit="${shown}" total="${total}"` });
    // Either accepted correctly or blocked by validation - never a wrong number / NaN
    expect(['', '1,00,000', '1,00,000.00']).toContain(shown);
    expect(total).not.toMatch(/NaN|undefined/i);
    if (shown) await expectINR(pprf.totalCost(0), 100000);
  });

  test('TC_014 Alphabets / special characters not accepted', async ({ pprf }) => {
    await pprf.typeAmount(pprf.quantity(0), 1);
    await pprf.typeAmount(pprf.unitPrice(0), 'abc@#');
    expect(await pprf.unitPrice(0).inputValue()).not.toMatch(/[a-z@#]/i);
    expect(await pprf.totalCost(0).inputValue()).not.toMatch(/NaN|undefined/i);
  });

  test('TC_015 Negative value not accepted', async ({ pprf }) => {
    await pprf.typeAmount(pprf.quantity(0), 1);
    await pprf.typeAmount(pprf.unitPrice(0), '-5000');
    expect(normalize(await pprf.unitPrice(0).inputValue())).not.toMatch(/^-/);
  });
});

// ---------------- B. Grand Total ----------------
test.describe('B. Grand Total & Rounded Grand Total', () => {
  test('TC_016 Grand Total of multiple items @smoke', async ({ pprf }) => {
    await pprf.setRow(0, 1, 150000);
    await pprf.addItem();
    await pprf.setRow(1, 1, '275000.50');
    await expectINR(pprf.grandTotal, 425000.5, { strictDecimals: true });     // 4,25,000.50
  });

  test('TC_017 Rounded Grand Total in Indian format', async ({ pprf }) => {
    await pprf.setRow(0, 1, 150000);
    await pprf.addItem();
    await pprf.setRow(1, 1, '275000.50');
    await expectINR(pprf.grandTotal, 425000.5, { strictDecimals: true });
    const rounded = normalize(await pprf.roundedGrandTotal.inputValue());
    test.info().annotations.push({ type: 'observed', description: `Rounded Grand Total = ${rounded}` });
    expect(rounded).toMatch(INDIAN_FORMAT);
    expect(rounded).toMatch(/^4,25,00[01](\.00)?$/); // confirm rounding rule with dev
  });

  test('TC_018 Grand Total updates when an item is removed', async ({ pprf }) => {
    await pprf.setRow(0, 1, 150000);
    await pprf.addItem();
    await pprf.setRow(1, 1, '275000.50');
    await pprf.removeLastItem();
    await expectINR(pprf.grandTotal, 150000);
    await expectINR(pprf.roundedGrandTotal, 150000);
  });

  test('TC_019 Crore-level Grand Total', async ({ pprf }) => {
    await pprf.setRow(0, 1, 6000000);
    await pprf.addItem();
    await pprf.setRow(1, 1, 5500000);
    await expectINR(pprf.grandTotal, 11500000);                               // 1,15,00,000.00
  });

  test('TC_020 Chairperson mandatory above Rs. 2.5 lakh still works', async ({ pprf }) => {
    await pprf.fillRowDetails(0, `AUTO-CHAIR-${Date.now()}`);
    await pprf.setRow(0, 1, 250001);
    await expectINR(pprf.grandTotal, 250001);
    await pprf.submit();
    await expect(pprf.validation(/chair\s*person/i).first()).toBeVisible();
  });

  test('TC_021 Chairperson NOT mandatory at Rs. 2.5 lakh', async ({ pprf }) => {
    await pprf.fillRowDetails(0, `AUTO-CHAIR-${Date.now()}`);
    await pprf.setRow(0, 1, 250000);
    await expectINR(pprf.grandTotal, 250000);
    await pprf.submit();
    await pprf.page.waitForTimeout(2_000);
    await expect(pprf.validation(/chair\s*person/i)).toHaveCount(0);
  });
});

// ---------------- C. Funds Detail ----------------
test.describe('C. Funds Detail', () => {
  test('TC_022 Total Fund Amount formatted @smoke', async ({ pprf }) => {
    await pprf.typeAmount(pprf.totalFundAmount, 2500000);
    await expectINR(pprf.totalFundAmount, 2500000);                           // 25,00,000
  });

  test('TC_023 Source of Funds amount formatted', async ({ pprf, page }) => {
    test.fixme(!SEL.sourceOfFundsAmount, 'Set SEL.sourceOfFundsAmount in pages/selectors.ts first');
    await page.getByText('+ Add', { exact: true }).first().click();
    const amount = page.locator(SEL.sourceOfFundsAmount).first();
    await pprf.typeAmount(amount, 1250000);
    await expectINR(amount, 1250000);                                         // 12,50,000
  });

  test('TC_024 Total Amount vs Grand Total validation', async () => {
    test.fixme(true, 'Manual - confirm the mismatch rule with the developer, then automate');
  });
});

// ---------------- F. Regression ----------------
test.describe('F. Regression', () => {
  test('TC_039 Indenter details auto-populate for rnd.ja', async ({ pprf }) => {
    await expect(pprf.employeeId).toHaveValue(process.env.EXPECTED_EMP_ID ?? 'E0023');
  });

  test('TC_040 ₹ symbol not duplicated', async ({ pprf, page }) => {
    await pprf.setRow(0, 2, 150000);
    await pprf.typeAmount(pprf.totalFundAmount, 300000);
    const values = await page.locator('input').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
    const body = await page.locator('body').innerText();
    for (const text of [...values, body]) {
      expect(text).not.toMatch(/₹\s*₹|Rs\.?\s*₹|₹\s*Rs/);
    }
  });

  test('TC_041 Other screens using MM.fn_FormatIndianAmount', async () => {
    test.fixme(true, 'Manual - list of other MM screens using the function to be confirmed with the developer');
  });

  // TC_042 (cross-browser) = this whole suite running under both the "chrome" and "edge" projects.
});
