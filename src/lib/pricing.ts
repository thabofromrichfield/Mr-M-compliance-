/** Prices are stored as ZAR amounts with at most two decimal places. */
export function isValidCost(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 999_999_999.99 && Math.abs(value * 100 - Math.round(value * 100)) < 0.00001;
}

export function detectCost(text: string): number | null {
  // Require an explicit rand marker: never mistake dates, IDs or foreign prices for ZAR.
  const amounts = new Set<number>();
  const pattern = /\b(?:ZAR|R)\s*((?:\d{1,3}(?:[ ,\u00a0]\d{3})+|\d+)(?:[.,]\d{2})?)(?!\d|[.,]\d)/gi;
  for (const match of text.matchAll(pattern)) {
    const prefix = text.slice(Math.max(0, match.index! - 1), match.index);
    if (prefix === '-') continue;
    let raw = match[1]!.replace(/[ \u00a0]/g, '');
    if (/,[0-9]{2}$/.test(raw)) raw = raw.replace(/,([0-9]{2})$/, '.$1');
    raw = raw.replace(/,/g, '');
    const value = Number(raw);
    if (isValidCost(value)) amounts.add(value);
  }
  // Multiple totals/subtotals are ambiguous. Ask the user instead of guessing.
  return amounts.size === 1 ? [...amounts][0]! : null;
}
