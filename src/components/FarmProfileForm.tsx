import { useEffect, useState } from 'react';
import type { FarmProfile } from '../types';
import { emptyProfile } from '../store';
import * as db from '../lib/db';

interface Props {
  initial: FarmProfile | null;
  onSave: (profile: FarmProfile) => void | Promise<void>;
  onClose?: () => void;
  /** 'modal' shows a centered dialog (onboarding); 'page' renders inline. */
  variant?: 'modal' | 'page';
}

const FIELDS: Array<{
  key: keyof FarmProfile;
  label: string;
  full?: boolean;
  textarea?: boolean;
  number?: boolean;
  placeholder?: string;
}> = [
  { key: 'farmName', label: 'Hofname', placeholder: 'Musterhof' },
  { key: 'ownerName', label: 'Familie / Inhaber', placeholder: 'Familie Mustermann' },
  { key: 'street', label: 'Straße & Nr.', placeholder: 'Irgendweg 11' },
  { key: 'cityLine', label: 'PLZ & Ort', placeholder: '0000 Musterdorf' },
  { key: 'phone', label: 'Telefon', placeholder: '+43 123 456 789' },
  { key: 'email', label: 'E-Mail', placeholder: 'muster@musterhof.at' },
  { key: 'website', label: 'Webseite', placeholder: 'www.musterhof.at' },
  { key: 'issuePlace', label: 'Ausstellungsort (für "…, am …")', placeholder: 'Musterdorf' },
  { key: 'iban', label: 'IBAN', placeholder: 'AT00 0000 0000 0000 0000' },
  { key: 'bic', label: 'BIC', placeholder: 'XXXXATWW' },
  { key: 'accountHolder', label: 'Kontoinhaber', placeholder: 'Familie Mustermann' },
  { key: 'uidText', label: 'Text in der UID-Zeile', full: true, textarea: true },
  {
    key: 'nextInvoiceNumber',
    label: 'Nächste Rechnungsnummer',
    placeholder: '1',
    number: true,
  },
];

export function FarmProfileForm({ initial, onSave, onClose, variant = 'modal' }: Props) {
  const [profile, setProfile] = useState<FarmProfile>(initial ?? emptyProfile());
  const [busy, setBusy] = useState(false);
  // Lowest invoice number the user may set: one above the highest already
  // issued for the current year, so we never clash with an existing invoice.
  const [minNumber, setMinNumber] = useState(1);
  const [numberError, setNumberError] = useState<string | null>(null);

  const twoDigitYear = String(new Date().getFullYear()).slice(-2);

  useEffect(() => {
    let alive = true;
    db.fetchMaxInvoiceNumberForYear(twoDigitYear)
      .then((max) => {
        if (alive) setMinNumber(max + 1);
      })
      .catch(() => {
        /* If we can't read it, fall back to no restriction (min 1). */
      });
    return () => {
      alive = false;
    };
  }, [twoDigitYear]);

  const set = (key: keyof FarmProfile, value: string) =>
    setProfile((p) => ({ ...p, [key]: value }));

  const setNumber = (key: keyof FarmProfile, value: string) => {
    setNumberError(null);
    setProfile((p) => ({
      ...p,
      [key]: value === '' ? undefined : Math.max(1, parseInt(value, 10) || 1),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Guard against a starting number that would clash with an existing invoice.
    const desired = profile.nextInvoiceNumber ?? 1;
    if (minNumber > 1 && desired < minNumber) {
      setNumberError(
        `Für ${twoDigitYear} ist bereits Rechnung Nr. ${minNumber - 1}/${twoDigitYear} vergeben. ` +
          `Die nächste Nummer muss mindestens ${minNumber} sein.`,
      );
      return;
    }
    setBusy(true);
    try {
      await onSave(profile);
    } finally {
      setBusy(false);
    }
  };

  const form = (
    <form className={variant === 'modal' ? 'modal' : 'settings-form'} onSubmit={handleSubmit}>
      <h2>Stammdaten Ihres Betriebs</h2>
      <p className="sub">
        Diese Angaben werden sicher in Ihrem Konto gespeichert und automatisch in jede neue Rechnung
        übernommen.
      </p>
      <div className="form-grid">
        {FIELDS.map((f) => (
          <label key={f.key} className={f.full ? 'full' : ''}>
            {f.label}
            {f.textarea ? (
              <textarea
                rows={2}
                value={profile[f.key] ?? ''}
                onChange={(e) => set(f.key, e.target.value)}
              />
            ) : f.number ? (
              <>
                <input
                  type="number"
                  min={minNumber}
                  value={profile[f.key] ?? ''}
                  placeholder={f.placeholder}
                  onChange={(e) => setNumber(f.key, e.target.value)}
                />
                {minNumber > 1 && !numberError && (
                  <span className="field-hint">
                    Bereits vergeben bis {minNumber - 1}/{twoDigitYear} · mind. {minNumber} möglich
                  </span>
                )}
                {numberError && <span className="field-error">{numberError}</span>}
              </>
            ) : (
              <input
                value={profile[f.key] ?? ''}
                placeholder={f.placeholder}
                onChange={(e) => set(f.key, e.target.value)}
              />
            )}
          </label>
        ))}
      </div>
      <div className="modal-actions">
        {onClose && (
          <button type="button" className="subtle" onClick={onClose} disabled={busy}>
            Abbrechen
          </button>
        )}
        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Speichern…' : 'Speichern'}
        </button>
      </div>
    </form>
  );

  if (variant === 'page') return form;
  return <div className="modal-backdrop">{form}</div>;
}
