import { useEffect, useMemo, useRef, useState } from 'react';
import { formatDate, nightsBetween } from '../lib/format';

interface Props {
  from: string; // ISO yyyy-mm-dd or ''
  to: string; // ISO yyyy-mm-dd or ''
  onChange: (from: string, to: string) => void;
}

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTHS = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

function isoToDate(iso: string): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function dateToIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Visible month count: 1 on phones, 2 on wider screens. */
function useMonthCount(): number {
  const query = '(max-width: 760px)';
  const [count, setCount] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(query).matches ? 1 : 2,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setCount(mq.matches ? 1 : 2);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return count;
}

export function StayRangePicker({ from, to, onChange }: Props) {
  const fromDate = isoToDate(from);
  const toDate = isoToDate(to);

  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<Date | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const monthCount = useMonthCount();

  // First visible month (anchored to the current selection or today).
  const [viewYear, setViewYear] = useState(() => (fromDate ?? new Date()).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => (fromDate ?? new Date()).getMonth());

  // When opening, jump the calendar to the selected start (or today).
  useEffect(() => {
    if (open) {
      const anchor = fromDate ?? new Date();
      setViewYear(anchor.getFullYear());
      setViewMonth(anchor.getMonth());
      setHovered(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Close on outside click + Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const nights = nightsBetween(from, to);

  const handleDayClick = (date: Date) => {
    // No start yet, or a full range already chosen → begin a new range.
    if (!fromDate || (fromDate && toDate)) {
      onChange(dateToIso(date), '');
      return;
    }
    // Start chosen, choosing the end.
    if (date.getTime() > fromDate.getTime()) {
      onChange(from, dateToIso(date));
      setOpen(false);
    } else {
      // Clicked the same day or earlier → restart from here.
      onChange(dateToIso(date), '');
    }
  };

  const clear = () => {
    onChange('', '');
    setHovered(null);
  };

  const step = (dir: number) => {
    let m = viewMonth + dir;
    let y = viewYear;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewYear(y);
    setViewMonth(m);
  };

  const months = useMemo(() => {
    const list: { year: number; month: number }[] = [];
    for (let i = 0; i < monthCount; i += 1) {
      let m = viewMonth + i;
      let y = viewYear;
      while (m > 11) {
        m -= 12;
        y += 1;
      }
      list.push({ year: y, month: m });
    }
    return list;
  }, [viewYear, viewMonth, monthCount]);

  // The provisional end used for hover-preview before the user clicks.
  const previewEnd =
    fromDate && !toDate && hovered && hovered.getTime() > fromDate.getTime() ? hovered : null;

  const renderMonth = (year: number, month: number) => {
    const first = new Date(year, month, 1);
    const lead = (first.getDay() + 6) % 7; // Monday-first offset
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    const cells: (Date | null)[] = [];
    for (let i = 0; i < lead; i += 1) cells.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null); // pad trailing to a full week

    // Chunk into explicit week rows so layout never depends on grid auto-flow.
    const weeks: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

    const renderCell = (date: Date | null, key: string) => {
      if (!date) return <span className="rp-cell empty" key={key} />;

      const rangeEnd = toDate ?? previewEnd;
      const hasRange = Boolean(fromDate && rangeEnd && rangeEnd.getTime() > fromDate.getTime());
      const isStart = Boolean(fromDate && sameDay(date, fromDate));
      const isEnd = Boolean(rangeEnd && sameDay(date, rangeEnd));
      const inRange = Boolean(
        fromDate &&
          rangeEnd &&
          date.getTime() > fromDate.getTime() &&
          date.getTime() < rangeEnd.getTime(),
      );
      const isToday = sameDay(date, today);

      const cls = [
        'rp-cell',
        'day',
        isStart ? 'is-start' : '',
        isEnd ? 'is-end' : '',
        inRange ? 'is-between' : '',
        hasRange ? 'has-range' : '',
        isToday ? 'is-today' : '',
      ]
        .filter(Boolean)
        .join(' ');

      return (
        <button
          type="button"
          className={cls}
          key={key}
          onClick={() => handleDayClick(date)}
          onMouseEnter={() => setHovered(date)}
          aria-label={formatDate(dateToIso(date))}
        >
          <span className="rp-day-num">{date.getDate()}</span>
        </button>
      );
    };

    return (
      <div className="rp-month" key={`${year}-${month}`}>
        <div className="rp-month-title">
          {MONTHS[month]} {year}
        </div>
        <div className="rp-weekdays">
          {WEEKDAYS.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className="rp-grid">
          {weeks.map((week, wi) => (
            <div className="rp-week" key={`w${wi}`}>
              {week.map((date, di) => renderCell(date, date ? dateToIso(date) : `e${wi}-${di}`))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="range-picker" ref={rootRef}>
      <button
        type="button"
        className={`range-trigger ${open ? 'open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="rt-seg">
          <span className="rt-label">Anreise</span>
          <span className={`rt-value ${from ? '' : 'ph'}`}>
            {from ? formatDate(from) : 'Datum'}
          </span>
        </span>
        <span className="rt-arrow" aria-hidden="true">
          →
        </span>
        <span className="rt-seg">
          <span className="rt-label">Abreise</span>
          <span className={`rt-value ${to ? '' : 'ph'}`}>{to ? formatDate(to) : 'Datum'}</span>
        </span>
      </button>

      {open && (
        <>
          <div className="range-backdrop" onClick={() => setOpen(false)} />
          <div className="range-pop" role="dialog" aria-label="Zeitraum wählen">
            <div className="rp-head">
              <button
                type="button"
                className="rp-nav"
                onClick={() => step(-1)}
                aria-label="Vorheriger Monat"
              >
                ‹
              </button>
              <div className="rp-head-spacer" />
              <button
                type="button"
                className="rp-nav"
                onClick={() => step(1)}
                aria-label="Nächster Monat"
              >
                ›
              </button>
            </div>

            <div className="rp-months" onMouseLeave={() => setHovered(null)}>
              {months.map((m) => renderMonth(m.year, m.month))}
            </div>

            <div className="rp-foot">
              <span className="rp-foot-info">
                {nights > 0 ? `${nights} ${nights === 1 ? 'Nacht' : 'Nächte'}` : 'Zeitraum wählen'}
              </span>
              <div className="rp-foot-actions">
                <button type="button" className="subtle" onClick={clear}>
                  Zurücksetzen
                </button>
                <button type="button" className="primary" onClick={() => setOpen(false)}>
                  Fertig
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
