import { Link } from 'react-router-dom';
import { cx } from '../../utils/format.js';

// variant: primary | outline | outline-green | soft | ghost | danger | danger-outline
export function Button({ variant = 'primary', size, block, round, icon, loading, className, children, type = 'button', ...rest }) {
  const cls = cx('btn', `btn--${variant}`, size && `btn--${size}`, block && 'btn--block', round && 'btn--round', icon && 'btn--icon', className);
  return (
    <button type={type} className={cls} disabled={loading || rest.disabled} {...rest}>
      {loading && <span className={cx('spinner', variant !== 'primary' && variant !== 'danger' && 'spinner--dark')} aria-hidden="true" />}
      {children}
    </button>
  );
}

export function LinkButton({ to, variant = 'primary', size, block, round, className, children, ...rest }) {
  const cls = cx('btn', `btn--${variant}`, size && `btn--${size}`, block && 'btn--block', round && 'btn--round', className);
  return (
    <Link to={to} className={cls} {...rest}>
      {children}
    </Link>
  );
}
