import type { FarmProfile, Invoice } from '../types';
import { formatAmount } from './format';
import { computeGrandTotal } from './calc';

/** Build the invoice PDF as a Blob plus a safe file name. */
async function renderInvoiceBlob(
  invoice: Invoice,
  profile: FarmProfile,
): Promise<{ blob: Blob; filename: string }> {
  const [{ pdf }, { InvoiceDocument }, { logoToPngDataUrl }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('../pdf/InvoiceDocument'),
    import('./logo'),
  ]);
  const logoPng = await logoToPngDataUrl();
  const blob = await pdf(
    <InvoiceDocument invoice={invoice} profile={profile} logoPng={logoPng} />,
  ).toBlob();

  const safeNumber = invoice.number.replace(/[^\w.-]+/g, '-');
  const safeName = invoice.recipient.name.replace(/[^\w.-]+/g, '-');
  const filename = `Rechnung-${safeNumber}${safeName ? '-' + safeName : ''}.pdf`;
  return { blob, filename };
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Generate and download a PDF for the given invoice. The heavy @react-pdf
 * renderer and the logo rasteriser are imported lazily so they are only loaded
 * when the user actually exports.
 */
export async function exportInvoicePdf(invoice: Invoice, profile: FarmProfile): Promise<void> {
  const { blob, filename } = await renderInvoiceBlob(invoice, profile);
  triggerDownload(blob, filename);
}

/** Build a correct German salutation line from the Anrede dropdown + name. */
function salutationGreeting(salutation: string | undefined, name: string): string {
  const n = name.trim();
  switch ((salutation ?? '').trim()) {
    case 'Herr':
      return `Sehr geehrter Herr${n ? ' ' + n : ''}`;
    case 'Frau':
      return `Sehr geehrte Frau${n ? ' ' + n : ''}`;
    case 'Familie':
      return `Sehr geehrte Familie${n ? ' ' + n : ''}`;
    case 'Firma':
      return `Sehr geehrte Firma${n ? ' ' + n : ''}`;
    default:
      return n ? `Sehr geehrte/r ${n}` : 'Sehr geehrte Damen und Herren';
  }
}

/** Default subject + body for the invoice email. */
function emailDraft(invoice: Invoice, profile: FarmProfile) {
  const total = formatAmount(computeGrandTotal(invoice.lineItems));
  const farm = profile.farmName || 'Urlaub am Bauernhof';
  const subject = `Rechnung Nr. ${invoice.number} – ${farm}`;
  const greeting = salutationGreeting(invoice.recipient.salutation, invoice.recipient.name);
  const body =
    `${greeting},\n\n` +
    `anbei erhalten Sie Ihre Rechnung Nr. ${invoice.number} über ${total} €.\n\n` +
    `Mit freundlichen Grüßen\n${profile.ownerName || farm}`;
  return { subject, body };
}

/**
 * Try to open the device's mail app with the PDF attached via the Web Share
 * API. On platforms that support sharing files (most phones and some desktops)
 * this opens the share sheet including Mail. Where file sharing is unavailable,
 * the PDF is downloaded and a mailto draft is opened so the user can attach the
 * just-downloaded file manually.
 *
 * Returns 'shared' when the native share sheet was used, otherwise 'fallback'.
 */
export async function emailInvoicePdf(
  invoice: Invoice,
  profile: FarmProfile,
): Promise<'shared' | 'fallback'> {
  const { blob, filename } = await renderInvoiceBlob(invoice, profile);
  const { subject, body } = emailDraft(invoice, profile);

  const file = new File([blob], filename, { type: 'application/pdf' });
  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
  };

  if (typeof nav.share === 'function' && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: subject, text: body });
      return 'shared';
    } catch (err) {
      // User cancelled the share sheet — treat as done, do not fall back.
      if (err instanceof DOMException && err.name === 'AbortError') return 'shared';
      // Otherwise fall through to the download + mailto fallback.
    }
  }

  // Fallback: download the PDF, then open a pre-filled mail draft. The
  // recipient address is pre-filled from the guest's stored e-mail (if any).
  triggerDownload(blob, filename);
  const to = encodeURIComponent((invoice.recipient.email ?? '').trim());
  const mailto =
    `mailto:${to}?subject=${encodeURIComponent(subject)}&body=` +
    encodeURIComponent(body + '\n\n(Bitte die soeben heruntergeladene PDF anhängen.)');
  window.location.href = mailto;
  return 'fallback';
}
