import { useId } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { ROLE_META } from '../../data/people.js';
import { Avatar, StatusPill } from '../ui/index.js';
import { DEMO_USER_IDS } from './authUtils.js';

const ROLE_TONE = { cooperative: 'green', investor: 'blue', admin: 'purple', farmer: 'amber' };

// The five demo people from the seed data. One click signs in, no typing and no password.
export default function DemoAccounts({ onPick, busyId, heading = 'Demo accounts', note = true }) {
  const { data } = useApp();
  const titleId = useId();
  const users = data.users.filter((u) => DEMO_USER_IDS.includes(u.id));
  return (
    <section className="auth-demo" aria-labelledby={titleId}>
      <div className="auth-demo__head">
        <h2 className="auth-demo__title" id={titleId}>{heading}</h2>
        <span className="auth-tag">Demo only</span>
      </div>
      {note && (
        <p className="caption muted">
          This is a frontend-only demo with sample people. Choose one to sign in with a single click, or type its email and any password with 8 or more characters.
        </p>
      )}
      <ul className="auth-demo__list">
        {users.map((u) => (
          <li key={u.id}>
            <button type="button" className="auth-demo__item" onClick={() => onPick(u)} disabled={!!busyId} aria-label={`Sign in as ${u.name}, ${ROLE_META[u.role].label}`}>
              <Avatar name={u.name} size="sm" />
              <span className="auth-demo__who">
                <span className="strong small">{u.name}</span>
                <span className="caption muted">{u.email}</span>
              </span>
              <span className="auth-demo__role">
                {busyId === u.id ? <span className="spinner spinner--dark" aria-label="Signing in" /> : <StatusPill tone={ROLE_TONE[u.role]}>{ROLE_META[u.role].label}</StatusPill>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
