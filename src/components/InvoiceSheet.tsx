import { useStore } from '../store';
import { logoUrl } from '../lib/logo';
import { RecipientBlock } from './RecipientBlock';
import { LineItemsTable } from './LineItemsTable';
import { PaymentSection } from './PaymentSection';
import { NumberInput } from './NumberInput';
import { StayRangePicker } from './StayRangePicker';

export function InvoiceSheet() {
  const profile = useStore((s) => s.profile);
  const current = useStore((s) => s.current);
  const updateCurrent = useStore((s) => s.updateCurrent);

  return (
    <div className="sheet" id="invoice-sheet">
      {/* ===== Header ===== */}
      <div className="inv-header">
        <div className="issuer">
          <div className="lines">
            {profile ? (
              <>
                <div className="farm">{profile.farmName || 'Ihr Hofname'}</div>
                {profile.ownerName && <div className="owner">{profile.ownerName}</div>}
                {profile.street && <div className="muted-lines">{profile.street}</div>}
                {profile.cityLine && <div className="muted-lines">{profile.cityLine}</div>}
                <div className="muted-lines">
                  {profile.phone && <span>{profile.phone}</span>}
                  {profile.phone && profile.email && <span className="sep">·</span>}
                  {profile.email && <span>{profile.email}</span>}
                </div>
                {profile.website && <div className="muted-lines">{profile.website}</div>}
              </>
            ) : (
              <div className="farm" style={{ color: 'var(--muted)' }}>
                Bitte Stammdaten ausfüllen…
              </div>
            )}
          </div>
        </div>

        <div className="uab-logo">
          <img src={logoUrl} alt="Urlaub am Bauernhof" height={62} />
        </div>
      </div>

      <div className="rule" />

      {/* ===== Title + meta ===== */}
      <div className="title-row">
        <div className="inv-title">Rechnung</div>
        <div className="inv-meta">
          <div className="k">Nr.</div>
          <input
            aria-label="Rechnungsnummer"
            className="v"
            value={current.number}
            onChange={(e) => updateCurrent({ number: e.target.value })}
          />
          <div className="k">Datum</div>
          <input
            aria-label="Rechnungsdatum"
            className="v"
            type="date"
            value={current.date}
            onChange={(e) => updateCurrent({ date: e.target.value })}
          />
          {profile?.issuePlace && (
            <>
              <div className="k">Ort</div>
              <div className="v">{profile.issuePlace}</div>
            </>
          )}
        </div>
      </div>

      {/* ===== Parties ===== */}
      <div className="parties">
        <RecipientBlock />

        <div>
          <div className="block-label">Aufenthalt</div>
          <div className="stay-card">
            <StayRangePicker
              from={current.stayFrom}
              to={current.stayTo}
              onChange={(stayFrom, stayTo) => updateCurrent({ stayFrom, stayTo })}
            />
            <div className="stay-nights">
              <span className="k">Nächte</span>
              <span className="nights-pill">
                <NumberInput
                  aria-label="Nächte"
                  value={current.nights}
                  onChange={(v) => updateCurrent({ nights: v })}
                />
                Nächte
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Items + totals ===== */}
      <LineItemsTable />

      {/* ===== UID note ===== */}
      {profile?.uidText && <div className="uid-note">{profile.uidText}</div>}

      {/* ===== Payment ===== */}
      <PaymentSection />

      {/* ===== Footer ===== */}
      <div className="sheet-footer">
        <span className="thanks">Vielen Dank für Ihren Aufenthalt!</span>
      </div>
    </div>
  );
}
