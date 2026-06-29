// Central data model for the UaB invoice app.

/** Repetitive farm/issuer data, captured once and persisted. */
export interface FarmProfile {
  /** Farm / business name, e.g. "Musterhof". */
  farmName: string;
  /** Owner / family line, e.g. "Familie Mustermann". */
  ownerName: string;
  /** Street + number. */
  street: string;
  /** Postcode + town, e.g. "0000 Musterdorf". */
  cityLine: string;
  phone: string;
  email: string;
  /** Website URL of the farm, shown in the header. */
  website: string;
  /** Place used in the "Rechnung Nr. ___, <place>, am <date>" line. */
  issuePlace: string;
  iban: string;
  bic: string;
  /** Account holder name (Kontoinhaber) shown with the bank details. */
  accountHolder: string;
  /** Text shown in the UID line. */
  uidText: string;
  /** Optional base64 data URL of a custom logo/stamp (not the UaB logo). */
  logoDataUrl?: string;
  /** Next invoice number to assign. Editable so a business adopting the tool
   *  mid-year can start at e.g. 124 instead of 1. Resets to 1 each new year. */
  nextInvoiceNumber?: number;
}

/** A returning customer remembered for autocomplete. */
export interface Customer {
  id: string;
  /** Optional salutation, e.g. "Herr", "Frau", "Familie", "Firma". */
  salutation?: string;
  /** Salutation/name line, e.g. "Herr Max Lieblingsgast". */
  name: string;
  /** Street line. */
  street: string;
  /** Postcode + town line. */
  cityLine: string;
  /** Country line (optional, e.g. for foreign guests). */
  country: string;
  /** E-mail address (optional) — used to pre-fill the share/mailto recipient. */
  email?: string;
}

export interface LineItem {
  id: string;
  /** Quantity (e.g. number of nights). */
  menge: number;
  /** Unit label, e.g. "ÜF/F" or "Nächte" (optional). */
  einheit: string;
  /** Description, e.g. "Übernächtigungen für Herr Czandy". */
  bezeichnung: string;
  /** Gross unit price entered by the user (Brutto-Einzelpreis). */
  unitGross: number;
  /** VAT percentage, e.g. 13, 10 or 0. */
  ustPercent: number;
}

/** Derived monetary values for a line item (never stored, always recomputed). */
export interface LineItemTotals {
  net: number;
  ustAmount: number;
  gross: number;
}

export type PaymentMode = 'received' | 'transfer';

/** Whether an issued invoice has been settled. */
export type InvoiceStatus = 'open' | 'paid';

export interface Invoice {
  id: string;
  /** Full invoice number string, e.g. "1/2018". */
  number: string;
  /** ISO date string (yyyy-mm-dd) of issue. */
  date: string;
  /** Recipient block. */
  recipient: Customer;
  /** Stay start (ISO date) — optional. */
  stayFrom: string;
  /** Stay end (ISO date) — optional. */
  stayTo: string;
  /** Total number of nights. */
  nights: number;
  lineItems: LineItem[];
  paymentMode: PaymentMode;
  /** Payment status. Cash invoices ('received') are paid on issue. */
  status: InvoiceStatus;
  /** ISO timestamp when the invoice was marked paid (if known). */
  paidAt?: string;
  /** Snapshot of the issuer profile at the time the invoice was saved. */
  issuer?: FarmProfile;
  /** Timestamp (ms) when saved/updated. */
  savedAt?: number;
}

export interface AppSettings {
  /** Running counter used to suggest the next invoice number. */
  nextInvoiceNumber: number;
}

// ---------------------------------------------------------------------------
// Eurowork "Quartierbestätigung" — a monthly accommodation-confirmation sheet
// for one specific corporate customer. Each sheet covers one month and lists
// the employees who stayed, with an X per night, plus per-person and grand
// totals of nights.
// ---------------------------------------------------------------------------

/** One worker row on a Quartierbestätigung sheet. */
export interface EuroworkEmployee {
  id: string;
  /** Room number ("Zi. Nr."). */
  zimmerNr: string;
  /** Worker name ("Namen"). */
  name: string;
  /** 31 booleans — index 0 = day 1. True = stayed that night (X). */
  days: boolean[];
}

/** A full monthly Quartierbestätigung sheet. */
export interface EuroworkSheet {
  id: string;
  /** Month number 1–12. */
  month: number;
  /** Four-digit year. */
  year: number;
  /** Quartier (accommodation owner / name). */
  quartier: string;
  /** Street line. */
  street: string;
  /** Postcode + town ("PLZ, Ort"). */
  plzOrt: string;
  /** Phone number. */
  phone: string;
  /** E-mail address. */
  email: string;
  /** Price per person, per night (free text, e.g. "25,00"). */
  pricePerNight: string;
  employees: EuroworkEmployee[];
  /** Timestamp (ms) when saved/updated. */
  savedAt?: number;
}
