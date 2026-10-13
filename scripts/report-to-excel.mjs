/**
 * Converts the last Playwright run (test-results/results.json) into a standalone Excel report.
 *
 * Usage:  npm run report:excel [-- <results.json> <output.xlsx>]
 * Output: reports/Test_Report_<date>.xlsx  (sheets: Summary, Results)
 */
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';

const resultsPath = process.argv[2] ?? 'test-results/results.json';
const stamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
const outPath = process.argv[3] ?? `reports/Test_Report_${stamp}.xlsx`;
if (!fs.existsSync(resultsPath)) {
  console.error(`No results at ${resultsPath}. Run "npm test" first.`);
  process.exit(1);
}

const json = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
const STATUS = { expected: 'Passed', unexpected: 'Failed', flaky: 'Flaky', skipped: 'Skipped' };
const clean = (s) => (s ?? '').replace(/\u001b\[[0-9;]*m/g, '');

// ---------- collect one row per test x project ----------
const rows = [];
function walk(suite, parents) {
  for (const spec of suite.specs ?? []) {
    for (const t of spec.tests ?? []) {
      const last = t.results?.[t.results.length - 1] ?? {};
      rows.push({
        id: spec.title.match(/^([A-Z]+_\d+)/)?.[1] ?? '',
        file: spec.file,
        suite: parents.slice(1).join(' > '),
        title: spec.title,
        project: t.projectName,
        status: STATUS[t.status] ?? t.status,
        duration: +((last.duration ?? 0) / 1000).toFixed(1),
        retries: Math.max(0, (t.results?.length ?? 1) - 1),
        error: clean(last.error?.message).split('\n').filter(Boolean).slice(0, 5).join('\n'),
        notes: (t.annotations ?? []).map((a) => `${a.type}: ${a.description ?? ''}`).join('; '),
        screenshots: (last.attachments ?? []).filter((a) => a.name === 'screenshot' && a.path)
          .map((a) => path.relative(process.cwd(), a.path)).join('\n'),
      });
    }
  }
  for (const s of suite.suites ?? []) walk(s, [...parents, s.title]);
}
(json.suites ?? []).forEach((s) => walk(s, [s.title]));

// ---------- workbook ----------
const wb = new ExcelJS.Workbook();
const header = (ws) => {
  const r = ws.getRow(1);
  r.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF305496' } };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
};

const sum = wb.addWorksheet('Summary');
const res = wb.addWorksheet('Results');
res.columns = [
  { header: 'TC ID', key: 'id', width: 10 },
  { header: 'File', key: 'file', width: 26 },
  { header: 'Suite', key: 'suite', width: 30 },
  { header: 'Test', key: 'title', width: 60 },
  { header: 'Browser', key: 'project', width: 10 },
  { header: 'Status', key: 'status', width: 10 },
  { header: 'Duration (s)', key: 'duration', width: 12 },
  { header: 'Retries', key: 'retries', width: 8 },
  { header: 'Error', key: 'error', width: 70 },
  { header: 'Annotations', key: 'notes', width: 40 },
  { header: 'Screenshots', key: 'screenshots', width: 50 },
];
res.addRows(rows);
header(res);
res.autoFilter = { from: 'A1', to: 'K1' };
const COLORS = { Passed: 'FFC6EFCE', Failed: 'FFFFC7CE', Flaky: 'FFFFEB9C', Skipped: 'FFD9D9D9' };
res.eachRow((row, i) => {
  row.alignment = { vertical: 'top', wrapText: true };
  if (i === 1) return;
  const c = row.getCell('status');
  if (COLORS[c.value]) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS[c.value] } };
});

const st = json.stats ?? {};
const count = (s) => rows.filter((r) => r.status === s).length;
sum.columns = [{ header: 'Metric', key: 'k', width: 22 }, { header: 'Value', key: 'v', width: 40 }];
sum.addRows([
  { k: 'Run started', v: st.startTime ? new Date(st.startTime).toLocaleString('en-GB') : '' },
  { k: 'Duration (s)', v: +((st.duration ?? 0) / 1000).toFixed(1) },
  { k: 'Browsers', v: [...new Set(rows.map((r) => r.project))].join(', ') },
  { k: 'Total', v: rows.length },
  { k: 'Passed', v: count('Passed') },
  { k: 'Failed', v: count('Failed') },
  { k: 'Flaky', v: count('Flaky') },
  { k: 'Skipped', v: count('Skipped') },
  { k: 'Pass rate (executed)', v: `${((count('Passed') / Math.max(1, rows.length - count('Skipped'))) * 100).toFixed(1)}%` },
]);
header(sum);

fs.mkdirSync(path.dirname(outPath), { recursive: true });
await wb.xlsx.writeFile(outPath);
console.log(`Wrote ${rows.length} results -> ${outPath}`);
