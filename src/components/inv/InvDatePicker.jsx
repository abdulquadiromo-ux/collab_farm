import { useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, ChevronDown } from 'lucide-react';
import { Dropdown, Button } from '../ui/index.js';
import { cx, formatDateShort } from '../../utils/format.js';
import { appNow, isoDay } from './invData.js';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const local = (iso) => new Date(`${iso}T00:00:00`);

function Calendar({ value, marks, onChange, close }) {
  const [view, setView] = useState(() => {
    const base = value.from ? local(value.from) : appNow();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [anchor, setAnchor] = useState(null);
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7; // Monday first
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(view.getFullYear(), view.getMonth(), 1 - offset + i);
    return { d, iso: isoDay(d), inMonth: d.getMonth() === view.getMonth() };
  });
  const pick = (iso) => {
    if (!anchor) {
      setAnchor(iso);
      onChange({ from: iso, to: '' });
      return;
    }
    const [from, to] = iso < anchor ? [iso, anchor] : [anchor, iso];
    onChange({ from, to });
    close();
  };
  const inRange = (iso) => value.from && value.to && iso >= value.from && iso <= value.to;
  return (
    <div className="inv-cal">
      <div className="inv-cal__title">Select Date</div>
      <div className="inv-cal__nav">
        <button type="button" className="inv-cal__arrow" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))} aria-label="Previous month"><ArrowLeft size={18} /></button>
        <strong>{MONTH_NAMES[view.getMonth()]} {view.getFullYear()}</strong>
        <button type="button" className="inv-cal__arrow" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))} aria-label="Next month"><ArrowRight size={18} /></button>
      </div>
      <div className="inv-cal__grid" role="grid" aria-label={`${MONTH_NAMES[view.getMonth()]} ${view.getFullYear()}`}>
        {DAY_NAMES.map((n) => <div key={n} className="inv-cal__dow" role="columnheader">{n}</div>)}
        {cells.map(({ d, iso, inMonth }) => {
          const mark = marks[iso];
          const selected = iso === value.from || iso === value.to;
          return (
            <button
              key={iso}
              type="button"
              role="gridcell"
              disabled={!inMonth}
              className={cx('inv-cal__day', !inMonth && 'inv-cal__day--out', mark && `inv-cal__day--${mark}`, inRange(iso) && 'inv-cal__day--range', selected && 'inv-cal__day--sel')}
              aria-label={`${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}${mark === 'pending' ? ', pending activity' : mark ? ', activity' : ''}`}
              aria-pressed={selected}
              onClick={() => pick(iso)}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
      <div className="inv-cal__foot">
        <span className="caption muted">{anchor ? 'Now click an end day.' : 'Click a start day, then an end day. Green days have activity, amber days have waiting items.'}</span>
        <Button size="sm" variant="outline" onClick={() => { onChange({ from: '', to: '' }); close(); }}>Clear</Button>
      </div>
    </div>
  );
}

// value: { from: 'YYYY-MM-DD' | '', to: '' }. marks: { 'YYYY-MM-DD': 'ok' | 'pending' }
export function InvDatePicker({ value, onChange, marks = {}, label = 'Date range', alignLeft = false }) {
  const text = value.from ? `${formatDateShort(local(value.from))}${value.to ? ` - ${formatDateShort(local(value.to))}` : ' - ...'}` : 'All dates';
  return (
    <Dropdown
      left={alignLeft}
      panelClassName="inv-cal-panel"
      trigger={({ open, toggle }) => (
        <button type="button" className={cx('inv-select', open && 'inv-select--open')} onClick={toggle} aria-haspopup="dialog" aria-expanded={open} aria-label={`${label}: ${text}`}>
          <CalendarDays size={16} />
          <span>{text}</span>
          <ChevronDown size={16} />
        </button>
      )}
    >
      {({ close }) => <Calendar value={value} marks={marks} onChange={onChange} close={close} />}
    </Dropdown>
  );
}
