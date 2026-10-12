/**
 * Writes Playwright results (test-results/results.json) into the IPS-54654 Excel test report.
 *
 * Usage:  npm run excel -- "<path to IPS-54654_PPRF_INR_Format_Test_Report.xlsx>"
 * Output: a copy named ..._Executed_<date>.xlsx next to the original (original is untouched).
 *
 * Only test cases that were automated AND actually ran are updated.
 * Manual / fixme / skipped cases are left as they are for the tester to fill in.
 */
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';

const reportPath = process.argv[2];
const resultsPath = process.argv[3] ?? 'test-results/results.json';
if (!reportPath || !fs.existsSync(reportPath)) {
  console.error('Usage: npm run excel -- "<path to test report .xlsx>"');
  process.exit(1);
}
if (!fs.existsSync(resultsPath)) {
  console.error(`No results at ${resultsPath}. Run "npm test" first.`);
  process.exit(1);
}

// ---------- 1. collect results per TC ID ----------
const json = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
const byTc = new Map(); // TC_001 -> [{project, status, error, screenshots}]

function walk(suite) {
  for (const spec of suite.specs ?? []) {
    const id = spec.title.match(/^(TC_\d{3})/)?.[1];
    if (!id) continue;
    for (const t of spec.tests ?? []) {
      const last = t.results?.[t.results.length - 1] ?? {};
      const entry = {
        project: t.projectName,
        status: t.status, // expected | unexpected | flaky | skipped
        error: (last.error?.message ?? '').replace(/\u001b\[[0-9;]*m/g, '').split('\n').filter(Boolean).slice(0, 3).join(' | '),
        screenshots: (last.attachments ?? []).filter((a) => a.name === 'screenshot' && a.path).map((a) => a.path),
        observed: (t.annotations ?? []).filter((a) => a.type !== 'skip' && a.type !== 'fixme')
          .map((a) => `${a.type}: ${a.description}`),
      };
      if (!byTc.has(id)) byTc.set(id, []);
      byTc.get(id).push(entry);
    }
  }
  for (const s of suite.suites ?? []) walk(s);
}
(json.suites ?? []).forEach(walk);

// ---------- 2. write into the workbook ----------
const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(reportPath);
const ws = wb.getWorksheet('Test Cases');
const summary = wb.getWorksheet('Test Summary');
if (!ws || !summary) throw new Error('Expected sheets "Test Cases" and "Test Summary"');

const COL = { id: 1, actual: 8, status: 9, remarks: 10 };
let updated = 0;
const projects = new Set();

ws.eachRow((row, r) => {
  if (r === 1) return;
  const id = String(row.getCell(COL.id).value ?? '').trim();
  const runs = (byTc.get(id) ?? []).filter((x) => x.status !== 'skipped');
  if (!runs.length) return;
  runs.forEach((x) => projects.add(x.project));

  const failed = runs.filter((x) => x.status === 'unexpected');
  const flaky = runs.filter((x) => x.status === 'flaky');
  const browsers = runs.map((x) => `${x.project} ${x.status === 'unexpected' ? '✘' : '✔'}`).join(', ');
  const observed = [...new Set(runs.flatMap((x) => x.observed))].join('; ');

  row.getCell(COL.status).value = failed.length ? 'Fail' : 'Pass';
  row.getCell(COL.actual).value = failed.length
    ? `Automated (${browsers}). ${failed.map((f) => `[${f.project}] ${f.error}`).join(' || ')}`.slice(0, 1000)
    : `As expected - automated (${browsers})${observed ? `. ${observed}` : ''}`;
  const shots = [...new Set(runs.flatMap((x) => x.screenshots))].map((p) => path.relative(process.cwd(), p));
  row.getCell(COL.remarks).value = [flaky.length ? 'FLAKY - passed on retry, re-check manually' : '', shots.join('\n')]
    .filter(Boolean).join('\n');
  updated++;
});

// Summary: Tested By / Test Date / Browser(s)
const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
summary.eachRow((row) => {
  const label = String(row.getCell(1).value ?? '').trim();
  const cell = row.getCell(2);
  if (label === 'Tested By' && !cell.value) cell.value = 'Playwright automation (rnd.ja) + manual';
  if (label === 'Test Date') cell.value = today;
  if (label === 'Browser(s)') cell.value = [...projects].map((p) => (p === 'edge' ? 'Microsoft Edge' : p === 'chrome' ? 'Google Chrome' : p)).join(', ');
});

wb.calcProperties.fullCalcOnLoad = true; // summary counts recalc when opened
const out = reportPath.replace(/\.xlsx$/i, `_Executed_${new Date().toISOString().slice(0, 10)}.xlsx`);
await wb.xlsx.writeFile(out);
console.log(`Updated ${updated} test cases -> ${out}`);
console.log('Manual / skipped cases were left unchanged - fill them in before sharing.');
