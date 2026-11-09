import { cx } from '../../utils/format.js';

// Serif page title with a short plain subtitle, as in the Figma authentication frames.
export default function AuthHeading({ title, subtitle, className, id }) {
  return (
    <header className={cx('auth-head', className)}>
      <h1 className="auth__title" id={id}>{title}</h1>
      {subtitle && <p className="auth-sub">{subtitle}</p>}
    </header>
  );
}
