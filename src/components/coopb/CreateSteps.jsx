import { Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Pencil, Landmark, ClipboardCheck } from 'lucide-react';
import { Card, SectionHead, TextField, SelectField, TextAreaField, MoneyField, Field, Checkbox, InfoList, Banner, StatusPill } from '../ui/index.js';
import { formatNaira, formatDate, cx } from '../../utils/format.js';
import { TIERS, ALL_CATEGORIES, SEASONS } from './constants.jsx';
import { monthsBetween, regionsFor } from './logic.js';
import { PlainTerms, ReconPanel, FundingPlanTable, ThreeRules } from './Common.jsx';
import BudgetEditor from './BudgetEditor.jsx';

const inputProps = (form, set, key) => ({ value: form[key], onChange: (e) => set(key, e.target.value) });

export function BasicsStep({ form, set, errors, farms }) {
  const toggleFarm = (id) => set('farmIds', form.farmIds.includes(id) ? form.farmIds.filter((x) => x !== id) : [...form.farmIds, id]);
  const months = monthsBetween(form.startDate, form.endDate);
  const regions = regionsFor(form.farmIds, farms);
  return (
    <Card tone="green">
      <SectionHead icon="1" title="Package Basics" />
      <div className="form-grid">
        <TextField label="Package Name" required placeholder="For example, Maize Growth Package" maxLength={80} {...inputProps(form, set, 'name')} error={errors.name} />
        <SelectField label="Package Type" required options={TIERS} {...inputProps(form, set, 'tier')} error={errors.tier} hint="Starter, Growth and Commercial follow the standard templates. Custom is your own design." />
        <SelectField label="Category" required placeholder="Choose a category" options={ALL_CATEGORIES} {...inputProps(form, set, 'category')} error={errors.category} />
        <TextField label="Tenure (months)" required type="number" min={1} max={36} placeholder="4" {...inputProps(form, set, 'tenureMonths')} error={errors.tenureMonths} hint="How long the farming cycle lasts, from start to final settlement." />
        <TextAreaField className="full" label="Short Description" required placeholder="What will this package fund, and who benefits?" {...inputProps(form, set, 'description')} error={errors.description} />
        <TextField label="Crop or activity" required placeholder="For example, Maize, Catfish, Broilers" {...inputProps(form, set, 'crop')} error={errors.crop} />
        <SelectField label="Season" required placeholder="Choose a season" options={SEASONS} {...inputProps(form, set, 'season')} error={errors.season} />

        <div className="full">
          <Field label="Farm locations" required error={errors.farmIds} hint="Choose from the farms registered by your cooperative. Investors see only the area, never exact addresses.">
            {() => (
              <div className="coopb-farms" role="group" aria-label="Farm locations">
                {farms.length === 0 && <p className="muted small">Your cooperative has no farms yet. Add one under Farms and Plots first.</p>}
                {farms.map((f) => {
                  const off = f.status !== 'Active';
                  return (
                    <label key={f.id} className={cx('coopb-farm', form.farmIds.includes(f.id) && 'coopb-farm--on', off && 'coopb-farm--off')}>
                      <input type="checkbox" checked={form.farmIds.includes(f.id)} disabled={off && !form.farmIds.includes(f.id)} onChange={() => toggleFarm(f.id)} />
                      <span>
                        <span className="strong small">{f.name}</span>
                        <span className="cell-sub">{f.location} . {f.areaHa} ha . {f.crop}</span>
                        <span className="caption muted">Land access: {f.landAccess}{off ? ' . Inactive farm' : ''}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </Field>
          {regions && <p className="small muted" style={{ marginTop: 8 }}>Regions covered: <strong>{regions}</strong></p>}
        </div>

        <TextField label="Start Date" required type="date" {...inputProps(form, set, 'startDate')} error={errors.startDate} />
        <TextField label="End Date" required type="date" {...inputProps(form, set, 'endDate')} error={errors.endDate} hint={months ? `About ${months} month${months === 1 ? '' : 's'} of farming.` : undefined} />
        <TextField label="Funding closes on" required type="date" {...inputProps(form, set, 'closingDate')} error={errors.closingDate} hint="Investors can commit until this date. It must not be after the start date." />
        <MoneyField label="Minimum funding target" required value={form.minTarget} onChange={(v) => set('minTarget', v)} error={errors.minTarget} hint="The least amount that must be raised for the project to go ahead." />
        <MoneyField label="Minimum investment" required value={form.minInvestment} onChange={(v) => set('minInvestment', v)} error={errors.minInvestment} hint="Smallest amount one investor may commit." />
        <MoneyField label="Maximum investment" required value={form.maxInvestment} onChange={(v) => set('maxInvestment', v)} error={errors.maxInvestment} hint="Largest amount one investor may commit." />
        <TextField className="full" label="Expected harvest or output" required placeholder="For example, About 40 tonnes of yam tubers" {...inputProps(form, set, 'expectedOutput')} error={errors.expectedOutput} />

        <div className="full">
          <Field label="Expected return range (estimate)" required error={errors.returnLow || errors.returnHigh} hint="An estimate of what investors might earn. It depends on yield, weather and prices, and is never a promise.">
            {({ id, invalid }) => (
              <div className="coopb-range">
                <input id={id} type="number" step="0.1" min={0} max={100} className={cx('input', invalid && 'input--error')} aria-label="Lower estimate in percent" placeholder="12" value={form.returnLow} onChange={(e) => set('returnLow', e.target.value)} />
                <span className="muted">% to</span>
                <input type="number" step="0.1" min={0} max={100} className={cx('input', invalid && 'input--error')} aria-label="Upper estimate in percent" placeholder="20" value={form.returnHigh} onChange={(e) => set('returnHigh', e.target.value)} />
                <span className="muted">%</span>
              </div>
            )}
          </Field>
        </div>
      </div>
    </Card>
  );
}

export function DetailsStep({ form, set, errors, setBudget, clearError }) {
  const months = monthsBetween(form.startDate, form.endDate);
  const duration = form.tenureMonths
    ? `${form.tenureMonths} month${Number(form.tenureMonths) === 1 ? '' : 's'}${form.startDate && form.endDate ? ` (${formatDate(form.startDate)} to ${formatDate(form.endDate)})` : ''}`
    : '';
  return (
    <div className="stack-lg">
      <Card tone="green">
        <SectionHead icon="2" title="Funding Details" />
        <div className="form-grid">
          <MoneyField label="Total Package Amount" required value={form.amount} onChange={(v) => set('amount', v)} error={errors.amount} hint="In Nigerian naira. The budget below must add up to this amount." />
          <TextField label="Expected Duration" readOnly value={duration} placeholder="Set in Package Basics" hint={months ? 'Taken from your tenure and dates in Package Basics.' : 'Taken from the tenure in Package Basics.'} />
          <TextField label="Expected ROI (estimate, %)" required type="number" step="0.1" min={0} max={100} placeholder="18" {...inputProps(form, set, 'expectedRoiPct')} error={errors.expectedRoiPct} hint="An estimate inside your range from Package Basics. Not a promise." />
          <TextField label="Cooperative Share (%)" required type="number" step="0.1" min={0} max={50} {...inputProps(form, set, 'coopSharePct')} error={errors.coopSharePct} hint="The part of the profit your cooperative keeps." />
          <TextAreaField className="full" optional label="Main risks and how you will reduce them" placeholder="One risk per line, for example: Drought may reduce yield. We will plant drought tolerant seed." {...inputProps(form, set, 'risks')} hint="Investors read this before they commit. Be honest about what can go wrong." />
        </div>
        <div className="mt-4"><PlainTerms terms={['roi', 'coopShare']} /></div>
      </Card>

      <Card tone="green">
        <SectionHead icon={<ClipboardCheck size={18} />} title="What's Included?" />
        <p className="muted small" style={{ marginBottom: 16 }}>List every item the money will pay for. Each item needs a budget category, an amount, the person responsible and a supporting document such as a supplier quotation.</p>
        <BudgetEditor items={form.budget} onChange={setBudget} errors={errors} onClearError={clearError} />
        <div className="mt-4"><ReconPanel budget={form.budget} amount={form.amount} /></div>
        <div className="mt-4"><PlainTerms terms={['reconciliation']} /></div>
      </Card>

      <Card tone="green">
        <SectionHead icon={<Landmark size={18} />} title="Funding plan" />
        <p className="muted small" style={{ marginBottom: 16 }}>Your package amount is released in four stages. The shares are set by the platform and cannot be changed for a single package. Money is released after evidence is approved, never on request alone.</p>
        <FundingPlanTable amount={form.amount} />
        <div className="mt-4"><PlainTerms terms={['tranche']} /></div>
      </Card>
    </div>
  );
}

function CheckRow({ item, onFix }) {
  return (
    <li className={cx('coopb-check', item.ok ? 'coopb-check--ok' : 'coopb-check--bad')}>
      {item.ok ? <CheckCircle2 size={22} /> : <AlertCircle size={22} />}
      <div className="grow">
        <div className="strong small">{item.label}</div>
        {!item.ok && item.detail && <div className="caption">{item.detail}</div>}
      </div>
      {!item.ok && item.step != null && <button type="button" className="link-btn small" onClick={() => onFix(item.step)}>Fix this</button>}
      {!item.ok && item.id === 'verified' && <Link to="/onboarding/status" className="small strong">View status</Link>}
    </li>
  );
}

function SummaryCard({ title, onEdit, children }) {
  return (
    <Card>
      <div className="card__head">
        <h2 className="card__title strong">{title}</h2>
        {onEdit && <button type="button" className="btn btn--ghost btn--sm" onClick={onEdit} aria-label={`Edit ${title}`}><Pencil size={14} />Edit</button>}
      </div>
      {children}
    </Card>
  );
}

export function ReviewStep({ form, farms, checklist, confirmed, setConfirmed, confirmError, goTo, existingStatus, reviewerNotes }) {
  const chosen = farms.filter((f) => form.farmIds.includes(f.id));
  const total = form.budget.reduce((s, b) => s + (Number(b.amount) || 0), 0);
  const blockers = checklist.filter((c) => !c.ok);
  return (
    <div className="stack-lg">
      {reviewerNotes && <Banner tone="warn" title="Changes requested by the reviewer">{reviewerNotes}</Banner>}
      <Card tone="green">
        <SectionHead icon="3" title="Review and submit" />
        <p className="muted small" style={{ marginBottom: 16 }}>Check everything below. After you submit, a CollabFarm reviewer checks the budget and documents. You cannot edit the package while it is under review.</p>
        <ul className="coopb-checklist" aria-label="Submission checklist">
          {checklist.map((c) => <CheckRow key={c.id} item={c} onFix={goTo} />)}
        </ul>
        {blockers.length > 0 && <div className="mt-4"><Banner tone="warn" title="Not ready to submit">Fix the items marked above. You can still save this package as a draft and return later.</Banner></div>}
      </Card>

      <div className="grid-2">
        <SummaryCard title="Package" onEdit={() => goTo(0)}>
          <InfoList compact items={[
            ['Name', form.name || '-'], ['Package type', form.tier || '-'], ['Category', form.category || '-'], ['Crop or activity', form.crop || '-'],
            ['Season', form.season || '-'], ['Farming dates', form.startDate && form.endDate ? `${formatDate(form.startDate)} to ${formatDate(form.endDate)}` : '-'],
            ['Tenure', form.tenureMonths ? `${form.tenureMonths} months` : '-'], ['Description', form.description || '-'],
          ]} />
        </SummaryCard>
        <SummaryCard title="Funding" onEdit={() => goTo(1)}>
          <InfoList compact items={[
            ['Package amount', formatNaira(form.amount)], ['Minimum funding target', formatNaira(form.minTarget)], ['Funding closes', form.closingDate ? formatDate(form.closingDate) : '-'],
            ['Investment per investor', `${formatNaira(form.minInvestment)} to ${formatNaira(form.maxInvestment)}`],
            ['Expected return range', form.returnLow !== '' && form.returnHigh !== '' ? `${form.returnLow}% to ${form.returnHigh}% (estimate, not a promise)` : '-'],
            ['Expected ROI estimate', form.expectedRoiPct !== '' ? `${form.expectedRoiPct}% (estimate)` : '-'], ['Cooperative share', `${form.coopSharePct}%`], ['Expected output', form.expectedOutput || '-'],
          ]} />
        </SummaryCard>
      </div>

      <SummaryCard title="Farm locations" onEdit={() => goTo(0)}>
        {chosen.length === 0 ? <p className="muted small">No farm selected yet.</p> : (
          <ul className="coopb-plain-list">{chosen.map((f) => <li key={f.id}><span className="strong">{f.name}</span> <span className="muted">{f.location}, {f.areaHa} ha, {f.crop}</span></li>)}</ul>
        )}
      </SummaryCard>

      <SummaryCard title="Budget (What's Included)" onEdit={() => goTo(1)}>
        <div className="table-wrap">
          <table className="data-table" style={{ minWidth: 560 }}>
            <thead><tr><th>Category</th><th>Item</th><th>Responsible</th><th>Document</th><th className="right">Amount</th></tr></thead>
            <tbody>
              {form.budget.map((b) => (
                <tr key={b.id}>
                  <td>{b.category || '-'}</td><td>{b.description || '-'}</td><td>{b.responsible || '-'}</td>
                  <td>{b.files?.length ? <span className="green strong small">{b.files[0].name}</span> : <StatusPill tone="amber">Missing</StatusPill>}</td>
                  <td className="right nowrap">{formatNaira(b.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td colSpan={4} className="strong">Budget total</td><td className="right strong nowrap">{formatNaira(total)}</td></tr></tfoot>
          </table>
        </div>
        <div className="mt-4"><ReconPanel budget={form.budget} amount={form.amount} /></div>
      </SummaryCard>

      <SummaryCard title="Funding plan" onEdit={() => goTo(1)}>
        <FundingPlanTable amount={form.amount} />
      </SummaryCard>

      <SummaryCard title="Risks" onEdit={() => goTo(1)}>
        {form.risks.trim() ? <ul className="coopb-plain-list">{form.risks.split('\n').filter((l) => l.trim()).map((l) => <li key={l}>{l}</li>)}</ul> : <p className="muted small">No risks listed. The standard platform risk disclosures will still be shown to investors.</p>}
      </SummaryCard>

      <ThreeRules />

      <Card tone="green">
        <Checkbox checked={confirmed} onChange={setConfirmed} error={confirmError}>
          I confirm that the information in this request is accurate. I understand that approval is not a guarantee of funding or returns, that expected returns are estimates, and that money is released in stages only after evidence is approved.
        </Checkbox>
        {existingStatus === 'Changes Requested' && <p className="caption muted" style={{ marginTop: 10 }}>This request will go back to the same reviewer.</p>}
      </Card>
    </div>
  );
}
