// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { renderToBuffer } from '@react-pdf/renderer';
import { InvoiceDocument } from '../InvoiceDocument';
import type { FarmProfile, Invoice } from '../../types';

const profile: FarmProfile = {
  farmName: 'Musterhof',
  ownerName: 'Familie Mustermann',
  street: 'Musterstraße 1',
  cityLine: '0000 Musterdorf',
  phone: '+43 000 000 00 00',
  email: 'info@musterhof.example',
  website: 'www.musterhof.example',
  issuePlace: 'Musterdorf',
  iban: 'AT00 0000 0000 0000 0000',
  bic: 'XXXXATWW',
  accountHolder: 'Familie Mustermann',
  uidText: 'Als pauschalierter Landwirtschaftsbetrieb verfügen wir über keine UID Nummer',
};

const invoice: Invoice = {
  id: 'x',
  number: '1/2026',
  date: '2026-06-26',
  recipient: { id: 'r', name: 'Herr Max Mustergast', street: 'Gasse 1', cityLine: '9999 Irgendwo', country: 'Österreich' },
  stayFrom: '2026-06-20',
  stayTo: '2026-06-27',
  nights: 7,
  lineItems: [
    { id: '1', menge: 5, einheit: 'ÜF', bezeichnung: 'Übernächtigungen', unitGross: 25, ustPercent: 13 },
    { id: '2', menge: 15, einheit: '', bezeichnung: 'Ortstaxe', unitGross: 2.4, ustPercent: 0 },
  ],
  paymentMode: 'transfer',
  status: 'open',
};

describe('InvoiceDocument PDF', () => {
  it('renders to a non-empty PDF buffer', async () => {
    // Logo is rasterised in the browser (canvas) and passed as logoPng at export
    // time; here we smoke-test the document structure without it.
    const buf = await renderToBuffer(<InvoiceDocument invoice={invoice} profile={profile} />);
    expect(buf.length).toBeGreaterThan(1000);
    // PDF magic header
    expect(buf.subarray(0, 4).toString('latin1')).toBe('%PDF');
  });
});
