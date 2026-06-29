// Shared layout constants so the on-screen sheet and the PDF stay visually in sync.

/** UaB brand colours sampled from the printed form. */
export const COLORS = {
  brandGreen: '#3f7d3a',
  tableHeaderGreen: '#cfe0b4',
  tableBorder: '#5a7a3a',
  ink: '#1c3f8f', // the blue used for hand-written entries
  text: '#1a1a1a',
  muted: '#6b6b6b',
  sheetBorder: '#222222',
};

/** Relative widths (flex) of the line-item table columns. */
export const TABLE_COLUMNS = {
  menge: 0.7,
  einheit: 0.9,
  bezeichnung: 3.4,
  unitGross: 1.0,
  net: 1.2,
  ustPercent: 0.9,
  ustAmount: 1.2,
  gross: 1.3,
} as const;

export const TABLE_HEADERS = {
  menge: '',
  einheit: '',
  bezeichnung: '',
  unitGross: 'à',
  net: 'Nettobetrag',
  ustPercent: 'USt %',
  ustAmount: 'USt - Betrag',
  gross: 'Bruttobetrag',
} as const;

/** A4 dimensions in points (for @react-pdf/renderer) and the on-screen mm sheet. */
export const A4 = {
  widthPt: 595.28,
  heightPt: 841.89,
};

export const DEFAULT_UID_TEXT =
  'Als pauschalierter Landwirtschaftsbetrieb verfügen wir über keine UID Nummer';

/** Number of empty rows to keep visible in the editable table. */
export const MIN_TABLE_ROWS = 5;
