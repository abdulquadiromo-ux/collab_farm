import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, CalendarClock, Download, Printer, RotateCcw } from 'lucide-react';
import '../../styles/pages/shr.css';
import { useApp, useSimulatedLoad } from '../../context/AppContext.jsx';
import { Banner, Breadcrumb, Button, Card, FilterSelect, Modal, PageHeader, PageSkeleton, SelectField } from '../../components/ui/index.js';
import { BasisLegend, NotFoundRecord } from '../../components/shr/ShrBits.jsx';
import { ReportResult, csvColumns } from '../../components/shr/ReportView.jsx';
import { REPORT_FALLBACK_ICON, catalogueFor, makeCtx } from '../../components/shr/reportDefs.js';
import { baseFor, downloadFile, isoNow, mergeUserPrefs, toCsv, userPrefs } from '../../components/shr/shrUtils.js';
import { formatDateShort } from '../../utils/format.js';

const SUB = {
  cooperative: 'Budgets, allocations, milestones, harvest and obligations for your cooperative.',
  investor: 'Your commitments, disbursements, progress, risks and distributions.',
  admin: 'Platform wide reports for verification, funding, reconciliation and risk.',
};
const FREQ = ['Weekly', 'Monthly', 'Quarterly'];

export default function Reports() {
  const { data, user, role, audit, patchData, toast } = useApp();
  const loading = useSimulatedLoad(350);
  const [sp, setSp] = useSearchParams();
  const [scheduling, setScheduling] = useState(false);
  const [freq, setFreq] = useState('Monthly');

  const defs = catalogueFor(role);
  const reportId = sp.get('report') || '';
  const def = defs.find((d) => d.id === reportId);
  const params = { from: sp.get('from') || '', to: sp.get('to') || '', pkg: sp.get('pkg') || '', status: sp.get('status') || '' };
  const schedules = userPrefs(data, user.id).reportSchedules || {};

  const setParam = (key, value) => {
    const next = new URLSearchParams(sp);
    if (value) next.set(key, value); else next.delete(key);
    setSp(next, { replace: true });
  };
  const resetParams = () => setSp({ report: reportId }, { replace: true });

  const ctx = useMemo(() => makeCtx({ data, user, params }), [data, user, params.from, params.to, params.pkg, params.status]); // eslint-disable-line react-hooks/exhaustive-deps
  const result = useMemo(() => (def ? def.build(ctx) : null), [def, ctx]);
  const dateBad = params.from && params.to && params.from > params.to;

  const exportCsv = () => {
    if (!result) return;
    const ok = downloadFile(`${role}-${def.id}-report-${isoNow().slice(0, 10)}.csv`, toCsv(csvColumns(result.columns), result.rows), 'text/csv;charset=utf-8');
    if (ok) {
      audit({ action: 'Exported report', entityType: 'Report', entityId: def.id, reason: 'CSV export requested', summary: `${def.title}, ${result.rows.length} rows` });
      toast('CSV file created on your device');
    } else toast('Could not create the file in this browser', 'error');
  };

  const print = () => {
    const cls = 'shr-print-mode';
    const done = () => { document.body.classList.remove(cls); window.removeEventListener('afterprint', done); };
    document.body.classList.add(cls);
    window.addEventListener('afterprint', done);
    setTimeout(done, 15000);
    try { window.print(); } catch { done(); }
  };

  const saveSchedule = () => {
    patchData(mergeUserPrefs(user.id, { reportSchedules: { ...schedules, [def.id]: { frequency: freq, savedAt: isoNow() } } }));
    setScheduling(false);
    toast(`${def.title}: ${freq.toLowerCase()} schedule saved on this device. No email is sent in this demo.`, 'info');
  };
  const removeSchedule = () => {
    const { [def.id]: _gone, ...rest } = schedules;
    patchData(mergeUserPrefs(user.id, { reportSchedules: rest }));
    setScheduling(false);
    toast('Schedule removed', 'info');
  };

  if (loading) return <PageSkeleton />;

  if (reportId && !def) {
    return <NotFoundRecord title="We could not find that report" backTo={`${baseFor(role)}/reports`} backLabel="Back to reports">Choose a report from the list.</NotFoundRecord>;
  }

  // ---------- catalogue ----------
  if (!def) {
    return (
      <div className="page shr-page">
        <PageHeader title="Reports" subtitle={SUB[role]} />
        <Banner tone="info" title="Confirmed, estimate or user-submitted">
          Every figure in a report is labelled so you can tell confirmed financial data from estimates and from claims that have not been verified yet.
        </Banner>
        <BasisLegend />
        <div className="shr-tiles">
          {defs.map((d) => {
            const Icon = d.icon || REPORT_FALLBACK_ICON;
            const sch = schedules[d.id];
            return (
              <Link key={d.id} to={`?report=${d.id}`} className="shr-tile">
                <span className="shr-ico shr-ico--green"><Icon size={22} /></span>
                <span className="shr-tile__title">{d.title}</span>
                <span className="small muted">{d.desc}</span>
                <span className="shr-tile__foot">
                  {sch ? <span className="chip" style={{ background: 'var(--primary-50)', color: 'var(--primary-700)' }}><CalendarClock size={12} style={{ marginRight: 4 }} />{sch.frequency}</span> : <span />}
                  <span className="strong green">Open report <ArrowRight size={14} style={{ verticalAlign: '-2px' }} /></span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------- one report ----------
  const sch = schedules[def.id];
  return (
    <div className="page shr-page shr-report">
      <div className="shr-noprint">
        <Breadcrumb items={[{ label: 'Reports', to: '?' }, { label: def.title }]} />
      </div>
      <PageHeader
        title={def.title}
        subtitle={def.desc}
        actions={(
          <div className="shr-noprint row-wrap">
            <Button variant="outline" onClick={exportCsv} disabled={!result?.rows.length}><Download size={18} />Export CSV</Button>
            <Button variant="outline" onClick={print}><Printer size={18} />Print</Button>
            <Button variant="outline-green" onClick={() => { setFreq(sch?.frequency || 'Monthly'); setScheduling(true); }}><CalendarClock size={18} />{sch ? `Scheduled: ${sch.frequency}` : 'Schedule'}</Button>
          </div>
        )}
      />

      <p className="shr-print-only small">Prepared for {user.name} on {formatDateShort(new Date())}. {params.from || params.to ? `Period: ${params.from || 'start'} to ${params.to || 'today'}. ` : ''}Figures are labelled Confirmed, Estimate or User-submitted.</p>

      <Card className="shr-noprint">
        <div className="shr-params">
          <label className="shr-date"><span className="small strong">From</span><input type="date" className="input" value={params.from} max={params.to || undefined} onChange={(e) => setParam('from', e.target.value)} /></label>
          <label className="shr-date"><span className="small strong">To</span><input type="date" className="input" value={params.to} min={params.from || undefined} onChange={(e) => setParam('to', e.target.value)} /></label>
          {!def.noPkg && (
            <div className="shr-date">
              <span className="small strong">Package</span>
              <FilterSelect value={params.pkg} onChange={(v) => setParam('pkg', v)} allLabel="All packages" options={ctx.allPkgs.map((p) => ({ value: p.id, label: p.name }))} label="Package" />
            </div>
          )}
          {def.statuses && (
            <div className="shr-date">
              <span className="small strong">Status</span>
              <FilterSelect value={params.status} onChange={(v) => setParam('status', v)} allLabel="All statuses" options={def.statuses} label="Status" />
            </div>
          )}
          <Button variant="ghost" onClick={resetParams}><RotateCcw size={14} />Reset</Button>
        </div>
        {dateBad && <p className="field__error" role="alert" style={{ marginTop: 8 }}>The start date is after the end date. Choose a start date on or before the end date.</p>}
      </Card>

      <div className="shr-report-sheet">
        <ReportResult result={result} />
      </div>

      <Modal
        open={scheduling}
        onClose={() => setScheduling(false)}
        title={`Schedule: ${def.title}`}
        footer={(
          <>
            {sch ? <Button variant="danger-outline" onClick={removeSchedule} block>Remove schedule</Button> : <Button variant="outline" onClick={() => setScheduling(false)} block>Cancel</Button>}
            <Button onClick={saveSchedule} block>Save schedule</Button>
          </>
        )}
      >
        <div className="stack">
          <SelectField label="How often?" value={freq} onChange={(e) => setFreq(e.target.value)} options={FREQ} />
          <Banner tone="info">This saves a preference on this device only. In this demo no email is sent and no file is created automatically. Use Export CSV to get the report now.</Banner>
        </div>
      </Modal>
    </div>
  );
}
