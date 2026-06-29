import { useCallback, useEffect, useRef, useState } from 'react';
import type { EuroworkEmployee, EuroworkSheet } from '../types';
import { useStore } from '../store';
import * as db from '../lib/db';
import { exportEuroworkPdf } from '../lib/exportEurowork';
import {
  EUROWORK_ATTENTION,
  EUROWORK_COMPANY,
  EUROWORK_FOOTER,
  EUROWORK_INTRO,
  EUROWORK_NOTES,
  EUROWORK_TITLE,
  MAX_DAYS,
  MONTHS,
  daysInMonth,
  emptyEmployee,
  grandTotalNights,
  isEuroworkSheetEmpty,
  monthLabel,
  newEuroworkSheet,
  nightsForEmployee,
  normalizeEmployee,
} from '../lib/eurowork';

export function EuroworkPage() {
  const profile = useStore((s) => s.profile);

  const [sheets, setSheets] = useState<EuroworkSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<EuroworkSheet | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSheets(await db.fetchEuroworkSheets());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleNew = () => setCurrent(newEuroworkSheet(profile));

  const handleOpen = (sheet: EuroworkSheet) =>
    setCurrent({ ...sheet, employees: sheet.employees.map(normalizeEmployee) });

  const handleDelete = async (sheet: EuroworkSheet) => {
    if (!confirm(`Quartierbestätigung ${monthLabel(sheet)} wirklich löschen?`)) return;
    try {
      await db.deleteEuroworkSheet(sheet.id);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (current) {
    return (
      <SheetEditor
        initial={current}
        onClose={() => {
          setCurrent(null);
          void reload();
        }}
      />
    );
  }

  return (
    <div className="page eurowork">
      <div className="page-head">
        <div>
          <h1>Eurowork</h1>
          <p className="page-sub">Quartierbestätigungen für {EUROWORK_COMPANY.name}</p>
        </div>
        <button className="primary" onClick={handleNew}>
          + Neue Bestätigung
        </button>
      </div>

      {error && <div className="banner-error">{error}</div>}

      {loading ? (
        <div className="empty">Lädt…</div>
      ) : sheets.length === 0 ? (
        <div className="empty">
          Noch keine Quartierbestätigungen. Erstellen Sie Ihre erste für den aktuellen Monat.
        </div>
      ) : (
        <div className="ew-card-list">
          {sheets.map((s) => {
            const filled = s.employees.filter((e) => e.name.trim()).length;
            return (
              <button key={s.id} className="ew-card" onClick={() => handleOpen(s)}>
                <div className="ew-card-main">
                  <span className="ew-card-month">{monthLabel(s)}</span>
                  <span className="ew-card-sub">
                    {filled} {filled === 1 ? 'Person' : 'Personen'} · {grandTotalNights(s)} Nächte
                  </span>
                  {s.quartier && <span className="ew-card-quartier">{s.quartier}</span>}
                </div>
                <span
                  className="ew-card-del"
                  role="button"
                  aria-label="Löschen"
                  title="Löschen"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleDelete(s);
                  }}
                >
                  <TrashIcon />
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editor — a WYSIWYG version of the paper "Quartierbestätigung" form.
// ---------------------------------------------------------------------------

function SheetEditor({ initial, onClose }: { initial: EuroworkSheet; onClose: () => void }) {
  const [sheet, setSheet] = useState<EuroworkSheet>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // On touch devices, range-painting is opt-in so horizontal swipes can scroll.
  const [selectMode, setSelectMode] = useState(false);

  const dim = daysInMonth(sheet.month, sheet.year);
  const grand = grandTotalNights(sheet);

  // Keep latest sheet available for save-on-back / save-after-PDF.
  const sheetRef = useRef(sheet);
  sheetRef.current = sheet;

  const patch = (p: Partial<EuroworkSheet>) => setSheet((s) => ({ ...s, ...p }));

  const setEmployees = useCallback(
    (employees: EuroworkEmployee[]) => setSheet((s) => ({ ...s, employees })),
    [],
  );

  const addRow = () => setEmployees([...sheet.employees, emptyEmployee()]);
  const removeRow = (id: string) =>
    setEmployees(sheet.employees.filter((e) => e.id !== id));

  /**
   * Persist the sheet, but skip a brand-new draft the user never filled in.
   * Returns the stored sheet (or null if nothing was saved).
   */
  const persist = async (): Promise<EuroworkSheet | null> => {
    const s = sheetRef.current;
    if (!s.savedAt && isEuroworkSheetEmpty(s)) return null;
    const stored = await db.saveEuroworkSheet(s);
    setSheet(stored);
    return stored;
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await persist();
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleBack = async () => {
    try {
      await persist();
    } catch (e) {
      setError((e as Error).message);
    }
    onClose();
  };

  const handlePdf = async () => {
    setPdfBusy(true);
    setError(null);
    try {
      await exportEuroworkPdf(sheetRef.current);
      await persist();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPdfBusy(false);
    }
  };

  const years = (() => {
    const y = new Date().getFullYear();
    return [y - 1, y, y + 1];
  })();

  return (
    <div className="page eurowork-editor">
      <div className="ew-toolbar">
        <button className="subtle" onClick={handleBack}>
          ← Zurück
        </button>
        <div className="spacer" />
        <button className={`subtle save-ew${saved ? ' is-saved' : ''}`} onClick={handleSave} disabled={saving}>
          {saved ? (
            <>
              <CheckIcon /> Gespeichert
            </>
          ) : saving ? (
            'Speichern…'
          ) : (
            'Speichern'
          )}
        </button>
        <button className="primary" onClick={handlePdf} disabled={pdfBusy}>
          <DownloadIcon /> {pdfBusy ? 'PDF…' : 'PDF'}
        </button>
      </div>

      {error && <div className="banner-error">{error}</div>}

      <div className="ew-sheet-scroll">
        <div className="ew-sheet">
          {/* Header */}
          <div className="ew-header">
            <div>
              <div className="ew-title">{EUROWORK_TITLE}</div>
              <div className="ew-attention">{EUROWORK_ATTENTION}</div>
            </div>
            <div className="ew-bill">
              <div className="ew-bill-line">
                <span className="ew-bill-label">Rechnungsadresse:</span>{' '}
                <span className="ew-bill-name">{EUROWORK_COMPANY.name}</span>
              </div>
              <div className="ew-bill-addr">{EUROWORK_COMPANY.address}</div>
              <div className="ew-bill-contact">
                Tel.: {EUROWORK_COMPANY.phone} &nbsp; E-Mail: {EUROWORK_COMPANY.email} &nbsp;
                Betreuer: {EUROWORK_COMPANY.betreuer}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="ew-intro">{EUROWORK_INTRO}</div>
          <div className="ew-notes">
            {EUROWORK_NOTES.map((p, i) =>
              p.kind === 'note' ? (
                <div className="ew-note" key={i}>
                  <span className="ew-note-num">{p.n}</span>
                  <span>
                    <strong>{p.title} </strong>
                    {p.text}
                  </span>
                </div>
              ) : (
                <div className="ew-note-plain" key={i}>
                  {p.text}
                </div>
              ),
            )}
          </div>

          {/* Quartier fields */}
          <div className="ew-fields">
            <div className="ew-fields-col">
              <FieldInput
                label="Quartier:"
                value={sheet.quartier}
                onChange={(v) => patch({ quartier: v })}
              />
              <FieldInput
                label="Straße:"
                value={sheet.street}
                onChange={(v) => patch({ street: v })}
              />
              <FieldInput
                label="PLZ, Ort:"
                value={sheet.plzOrt}
                onChange={(v) => patch({ plzOrt: v })}
              />
            </div>
            <div className="ew-fields-col">
              <FieldInput
                label="Telefonnummer:"
                value={sheet.phone}
                onChange={(v) => patch({ phone: v })}
              />
              <FieldInput
                label="Emailadresse:"
                value={sheet.email}
                onChange={(v) => patch({ email: v })}
              />
              <FieldInput
                label="Preis pro Person, pro Nacht:"
                value={sheet.pricePerNight}
                onChange={(v) => patch({ pricePerNight: v })}
              />
            </div>
          </div>

          {/* Month selector */}
          <div className="ew-month">
            <span className="ew-month-label">Monat:</span>
            <select
              className="ew-month-select"
              value={sheet.month}
              onChange={(e) => patch({ month: Number(e.target.value) })}
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <select
              className="ew-month-select"
              value={sheet.year}
              onChange={(e) => patch({ year: Number(e.target.value) })}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Day grid */}
          <DayGrid
            employees={sheet.employees}
            dim={dim}
            selectMode={selectMode}
            onChange={setEmployees}
            onRemoveRow={removeRow}
          />

          <div className="ew-grid-actions">
            <button className="subtle" onClick={addRow}>
              + Zeile
            </button>
            <button
              className={`subtle ew-select-toggle${selectMode ? ' is-on' : ''}`}
              onClick={() => setSelectMode((v) => !v)}
            >
              {selectMode ? 'Fertig markieren' : 'Mehrere markieren'}
            </button>
            <div className="ew-grand">
              <span>Gesamt Nächte:</span>
              <strong>{grand}</strong>
            </div>
          </div>
          <p className="ew-grid-hint">
            {selectMode
              ? 'Ziehen Sie über mehrere Tage, um sie gemeinsam zu markieren. Zum seitlichen Scrollen wieder „Fertig markieren“.'
              : 'Tippen Sie auf einen Tag zum Umschalten · seitlich wischen zum Scrollen · „Mehrere markieren“ für Bereiche.'}
          </p>

          {/* Footer */}
          <div className="ew-footer">
            <div>
              <div className="ew-foot-greet">{EUROWORK_FOOTER.greeting}</div>
              <div className="ew-foot-company">{EUROWORK_FOOTER.company}</div>
            </div>
            <div className="ew-sig">
              <div className="ew-sig-line" />
              <div className="ew-sig-text">{EUROWORK_FOOTER.signature}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="ew-field">
      <span className="ew-field-label">{label}</span>
      <input className="ew-field-input" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

// ---------------------------------------------------------------------------
// Interactive day grid with click + drag multi-select painting.
// ---------------------------------------------------------------------------

interface DragState {
  anchorR: number;
  anchorC: number;
  paint: boolean;
  base: boolean[][];
}

function DayGrid({
  employees,
  dim,
  selectMode,
  onChange,
  onRemoveRow,
}: {
  employees: EuroworkEmployee[];
  dim: number;
  selectMode: boolean;
  onChange: (employees: EuroworkEmployee[]) => void;
  onRemoveRow: (id: string) => void;
}) {
  const dayNumbers = Array.from({ length: MAX_DAYS }, (_, i) => i + 1);
  const [drag, setDrag] = useState<DragState | null>(null);

  // Keep the latest employees available to the global pointer listener so the
  // row metadata (room / name) is preserved while painting day cells.
  const employeesRef = useRef(employees);
  employeesRef.current = employees;
  // True when a pointerdown started a drag, so the trailing click doesn't
  // double-toggle the anchor cell.
  const draggedRef = useRef(false);

  const toggleCell = (r: number, c: number) => {
    if (c >= dim) return;
    onChange(
      employeesRef.current.map((e, ri) =>
        ri === r ? { ...e, days: e.days.map((on, ci) => (ci === c ? !on : on)) } : e,
      ),
    );
  };

  const paintRect = useCallback(
    (base: boolean[][], aR: number, aC: number, r: number, c: number, value: boolean) => {
      const rMin = Math.min(aR, r);
      const rMax = Math.max(aR, r);
      const cMin = Math.min(aC, c);
      const cMax = Math.max(aC, c);
      return employeesRef.current.map((e, ri) => {
        const days = base[ri] ? [...base[ri]] : [...e.days];
        if (ri >= rMin && ri <= rMax) {
          for (let ci = cMin; ci <= cMax; ci++) if (ci < dim) days[ci] = value;
        }
        return { ...e, days };
      });
    },
    [dim],
  );

  const handleDown = (r: number, c: number) => (e: React.PointerEvent) => {
    if (c >= dim) return;
    // Touch can only paint a range when select mode is on, so a normal swipe
    // scrolls the table. Mouse/pen always drag-select (no scroll conflict).
    const allowDrag = e.pointerType !== 'touch' || selectMode;
    if (!allowDrag) return; // let the browser scroll; tap toggles via onClick
    e.preventDefault();
    draggedRef.current = true;
    const base = employeesRef.current.map((emp) => [...emp.days]);
    const value = !base[r][c];
    setDrag({ anchorR: r, anchorC: c, paint: value, base });
    onChange(paintRect(base, r, c, r, c, value));
  };

  useEffect(() => {
    if (!drag) return;
    const move = (ev: PointerEvent) => {
      const el = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
      const cell = el?.closest('[data-day-cell]') as HTMLElement | null;
      if (!cell) return;
      const r = Number(cell.dataset.r);
      const c = Number(cell.dataset.c);
      if (Number.isNaN(r) || Number.isNaN(c) || c >= dim) return;
      onChange(paintRect(drag.base, drag.anchorR, drag.anchorC, r, c, drag.paint));
    };
    const up = () => setDrag(null);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [drag, dim, onChange, paintRect]);

  const setMeta = (id: string, p: Partial<EuroworkEmployee>) =>
    onChange(employees.map((e) => (e.id === id ? { ...e, ...p } : e)));

  return (
    <div className="ew-grid-scroll">
      <table className={`ew-grid${drag ? ' is-dragging' : ''}${selectMode ? ' select-mode' : ''}`}>
        <thead>
          <tr>
            <th className="ew-col-zi">Zi. Nr.</th>
            <th className="ew-col-name">Namen</th>
            {dayNumbers.map((d) => (
              <th key={d} className={`ew-col-day${d > dim ? ' is-disabled' : ''}`}>
                {d}
              </th>
            ))}
            <th className="ew-col-total">Gesamt</th>
            <th className="ew-col-x" aria-hidden="true"></th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp, ri) => {
            const total = nightsForEmployee(emp, dim);
            return (
              <tr key={emp.id}>
                <td className="ew-col-zi">
                  <input
                    className="ew-cell-input"
                    value={emp.zimmerNr}
                    onChange={(e) => setMeta(emp.id, { zimmerNr: e.target.value })}
                  />
                </td>
                <td className="ew-col-name">
                  <input
                    className="ew-cell-input ew-name-input"
                    value={emp.name}
                    placeholder="Name"
                    onChange={(e) => setMeta(emp.id, { name: e.target.value })}
                  />
                </td>
                {dayNumbers.map((d) => {
                  const ci = d - 1;
                  const disabled = d > dim;
                  const on = !disabled && emp.days[ci];
                  return (
                    <td
                      key={d}
                      data-day-cell=""
                      data-r={ri}
                      data-c={ci}
                      className={`ew-day${on ? ' is-on' : ''}${disabled ? ' is-disabled' : ''}`}
                      onPointerDown={disabled ? undefined : handleDown(ri, ci)}
                      onClick={
                        disabled
                          ? undefined
                          : () => {
                              if (draggedRef.current) {
                                draggedRef.current = false;
                                return;
                              }
                              toggleCell(ri, ci);
                            }
                      }
                    >
                      {on ? 'X' : ''}
                    </td>
                  );
                })}
                <td className="ew-col-total ew-total-cell">{total > 0 ? total : ''}</td>
                <td className="ew-col-x">
                  <button
                    className="ew-row-del"
                    title="Zeile entfernen"
                    aria-label="Zeile entfernen"
                    onClick={() => onRemoveRow(emp.id)}
                  >
                    ×
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
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

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12l5 5 9-10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
