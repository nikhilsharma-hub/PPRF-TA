# IPS-54654 – PPRF INR Amount Format: Playwright Test Execution Process

**Ticket:** IPS-54654 · **Module:** Material Management (MM) · **Type:** Hot-Fix · **Severity:** S3
**Change:** `MM.fn_FormatIndianAmount`, `NPPRF_GetPPRFDetailsFromPPRFId`
**Environment:** Staging · **Account:** `rnd.ja` (E0023 – RD Jr. Assistant)
**Test report:** `IPS-54654_PPRF_INR_Format_Test_Report.xlsx`

---

## 1. What is automated and what is manual

| Area | TC IDs | How |
|---|---|---|
| A. Item amount fields | TC_001 – TC_015 | Playwright |
| B. Grand Total / Rounded / Chairperson rule | TC_016 – TC_021 | Playwright |
| C. Funds Detail | TC_022 – TC_023 | Playwright (TC_023 after selector is set) |
| C. Total vs Grand Total rule | TC_024 | Manual |
| D. Save / Saved PPRF / Preview | TC_025 – TC_029 | Playwright |
| D. Submit view | TC_030 | Playwright, opt-in (`RUN_SUBMIT=true`) |
| D. Approver view | TC_031 | Manual |
| D. Old PPRF (before fix) | TC_032 | Playwright (needs `OLD_PPRF_LABEL`) |
| E. DB function and SP | TC_033 – TC_038 | Manual SQL – `db/IPS-54654_db_checks.sql` |
| F. Indenter, ₹ symbol | TC_039 – TC_040 | Playwright |
| F. Other screens using the function | TC_041 | Manual |
| F. Cross-browser | TC_042 | Whole suite runs on Chrome **and** Edge |

---

## 2. One-time setup

1. Install **Node.js 18 or later**, plus Google Chrome and Microsoft Edge.
2. In this folder:
   ```bash
   npm install
   npx playwright install chrome msedge
   ```
3. `.env` is already included with the rnd.ja credentials. Only fill in **`BASE_URL`**, the IPAS staging URL.
   **Never commit `.env`** (it is in `.gitignore`).

**Only the PPRF form is tested.** Login and the menu path are a pre-condition, done once in `tests/auth.setup.ts` before the tests start:

1. Log in as rnd.ja.
2. Open **MM** (top menu) → **Individual** → **STORES** → **PPRF**.
3. Save the session and the PPRF form URL.

Every test then opens the form directly and works only on the form. Neither the login nor the path is a test case or appears in the Excel report. If the pre-condition fails (wrong password, menu changed), the run stops before any form test starts. That is a setup problem, not a product defect.

---

## 3. Verify the selectors (first run only)

The suite was written from screenshots, so the locators in `pages/selectors.ts` need a one-time check against the real page.

1. Open the PPRF page with the recorder:
   ```bash
   npx playwright codegen https://<staging-url>
   ```
2. Log in as rnd.ja and open **MM → STORES → PPRF**. Check the login fields and the MM / Individual / PPRF menu items too (`login` and `nav` in selectors.ts). Then hover over or click each field: Unit Price, Approx. Total Cost, Grand Total, Rounded Grand Total, Total Amount, Saved PPRF, Save, Preview and the remove-item icon.
3. Compare the locator codegen shows with the one in `pages/selectors.ts`. Fix any that differ **in that file only**.
4. Click **Source of Funds → + Add**, find the amount field and set `sourceOfFundsAmount`. This enables TC_023.
5. Dry run one test in a visible browser:
   ```bash
   npx playwright test -g "TC_004" --project=chrome --headed
   ```

---

## 4. Execution steps for each build or deployment

| Step | Action | Command |
|---|---|---|
| 1 | Confirm the hot-fix (function and SP) is deployed on Staging | Check with the developer (Nidhi) |
| 2 | **Smoke run:** 9 key cases on Chrome. If anything fails, stop and raise a defect. | `npm run test:smoke` |
| 3 | **Full run** on Chrome and Edge | `npm test` |
| 4 | Open the HTML report: screenshots, video and trace for each failure | `npm run report` |
| 5 | Re-check any failure manually in the browser before you log it, to rule out a selector or test-data problem | `npm run test:headed -- -g "TC_0xx"` |
| 6 | Run the DB checks (TC_033 – TC_038) in SSMS on Staging | `db/IPS-54654_db_checks.sql` |
| 7 | Execute the manual cases (TC_024, TC_031, TC_041) | In the browser |
| 8 | Write the automated results into the Excel report | `npm run excel -- "C:\path\IPS-54654_PPRF_INR_Format_Test_Report.xlsx"` |
| 9 | Open the generated `..._Executed_<date>.xlsx`. Fill in the manual and DB rows, and log any failures in **Defect Log**. | Excel |
| 10 | Attach the Executed report and the zipped `playwright-report` folder to IPS-54654, then update the ticket status | Jira |

**Pass criteria for sign-off:** all TCs Pass (or Not Applicable with a reason), no open S1–S3 defects, and Chrome and Edge both green.

---

## 5. Useful commands

```bash
npm test                              # full suite, Chrome + Edge
npm run test:chrome                   # Chrome only
npm run test:smoke                    # @smoke cases only
npx playwright test -g "TC_026"       # a single test case
npm run test:headed                   # watch it run
npm run test:debug                    # step through with the inspector
npx playwright show-trace test-results/<folder>/trace.zip   # replay a failure
```

---

## 6. Reading the results

- **Pass:** the field showed Indian grouping, e.g. `1,00,000.00` or `12,34,567.50`.
- **Fail: "Expected Indian format 1,00,000.00 … Received 100,000.00"** means western grouping. This is the real defect: log it.
- **Fail: "Received 100000.00"** means no commas at all, which is the original bug. Log it.
- **Fail: timeout or locator not found.** This is usually a selector problem, not a product bug. Fix `pages/selectors.ts` and re-run before logging anything.
- **Skipped or fixme:** the case is manual or waiting on setup. The Excel script leaves these rows untouched.

Decimals are checked strictly only where they matter (TC_008, TC_016, and the D section). Elsewhere, `1,00,000` and `1,00,000.00` are both accepted, because the ticket is about the comma separators.

---

## 7. Test data notes

- TC_025 saves a draft named `AUTO-IPS54654-<timestamp>`. Delete these drafts from Staging after sign-off if your team requires it.
- TC_030 creates a **real submitted PPRF**. It only runs when `RUN_SUBMIT=true` is set.
- Confirm two expected values with the developer: the rounding rule (TC_017, where `4,25,000.50` becomes `4,25,001`?) and the paste behaviour (TC_013).

---

## 8. Project structure

```
playwright.config.ts        Chrome + Edge projects, reporters (list, HTML, JSON)
.env.example                environment variables (copy to .env)
pages/selectors.ts          ALL locators – the only file to edit if the UI changes
pages/pprf.page.ts          page object: fill rows, save, reload, preview
utils/inr.ts                expected Indian format (Intl en-IN) and assertion helper
utils/dropdown.ts           native <select> / select2 helper
tests/auth.setup.ts         pre-condition only (not a test): login + MM > STORES > PPRF, saves session and form URL
tests/pprf-inr-format.spec.ts   sections A, B, C, F
tests/pprf-save-reload.spec.ts  section D (serial)
db/IPS-54654_db_checks.sql      section E (manual)
scripts/update-excel.mjs    writes results into the Excel report
```
