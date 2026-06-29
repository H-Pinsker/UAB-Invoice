import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';
import type { FarmProfile, Invoice } from '../types';
import {
  computeLineTotals,
  computeGrandTotal,
  computeNetTotal,
  computeUstTotal,
} from '../lib/calc';
import { formatAmount, formatDate } from '../lib/format';

const C = {
  green: '#0e995a',
  greenDark: '#096b40',
  tint: '#f3faf6',
  tint2: '#e9f6ef',
  ink: '#14241c',
  text: '#243029',
  muted: '#6b7c74',
  line: '#e4ebe7',
};

const styles = StyleSheet.create({
  page: { paddingHorizontal: 44, paddingVertical: 46, fontSize: 9, color: C.text, fontFamily: 'Helvetica' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  issuer: { flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: '62%' },
  farm: { fontFamily: 'Helvetica-Bold', fontSize: 15, color: C.ink },
  owner: { fontFamily: 'Helvetica-Bold', fontSize: 9, color: C.text, marginTop: 1 },
  mutedLine: { fontSize: 8, color: C.muted, marginTop: 2 },

  titleBlock: { alignItems: 'flex-end' },
  title: { fontFamily: 'Helvetica-Bold', fontSize: 24, color: C.green, letterSpacing: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  metaBlock: { alignItems: 'flex-end' },
  metaRow: { flexDirection: 'row', marginTop: 4 },
  metaK: { fontSize: 9, color: C.muted, marginRight: 8 },
  metaV: { fontSize: 9, color: C.ink, fontFamily: 'Helvetica-Bold', minWidth: 70, textAlign: 'right' },

  uabLogo: { width: 150, height: 54.7, objectFit: 'contain' },

  rule: { height: 3, backgroundColor: C.green, borderRadius: 2, marginTop: 16, marginBottom: 18 },

  parties: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  blockLabel: { fontFamily: 'Helvetica-Bold', fontSize: 8, letterSpacing: 1.2, color: C.green, marginBottom: 4 },
  recipientName: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: C.ink },
  recipientLine: { fontSize: 9, color: C.text, marginTop: 1 },

  stayCard: { backgroundColor: C.tint, borderWidth: 1, borderColor: C.line, borderRadius: 7, padding: 10, minWidth: 180 },
  stayRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  stayK: { fontSize: 9, color: C.muted },
  stayV: { fontSize: 9, color: C.ink },
  nightsPill: { marginTop: 4, alignSelf: 'flex-start', backgroundColor: C.green, color: '#fff', borderRadius: 10, paddingVertical: 2, paddingHorizontal: 10, fontSize: 9, fontFamily: 'Helvetica-Bold' },

  table: { borderWidth: 1, borderColor: C.line, borderRadius: 7, overflow: 'hidden' },
  thead: { flexDirection: 'row', backgroundColor: C.green },
  th: { color: '#fff', fontFamily: 'Helvetica-Bold', fontSize: 7.5, padding: 6, textAlign: 'right' },
  thLeft: { textAlign: 'left' },
  tr: { flexDirection: 'row', borderTopWidth: 1, borderColor: C.line },
  trAlt: { backgroundColor: C.tint },
  td: { padding: 5, fontSize: 9, color: C.text, textAlign: 'right' },
  tdLeft: { textAlign: 'left', color: C.ink },

  totals: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14 },
  totalsBox: { width: 240 },
  totalsLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingHorizontal: 2 },
  totalsK: { fontSize: 9, color: C.muted },
  totalsV: { fontSize: 9, color: C.text },
  grand: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5, backgroundColor: C.green, borderRadius: 7, paddingVertical: 9, paddingHorizontal: 12 },
  grandLabel: { color: '#fff', fontFamily: 'Helvetica-Bold', fontSize: 9, letterSpacing: 0.5 },
  grandAmount: { color: '#fff', fontFamily: 'Helvetica-Bold', fontSize: 15 },

  uidNote: { marginTop: 14, fontSize: 8, color: C.muted, fontStyle: 'italic' },

  payment: { marginTop: 22, borderTopWidth: 1, borderColor: C.line, paddingTop: 14 },
  transferNote: { fontSize: 9.5, color: C.text, marginTop: 4 },
  bankCard: { flexDirection: 'row', gap: 28, marginTop: 10, backgroundColor: C.tint, borderWidth: 1, borderColor: C.line, borderRadius: 7, padding: 10, alignSelf: 'flex-start' },
  bankK: { fontSize: 7.5, color: C.muted, letterSpacing: 0.8 },
  bankV: { fontSize: 10, color: C.ink, fontFamily: 'Helvetica-Bold', marginTop: 2 },
  paidBadge: { marginTop: 10, alignSelf: 'flex-start', backgroundColor: C.tint2, borderWidth: 1, borderColor: '#bfe6cf', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 14, color: C.greenDark, fontFamily: 'Helvetica-Bold', fontSize: 10 },

  footer: { position: 'absolute', left: 44, right: 44, bottom: 32, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: C.line, paddingTop: 10 },
  thanks: { fontFamily: 'Helvetica-Bold', fontSize: 9, color: C.green },
});

// Column flex widths (must match header + body).
const COLS = [0.7, 4.1, 1.1, 1.3, 0.8, 1.2, 1.4];

export function InvoiceDocument({
  invoice,
  profile,
  logoPng,
}: {
  invoice: Invoice;
  profile: FarmProfile;
  logoPng?: string;
}) {
  const rows = invoice.lineItems.filter(
    (li) => li.menge || li.unitGross || li.bezeichnung || li.ustPercent,
  );
  const net = computeNetTotal(invoice.lineItems);
  const ust = computeUstTotal(invoice.lineItems);
  const grand = computeGrandTotal(invoice.lineItems);

  const headers = ['Menge', 'Bezeichnung', 'Einzel', 'Netto', 'USt %', 'USt', 'Brutto'];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.issuer}>
            <View>
              <Text style={styles.farm}>{profile.farmName}</Text>
              {!!profile.ownerName && <Text style={styles.owner}>{profile.ownerName}</Text>}
              {!!profile.street && <Text style={styles.mutedLine}>{profile.street}</Text>}
              {!!profile.cityLine && <Text style={styles.mutedLine}>{profile.cityLine}</Text>}
              <Text style={styles.mutedLine}>
                {[profile.phone, profile.email].filter(Boolean).join('  ·  ')}
              </Text>
              {!!profile.website && <Text style={styles.mutedLine}>{profile.website}</Text>}
            </View>
          </View>

          {logoPng && <Image src={logoPng} style={styles.uabLogo} />}
        </View>

        <View style={styles.rule} />

        {/* Title + meta */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>RECHNUNG</Text>
          <View style={styles.metaBlock}>
            <View style={styles.metaRow}>
              <Text style={styles.metaK}>Nr.</Text>
              <Text style={styles.metaV}>{invoice.number}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaK}>Datum</Text>
              <Text style={styles.metaV}>{formatDate(invoice.date)}</Text>
            </View>
            {!!profile.issuePlace && (
              <View style={styles.metaRow}>
                <Text style={styles.metaK}>Ort</Text>
                <Text style={styles.metaV}>{profile.issuePlace}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Parties */}
        <View style={styles.parties}>
          <View style={{ maxWidth: '55%' }}>
            <Text style={styles.blockLabel}>AN</Text>
            {!!invoice.recipient.salutation && (
              <Text style={styles.recipientLine}>{invoice.recipient.salutation}</Text>
            )}
            <Text style={styles.recipientName}>{invoice.recipient.name}</Text>
            {!!invoice.recipient.street && (
              <Text style={styles.recipientLine}>{invoice.recipient.street}</Text>
            )}
            {!!invoice.recipient.cityLine && (
              <Text style={styles.recipientLine}>{invoice.recipient.cityLine}</Text>
            )}
            {!!invoice.recipient.country && (
              <Text style={styles.recipientLine}>{invoice.recipient.country}</Text>
            )}
          </View>

          <View>
            <Text style={styles.blockLabel}>AUFENTHALT</Text>
            <View style={styles.stayCard}>
              <View style={styles.stayRow}>
                <Text style={styles.stayK}>Anreise</Text>
                <Text style={styles.stayV}>{formatDate(invoice.stayFrom) || '—'}</Text>
              </View>
              <View style={styles.stayRow}>
                <Text style={styles.stayK}>Abreise</Text>
                <Text style={styles.stayV}>{formatDate(invoice.stayTo) || '—'}</Text>
              </View>
              {!!invoice.nights && <Text style={styles.nightsPill}>{invoice.nights} Nächte</Text>}
            </View>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.thead}>
            {headers.map((h, i) => (
              <Text
                key={i}
                style={[styles.th, { flex: COLS[i] }, i === 1 ? styles.thLeft : {}]}
              >
                {h}
              </Text>
            ))}
          </View>
          {rows.map((item, idx) => {
            const t = computeLineTotals(item);
            return (
              <View style={[styles.tr, idx % 2 === 1 ? styles.trAlt : {}]} key={item.id}>
                <Text style={[styles.td, { flex: COLS[0] }]}>{item.menge || ''}</Text>
                <Text style={[styles.td, styles.tdLeft, { flex: COLS[1] }]}>{item.bezeichnung}</Text>
                <Text style={[styles.td, { flex: COLS[2] }]}>
                  {item.unitGross ? formatAmount(item.unitGross) : ''}
                </Text>
                <Text style={[styles.td, { flex: COLS[3] }]}>{formatAmount(t.net)}</Text>
                <Text style={[styles.td, { flex: COLS[4] }]}>{item.ustPercent}%</Text>
                <Text style={[styles.td, { flex: COLS[5] }]}>{formatAmount(t.ustAmount)}</Text>
                <Text style={[styles.td, { flex: COLS[6], fontFamily: 'Helvetica-Bold', color: C.ink }]}>
                  {formatAmount(t.gross)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalsBox}>
            <View style={styles.totalsLine}>
              <Text style={styles.totalsK}>Nettobetrag</Text>
              <Text style={styles.totalsV}>{formatAmount(net)} €</Text>
            </View>
            <View style={styles.totalsLine}>
              <Text style={styles.totalsK}>USt gesamt</Text>
              <Text style={styles.totalsV}>{formatAmount(ust)} €</Text>
            </View>
            <View style={styles.grand}>
              <Text style={styles.grandLabel}>RECHNUNGSBETRAG</Text>
              <Text style={styles.grandAmount}>{formatAmount(grand)} €</Text>
            </View>
          </View>
        </View>

        {/* UID note */}
        {!!profile.uidText && <Text style={styles.uidNote}>{profile.uidText}</Text>}

        {/* Payment */}
        <View style={styles.payment}>
          <Text style={styles.blockLabel}>ZAHLUNG</Text>
          {invoice.paymentMode === 'transfer' ? (
            <>
              <Text style={styles.transferNote}>
                Wir bitten um Überweisung von {formatAmount(grand)} € binnen einer Woche ab Rechnungsdatum.
              </Text>
              <View style={styles.bankCard}>
                <View>
                  <Text style={styles.bankK}>Kontoinhaber</Text>
                  <Text style={styles.bankV}>{profile.accountHolder || '—'}</Text>
                </View>
                <View>
                  <Text style={styles.bankK}>IBAN</Text>
                  <Text style={styles.bankV}>{profile.iban || '—'}</Text>
                </View>
                <View>
                  <Text style={styles.bankK}>BIC</Text>
                  <Text style={styles.bankV}>{profile.bic || '—'}</Text>
                </View>
              </View>
            </>
          ) : (
            <Text style={styles.paidBadge}>✓ Betrag dankend erhalten</Text>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.thanks}>Vielen Dank für Ihren Aufenthalt!</Text>
        </View>
      </Page>
    </Document>
  );
}
