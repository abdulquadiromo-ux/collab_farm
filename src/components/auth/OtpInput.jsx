import { useRef } from 'react';
import { cx } from '../../utils/format.js';
import { OTP_LENGTH } from './authUtils.js';

// Six separate digit boxes. `value` is an array of single digits or empty strings.
// Handles typing with auto advance, backspace to go back, arrow keys, paste and one-time-code autofill.
export default function OtpInput({ value, onChange, invalid, disabled, describedBy, length = OTP_LENGTH }) {
  const refs = useRef([]);
  const focusAt = (i) => {
    const el = refs.current[Math.max(0, Math.min(length - 1, i))];
    if (el) { el.focus(); el.select?.(); }
  };

  const place = (start, text) => {
    const clean = String(text).replace(/\D/g, '');
    if (!clean) return;
    const next = value.slice();
    let j = start;
    for (const ch of clean) { if (j >= length) break; next[j] = ch; j += 1; }
    onChange(next);
    focusAt(Math.min(j, length - 1));
  };

  const handleChange = (i, e) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) { const next = value.slice(); next[i] = ''; onChange(next); return; }
    const kind = e.nativeEvent?.inputType;
    // A single key press on a box that already holds a digit: keep only the digit just typed.
    if (kind === 'insertText' && raw.length > 1) { place(i, raw.slice(-1)); return; }
    place(i, raw);
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !value[i] && i > 0) {
      e.preventDefault();
      const next = value.slice(); next[i - 1] = ''; onChange(next); focusAt(i - 1);
    } else if (e.key === 'ArrowLeft') { e.preventDefault(); focusAt(i - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); focusAt(i + 1); }
    else if (e.key === 'Home') { e.preventDefault(); focusAt(0); }
    else if (e.key === 'End') { e.preventDefault(); focusAt(length - 1); }
  };

  const handlePaste = (i, e) => {
    const text = e.clipboardData?.getData('text') || '';
    if (!/\d/.test(text)) return;
    e.preventDefault();
    // A pasted full code always starts from the first box.
    place(text.replace(/\D/g, '').length >= length ? 0 : i, text);
  };

  return (
    <div className="auth-otp" role="group" aria-label={`${length} digit verification code`} aria-describedby={describedBy}>
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          className={cx('auth-otp__box', invalid && 'is-invalid')}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${i + 1} of ${length}`}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          value={value[i] || ''}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => handlePaste(i, e)}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}
