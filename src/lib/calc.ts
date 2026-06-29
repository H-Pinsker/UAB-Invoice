import type { LineItem, LineItemTotals } from '../types';

/** Round to 2 decimals using commercial rounding. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Compute net / VAT / gross for a single line.
 *
 * The user enters quantity, the GROSS unit price and the VAT percentage.
 * gross  = menge * unitGross
 * net    = gross / (1 + ust/100)
 * ust    = gross - net
 */
export function computeLineTotals(item: Pick<LineItem, 'menge' | 'unitGross' | 'ustPercent'>): LineItemTotals {
  const menge = Number.isFinite(item.menge) ? item.menge : 0;
  const unitGross = Number.isFinite(item.unitGross) ? item.unitGross : 0;
  const ustPercent = Number.isFinite(item.ustPercent) ? item.ustPercent : 0;

  const gross = round2(menge * unitGross);
  const net = round2(gross / (1 + ustPercent / 100));
  const ustAmount = round2(gross - net);

  return { net, ustAmount, gross };
}

/** Sum of all gross line totals. */
export function computeGrandTotal(items: LineItem[]): number {
  return round2(items.reduce((sum, item) => sum + computeLineTotals(item).gross, 0));
}

/** Sum of all net line totals. */
export function computeNetTotal(items: LineItem[]): number {
  return round2(items.reduce((sum, item) => sum + computeLineTotals(item).net, 0));
}

/** Sum of all VAT line amounts. */
export function computeUstTotal(items: LineItem[]): number {
  return round2(items.reduce((sum, item) => sum + computeLineTotals(item).ustAmount, 0));
}
