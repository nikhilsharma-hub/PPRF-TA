/**
 * Travelling Allowance Claim (General -> Individual -> Claims -> Travelling Allowance).
 * Test titles start with a TA_xxx ID. Login + menu path are a pre-condition in tests/ta.setup.ts.
 */
import { test, expect } from './ta-fixtures';
import { expectINR, toNumber } from '../utils/inr';
import { TA_SEL } from '../pages/ta.selectors';

// Trace capture on this form hangs after a failure until the 90 s test timeout; screenshots are still kept.
test.use({ trace: 'off' });

// ---------------- A. Form and employee details (Self) ----------------
test.describe('A. Form and employee details', () => {
  test('TA_001 Form opens with "Self" selected by default @smoke', async ({ ta }) => {
    await expect(ta.requestFor('Self')).toHaveAttribute('aria-checked', 'true');
    await expect(ta.requestFor('Guest')).toHaveAttribute('aria-checked', 'false');
  });

  test('TA_002 Employee details are auto-filled and read-only @smoke', async ({ ta }) => {
    await expect(ta.$(TA_SEL.empId)).toHaveValue(process.env.EXPECTED_EMP_ID || 'E0023');
    for (const sel of [TA_SEL.empId, TA_SEL.empName, TA_SEL.department, TA_SEL.designation, TA_SEL.payLevel]) {
      await expect(ta.$(sel)).not.toBeEditable();
    }
    await expect(ta.$(TA_SEL.empName)).not.toHaveValue('');
  });

  test('TA_003 Purpose of Travel and Funds Detail are read-only in Self mode', async ({ ta }) => {
    await expect(ta.$(TA_SEL.purposeOfTravel)).not.toBeEditable();
    await expect(ta.$(TA_SEL.fundTotalAmount)).not.toBeEditable();
  });

  test('TA_031 Selecting the eOffice Leave Receipt fills Purpose of Travel', async ({ ta }) => {
    const receipts = await ta.optionTexts(TA_SEL.eOfficeReceipt);
    test.skip(!receipts.length, 'No eOffice Leave Receipt available for this account');
    await ta.choose(TA_SEL.eOfficeReceipt, process.env.TA_RECEIPT_LABEL || receipts[0]);
    await expect(ta.$(TA_SEL.purposeOfTravel)).not.toHaveValue('');
    await expect(ta.$(TA_SEL.purposeOfTravel)).not.toBeEditable();
  });

  test('TA_004 Mode of Travel lists all travel modes', async ({ ta }) => {
    expect(await ta.optionTexts(TA_SEL.journey.mode(0))).toEqual([
      'Air',
      'Rail',
      'By Road - (Bus/Taxi/Auto Rickshaw)',
      'By Road Self driven - (Car/Scooter/Tempo ...)',
      'Sea',
    ]);
  });
});

// ---------------- B. Amounts and Claim Summary ----------------
test.describe('B. Amounts and Claim Summary', () => {
  test('TA_005 Journey amount shows INR format', async ({ ta }) => {
    await ta.typeAmount(ta.journeyAmount(0), 12345);
    await expectINR(ta.journeyAmount(0), 12345, { strictDecimals: true });       // 12,345.00
  });

  test('TA_006 Accommodation amount shows lakh grouping @smoke', async ({ ta }) => {
    await ta.typeAmount(ta.accommodationAmount(0), 100000);
    await expectINR(ta.accommodationAmount(0), 100000, { strictDecimals: true }); // 1,00,000.00
  });

  test('TA_007 Other Expenses keeps 2 decimals', async ({ ta }) => {
    await ta.typeAmount(ta.otherAmount(0), '500.5');
    await expectINR(ta.otherAmount(0), 500.5, { strictDecimals: true });         // 500.50
  });

  test('TA_008 Gross Amount = Journey + Accommodation + Other @smoke', async ({ ta }) => {
    await ta.typeAmount(ta.journeyAmount(0), 12345);
    await ta.typeAmount(ta.accommodationAmount(0), 100000);
    await ta.typeAmount(ta.otherAmount(0), '500.5');
    await expectINR(ta.gross, 112845.5, { strictDecimals: true });               // 1,12,845.50
    await expectINR(ta.net, 112845.5, { strictDecimals: true });
  });

  test('TA_009 Net Amount = Gross - Advance Received', async ({ ta }) => {
    await ta.typeAmount(ta.accommodationAmount(0), 100000);
    await ta.typeAmount(ta.advance, 20000);
    await expectINR(ta.advance, 20000);
    await expectINR(ta.net, 80000);                                               // 80,000.00
  });

  test('TA_010 Advance more than Gross gives a negative Net (to be refunded)', async ({ ta }) => {
    await ta.typeAmount(ta.accommodationAmount(0), 12345);
    await ta.typeAmount(ta.advance, 200000);
    await expectINR(ta.net, -187655);                                             // -1,87,655.00
  });

  test('TA_011 Per Diem Total = Amount Per Day x number of days', async ({ ta }) => {
    await ta.setDate(TA_SEL.perDiem.from(0), '2026-09-01 09:00');
    await ta.setDate(TA_SEL.perDiem.to(0), '2026-09-03 18:00');
    await ta.typeAmount(ta.perDiemAmount(0), 800);
    await expect.poll(async () => toNumber(await ta.perDiemTotal(0).inputValue())).toBe(2400);  // 3 days
    await expectINR(ta.gross, 2400);
  });

  test('TA_012 Per Diem Total shows INR format', async ({ ta }) => {
    // Known defect: field shows "150000" (no commas). Remove this line once fixed - the test then turns red.
    test.fail(true, 'Known defect: Per Diem Total is not INR formatted');
    await ta.setDate(TA_SEL.perDiem.from(0), '2026-09-01 09:00');
    await ta.setDate(TA_SEL.perDiem.to(0), '2026-09-03 18:00');
    await ta.typeAmount(ta.perDiemAmount(0), 50000);
    await expectINR(ta.perDiemTotal(0), 150000);                                  // 1,50,000
  });

  test('TA_013 Per Diem To date before From date is rejected', async ({ ta }) => {
    await ta.setDate(TA_SEL.perDiem.from(0), '2026-09-01 09:00');
    await ta.setDate(TA_SEL.perDiem.to(0), '2026-08-30 18:00');
    await expect(ta.alertTitle).toHaveText('Invalid Date');
    await expect(ta.alertText).toContainText('must be after');
    await ta.closeAlert();
    await expect(ta.$(TA_SEL.perDiem.to(0))).toHaveValue('');
  });

  test('TA_014 Journey Arrival before Departure is not accepted', async ({ ta }) => {
    await ta.setDate(TA_SEL.journey.departureDate(0), '2026-09-01 08:00');
    await ta.setDate(TA_SEL.journey.arrivalDate(0), '2026-08-31 08:00');
    await expect(ta.$(TA_SEL.journey.arrivalDate(0))).toHaveValue('');
  });

  test('TA_015 Letters are not accepted in an amount field', async ({ ta }) => {
    await ta.typeAmount(ta.journeyAmount(0), 'abc');
    await expect(ta.journeyAmount(0)).toHaveValue('');
  });

  test('TA_016 Adding and removing a journey row updates Gross Amount', async ({ ta }) => {
    await ta.typeAmount(ta.journeyAmount(0), 1500);
    await ta.addJourney();
    await ta.typeAmount(ta.journeyAmount(1), 3000);
    await expectINR(ta.gross, 4500);
    await ta.removeLastJourney();
    await expectINR(ta.gross, 1500);
  });

  test('TA_017 Payment amount shows INR format', async ({ ta }) => {
    await ta.typeAmount(ta.paymentAmount(0), 123456);
    await expectINR(ta.paymentAmount(0), 123456, { strictDecimals: true });       // 1,23,456.00
  });
});

// ---------------- C. Mandatory field validation ----------------
test.describe('C. Mandatory field validation', () => {
  test('TA_018 Save without eOffice Leave Receipt No. is blocked @smoke', async ({ ta }) => {
    await ta.save();
    await expect(ta.alertTitle).toHaveText('Required Field');
    await expect(ta.alertText).toHaveText('eOffice Leave Receipt No. is required.');
  });

  test('TA_019 Submit on an empty form flags all mandatory fields', async ({ ta }) => {
    await ta.$(TA_SEL.submit).click();
    for (const f of [
      TA_SEL.eOfficeReceipt,
      'JourneyDetails.JourneyList.0.DeparturePlace',
      'JourneyDetails.JourneyList.0.ArrivalPlace',
      'PaymentDetails.PaymentList.0.PaymentName',
    ]) {
      await expect(ta.fieldError(f), f).toContainText('required');
    }
    await expect(ta.fieldError('h3.checkbox')).toContainText('must be accepted');
  });

  test('TA_020 Preview on an empty form shows the missing-fields message', async ({ ta }) => {
    await ta.$(TA_SEL.preview).click();
    await expect(ta.alertTitle).toContainText('Required fields are missing');
  });
});

// ---------------- D. Guest claim ----------------
test.describe('D. Guest claim', () => {
  test.beforeEach(async ({ ta }) => {
    await ta.requestFor('Guest').click();
    await expect(ta.$(TA_SEL.guestName)).toBeVisible();
  });

  test('TA_021 Guest shows editable Guest Details instead of Employee Details', async ({ ta }) => {
    await expect(ta.$(TA_SEL.empId)).toBeHidden();
    for (const sel of [TA_SEL.guestName, TA_SEL.guestOrganization, TA_SEL.guestPurpose, TA_SEL.guestTotalFund]) {
      await expect(ta.$(sel)).toBeEditable();
    }
  });

  test('TA_022 Guest Save without details asks for Name, Organization and Purpose', async ({ ta }) => {
    await ta.save();
    for (const f of ['EmployeeDetailsGuest.EmpName', 'EmployeeDetailsGuest.Organization', 'TravelDetailsGuest.PurposeOfTravel']) {
      await expect(ta.fieldError(f), f).toContainText('required');
    }
  });

  test('TA_023 Guest Total Amount shows INR format', async ({ ta }) => {
    await ta.typeAmount(ta.$(TA_SEL.guestTotalFund), 250000);
    await expectINR(ta.$(TA_SEL.guestTotalFund), 250000);                          // 2,50,000
  });

  test('TA_024 Guest Source of Funds amount shows INR format', async ({ ta }) => {
    // Known defect: field shows "250000" (no commas). Remove this line once fixed - the test then turns red.
    test.fail(true, 'Known defect: Guest Source of Funds amount is not INR formatted');
    await ta.typeAmount(ta.$(TA_SEL.guestFundAmount), 250000);
    await expectINR(ta.$(TA_SEL.guestFundAmount), 250000);                         // 2,50,000
  });

  test('TA_025 Guest Fund Source lists the fund types', async ({ ta }) => {
    expect(await ta.optionTexts(TA_SEL.guestFundSource)).toEqual(['Departmental', 'Endowment', 'Institute', 'Project']);
  });

  test('TA_026 Switching back to Self restores Employee Details', async ({ ta }) => {
    await ta.requestFor('Self').click();
    await expect(ta.$(TA_SEL.empId)).toHaveValue(process.env.EXPECTED_EMP_ID || 'E0023');
  });
});

// ---------------- E. Save and reload ----------------
test.describe('E. Save and reload', () => {
  test.describe.configure({ mode: 'serial' });   // TA_032 reopens the claim TA_027 saves
  let savedLabel = '';

  test('TA_027 Saved claim reopens with the same amounts', async ({ ta }) => {
    const receipts = await ta.optionTexts(TA_SEL.eOfficeReceipt);
    test.skip(!receipts.length, 'No eOffice Leave Receipt available for this account - create an approved leave first');

    const tag = `AUTO-TA-${Date.now()}`;
    const before = await ta.optionTexts(TA_SEL.savedTA);
    await ta.choose(TA_SEL.eOfficeReceipt, process.env.TA_RECEIPT_LABEL || receipts[0]);
    await ta.fillMinimumClaim(tag, 123456.5);
    await ta.save();
    await expect(ta.$(TA_SEL.successMessage).first()).toBeVisible({ timeout: 20_000 });

    await ta.goto();
    const added = (await ta.optionTexts(TA_SEL.savedTA)).filter((o) => !before.includes(o));
    expect(added, 'saved claim did not appear in "Saved Travelling Allowance Claim"').not.toHaveLength(0);
    // Chrome and Edge run in parallel on the same account: open the new entry that holds OUR tag
    let found = false;
    for (const label of added) {
      await ta.choose(TA_SEL.savedTA, label);
      await expect(ta.$(TA_SEL.paymentName(0))).not.toHaveValue('');
      if ((found = (await ta.$(TA_SEL.paymentName(0)).inputValue()) === tag)) { savedLabel = label; break; }
    }
    expect(found, `saved claim ${tag} not found in the Saved list`).toBe(true);
    await expectINR(ta.journeyAmount(0), 123456.5, { strictDecimals: true });      // 1,23,456.50
    await expectINR(ta.paymentAmount(0), 123456.5, { strictDecimals: true });
    expect(toNumber(await ta.gross.inputValue())).toBe(123456.5);
  });

  test('TA_032 Saved claim reloads Gross and Net Amount in INR format', async ({ ta }) => {
    test.skip(!savedLabel, 'Depends on TA_027');
    // Known defect: on reload Gross/Net show "123456.5" (no commas). Remove this line once fixed - the test then turns red.
    test.fail(true, 'Known defect: reloaded Gross/Net Amount are not INR formatted');
    await ta.choose(TA_SEL.savedTA, savedLabel);
    await expectINR(ta.journeyAmount(0), 123456.5, { strictDecimals: true });      // wait until the claim is loaded
    await expectINR(ta.gross, 123456.5, { strictDecimals: true });                 // 1,23,456.50
    await expectINR(ta.net, 123456.5, { strictDecimals: true });
  });
});
