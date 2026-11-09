import { ChevronDown, Check } from 'lucide-react';
import { Dropdown } from '../ui/index.js';
import { cx } from '../../utils/format.js';

// Dropdown styled like the Figma "Status", "Tranches" and "Sort by" menus: rounded trigger, rounded panel,
// options separated by thin rules. options: [{ value, label }]. `allLabel` adds an empty "all" option.
export function InvSelect({ label, value, onChange, options, allLabel, prefix = '', alignLeft = false, className }) {
  const all = allLabel ? [{ value: '', label: allLabel }, ...options] : options;
  const current = all.find((o) => o.value === value) || all[0];
  return (
    <Dropdown
      left={alignLeft}
      panelClassName="inv-select__panel"
      trigger={({ open, toggle }) => (
        <button type="button" className={cx('inv-select', open && 'inv-select--open', className)} onClick={toggle} aria-haspopup="menu" aria-expanded={open} aria-label={`${label}: ${current.label}`}>
          <span>{prefix}{current.label}</span>
          <ChevronDown size={16} />
        </button>
      )}
    >
      {({ close }) => all.map((o) => (
        <button
          key={o.value || '__all'}
          type="button"
          role="menuitemradio"
          aria-checked={o.value === current.value}
          className={cx('inv-select__opt', o.value === current.value && 'inv-select__opt--on')}
          onClick={() => { onChange(o.value); close(); }}
        >
          <span>{o.label}</span>
          {o.value === current.value && <Check size={14} />}
        </button>
      ))}
    </Dropdown>
  );
}
