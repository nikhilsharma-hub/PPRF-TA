import { expect, Locator } from '@playwright/test';

/** Expected Indian-format string, e.g. inr(1234567.5) -> "12,34,567.50" */
export function inr(n: number, decimals = 2): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

/** Strip currency symbol and spaces: "₹ 1,00,000.00" -> "1,00,000.00" */
export function normalize(s: string | null | undefined): string {
  return (s ?? '').replace(/₹|Rs\.?|INR/gi, '').replace(/\s+/g, '').trim();
}

/** Any valid Indian grouping: 999 | 1,000 | 12,34,567 | 1,23,45,678.90 */
export const INDIAN_FORMAT = /^-?(\d{1,3}|\d{1,2}(,\d{2})*,\d{3})(\.\d{1,2})?$/;

/** Plain number from a displayed value: "12,34,567.50" -> 1234567.5 */
export function toNumber(s: string): number {
  return Number(normalize(s).replace(/,/g, ''));
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Asserts that an input shows `n` in Indian format.
 * Commas are always checked strictly. Decimals: strict -> must be ".xx";
 * lenient (default) -> "1,00,000" or "1,00,000.00" both accepted.
 */
export async function expectINR(field: Locator, n: number, opts: { strictDecimals?: boolean } = {}) {
  const allowed = opts.strictDecimals ? [inr(n)] : [inr(n), inr(n, 0)];
  const re = new RegExp(`^(${allowed.map(esc).join('|')})$`);
  await expect
    .poll(async () => normalize(await field.inputValue()), {
      message: `Expected Indian format ${allowed.join(' or ')}`,
      timeout: 10_000,
    })
    .toMatch(re);
}
