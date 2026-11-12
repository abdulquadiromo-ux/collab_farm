import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Pencil, Landmark, ClipboardCheck, Plus, Trash2 } from 'lucide-react';
import { Avatar, Button, Card, SectionHead, TextField, SelectField, TextAreaField, MoneyField, Field, Checkbox, InfoList, Banner } from '../ui/index.js';
import { formatNaira, formatDate, cx } from '../../utils/format.js';
import { TIERS, ALL_CATEGORIES } from './constants.jsx';
import { monthsBetween } from './logic.js';
import { PlainTerms, ReconPanel, FundingPlanTable, ThreeRules } from './Common.jsx';
import BudgetEditor from './BudgetEditor.jsx';

const inputProps = (form, set, key) => ({ value: form[key], onChange: (e) => set(key, e.target.value) });

export function BasicsStep({ form, set, errors, farmers = [], packageId }) {
  const [openFarmerRow, setOpenFarmerRow] = useState(null);
  const months = monthsBetween(form.startDate, form.endDate);
  return (
    <Card tone="green">
      <SectionHead icon="1" title="Package Basics" />
      <div className="form-grid">
        <TextField label="Package Name" required placeholder="For example, Maize Growth Package" maxLength={80} {...inputProps(form, set, 'name')} error={errors.name} />
        <SelectField label="Package Type" required options={TIERS} {...inputProps(form, set, 'tier')} error={errors.tier} hint="Choose a package type supported by the platform." />
        <SelectField label="Category" required placeholder="Choose a category" options={ALL_CATEGORIES} {...inputProps(form, set, 'category')} error={errors.category} />
        <TextField label="Tenure (months)" required type="number" min={1} max={36} placeholder="4" {...inputProps(form, set, 'tenureMonths')} error={errors.tenureMonths} hint="How long the farming cycle lasts, from start to final settlement." />
        <TextAreaField className="full" label="Short Description" required placeholder="What will this package fund, and who benefits?" {...inputProps(form, set, 'description')} error={errors.description} />
        <div className="full">
          <Field label="Farmers" error={errors.farmers} hint="Choose farmers to include, then enter how much to invest in each one.">
            {() => (
              <div className="stack-sm">
                {(form.farmers.length ? form.farmers : [{ farmerId: '', allocatedAmount: '' }]).map((allocation, index) => {
                  const selectedIds = form.farmers.map((f) => f.farmerId).filter(Boolean);
                  const selectedFarmer = farmers.find((f) => f.id === allocation.farmerId);
                  return (
                    <div key={`${allocation.farmerId || 'farmer'}-${index}`} className="form-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', alignItems: 'end', gap: 16 }}>
                      <div className="field" style={{ position: 'relative' }}>
                        <span className="field__label">Farmer</span>
                        <button type="button" className="input" aria-label="Choose a farmer" aria-expanded={openFarmerRow === index} onClick={() => setOpenFarmerRow(openFarmerRow === index ? null : index)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left', minHeight: 48 }}>
                          {selectedFarmer ? <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar name={selectedFarmer.name} size="sm" /><span><span style={{ display: 'block' }}>{selectedFarmer.name}</span><span className="cell-sub">{selectedFarmer.farmingCategory || selectedFarmer.cropType || 'Category not set'}</span></span></span> : <span className="muted">Choose a farmer</span>}
                          <span aria-hidden="true">▾</span>
                        </button>
                        {openFarmerRow === index && <div role="listbox" aria-label="Farmers" style={{ position: 'absolute', zIndex: 20, top: '100%', left: 0, right: 0, maxHeight: 260, overflowY: 'auto', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.12)' }}>
                          {farmers.filter((farmer) => farmer.id === allocation.farmerId || !selectedIds.includes(farmer.id)).map((farmer) => (
                            <button key={farmer.id} type="button" role="option" aria-selected={farmer.id === allocation.farmerId} disabled={!!farmer.allocationPackageId && farmer.allocationPackageId !== packageId} onClick={() => {
                              const updated = [...form.farmers];
                              if (!updated.length) updated.push({ farmerId: '', allocatedAmount: '' });
                              updated[index] = { ...updated[index], farmerId: farmer.id };
                              set('farmers', updated);
                              setOpenFarmerRow(null);
                            }} style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 10, padding: '10px 12px', border: 0, background: 'transparent', textAlign: 'left', cursor: 'pointer' }}>
                              <Avatar name={farmer.name} size="sm" />
                              <span><span style={{ display: 'block' }}>{farmer.name}</span><span className="cell-sub">{farmer.farmingCategory || farmer.cropType || 'Category not set'}</span></span>
                            </button>
                          ))}
                          {farmers.length === 0 && <div className="muted small" style={{ padding: 12 }}>No farmers available.</div>}
                        </div>}
                      </div>
                      <label className="field">
                        <span className="field__label">Amount to invest</span>
                        <input className={cx('input', errors[`farmer:${allocation.farmerId}:amount`] && 'input--error')} aria-invalid={Boolean(errors[`farmer:${allocation.farmerId}:amount`])} aria-label={`Investment amount for ${selectedFarmer?.name || 'farmer'}`} type="number" min="1" placeholder="Enter amount" value={allocation.allocatedAmount} onChange={(e) => {
                          const updated = [...form.farmers];
                          if (!updated.length) updated.push({ farmerId: '', allocatedAmount: '' });
                          updated[index] = { ...updated[index], allocatedAmount: e.target.value };
                          set('farmers', updated);
                        }} />
                        {errors[`farmer:${allocation.farmerId}:amount`] && <span className="field__error">{errors[`farmer:${allocation.farmerId}:amount`]}</span>}
                      </label>
                      {form.farmers.length > 0 && <Button variant="danger-outline" size="sm" onClick={() => set('farmers', form.farmers.filter((_, i) => i !== index))} style={{ gridColumn: '1 / -1', justifySelf: 'end' }}><Trash2 size={15} />Remove farmer</Button>}
                    </div>
                  );
                })}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Button variant="outline-green" size="sm" onClick={() => set('farmers', [...form.farmers, { farmerId: '', allocatedAmount: '' }])}><Plus size={16} />Add farmer</Button></div>
              </div>
            )}
          </Field>
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
        <MoneyField label="Total Package Amount" required value={form.amount} onChange={(v) => set('amount', v)} error={errors.amount} hint="In Nigerian naira. The budget and farmer allocations must add up to this amount." />
          <TextField label="Expected Duration" readOnly value={duration} placeholder="Set in Package Basics" hint={months ? 'Taken from your tenure and dates in Package Basics.' : 'Taken from the tenure in Package Basics.'} />
          <TextField label="Expected ROI (estimate, %)" required type="number" step="0.1" min={0} max={100} placeholder="18" {...inputProps(form, set, 'expectedRoiPct')} error={errors.expectedRoiPct} hint="An estimate inside your range from Package Basics. Not a promise." />
          <TextField label="Cooperative Share (%)" required type="number" step="0.1" min={0} max={100} {...inputProps(form, set, 'coopSharePct')} error={errors.coopSharePct} hint="The part of the profit your cooperative keeps." />
        </div>
        <div className="mt-4"><PlainTerms terms={['roi', 'coopShare']} /></div>
      </Card>

      <Card tone="green">
        <SectionHead icon={<ClipboardCheck size={18} />} title="What's Included?" />
        <p className="muted small" style={{ marginBottom: 16 }}>List what the package includes and the amount for each item.</p>
        <BudgetEditor items={form.budget} onChange={setBudget} errors={errors} onClearError={clearError} />
        <div className="mt-4"><ReconPanel budget={form.budget} amount={form.amount} /></div>
        <div className="mt-4"><PlainTerms terms={['reconciliation']} /></div>
      </Card>

      <Card tone="green">
        <SectionHead icon={<Landmark size={18} />} title="Funding plan" />
        <p className="muted small" style={{ marginBottom: 16 }}>Your package amount is released in four stages. The shares are set by the platform and cannot be changed for a single package. Money is released after evidence is approved, never on request alone.</p>
        <FundingPlanTable amount={form.amount} category={form.category} />
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
      {!item.ok && item.id === 'verified' && <Link to="/onboarding/cooperative" className="small strong">Review profile</Link>}
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

export function ReviewStep({ form, checklist, confirmed, setConfirmed, confirmError, goTo, existingStatus, reviewerNotes }) {
  const total = form.budget.reduce((s, b) => s + (Number(b.amount) || 0), 0);
  const blockers = checklist.filter((c) => !c.ok);
  return (
    <div className="stack-lg">
      {reviewerNotes && <Banner tone="warn" title="Changes requested by the reviewer">{reviewerNotes}</Banner>}
      <Card tone="green">
        <SectionHead icon="3" title="Review and submit" />
        <p className="muted small" style={{ marginBottom: 16 }}>Check everything below. After you submit, a CollabFarm reviewer checks the package details. You cannot edit the package while it is under review.</p>
        <ul className="coopb-checklist" aria-label="Submission checklist">
          {checklist.map((c) => <CheckRow key={c.id} item={c} onFix={goTo} />)}
        </ul>
        {blockers.length > 0 && <div className="mt-4"><Banner tone="warn" title="Not ready to submit">Fix the items marked above. You can still save this package as a draft and return later.</Banner></div>}
      </Card>

      <div className="grid-2">
        <SummaryCard title="Package" onEdit={() => goTo(0)}>
          <InfoList compact items={[
            ['Name', form.name || '-'], ['Package type', form.tier || '-'], ['Category', form.category || '-'],
            ['Farming dates', form.startDate && form.endDate ? `${formatDate(form.startDate)} to ${formatDate(form.endDate)}` : '-'],
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

      <SummaryCard title="Budget (What's Included)" onEdit={() => goTo(1)}>
        <div className="table-wrap">
          <table className="data-table" style={{ minWidth: 560 }}>
            <thead><tr><th>What's included</th><th className="right">Amount</th></tr></thead>
            <tbody>
              {form.budget.map((b) => (
                <tr key={b.id}>
                  <td>{b.description || '-'}</td><td className="right nowrap">{formatNaira(b.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td className="strong">Budget total</td><td className="right strong nowrap">{formatNaira(total)}</td></tr></tfoot>
          </table>
        </div>
        <div className="mt-4"><ReconPanel budget={form.budget} amount={form.amount} /></div>
      </SummaryCard>

      <SummaryCard title="Funding plan" onEdit={() => goTo(1)}>
        <FundingPlanTable amount={form.amount} category={form.category} />
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
