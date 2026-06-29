import { useMemo, useState } from 'react';
import { useStore, emptyCustomer } from '../store';
import type { Customer } from '../types';

export function CustomersPage() {
  const customers = useStore((s) => s.customers);
  const saveCustomer = useStore((s) => s.saveCustomer);
  const deleteCustomer = useStore((s) => s.deleteCustomer);

  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<Customer | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      [c.name, c.cityLine, c.email, c.street].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [customers, search]);

  const startNew = () => {
    setError(null);
    setDraft(emptyCustomer());
  };

  const handleSave = async (c: Customer) => {
    setError(null);
    try {
      await saveCustomer(c);
      setDraft(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      await deleteCustomer(id);
      if (draft?.id === id) setDraft(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="page customers">
      <div className="page-head">
        <div>
          <h1>Gäste</h1>
          <p className="page-sub">Gespeicherte Kontakte für Rechnungen und E-Mails.</p>
        </div>
        <button className="primary" onClick={startNew}>
          + Neuer Gast
        </button>
      </div>

      {error && <div className="banner-error">{error}</div>}

      {customers.length > 0 && (
        <input
          className="guest-search"
          type="search"
          placeholder="Suchen…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}

      {draft && (
        <GuestEditor
          key={draft.id}
          initial={draft}
          isNew
          onSave={handleSave}
          onCancel={() => setDraft(null)}
        />
      )}

      {filtered.length === 0 && !draft ? (
        <div className="guest-empty">
          {customers.length === 0
            ? 'Noch keine Gäste gespeichert. Legen Sie den ersten an.'
            : 'Keine Treffer.'}
        </div>
      ) : (
        <div className="guest-list">
          {filtered.map((c) => (
            <GuestEditor key={c.id} initial={c} onSave={handleSave} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

interface EditorProps {
  initial: Customer;
  isNew?: boolean;
  onSave: (c: Customer) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onCancel?: () => void;
}

function GuestEditor({ initial, isNew, onSave, onDelete, onCancel }: EditorProps) {
  const [c, setC] = useState<Customer>(initial);
  const [busy, setBusy] = useState(false);

  const set = (patch: Partial<Customer>) => setC((prev) => ({ ...prev, ...patch }));

  const dirty =
    c.salutation !== (initial.salutation ?? '') ||
    c.name !== initial.name ||
    c.street !== initial.street ||
    c.cityLine !== initial.cityLine ||
    c.country !== initial.country ||
    (c.email ?? '') !== (initial.email ?? '');

  const submit = async () => {
    setBusy(true);
    try {
      await onSave(c);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="guest-card">
      <div className="form-grid">
        <label>
          Anrede
          <select
            value={c.salutation ?? ''}
            onChange={(e) => set({ salutation: e.target.value })}
          >
            <option value="">—</option>
            <option value="Herr">Herr</option>
            <option value="Frau">Frau</option>
            <option value="Familie">Familie</option>
            <option value="Firma">Firma</option>
          </select>
        </label>
        <label>
          Name / Firma
          <input value={c.name} onChange={(e) => set({ name: e.target.value })} />
        </label>
        <label className="full">
          Straße &amp; Nr.
          <input value={c.street} onChange={(e) => set({ street: e.target.value })} />
        </label>
        <label>
          PLZ &amp; Ort
          <input value={c.cityLine} onChange={(e) => set({ cityLine: e.target.value })} />
        </label>
        <label>
          Land
          <input value={c.country} onChange={(e) => set({ country: e.target.value })} />
        </label>
        <label className="full">
          E-Mail
          <input
            type="email"
            inputMode="email"
            autoCapitalize="none"
            placeholder="gast@example.com"
            value={c.email ?? ''}
            onChange={(e) => set({ email: e.target.value })}
          />
        </label>
      </div>

      <div className="guest-card-actions">
        {onDelete && (
          <button className="danger" disabled={busy} onClick={() => onDelete(c.id)}>
            Löschen
          </button>
        )}
        <div className="spacer" />
        {onCancel && (
          <button className="subtle" disabled={busy} onClick={onCancel}>
            Abbrechen
          </button>
        )}
        <button className="primary" disabled={busy || (!isNew && !dirty)} onClick={submit}>
          {busy ? 'Speichern…' : isNew ? 'Anlegen' : 'Speichern'}
        </button>
      </div>
    </div>
  );
}
