import type { EuroworkSheet } from '../types';
import { MONTHS } from './eurowork';

/**
 * Generate and download a PDF for a Eurowork "Quartierbestätigung" sheet. The
 * heavy @react-pdf renderer is imported lazily so it only loads on export.
 */
export async function exportEuroworkPdf(sheet: EuroworkSheet): Promise<void> {
  const [{ pdf }, { EuroworkDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('../pdf/EuroworkDocument'),
  ]);
  const blob = await pdf(<EuroworkDocument sheet={sheet} />).toBlob();

  const month = (MONTHS[sheet.month - 1] ?? '').replace(/[^\w.-]+/g, '');
  const filename = `Quartierbestaetigung-${month}-${sheet.year}.pdf`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
