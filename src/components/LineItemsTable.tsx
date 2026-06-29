import {
  computeLineTotals,
  computeGrandTotal,
  computeNetTotal,
  computeUstTotal,
} from '../lib/calc';
import { formatAmount } from '../lib/format';
import { NumberInput } from './NumberInput';
import { AutoTextarea } from './AutoTextarea';
import { useStore } from '../store';

export function LineItemsTable() {
  const items = useStore((s) => s.current.lineItems);
  const updateLineItem = useStore((s) => s.updateLineItem);
  const addLineItem = useStore((s) => s.addLineItem);
  const removeLineItem = useStore((s) => s.removeLineItem);

  const net = computeNetTotal(items);
  const ust = computeUstTotal(items);
  const grand = computeGrandTotal(items);

  return (
    <>
      <div className="table-wrap">
        <table className="items">
          <thead>
            <tr>
              <th style={{ width: '7%' }}>Menge</th>
              <th className="left">Bezeichnung</th>
              <th style={{ width: '11%' }}>Einzel</th>
              <th style={{ width: '12%' }}>Netto</th>
              <th style={{ width: '7%' }}>USt %</th>
              <th style={{ width: '12%' }}>USt</th>
              <th style={{ width: '13%' }}>Brutto</th>
              <th className="actions"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const t = computeLineTotals(item);
              const empty =
                !item.menge && !item.unitGross && !item.bezeichnung && !item.ustPercent;
              return (
                <tr key={item.id}>
                  <td>
                    <NumberInput
                      aria-label="Menge"
                      value={item.menge}
                      onChange={(v) => updateLineItem(item.id, { menge: v })}
                    />
                  </td>
                  <td className="text">
                    <AutoTextarea
                      aria-label="Bezeichnung"
                      placeholder="Bezeichnung"
                      value={item.bezeichnung}
                      onChange={(v) => updateLineItem(item.id, { bezeichnung: v })}
                    />
                  </td>
                  <td>
                    <NumberInput
                      aria-label="Brutto-Einzelpreis"
                      money
                      value={item.unitGross}
                      onChange={(v) => updateLineItem(item.id, { unitGross: v })}
                    />
                  </td>
                  <td className="computed">{empty ? '' : formatAmount(t.net)}</td>
                  <td>
                    <NumberInput
                      aria-label="USt-Prozent"
                      value={item.ustPercent}
                      onChange={(v) => updateLineItem(item.id, { ustPercent: v })}
                    />
                  </td>
                  <td className="computed">{empty ? '' : formatAmount(t.ustAmount)}</td>
                  <td className="computed" style={{ fontWeight: 600 }}>
                    {empty ? '' : formatAmount(t.gross)}
                  </td>
                  <td className="actions">
                    {items.length > 1 && (
                      <button
                        type="button"
                        className="row-remove"
                        title="Zeile entfernen"
                        onClick={() => removeLineItem(item.id)}
                      >
                        ×
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button type="button" className="add-row subtle" onClick={addLineItem}>
        + Position hinzufügen
      </button>

      {/* Totals summary */}
      <div className="totals">
        <div className="totals-box">
          <div className="totals-line">
            <span>Nettobetrag</span>
            <span className="val">{formatAmount(net)} €</span>
          </div>
          <div className="totals-line">
            <span>USt gesamt</span>
            <span className="val">{formatAmount(ust)} €</span>
          </div>
          <div className="totals-grand">
            <span className="label">Rechnungsbetrag</span>
            <span className="amount">{formatAmount(grand)} €</span>
          </div>
        </div>
      </div>
    </>
  );
}
