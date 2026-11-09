import { useCallback, useEffect, useRef, useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { cx } from '../../utils/format.js';

// Row actions menu for tables. The shared table wrapper scrolls sideways, which also clips an absolutely
// positioned menu on the last rows. This menu is placed with fixed coordinates, so it is never clipped.
// items: [{ label, icon, onClick, danger? }]
export default function RowMenu({ items, label = 'Row actions' }) {
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const openedAt = useRef(0);
  const close = useCallback(() => setPos(null), []);

  const toggle = (e) => {
    e.stopPropagation();
    if (pos) { close(); return; }
    const r = btnRef.current.getBoundingClientRect();
    openedAt.current = Date.now();
    const height = items.length * 44 + 20;
    const up = r.bottom + height + 8 > window.innerHeight && r.top > height + 8;
    setPos({
      right: Math.max(8, window.innerWidth - r.right),
      top: up ? 'auto' : r.bottom + 8,
      bottom: up ? window.innerHeight - r.top + 8 : 'auto',
    });
  };

  useEffect(() => {
    if (!pos) return undefined;
    const onDown = (e) => {
      if (panelRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return;
      close();
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    // A scroll that was already under way when the menu opened (for example scroll into view) should not close it.
    const onScroll = () => { if (Date.now() - openedAt.current > 300) close(); };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', close);
    };
  }, [pos, close]);

  return (
    <>
      <button ref={btnRef} type="button" className="kebab" onClick={toggle} aria-label={label} aria-haspopup="menu" aria-expanded={!!pos}>
        <MoreVertical size={18} />
      </button>
      {pos && (
        <div
          ref={panelRef} className="dropdown__panel" role="menu"
          style={{ position: 'fixed', left: 'auto', right: pos.right, top: pos.top, bottom: pos.bottom }}
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((it) => (
            <button
              key={it.label} type="button" role="menuitem" className={cx('dropdown__item', it.danger && 'dropdown__item--danger')}
              onClick={() => { close(); it.onClick?.(); }}
            >
              {it.icon}{it.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
