// German (Austrian) number / currency / date formatting helpers.
// Uses the de-DE locale so thousands are grouped with a dot ("1.234,56"),
// matching the printed form (de-AT groups with a space in some runtimes).

const currencyFormatter = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format a number as "1.234,56" (no currency symbol — the form prints € separately). */
export function formatAmount(value: number): string {
  if (!Number.isFinite(value)) return '0,00';
  return currencyFormatter.format(value);
}

/** Format a number as "1.234,56 €". */
export function formatCurrency(value: number): string {
  return `${formatAmount(value)} €`;
}

/** Parse a user-typed German number string ("1.234,56" or "25,-" or "40,00") into a number. */
export function parseGermanNumber(input: string): number {
  if (typeof input === 'number') return input;
  if (!input) return 0;
  let s = input.trim().replace(/[€\s]/g, '');
  // Handle trailing dash like "25,-" -> "25,0"
  s = s.replace(/,-$/, ',00');
  // Remove thousands separators (dots) then convert decimal comma to dot.
  s = s.replace(/\./g, '').replace(',', '.');
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

/** Format an ISO date (yyyy-mm-dd) as "dd.mm.yyyy". */
export function formatDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

/** Today's date as an ISO string (yyyy-mm-dd) in local time. */
export function todayIso(): string {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 10);
}

/** Number of nights between two ISO dates (>= 0). */
export function nightsBetween(fromIso: string, toIso: string): number {
  if (!fromIso || !toIso) return 0;
  const from = new Date(fromIso);
  const to = new Date(toIso);
  const diff = Math.round((to.getTime() - from.getTime()) / 86400000);
  return diff > 0 ? diff : 0;
}
