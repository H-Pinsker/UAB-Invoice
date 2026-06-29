import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import type { Customer } from '../types';

export function RecipientBlock() {
  const recipient = useStore((s) => s.current.recipient);
  const customers = useStore((s) => s.customers);
  const updateRecipient = useStore((s) => s.updateRecipient);
  const setRecipientFromCustomer = useStore((s) => s.setRecipientFromCustomer);
  const saveCustomer = useStore((s) => s.saveCustomer);

  // Guest picker popover
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // "Gast speichern" state: appears once the user manually edits a field.
  const [touched, setTouched] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    if (!pickerOpen) return;
    const onDown = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [pickerOpen]);

  // A manual edit to any recipient field. Reveals the save button.
  const edit = (patch: Partial<Customer>) => {
    setTouched(true);
    setSaveState('idle');
    updateRecipient(patch);
  };

  const pickCustomer = (id: string) => {
    const match = customers.find((c) => c.id === id);
    if (match) setRecipientFromCustomer({ ...match });
    // Picked guests are already saved — no save button.
    setTouched(false);
    setSaveState('idle');
    setPickerOpen(false);
  };

  const handleSaveGuest = async () => {
    setSaveState('saving');
    try {
      await saveCustomer({ ...recipient });
      setSaveState('saved');
      // Show the checkmark briefly, then hide the button.
      setTimeout(() => {
        setTouched(false);
        setSaveState('idle');
      }, 1200);
    } catch {
      setSaveState('idle');
    }
  };

  const canSave = touched && recipient.name.trim().length > 0;

  return (
    <div className="recipient">
      <div className="recipient-head">
        <div className="block-label">An</div>{' '}
        {customers.length > 0 && (
          <div className="guest-picker" ref={pickerRef}>
            <button
              type="button"
              className="guest-picker-btn"
              onClick={() => setPickerOpen((o) => !o)}
              aria-label="Gespeicherten Gast wählen"
              aria-expanded={pickerOpen}
              title="Gespeicherten Gast wählen"
            >
              <ChevronIcon />
            </button>
            {pickerOpen && (
              <div className="guest-picker-menu" role="menu">
                {customers.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    className="guest-picker-item"
                    role="menuitem"
                    onClick={() => pickCustomer(c.id)}
                  >
                    <span className="gp-name">{c.name || '(ohne Name)'}</span>
                    {c.cityLine && <span className="gp-city">{c.cityLine}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <select
        className="salutation-select"
        aria-label="Anrede"
        value={recipient.salutation ?? ''}
        onChange={(e) => edit({ salutation: e.target.value })}
      >
        <option value="">Anrede…</option>
        <option value="Herr">Herr</option>
        <option value="Frau">Frau</option>
        <option value="Familie">Familie</option>
        <option value="Firma">Firma</option>
      </select>
      <div className="name">
        <input
          aria-label="Name"
          placeholder="Name / Firma"
          value={recipient.name}
          onChange={(e) => edit({ name: e.target.value })}
        />
      </div>
      <input
        aria-label="Straße"
        placeholder="Straße & Nr."
        value={recipient.street}
        onChange={(e) => edit({ street: e.target.value })}
      />
      <input
        aria-label="PLZ und Ort"
        placeholder="PLZ & Ort"
        value={recipient.cityLine}
        onChange={(e) => edit({ cityLine: e.target.value })}
      />
      <input
        aria-label="Land"
        placeholder="Land"
        value={recipient.country}
        onChange={(e) => edit({ country: e.target.value })}
      />

      {touched && (
        <button
          type="button"
          className={`save-guest-btn ${saveState === 'saved' ? 'is-saved' : ''}`}
          onClick={handleSaveGuest}
          disabled={!canSave || saveState !== 'idle'}
        >
          {saveState === 'saved' ? (
            <>
              <CheckIcon /> Gespeichert
            </>
          ) : saveState === 'saving' ? (
            'Speichern…'
          ) : (
            'Gast speichern'
          )}
        </button>
      )}
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
