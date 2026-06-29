import { useStore } from '../store';
import { computeGrandTotal } from '../lib/calc';
import { formatAmount } from '../lib/format';

export function PaymentSection() {
  const paymentMode = useStore((s) => s.current.paymentMode);
  const items = useStore((s) => s.current.lineItems);
  const setPaymentMode = useStore((s) => s.setPaymentMode);
  const profile = useStore((s) => s.profile);

  const total = computeGrandTotal(items);

  return (
    <div className="payment">
      <div className="block-label">Zahlung</div>

      <div className="segmented" role="tablist" aria-label="Zahlungsart">
        <button
          type="button"
          className={paymentMode === 'transfer' ? 'active' : ''}
          onClick={() => setPaymentMode('transfer')}
        >
          Überweisung
        </button>
        <button
          type="button"
          className={paymentMode === 'received' ? 'active' : ''}
          onClick={() => setPaymentMode('received')}
        >
          Bar erhalten
        </button>
      </div>

      {paymentMode === 'transfer' ? (
        <>
          <div className="transfer-note">
            Wir bitten um Überweisung von <strong>{formatAmount(total)} €</strong> binnen einer Woche ab
            Rechnungsdatum.
          </div>
          <div className="bank-card">
            <div>
              <div className="k">Kontoinhaber</div>
              <div className="v">{profile?.accountHolder || '—'}</div>
            </div>
            <div>
              <div className="k">IBAN</div>
              <div className="v">{profile?.iban || '—'}</div>
            </div>
            <div>
              <div className="k">BIC</div>
              <div className="v">{profile?.bic || '—'}</div>
            </div>
          </div>
        </>
      ) : (
        <div className="paid-badge">
          <span aria-hidden="true">✓</span> Betrag dankend erhalten
        </div>
      )}
    </div>
  );
}
