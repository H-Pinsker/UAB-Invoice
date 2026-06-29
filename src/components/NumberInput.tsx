import { useEffect, useState } from 'react';
import { formatAmount, parseGermanNumber } from '../lib/format';

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  /** Show formatted (1.234,56) when not focused. */
  money?: boolean;
  placeholder?: string;
  className?: string;
  'aria-label'?: string;
}

/**
 * Text input that accepts German-style numbers ("25,-", "1.234,56") and
 * reports a parsed number. While focused it shows the raw text the user typed;
 * when blurred it shows the nicely formatted value.
 */
export function NumberInput({ value, onChange, money, placeholder, className, ...rest }: NumberInputProps) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!focused) setDraft('');
  }, [focused, value]);

  const display = focused
    ? draft
    : value
      ? money
        ? formatAmount(value)
        : String(value).replace('.', ',')
      : '';

  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      className={className}
      placeholder={placeholder}
      value={display}
      onFocus={() => {
        setFocused(true);
        setDraft(value ? String(value).replace('.', ',') : '');
      }}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        setDraft(e.target.value);
        onChange(parseGermanNumber(e.target.value));
      }}
    />
  );
}
