import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';

export default function NotFound() {
  const { user, roleMeta } = useApp();
  return (
    <div className="container" style={{ padding: '96px 24px', textAlign: 'center' }}>
      <p className="small muted strong">Error 404</p>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 44, margin: '8px 0 12px' }}>We could not find that page</h1>
      <p className="muted" style={{ maxWidth: 480, margin: '0 auto 24px' }}>The link may be old, or the record may not exist in this demo. Use the buttons below to get back on track.</p>
      <div className="row" style={{ justifyContent: 'center' }}>
        <Link className="btn btn--primary" to="/">Go to home</Link>
        {user && <Link className="btn btn--outline" to={roleMeta.base}>Go to my dashboard</Link>}
      </div>
    </div>
  );
}
