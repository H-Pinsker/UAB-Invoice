import { create } from 'zustand';
import type { Customer, FarmProfile, Invoice, LineItem, PaymentMode } from './types';
import { DEFAULT_UID_TEXT, MIN_TABLE_ROWS } from './lib/invoiceLayout';
import { nightsBetween, todayIso } from './lib/format';
import * as db from './lib/db';

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export const emptyProfile = (): FarmProfile => ({
  farmName: '',
  ownerName: '',
  street: '',
  cityLine: '',
  phone: '',
  email: '',
  website: '',
  issuePlace: '',
  iban: '',
  bic: '',
  accountHolder: '',
  uidText: DEFAULT_UID_TEXT,
  nextInvoiceNumber: 1,
});

export const emptyCustomer = (): Customer => ({
  id: uid(),
  salutation: '',
  name: '',
  street: '',
  cityLine: '',
  country: '',
  email: '',
});

export const emptyLineItem = (): LineItem => ({
  id: uid(),
  menge: 0,
  einheit: '',
  bezeichnung: '',
  unitGross: 0,
  ustPercent: 0,
});

const blankRows = (count: number): LineItem[] =>
  Array.from({ length: count }, () => emptyLineItem());

const formatInvoiceNumber = (n: number): string =>
  `${n}/${String(new Date().getFullYear()).slice(-2)}`;

export const newInvoice = (number: string): Invoice => ({
  id: uid(),
  number,
  date: todayIso(),
  recipient: emptyCustomer(),
  stayFrom: '',
  stayTo: '',
  nights: 0,
  lineItems: blankRows(MIN_TABLE_ROWS),
  paymentMode: 'transfer',
  status: 'open',
});

/**
 * True when the user has entered no meaningful content: no recipient details,
 * no stay dates, and every line item is blank. Used to avoid persisting an
 * untouched draft when the user just opens the editor and goes back.
 */
export const isInvoiceEmpty = (inv: Invoice): boolean => {
  const r = inv.recipient;
  const recipientEmpty =
    !r.salutation?.trim() &&
    !r.name.trim() &&
    !r.street.trim() &&
    !r.cityLine.trim() &&
    !r.country.trim();
  const datesEmpty = !inv.stayFrom && !inv.stayTo;
  const itemsEmpty = inv.lineItems.every(
    (li) =>
      !li.menge && !li.unitGross && !li.ustPercent && !li.bezeichnung.trim() && !li.einheit.trim(),
  );
  return recipientEmpty && datesEmpty && itemsEmpty;
};

interface State {
  profile: FarmProfile | null;
  customers: Customer[];
  current: Invoice;
  nextNumber: number;
  /** The auto-suggested number for the current draft (to detect manual edits). */
  draftAutoNumber: string;
  /** True once the cloud data has been loaded for the session. */
  loaded: boolean;
  saving: boolean;
}

interface Actions {
  loadCloud: () => Promise<void>;
  resetSession: () => void;
  saveProfile: (profile: FarmProfile) => Promise<void>;
  startNewInvoice: () => void;
  loadInvoiceById: (id: string) => Promise<void>;
  setCurrentInvoice: (inv: Invoice) => void;
  duplicateInvoice: (inv: Invoice) => void;
  saveCurrentInvoice: () => Promise<Invoice>;
  updateCurrent: (patch: Partial<Invoice>) => void;
  updateRecipient: (patch: Partial<Customer>) => void;
  setRecipientFromCustomer: (customer: Customer) => void;
  saveCustomer: (customer: Customer) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  setPaymentMode: (mode: PaymentMode) => void;
  updateLineItem: (id: string, patch: Partial<LineItem>) => void;
  addLineItem: () => void;
  removeLineItem: (id: string) => void;
}

export const useStore = create<State & Actions>()((set, get) => ({
  profile: null,
  customers: [],
  current: newInvoice(formatInvoiceNumber(1)),
  nextNumber: 1,
  draftAutoNumber: formatInvoiceNumber(1),
  loaded: false,
  saving: false,

  loadCloud: async () => {
    const [profile, customers, nextNumber] = await Promise.all([
      db.fetchProfile(),
      db.fetchCustomers(),
      db.fetchNextNumberPreview(),
    ]);
    set({ profile, customers, nextNumber, loaded: true });
    // Keep the current draft's suggested number in sync if it was never edited.
    const { current, draftAutoNumber } = get();
    if (!current.savedAt && current.number === draftAutoNumber) {
      const auto = formatInvoiceNumber(nextNumber);
      set({ current: { ...current, number: auto }, draftAutoNumber: auto });
    }
  },

  resetSession: () =>
    set({
      profile: null,
      customers: [],
      current: newInvoice(formatInvoiceNumber(1)),
      nextNumber: 1,
      draftAutoNumber: formatInvoiceNumber(1),
      loaded: false,
      saving: false,
    }),

  saveProfile: async (profile) => {
    await db.saveProfile(profile);
    // The user may have changed the starting invoice number (mid-year adopters
    // who are already at e.g. 124/26). Re-read the counter and re-suggest it
    // for any untouched draft so the editor reflects the new start.
    const nextNumber = await db.fetchNextNumberPreview();
    const { current, draftAutoNumber } = get();
    const auto = formatInvoiceNumber(nextNumber);
    const sync = !current.savedAt && current.number === draftAutoNumber;
    set({
      profile,
      nextNumber,
      ...(sync ? { current: { ...current, number: auto }, draftAutoNumber: auto } : {}),
    });
  },

  startNewInvoice: () => {
    const auto = formatInvoiceNumber(get().nextNumber);
    set({ current: newInvoice(auto), draftAutoNumber: auto });
  },

  loadInvoiceById: async (id) => {
    const inv = await db.fetchInvoice(id);
    if (inv) set({ current: inv });
  },

  setCurrentInvoice: (inv) => set({ current: structuredClone(inv) }),

  duplicateInvoice: (inv) => {
    const auto = formatInvoiceNumber(get().nextNumber);
    const copy = structuredClone(inv);
    copy.id = uid();
    copy.number = auto;
    copy.date = todayIso();
    copy.status = copy.paymentMode === 'received' ? 'paid' : 'open';
    copy.paidAt = undefined;
    copy.savedAt = undefined;
    copy.recipient = { ...copy.recipient, id: uid() };
    copy.lineItems = copy.lineItems.map((li) => ({ ...li, id: uid() }));
    set({ current: copy, draftAutoNumber: auto });
  },

  saveCurrentInvoice: async () => {
    const { current, draftAutoNumber } = get();
    set({ saving: true });
    try {
      const isNew = !current.savedAt;

      // Don't persist a brand-new draft the user never filled in. This avoids
      // creating empty invoices when someone just opens the editor and goes back.
      if (isNew && isInvoiceEmpty(current)) {
        return current;
      }

      // Allocate a fresh sequential number only for a brand-new invoice that
      // still carries the auto-suggested number (i.e. the user did not type a
      // custom one). This keeps numbering gap-free and unique across devices.
      let number = current.number;
      if (isNew && current.number === draftAutoNumber) {
        const allocated = await db.allocateInvoiceNumber();
        number = formatInvoiceNumber(allocated);
      }

      // Cash invoices are settled on issue; transfers keep their current status.
      const status = current.paymentMode === 'received' ? 'paid' : current.status;
      const paidAt =
        status === 'paid' ? current.paidAt ?? new Date().toISOString() : undefined;

      const toSave: Invoice = {
        ...structuredClone(current),
        number,
        status,
        paidAt,
        issuer: get().profile ?? undefined,
      };

      const saved = await db.saveInvoice(toSave);

      // NOTE: guests are no longer auto-saved here. The user adds them
      // explicitly via the "Gäste" menu or the "Gast speichern" button so the
      // contact list stays clean.

      const nextNumber = await db.fetchNextNumberPreview();
      set({ current: saved, nextNumber });
      return saved;
    } finally {
      set({ saving: false });
    }
  },

  updateCurrent: (patch) =>
    set((s) => {
      const next = { ...s.current, ...patch };
      if (patch.stayFrom !== undefined || patch.stayTo !== undefined) {
        const auto = nightsBetween(next.stayFrom, next.stayTo);
        if (auto > 0) next.nights = auto;
      }
      return { current: next };
    }),

  updateRecipient: (patch) =>
    set((s) => ({ current: { ...s.current, recipient: { ...s.current.recipient, ...patch } } })),

  setRecipientFromCustomer: (customer) =>
    set((s) => ({ current: { ...s.current, recipient: { ...customer } } })),

  saveCustomer: async (customer) => {
    const saved = await db.upsertCustomer(customer);
    set((s) => {
      const exists = s.customers.some((c) => c.id === saved.id);
      const customers = exists
        ? s.customers.map((c) => (c.id === saved.id ? saved : c))
        : [saved, ...s.customers];
      // Keep the current invoice's recipient in sync if it's the same guest.
      const current =
        s.current.recipient.id === saved.id
          ? { ...s.current, recipient: { ...saved } }
          : s.current;
      return { customers, current };
    });
  },

  deleteCustomer: async (id) => {
    await db.deleteCustomer(id);
    set((s) => ({ customers: s.customers.filter((c) => c.id !== id) }));
  },

  setPaymentMode: (mode) => set((s) => ({ current: { ...s.current, paymentMode: mode } })),

  updateLineItem: (id, patch) =>
    set((s) => ({
      current: {
        ...s.current,
        lineItems: s.current.lineItems.map((li) => (li.id === id ? { ...li, ...patch } : li)),
      },
    })),

  addLineItem: () =>
    set((s) => ({ current: { ...s.current, lineItems: [...s.current.lineItems, emptyLineItem()] } })),

  removeLineItem: (id) =>
    set((s) => ({
      current: { ...s.current, lineItems: s.current.lineItems.filter((li) => li.id !== id) },
    })),
}));
