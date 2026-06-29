// Static template text and helpers for the Eurowork "Quartierbestätigung" sheet.
// The header, the important-notes block and the footer are fixed parts of the
// form that the customer (Eurowork) sends out, so they are stored here as
// constants and shared by both the on-screen editor and the PDF export.

import type { EuroworkEmployee, EuroworkSheet, FarmProfile } from '../types';

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

/** Fixed maximum number of day columns on the paper form (1–31). */
export const MAX_DAYS = 31;

/**
 * The corporate customer's billing-address block (top right of the form). These
 * are real third-party details, so they are injected at build time from env
 * variables (set as CI secrets) rather than committed to this public repo.
 * See `.env.example` for the variable names.
 */
const env = import.meta.env;
export const EUROWORK_COMPANY = {
  name: (env.VITE_EUROWORK_COMPANY_NAME as string | undefined) || 'Musterfirma GmbH',
  address: (env.VITE_EUROWORK_COMPANY_ADDRESS as string | undefined) || 'Musterstraße 1, 0000 Musterstadt',
  phone: (env.VITE_EUROWORK_COMPANY_PHONE as string | undefined) || '',
  email: (env.VITE_EUROWORK_COMPANY_EMAIL as string | undefined) || '',
  betreuer: (env.VITE_EUROWORK_COMPANY_BETREUER as string | undefined) || '',
};

export const EUROWORK_TITLE = 'Quartierbestätigung';
export const EUROWORK_ATTENTION = 'UNBEDINGT BEACHTEN:';
export const EUROWORK_INTRO =
  'Wichtige Hinweise zur Abrechnung und Organisation der Unterkünfte:';

/** A paragraph in the important-notes block. */
export type EuroworkPara =
  | { kind: 'note'; n: string; title: string; text: string }
  | { kind: 'plain'; text: string };

/** The seven numbered notes (plus the bold liability sentence after note 3). */
export const EUROWORK_NOTES: EuroworkPara[] = [
  {
    kind: 'note',
    n: '1.',
    title: 'Rechnungsbeilagen:',
    text: 'Dieser Aufstellung muss jeder Rechnung beigelegt werden. Ohne diese Aufstellung erfolgt keine Zahlung der Rechnung.',
  },
  {
    kind: 'note',
    n: '2.',
    title: 'Abrechnungszeitraum:',
    text: 'Es werden ausschließlich Nächte abgerechnet, in denen tatsächlich eine Nächtigung stattgefunden hat. Nächte von Sonntag auf Montag werden nicht bezahlt.',
  },
  {
    kind: 'note',
    n: '3.',
    title: 'Schlüsselverwaltung:',
    text: 'Die Schlüssel sind am Wochenende vom Quartierinhaber einzuziehen.',
  },
  {
    kind: 'plain',
    text: `Erfolgt dies nicht, übernimmt die Firma ${EUROWORK_COMPANY.name} keine Haftung für etwaige Schäden.`,
  },
  {
    kind: 'note',
    n: '4.',
    title: 'Wochenweise Rücksprache:',
    text: 'Bitte klären Sie jede Woche mit den Arbeitern ab, ob die Zimmer auch in der darauffolgenden Woche benötigt werden, um Missverständnisse zu vermeiden.',
  },
  {
    kind: 'note',
    n: '5.',
    title: 'Meldepflicht:',
    text: 'Es dürfen weder Haupt- noch Nebenwohnsitze gemeldet werden!',
  },
  {
    kind: 'note',
    n: '6.',
    title: 'Bankverbindung:',
    text: 'Bitte IBAN und BIC auf jeder Rechnung anführen!',
  },
  {
    kind: 'note',
    n: '7.',
    title: 'Zahlungsziel:',
    text: 'Das Zahlungsziel beträgt 30 Tage netto nach Rechnungsprüfung. / Rechnungslegung: Monatlich / Dauer der Rechnungsprüfung: ca. 21 Tage',
  },
];

export const EUROWORK_FOOTER = {
  greeting: 'Mit freundlichen Grüßen',
  company:
    (env.VITE_EUROWORK_FOOTER_COMPANY as string | undefined) || `Firma ${EUROWORK_COMPANY.name}`,
  signature: 'Stempel/ Unterschrift',
};

/** Austrian German month names (note "Jänner"). */
export const MONTHS = [
  'Jänner',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

/** Number of days in a given month/year (28–31). */
export function daysInMonth(month: number, year: number): number {
  if (!month || !year) return MAX_DAYS;
  return new Date(year, month, 0).getDate();
}

/** "September 2025" for the Monat field. */
export function monthLabel(sheet: Pick<EuroworkSheet, 'month' | 'year'>): string {
  const name = MONTHS[sheet.month - 1] ?? '';
  return `${name} ${sheet.year}`.trim();
}

/** A blank employee row with 31 empty day cells. */
export function emptyEmployee(): EuroworkEmployee {
  return { id: uid(), zimmerNr: '', name: '', days: Array(MAX_DAYS).fill(false) };
}

/** Count of nights (X marks) for one employee within the valid days of the month. */
export function nightsForEmployee(emp: EuroworkEmployee, dim: number): number {
  let n = 0;
  for (let i = 0; i < Math.min(dim, emp.days.length); i++) if (emp.days[i]) n++;
  return n;
}

/** Grand total of nights across all employees. */
export function grandTotalNights(sheet: EuroworkSheet): number {
  const dim = daysInMonth(sheet.month, sheet.year);
  return sheet.employees.reduce((s, e) => s + nightsForEmployee(e, dim), 0);
}

/**
 * Build a fresh sheet for the current month, pre-filling the quartier details
 * from the farm profile (the user's own accommodation data) when available.
 */
export function newEuroworkSheet(profile?: FarmProfile | null, rows = 6): EuroworkSheet {
  const now = new Date();
  return {
    id: uid(),
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    quartier: profile?.ownerName || profile?.farmName || '',
    street: profile?.street || '',
    plzOrt: profile?.cityLine || '',
    phone: profile?.phone || '',
    email: profile?.email || '',
    pricePerNight: '',
    employees: Array.from({ length: rows }, () => emptyEmployee()),
  };
}

/** Ensure an employee always has exactly MAX_DAYS day slots (defensive). */
export function normalizeEmployee(emp: EuroworkEmployee): EuroworkEmployee {
  const days = emp.days.slice(0, MAX_DAYS);
  while (days.length < MAX_DAYS) days.push(false);
  return { ...emp, days };
}

/**
 * True when a brand-new sheet has no meaningful user input: no worker has a
 * room/name or any marked night, and no price was entered. The quartier/contact
 * fields are pre-filled from the farm profile, so they don't count as "filled".
 * Used to avoid persisting an untouched draft on back/PDF.
 */
export function isEuroworkSheetEmpty(sheet: EuroworkSheet): boolean {
  if (sheet.pricePerNight.trim()) return false;
  return sheet.employees.every(
    (e) => !e.zimmerNr.trim() && !e.name.trim() && e.days.every((d) => !d),
  );
}
