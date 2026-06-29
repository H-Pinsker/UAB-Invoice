// Cloud data-access layer. All reads/writes go through Supabase and are scoped
// to the authenticated user by Row-Level Security on the server.

import { supabase } from './supabase';
import type { Customer, EuroworkSheet, FarmProfile, Invoice } from '../types';
import { computeGrandTotal } from './calc';

// ---------------------------------------------------------------------------
// Row <-> domain mapping
// ---------------------------------------------------------------------------

interface ProfileRow {
  user_id: string;
  farm_name: string;
  owner_name: string;
  street: string;
  city_line: string;
  phone: string;
  email: string;
  website: string;
  issue_place: string;
  iban: string;
  bic: string;
  account_holder: string;
  uid_text: string;
  next_invoice_number: number;
  invoice_year: number;
}

function rowToProfile(r: ProfileRow): FarmProfile {
  return {
    farmName: r.farm_name,
    ownerName: r.owner_name,
    street: r.street,
    cityLine: r.city_line,
    phone: r.phone,
    email: r.email,
    website: r.website,
    issuePlace: r.issue_place,
    iban: r.iban,
    bic: r.bic,
    accountHolder: r.account_holder,
    uidText: r.uid_text,
    nextInvoiceNumber: r.next_invoice_number,
  };
}

function profileToRow(p: FarmProfile): Omit<ProfileRow, 'user_id' | 'invoice_year'> {
  return {
    farm_name: p.farmName,
    owner_name: p.ownerName,
    street: p.street,
    city_line: p.cityLine,
    phone: p.phone,
    email: p.email,
    website: p.website,
    issue_place: p.issuePlace,
    iban: p.iban,
    bic: p.bic,
    account_holder: p.accountHolder,
    uid_text: p.uidText,
    next_invoice_number: p.nextInvoiceNumber ?? 1,
  };
}

interface InvoiceRow {
  id: string;
  number: string;
  invoice_date: string;
  recipient: Customer;
  stay_from: string | null;
  stay_to: string | null;
  nights: number;
  line_items: Invoice['lineItems'];
  payment_mode: Invoice['paymentMode'];
  status: Invoice['status'];
  paid_at: string | null;
  issuer: FarmProfile | null;
  total_gross: number;
  updated_at: string;
}

function rowToInvoice(r: InvoiceRow): Invoice {
  return {
    id: r.id,
    number: r.number,
    date: r.invoice_date,
    recipient: r.recipient,
    stayFrom: r.stay_from ?? '',
    stayTo: r.stay_to ?? '',
    nights: r.nights,
    lineItems: r.line_items,
    paymentMode: r.payment_mode,
    status: r.status,
    paidAt: r.paid_at ?? undefined,
    issuer: r.issuer ?? undefined,
    savedAt: r.updated_at ? new Date(r.updated_at).getTime() : undefined,
  };
}

function invoiceToRow(inv: Invoice, userId: string) {
  return {
    id: inv.id,
    user_id: userId,
    number: inv.number,
    invoice_date: inv.date,
    recipient: inv.recipient,
    stay_from: inv.stayFrom || null,
    stay_to: inv.stayTo || null,
    nights: inv.nights || 0,
    line_items: inv.lineItems,
    payment_mode: inv.paymentMode,
    status: inv.status,
    paid_at: inv.paidAt ?? null,
    issuer: inv.issuer ?? null,
    total_gross: computeGrandTotal(inv.lineItems),
  };
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export async function fetchProfile(): Promise<FarmProfile | null> {
  const { data, error } = await supabase.from('profiles').select('*').maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const p = rowToProfile(data as ProfileRow);
  // Treat a never-filled profile (no farm name) as "not set up yet".
  return p.farmName.trim() ? p : null;
}

/** Read the next suggested invoice counter without incrementing it. */
export async function fetchNextNumberPreview(): Promise<number> {
  const { data, error } = await supabase
    .from('profiles')
    .select('next_invoice_number, invoice_year')
    .maybeSingle();
  if (error) throw error;
  // If the stored year is behind the current year, numbering will reset to 1
  // on the next allocation — preview that, so the editor suggests 1/<yy>.
  const storedYear = (data?.invoice_year as number | undefined) ?? new Date().getFullYear();
  if (storedYear < new Date().getFullYear()) return 1;
  return (data?.next_invoice_number as number | undefined) ?? 1;
}

export async function saveProfile(profile: FarmProfile): Promise<void> {
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('profiles')
    .upsert(
      { user_id: userId, invoice_year: new Date().getFullYear(), ...profileToRow(profile) },
      { onConflict: 'user_id' },
    );
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

export async function fetchCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((c) => ({
    id: c.id,
    salutation: c.salutation ?? '',
    name: c.name,
    street: c.street,
    cityLine: c.city_line,
    country: c.country,
    email: c.email ?? '',
  }));
}

/** Insert or update a guest (keyed by id), returning the stored row. */
export async function upsertCustomer(c: Customer): Promise<Customer> {
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('customers')
    .upsert({
      id: c.id,
      user_id: userId,
      salutation: c.salutation ?? '',
      name: c.name,
      street: c.street,
      city_line: c.cityLine,
      country: c.country,
      email: c.email ?? '',
    })
    .select()
    .single();
  if (error) throw error;
  return {
    id: data.id,
    salutation: data.salutation ?? '',
    name: data.name,
    street: data.street,
    cityLine: data.city_line,
    country: data.country,
    email: data.email ?? '',
  };
}

export async function deleteCustomer(id: string): Promise<void> {
  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

export async function fetchInvoices(): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .order('invoice_date', { ascending: false })
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => rowToInvoice(r as InvoiceRow));
}

export async function fetchInvoice(id: string): Promise<Invoice | null> {
  const { data, error } = await supabase.from('invoices').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? rowToInvoice(data as InvoiceRow) : null;
}

export async function saveInvoice(inv: Invoice): Promise<Invoice> {
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('invoices')
    .upsert(invoiceToRow(inv, userId), { onConflict: 'id' })
    .select('*')
    .single();
  if (error) throw error;
  return rowToInvoice(data as InvoiceRow);
}

export async function deleteInvoice(id: string): Promise<void> {
  const { error } = await supabase.from('invoices').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteInvoices(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from('invoices').delete().in('id', ids);
  if (error) throw error;
}

export async function setInvoiceStatus(
  id: string,
  status: Invoice['status'],
): Promise<void> {
  const { error } = await supabase
    .from('invoices')
    .update({ status, paid_at: status === 'paid' ? new Date().toISOString() : null })
    .eq('id', id);
  if (error) throw error;
}

/** Allocate the next gap-free invoice number for this user (server-side). */
export async function allocateInvoiceNumber(): Promise<number> {
  const { data, error } = await supabase.rpc('next_invoice_number');
  if (error) throw error;
  return data as number;
}

/**
 * Highest numeric prefix among invoices issued in the given two-digit year
 * (e.g. "26"). Used to stop the user from setting a starting number that would
 * collide with an already-issued invoice. Returns 0 when none exist.
 */
export async function fetchMaxInvoiceNumberForYear(twoDigitYear: string): Promise<number> {
  const { data, error } = await supabase
    .from('invoices')
    .select('number')
    .like('number', `%/${twoDigitYear}`);
  if (error) throw error;
  let max = 0;
  for (const row of data ?? []) {
    const m = /^(\d+)\s*\//.exec((row.number as string) ?? '');
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n > max) max = n;
    }
  }
  return max;
}

// ---------------------------------------------------------------------------
// Eurowork sheets (Quartierbestätigung)
// ---------------------------------------------------------------------------

interface EuroworkRow {
  id: string;
  month: number;
  year: number;
  quartier: string;
  street: string;
  plz_ort: string;
  phone: string;
  email: string;
  price_per_night: string;
  employees: EuroworkSheet['employees'];
  updated_at: string;
}

function rowToEurowork(r: EuroworkRow): EuroworkSheet {
  return {
    id: r.id,
    month: r.month,
    year: r.year,
    quartier: r.quartier ?? '',
    street: r.street ?? '',
    plzOrt: r.plz_ort ?? '',
    phone: r.phone ?? '',
    email: r.email ?? '',
    pricePerNight: r.price_per_night ?? '',
    employees: Array.isArray(r.employees) ? r.employees : [],
    savedAt: r.updated_at ? new Date(r.updated_at).getTime() : undefined,
  };
}

function euroworkToRow(s: EuroworkSheet, userId: string) {
  return {
    id: s.id,
    user_id: userId,
    month: s.month,
    year: s.year,
    quartier: s.quartier,
    street: s.street,
    plz_ort: s.plzOrt,
    phone: s.phone,
    email: s.email,
    price_per_night: s.pricePerNight,
    employees: s.employees,
  };
}

export async function fetchEuroworkSheets(): Promise<EuroworkSheet[]> {
  const { data, error } = await supabase
    .from('eurowork_sheets')
    .select('*')
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => rowToEurowork(r as EuroworkRow));
}

export async function saveEuroworkSheet(sheet: EuroworkSheet): Promise<EuroworkSheet> {
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('eurowork_sheets')
    .upsert(euroworkToRow(sheet, userId), { onConflict: 'id' })
    .select('*')
    .single();
  if (error) throw error;
  return rowToEurowork(data as EuroworkRow);
}

export async function deleteEuroworkSheet(id: string): Promise<void> {
  const { error } = await supabase.from('eurowork_sheets').delete().eq('id', id);
  if (error) throw error;
}
