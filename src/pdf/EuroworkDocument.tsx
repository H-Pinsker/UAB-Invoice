import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { EuroworkSheet } from '../types';
import {
  EUROWORK_ATTENTION,
  EUROWORK_COMPANY,
  EUROWORK_FOOTER,
  EUROWORK_INTRO,
  EUROWORK_NOTES,
  EUROWORK_TITLE,
  MAX_DAYS,
  daysInMonth,
  grandTotalNights,
  monthLabel,
  nightsForEmployee,
} from '../lib/eurowork';

const C = {
  ink: '#111111',
  text: '#1a1a1a',
  red: '#c1121f',
  yellow: '#fff27a',
  line: '#000000',
  grey: '#9aa0a6',
  shade: '#eceef0',
};

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 28,
    paddingVertical: 24,
    fontSize: 7,
    color: C.text,
    fontFamily: 'Helvetica',
  },

  // Header
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontFamily: 'Helvetica-Bold', fontSize: 16, color: C.ink },
  attention: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: C.yellow,
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  billBlock: { alignItems: 'flex-start', maxWidth: '58%' },
  billRow: { flexDirection: 'row' },
  billLabel: { fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.ink, marginRight: 6 },
  billName: { fontFamily: 'Helvetica-Bold', fontSize: 8.5, color: C.red },
  billText: { fontSize: 7, color: C.text, marginTop: 2 },
  billRed: { color: C.red, fontFamily: 'Helvetica-Bold' },

  // Notes
  intro: { fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: C.ink, marginTop: 10 },
  note: { flexDirection: 'row', marginTop: 3 },
  noteNum: { fontFamily: 'Helvetica-Bold', width: 12 },
  noteTitle: { fontFamily: 'Helvetica-Bold' },
  notePlain: { fontFamily: 'Helvetica-Bold', marginTop: 3, marginLeft: 12 },

  // Quartier fields
  fields: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, gap: 24 },
  fieldsCol: { flex: 1 },
  fieldRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 4 },
  fieldLabel: { fontFamily: 'Helvetica-Bold', fontSize: 7.5, width: 70 },
  fieldValueWrap: { flex: 1, borderBottomWidth: 0.7, borderColor: C.line, paddingBottom: 1 },
  fieldValue: { fontSize: 7.5 },

  // Month
  monthBox: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.8,
    borderColor: C.line,
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  monthLabel: { fontFamily: 'Helvetica-Bold', fontSize: 9, marginRight: 6 },
  monthValue: { fontSize: 9 },

  // Grid
  table: { marginTop: 2, borderWidth: 0.8, borderColor: C.line },
  headRow: { flexDirection: 'row' },
  bodyRow: { flexDirection: 'row' },
  cellBase: {
    borderRightWidth: 0.6,
    borderBottomWidth: 0.6,
    borderColor: C.line,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 22,
  },
  headCell: { backgroundColor: '#fff', fontFamily: 'Helvetica-Bold', fontSize: 6.5 },
  zimmerCol: { width: 34 },
  nameCol: { width: 150, alignItems: 'flex-start', paddingLeft: 4 },
  dayCol: { flex: 1 },
  totalCol: { width: 40 },
  headText: { fontFamily: 'Helvetica-Bold', fontSize: 6.5, textAlign: 'center' },
  nameText: { fontSize: 8, fontFamily: 'Helvetica-Bold' },
  zimmerText: { fontSize: 8 },
  dayMark: { fontFamily: 'Helvetica-Bold', fontSize: 9 },
  totalText: { fontFamily: 'Helvetica-Bold', fontSize: 9 },
  dayDisabled: { backgroundColor: C.shade },
  grandRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
  grandBox: {
    flexDirection: 'row',
    borderWidth: 0.8,
    borderColor: C.line,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  grandLabel: { fontFamily: 'Helvetica-Bold', fontSize: 8.5, marginRight: 8 },
  grandValue: { fontFamily: 'Helvetica-Bold', fontSize: 8.5 },

  // Footer
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 18 },
  fGreet: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: C.ink },
  fCompany: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: C.red, marginTop: 2 },
  sigWrap: { alignItems: 'center' },
  sigLine: { width: 150, borderTopWidth: 0.8, borderColor: C.line, marginBottom: 3 },
  sigText: { fontSize: 7.5 },
});

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldValueWrap}>
        <Text style={styles.fieldValue}>{value || ' '}</Text>
      </View>
    </View>
  );
}

export function EuroworkDocument({ sheet }: { sheet: EuroworkSheet }) {
  const dim = daysInMonth(sheet.month, sheet.year);
  const dayNumbers = Array.from({ length: MAX_DAYS }, (_, i) => i + 1);
  const grand = grandTotalNights(sheet);

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header: title + billing address */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>{EUROWORK_TITLE}</Text>
            <Text style={styles.attention}>{EUROWORK_ATTENTION}</Text>
          </View>
          <View style={styles.billBlock}>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Rechnungsadresse:</Text>
              <Text style={styles.billName}>{EUROWORK_COMPANY.name}</Text>
            </View>
            <Text style={[styles.billText, styles.billRed]}>{EUROWORK_COMPANY.address}</Text>
            <Text style={styles.billText}>
              Tel.: {EUROWORK_COMPANY.phone}   E-Mail: {EUROWORK_COMPANY.email}   Betreuer:{' '}
              {EUROWORK_COMPANY.betreuer}
            </Text>
          </View>
        </View>

        {/* Important notes */}
        <Text style={styles.intro}>{EUROWORK_INTRO}</Text>
        {EUROWORK_NOTES.map((p, i) =>
          p.kind === 'note' ? (
            <View key={i} style={styles.note}>
              <Text style={styles.noteNum}>{p.n}</Text>
              <Text>
                <Text style={styles.noteTitle}>{p.title} </Text>
                {p.text}
              </Text>
            </View>
          ) : (
            <Text key={i} style={styles.notePlain}>
              {p.text}
            </Text>
          ),
        )}

        {/* Quartier + contact fields */}
        <View style={styles.fields}>
          <View style={styles.fieldsCol}>
            <Field label="Quartier:" value={sheet.quartier} />
            <Field label="Straße:" value={sheet.street} />
            <Field label="PLZ, Ort:" value={sheet.plzOrt} />
          </View>
          <View style={styles.fieldsCol}>
            <Field label="Telefonnummer:" value={sheet.phone} />
            <Field label="Emailadresse:" value={sheet.email} />
            <Field label="Preis pro Person, pro Nacht:" value={sheet.pricePerNight} />
          </View>
        </View>

        {/* Month */}
        <View style={styles.monthBox}>
          <Text style={styles.monthLabel}>Monat:</Text>
          <Text style={styles.monthValue}>{monthLabel(sheet)}</Text>
        </View>

        {/* Day grid */}
        <View style={styles.table}>
          {/* Header row */}
          <View style={styles.headRow}>
            <View style={[styles.cellBase, styles.headCell, styles.zimmerCol]}>
              <Text style={styles.headText}>Zi. Nr.</Text>
            </View>
            <View style={[styles.cellBase, styles.headCell, styles.nameCol]}>
              <Text style={styles.headText}>Namen</Text>
            </View>
            {dayNumbers.map((d) => (
              <View
                key={d}
                style={[
                  styles.cellBase,
                  styles.headCell,
                  styles.dayCol,
                  d > dim ? styles.dayDisabled : {},
                ]}
              >
                <Text style={styles.headText}>{d}</Text>
              </View>
            ))}
            <View style={[styles.cellBase, styles.headCell, styles.totalCol]}>
              <Text style={styles.headText}>Gesamt</Text>
            </View>
          </View>

          {/* Body rows */}
          {sheet.employees.map((emp) => {
            const total = nightsForEmployee(emp, dim);
            return (
              <View key={emp.id} style={styles.bodyRow}>
                <View style={[styles.cellBase, styles.zimmerCol]}>
                  <Text style={styles.zimmerText}>{emp.zimmerNr}</Text>
                </View>
                <View style={[styles.cellBase, styles.nameCol]}>
                  <Text style={styles.nameText}>{emp.name}</Text>
                </View>
                {dayNumbers.map((d) => {
                  const idx = d - 1;
                  const disabled = d > dim;
                  return (
                    <View
                      key={d}
                      style={[styles.cellBase, styles.dayCol, disabled ? styles.dayDisabled : {}]}
                    >
                      <Text style={styles.dayMark}>{!disabled && emp.days[idx] ? 'X' : ''}</Text>
                    </View>
                  );
                })}
                <View style={[styles.cellBase, styles.totalCol]}>
                  <Text style={styles.totalText}>{total > 0 ? total : ''}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Grand total */}
        <View style={styles.grandRow}>
          <View style={styles.grandBox}>
            <Text style={styles.grandLabel}>Gesamt Nächte:</Text>
            <Text style={styles.grandValue}>{grand}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View>
            <Text style={styles.fGreet}>{EUROWORK_FOOTER.greeting}</Text>
            <Text style={styles.fCompany}>{EUROWORK_FOOTER.company}</Text>
          </View>
          <View style={styles.sigWrap}>
            <View style={styles.sigLine} />
            <Text style={styles.sigText}>{EUROWORK_FOOTER.signature}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
