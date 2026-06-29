import { describe, expect, it } from 'vitest';
import { computeGrandTotal, computeLineTotals, round2 } from '../calc';
import { formatAmount, parseGermanNumber, nightsBetween } from '../format';
import type { LineItem } from '../../types';

describe('computeLineTotals', () => {
  it('matches the 5 nights @ 25,- gross @ 13% example', () => {
    const totals = computeLineTotals({ menge: 5, unitGross: 25, ustPercent: 13 });
    expect(totals.gross).toBe(125);
    expect(totals.net).toBe(110.62);
    expect(totals.ustAmount).toBe(14.38);
  });

  it('handles 0% Ortstaxe', () => {
    const totals = computeLineTotals({ menge: 15, unitGross: 2.4, ustPercent: 0 });
    expect(totals.gross).toBe(36);
    expect(totals.net).toBe(36);
    expect(totals.ustAmount).toBe(0);
  });

  it('handles the 14 x 44,- gross @ 10% form example', () => {
    const totals = computeLineTotals({ menge: 14, unitGross: 44, ustPercent: 10 });
    expect(totals.gross).toBe(616);
    expect(totals.net).toBe(560);
    expect(totals.ustAmount).toBe(56);
  });

  it('treats invalid input as zero', () => {
    const totals = computeLineTotals({ menge: NaN, unitGross: 25, ustPercent: 13 });
    expect(totals.gross).toBe(0);
    expect(totals.net).toBe(0);
    expect(totals.ustAmount).toBe(0);
  });
});

describe('computeGrandTotal', () => {
  it('sums gross subtotals', () => {
    const items: LineItem[] = [
      { id: '1', menge: 5, einheit: '', bezeichnung: 'A', unitGross: 25, ustPercent: 13 },
      { id: '2', menge: 5, einheit: '', bezeichnung: 'B', unitGross: 25, ustPercent: 13 },
      { id: '3', menge: 15, einheit: '', bezeichnung: 'Ortstaxe', unitGross: 2.4, ustPercent: 0 },
    ];
    expect(computeGrandTotal(items)).toBe(286);
  });
});

describe('round2', () => {
  it('rounds half up', () => {
    expect(round2(110.615)).toBe(110.62);
    expect(round2(14.375)).toBe(14.38);
  });
});

describe('parseGermanNumber', () => {
  it('parses comma decimals and dash shorthand', () => {
    expect(parseGermanNumber('25,-')).toBe(25);
    expect(parseGermanNumber('1.234,56')).toBe(1234.56);
    expect(parseGermanNumber('40,00 €')).toBe(40);
    expect(parseGermanNumber('')).toBe(0);
  });
});

describe('formatAmount', () => {
  it('formats with German separators', () => {
    expect(formatAmount(1234.5)).toBe('1.234,50');
    expect(formatAmount(125)).toBe('125,00');
  });
});

describe('nightsBetween', () => {
  it('counts whole nights', () => {
    expect(nightsBetween('2018-10-27', '2018-11-03')).toBe(7);
    expect(nightsBetween('2018-11-03', '2018-10-27')).toBe(0);
  });
});
