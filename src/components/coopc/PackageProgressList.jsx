import { Link } from 'react-router-dom';
import { Progress, StatusPill, Stepper } from '../ui/index.js';
import { chainIndex, trancheShort } from './helpers.js';

// rows: [{ pkg, tranches, milestones }]. One row per package: milestones approved of total, then the T1 to T4 chain.
export default function PackageProgressList({ rows }) {
  return (
    <ul className="coopc-pp-list">
      {rows.map(({ pkg, tranches, milestones }) => {
        const approved = milestones.filter((m) => m.status === 'Approved').length;
        const total = milestones.length;
        const pct = total ? Math.round((approved / total) * 100) : 0;
        const allReleased = tranches.length > 0 && tranches.every((t) => t.status === 'Released');
        return (
          <li className="coopc-pp" key={pkg.id}>
            <div>
              <div className="row-wrap">
                <Link to={`/coop/funding/${pkg.id}`} className="strong">{pkg.name}</Link>
                <StatusPill>{pkg.status}</StatusPill>
              </div>
              <div className="cell-sub" style={{ margin: '6px 0 8px' }}>
                {total
                  ? `${approved} of ${total} milestones approved`
                  : allReleased ? 'All tranches released. No open milestones.' : 'No milestones set yet. They start once the package is funded.'}
              </div>
              {total > 0 && <Progress value={pct} label={`${pkg.name} milestones approved`} />}
            </div>
            <div>
              <div className="caption muted" style={{ marginBottom: 8 }}>Tranche chain (each stage opens after the one before it is released)</div>
              {tranches.length > 0 ? (
                <>
                  <Stepper steps={tranches.map(trancheShort)} current={chainIndex(tranches)} />
                  <div className="coopc-pp__chips">
                    {tranches.map((t) => (
                      <span className="coopc-pp__chip" key={t.id}>T{t.number}<StatusPill>{t.status}</StatusPill></span>
                    ))}
                  </div>
                </>
              ) : (
                <span className="muted small">No tranches yet.</span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
