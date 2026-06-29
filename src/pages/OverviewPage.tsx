import { useEffect, useMemo, useState } from 'react';
import type { Invoice, InvoiceStatus } from '../types';
import { useStore } from '../store';
import * as db from '../lib/db';
import { computeGrandTotal } from '../lib/calc';
import { formatAmount, formatDate } from '../lib/format';

type Filter = 'all' | 'open' | 'paid';

interface Props {
  onOpenEditor: () => void;
}

export function OverviewPage({ onOpenEditor }: Props) {
  const startNewInvoice = useStore((s) => s.startNewInvoice);
  const setCurrentInvoice = useStore((s) => s.setCurrentInvoice);
  const duplicateInvoice = useStore((s) => s.duplicateInvoice);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  // Multi-select / bulk delete
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      setInvoices(await db.fetchInvoices());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (filter !== 'all' && inv.status !== filter) return false;
      if (!q) return true;
      return (
        inv.number.toLowerCase().includes(q) ||
        inv.recipient.name.toLowerCase().includes(q) ||
        inv.recipient.cityLine.toLowerCase().includes(q)
      );
    });
  }, [invoices, filter, query]);

  const openCount = invoices.filter((i) => i.status === 'open').length;
  const openSum = invoices
    .filter((i) => i.status === 'open')
    .reduce((s, i) => s + computeGrandTotal(i.lineItems), 0);

  const handleNew = () => {
    startNewInvoice();
    onOpenEditor();
  };

  const handleOpen = (inv: Invoice) => {
    setCurrentInvoice(inv);
    onOpenEditor();
  };

  const handleDuplicate = (inv: Invoice) => {
    duplicateInvoice(inv);
    onOpenEditor();
  };

  const handleStatus = async (inv: Invoice, status: InvoiceStatus) => {
    setBusyId(inv.id);
    try {
      await db.setInvoiceStatus(inv.id, status);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (inv: Invoice) => {
    if (!confirm(`Rechnung Nr. ${inv.number} wirklich löschen?`)) return;
    setBusyId(inv.id);
    try {
      await db.deleteInvoice(inv.id);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  // --- Selection helpers ---
  const toggleSelectMode = () => {
    setSelectMode((on) => !on);
    setSelected(new Set());
  };

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allVisibleSelected = filtered.length > 0 && filtered.every((i) => selected.has(i.id));

  const toggleSelectAll = () => {
    setSelected((prev) => {
      if (filtered.every((i) => prev.has(i.id))) {
        const next = new Set(prev);
        filtered.forEach((i) => next.delete(i.id));
        return next;
      }
      const next = new Set(prev);
      filtered.forEach((i) => next.add(i.id));
      return next;
    });
  };

  const handleBulkDelete = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!confirm(`${ids.length} Rechnung(en) wirklich löschen?`)) return;
    setBulkBusy(true);
    setError(null);
    try {
      await db.deleteInvoices(ids);
      setSelected(new Set());
      setSelectMode(false);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBulkBusy(false);
    }
  };

  const handleRowClick = (inv: Invoice) => {
    if (selectMode) toggleSelected(inv.id);
    else handleOpen(inv);
  };

  return (
    <div className="page overview">
      <div className="page-head">
        <div>
          <h1>Rechnungen</h1>
          <p className="page-sub">
            {openCount > 0
              ? `${openCount} offen · ${formatAmount(openSum)} € ausstehend`
              : 'Alle Rechnungen bezahlt'}
          </p>
        </div>
        <button className="primary" onClick={handleNew}>
          + Neue Rechnung
        </button>
      </div>

      <div className="toolbar-row">
        <div className="segmented">
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
            Alle
          </button>
          <button className={filter === 'open' ? 'active' : ''} onClick={() => setFilter('open')}>
            Offen
          </button>
          <button className={filter === 'paid' ? 'active' : ''} onClick={() => setFilter('paid')}>
            Bezahlt
          </button>
        </div>
        <input
          className="search"
          type="search"
          placeholder="Suche nach Nummer oder Kunde…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {invoices.length > 0 && (
          <button
            className={selectMode ? 'subtle active-select' : 'subtle'}
            onClick={toggleSelectMode}
          >
            {selectMode ? 'Fertig' : 'Auswählen'}
          </button>
        )}
      </div>

      {selectMode && (
        <div className="bulk-bar">
          <label className="bulk-check">
            <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll} />
            Alle auswählen
          </label>
          <span className="bulk-count">{selected.size} ausgewählt</span>
          <div className="spacer" />
          <button
            className="danger"
            disabled={selected.size === 0 || bulkBusy}
            onClick={handleBulkDelete}
          >
            {bulkBusy ? 'Löschen…' : `Löschen (${selected.size})`}
          </button>
        </div>
      )}

      {error && <div className="banner-error">{error}</div>}

      {loading ? (
        <div className="empty">Lädt…</div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          {invoices.length === 0
            ? 'Noch keine Rechnungen. Erstellen Sie Ihre erste Rechnung.'
            : 'Keine Rechnungen für diese Auswahl.'}
        </div>
      ) : (
        <div className="invoice-table-wrap">
          <table className="invoice-table">
            <thead>
              <tr>
                {selectMode && <th className="select-col"></th>}
                <th>Nr.</th>
                <th>Kunde</th>
                <th>Datum</th>
                <th className="num">Betrag</th>
                <th>Status</th>
                <th className="actions-col"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => {
                const total = computeGrandTotal(inv.lineItems);
                const busy = busyId === inv.id;
                const isSelected = selected.has(inv.id);
                return (
                  <tr
                    key={inv.id}
                    className={`row-clickable${isSelected ? ' is-selected' : ''}`}
                    onClick={() => handleRowClick(inv)}
                  >
                    {selectMode && (
                      <td
                        className="select-col"
                        data-label=""
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelected(inv.id)}
                          aria-label={`Rechnung ${inv.number} auswählen`}
                        />
                      </td>
                    )}
                    <td className="mono" data-label="Nr.">
                      {inv.number}
                    </td>
                    <td data-label="Kunde">
                      <span className="cust-name">{inv.recipient.name || 'Ohne Empfänger'}</span>
                      {inv.recipient.cityLine && (
                        <div className="muted-sub">{inv.recipient.cityLine}</div>
                      )}
                    </td>
                    <td data-label="Datum">{formatDate(inv.date)}</td>
                    <td className="num" data-label="Betrag">
                      {formatAmount(total)} €
                    </td>
                    <td data-label="Status">
                      <span className={`status-pill ${inv.status}`}>
                        {inv.status === 'paid' ? 'Bezahlt' : 'Offen'}
                      </span>
                    </td>
                    <td className="actions-col" onClick={(e) => e.stopPropagation()}>
                      <div className="row-actions">
                        {inv.status === 'open' ? (
                          <button
                            className="mini primary"
                            disabled={busy}
                            onClick={() => handleStatus(inv, 'paid')}
                          >
                            Als bezahlt
                          </button>
                        ) : (
                          <button
                            className="mini subtle"
                            disabled={busy}
                            onClick={() => handleStatus(inv, 'open')}
                          >
                            Offen setzen
                          </button>
                        )}
                        <button
                          className="icon-mini subtle"
                          disabled={busy}
                          onClick={() => handleDuplicate(inv)}
                          title="Duplizieren"
                          aria-label="Duplizieren"
                        >
                          <DuplicateIcon />
                        </button>
                        <button
                          className="icon-mini danger"
                          disabled={busy}
                          onClick={() => handleDelete(inv)}
                          title="Löschen"
                          aria-label="Löschen"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DuplicateIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5 15V5a2 2 0 012-2h10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-8 0v12a2 2 0 002 2h6a2 2 0 002-2V7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
