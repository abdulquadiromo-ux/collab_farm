import { CalendarDays, ChevronRight, MapPin, Users } from 'lucide-react';
import { LinkButton } from '../ui/Button.jsx';
import { Progress } from '../ui/index.js';
import { formatNaira, formatDateShort } from '../../utils/format.js';
import { packageFunding } from '../../utils/rules.js';
import { CategoryChip, PkgStatusChip } from './Common.jsx';
import { daysLeft, isClosed } from './invData.js';

// Card from the Figma "Investor Packages" grid (7546:18197).
export function PackageCard({ pkg, coop }) {
  const f = packageFunding(pkg);
  const open = pkg.status === 'Open for Funding' && !isClosed(pkg);
  const left = daysLeft(pkg);
  return (
    <article className="inv-pkg-card" aria-label={pkg.name}>
      <div className="row between">
        <CategoryChip category={pkg.category} />
        <PkgStatusChip status={pkg.status} />
      </div>
      <div>
        <h3 className="inv-pkg-card__title">{pkg.name}</h3>
        {coop && <div className="caption muted">by {coop.name}</div>}
      </div>
      <p className="small muted inv-clamp-2">{pkg.description}</p>
      <div>
        <div className="inv-pkg-card__amount">{formatNaira(pkg.amount)}</div>
        <div className="caption muted">Package Amount</div>
      </div>
      <div className="stack-sm">
        <div className="caption strong">{f.pct}% Funded</div>
        <Progress value={f.pct} label={`${pkg.name} is ${f.pct} percent funded`} />
        <div className="caption muted"><span className="inv-green strong">{formatNaira(pkg.raised)}</span> raised of {formatNaira(pkg.amount)}</div>
        {f.awaitingConfirmation > 0 && <div className="caption muted">{formatNaira(f.awaitingConfirmation)} committed, waiting for partner confirmation</div>}
      </div>
      <ul className="inv-meta">
        <li><Users size={16} />{pkg.farmersCount} farmers using this package</li>
        <li><MapPin size={16} />{pkg.regions}</li>
        <li><CalendarDays size={16} />Closing date: {formatDateShort(pkg.closingDate)}{open && left != null && left >= 0 ? ` (${left} day${left === 1 ? '' : 's'} left)` : ''}</li>
      </ul>
      <LinkButton to={`/investor/packages/${pkg.id}`} variant="outline-green" block className="inv-pkg-card__btn">View Package<ChevronRight size={16} /></LinkButton>
    </article>
  );
}
