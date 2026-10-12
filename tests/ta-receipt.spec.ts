/**
 * TA Submit with empty Remarks - eOffice receipt not saved / duplicate receipt on re-submit.
 * Root cause: frontend sends Remarks: null to PATCH api/TA/V0/UpdateReceipt; the API rejects it with
 * an automatic 400 ("The Remarks field is required."), the user sees "API error", and a re-submit
 * generates a second eOffice receipt.
 *
 * SAFE TO RUN: no real claim or eOffice receipt is created. Claim creation (Submit), the PDF portal,
 * eOffice receipt generation and the document upload are mocked in the browser. Only UpdateReceipt
 * reaches the real API, for a claim id that does not exist, so nothing is written.
 */
import { Request } from '@playwright/test';
import { test, expect } from './ta-fixtures';
import { TA_SEL } from '../pages/ta.selectors';
import { TAPage } from '../pages/ta.page';
import { fulfillJson, blankPdfBase64 } from '../utils/mock';

test.use({ trace: 'off' });

const FAKE_CLAIM_ID = '00000000-0000-0000-0000-000000000000';   // claim ids are GUIDs; this one matches no claim
const REMARKS_400 = /Remarks field is required/i;

/** Mocks everything Submit touches except UpdateReceipt; returns the eOffice receipt calls. */
async function mockSubmitChain(ta: TAPage) {
  const page = ta.page;
  const eOfficeCalls: Request[] = [];
  await page.route('**/api/TA/V0/LeaveReceipts*', (r) =>
    fulfillJson(r, { data: [{ lInstanceId: FAKE_CLAIM_ID, eOfficeReceiptNo: 'AUTO-LEAVE-RECEIPT', purpose: 'Automation test', appliedOn: '2026-09-01' }] }));
  await page.route('**/GetFundDetailsFromInstanceId*', (r) => fulfillJson(r, []));
  await page.route('**/api/TA/V0/Submit', (r) => fulfillJson(r, { success: true, data: { claimId: FAKE_CLAIM_ID } }));
  await page.route('**/pdfPortal/ta/ta.aspx*', (r) =>
    r.fulfill({ body: blankPdfBase64(), contentType: 'text/plain', headers: { 'Access-Control-Allow-Origin': '*' } }));
  await page.route('**/api/eOffice/eOfficeGetReceiptNo', (r) => {
    eOfficeCalls.push(r.request());
    return fulfillJson(r, { statusCode: '200', eOfficeReceiptNo: `AUTO-RCPT-${eOfficeCalls.length}` });
  });
  await page.route('**/InsertDocumentDetails*', (r) => fulfillJson(r, { status: 'Success' }));
  // Reload so the mocked leave receipt list is used
  await ta.goto();
  return eOfficeCalls;
}

/** Self claim with all required fields, Remarks left untouched. */
async function fillAndSubmit(ta: TAPage) {
  await ta.choose(TA_SEL.eOfficeReceipt, 'AUTO-LEAVE-RECEIPT');
  await ta.fillMinimumClaim(`AUTO-TA-RCPT-${Date.now()}`, 1000);
  await expect(ta.$(TA_SEL.remarks)).toHaveValue('');
  await clickSubmit(ta);
}

async function clickSubmit(ta: TAPage) {
  await ta.$(TA_SEL.submit).click();
  await expect(ta.alertTitle).toHaveText('Confirmation');
  await ta.$(TA_SEL.alertOk).click();                                 // "Yes"
}

test.describe('F. Submit with empty Remarks - eOffice receipt', () => {
  test('TA_028 UpdateReceipt API accepts Remarks = null', async ({ ta, page }) => {
    // Pick up the API base URL and auth header from a call the form makes on load
    const apiCall = page.waitForRequest(/\/api\/TA\/V0\//);
    await ta.goto();
    const req = await apiCall;
    const url = req.url().replace(/\/api\/TA\/V0\/.*/, '/api/TA/V0/UpdateReceipt');
    const auth = await req.headerValue('authorization');

    const res = await page.request.patch(url, {
      headers: auth ? { authorization: auth } : {},
      data: { ClaimId: FAKE_CLAIM_ID, EOfficeReceiptNo: 'AUTO-RCPT-TEST', EOfficePostId: '0', Remarks: null },
    });
    const body = await res.text();
    test.info().annotations.push({ type: 'observed', description: `HTTP ${res.status()} ${body.slice(0, 300)}` });
    expect(body, 'API still rejects a null Remarks before the action runs').not.toMatch(REMARKS_400);
  });

  test('TA_029 Submit with empty Remarks is not blocked by Remarks validation (no "API error")', async ({ ta, page }) => {
    await mockSubmitChain(ta);
    const update = page.waitForResponse('**/api/TA/V0/UpdateReceipt');
    await fillAndSubmit(ta);
    const res = await update;

    const sent = res.request().postDataJSON();
    const body = await res.text();
    test.info().annotations.push({ type: 'observed', description: `Remarks sent=${JSON.stringify(sent.Remarks)}; HTTP ${res.status()} ${body.slice(0, 300)}` });
    expect(body, 'UpdateReceipt rejected the empty Remarks').not.toMatch(REMARKS_400);
    await expect(ta.alertTitle).toHaveText(/^(Success|Error)$/, { timeout: 30_000 });
    await expect(ta.alertText).not.toHaveText('API error');
  });

  test('TA_030 Re-submit after a failed UpdateReceipt does not create a second eOffice receipt', async ({ ta, page }) => {
    const eOfficeCalls = await mockSubmitChain(ta);
    // Reproduce the original failure on the first UpdateReceipt, succeed afterwards
    let updates = 0;
    await page.route('**/api/TA/V0/UpdateReceipt', (r) =>
      ++updates === 1
        ? fulfillJson(r, { title: 'One or more validation errors occurred.', status: 400, errors: { Remarks: ['The Remarks field is required.'] } }, 400)
        : fulfillJson(r, { success: true, message: 'Receipt updated' }));

    await fillAndSubmit(ta);
    await expect(ta.alertText).toHaveText('API error', { timeout: 30_000 });
    await ta.closeAlert();

    await clickSubmit(ta);
    await expect(ta.alertTitle, 'second Submit did not finish').toHaveText(/^(Success|Error)$/, { timeout: 30_000 });
    expect(eOfficeCalls, 'eOffice receipt generated again for the same claim').toHaveLength(1);
  });
});
