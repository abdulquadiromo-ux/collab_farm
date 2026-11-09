import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MoreVertical } from 'lucide-react';
import { cx } from '../../utils/format.js';

// Generic popover. `trigger({open, toggle})` renders the button. `children({close})` renders the panel body.
export function Dropdown({ trigger, children, left, panelClassName }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const ref = useRef(null);
  const panelRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  // The panel is fixed to the viewport so scrolling table wrappers (overflow auto) never clip it.
  // It flips above the trigger when there is no room below and stays inside the screen edges.
  useLayoutEffect(() => {
    if (!open || !ref.current) { setPos(null); return undefined; }
    const place = () => {
      const r = ref.current.getBoundingClientRect();
      const h = panelRef.current?.offsetHeight || 0;
      const w = panelRef.current?.offsetWidth || 220;
      const below = r.bottom + 8;
      const flip = below + h > window.innerHeight - 8 && r.top - 8 - h > 8;
      const top = flip ? r.top - 8 - h : Math.max(8, Math.min(below, window.innerHeight - h - 8));
      const wanted = left ? r.left : r.right - w;
      setPos({ top, left: Math.max(8, Math.min(wanted, window.innerWidth - w - 8)) });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open, left]);

  const style = pos ? { position: 'fixed', top: pos.top, left: pos.left, right: 'auto' } : { visibility: 'hidden' };
  return (
    <div className="dropdown" ref={ref}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && <div ref={panelRef} style={style} className={cx('dropdown__panel', left && 'dropdown__panel--left', panelClassName)} role="menu">{children({ close: () => setOpen(false) })}</div>}
    </div>
  );
}

// items: [{ label, icon, onClick?, to?, danger? }]
export function KebabMenu({ items, label = 'Row actions' }) {
  return (
    <Dropdown trigger={({ toggle }) => <button type="button" className="kebab" onClick={(e) => { e.stopPropagation(); toggle(); }} aria-label={label} aria-haspopup="menu"><MoreVertical size={18} /></button>}>
      {({ close }) => items.map((it) => (it.to ? (
        <Link key={it.label} to={it.to} className={cx('dropdown__item', it.danger && 'dropdown__item--danger')} role="menuitem" onClick={close}>{it.icon}{it.label}</Link>
      ) : (
        <button key={it.label} type="button" role="menuitem" className={cx('dropdown__item', it.danger && 'dropdown__item--danger')} onClick={(e) => { e.stopPropagation(); close(); it.onClick?.(); }}>{it.icon}{it.label}</button>
      )))}
    </Dropdown>
  );
}
