import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import { cx } from '../../utils/format.js';

// Round gold-to-green badge + serif wordmark + spaced "FINANCE".
export function Logo({ to = '/', size = 'md', light, className }) {
  const badge = size === 'sm' ? 30 : 38;
  const inner = (
    <span className={cx('row', className)} style={{ gap: 10 }}>
      <span style={{ width: badge, height: badge, borderRadius: '50%', background: 'linear-gradient(135deg, #d4af36 0%, #305d41 70%)', display: 'grid', placeItems: 'center', color: '#fff', flex: 'none' }}>
        <Users size={badge * 0.5} />
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: size === 'sm' ? 18 : 21, color: light ? '#fff' : 'var(--primary-500)' }}>CollabFarm</span>
        <span style={{ fontSize: 8, letterSpacing: '0.55em', marginTop: 5, color: light ? 'rgba(255,255,255,.8)' : 'var(--grey-800)' }}>FINANCE</span>
      </span>
    </span>
  );
  return to ? <Link to={to} aria-label="CollabFarm Finance home" style={{ textDecoration: 'none' }}>{inner}</Link> : inner;
}
