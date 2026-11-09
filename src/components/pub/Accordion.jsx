import { useId, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cx } from '../../utils/format.js';

/**
 * Accessible accordion. `items`: [{ id, title, body }] where `title` and `body` are React nodes.
 * `open` is a Set of open ids and `onToggle(id)` flips one. Arrow keys, Home and End move between headers.
 */
export function Accordion({ items, open, onToggle }) {
  const base = useId();
  const refs = useRef([]);
  const focusAt = (i) => refs.current[(i + items.length) % items.length]?.focus();

  const onKeyDown = (e, i) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); focusAt(i + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); focusAt(i - 1); }
    else if (e.key === 'Home') { e.preventDefault(); focusAt(0); }
    else if (e.key === 'End') { e.preventDefault(); focusAt(items.length - 1); }
  };

  return (
    <div className="pub-acc">
      {items.map((it, i) => {
        const isOpen = open.has(it.id);
        const hid = `${base}-h-${it.id}`;
        const pid = `${base}-p-${it.id}`;
        return (
          <div key={it.id} className={cx('pub-acc__item', isOpen && 'pub-acc__item--open')}>
            <h3 className="pub-acc__h">
              <button
                ref={(el) => { refs.current[i] = el; }}
                type="button"
                id={hid}
                className="pub-acc__btn"
                aria-expanded={isOpen}
                aria-controls={pid}
                onClick={() => onToggle(it.id)}
                onKeyDown={(e) => onKeyDown(e, i)}
              >
                <span>{it.title}</span>
                <ChevronDown size={20} className="pub-acc__chev" aria-hidden="true" />
              </button>
            </h3>
            <div id={pid} role="region" aria-labelledby={hid} hidden={!isOpen} className="pub-acc__panel">
              {it.body}
            </div>
          </div>
        );
      })}
    </div>
  );
}
