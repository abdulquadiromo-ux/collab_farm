import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FileText } from 'lucide-react';
import '../../styles/pages/shr.css';
import { useApp } from '../../context/AppContext.jsx';
import { Banner, Breadcrumb, Card, CardHeader, InfoList, PageHeader, StatusPill, PageSkeleton } from '../../components/ui/index.js';
import { CommentBox, STATUS_HELP, StatusTrack } from '../../components/shr/ComplaintPanels.jsx';
import { baseFor, whenLabel } from '../../components/shr/shrUtils.js';
import { API_BASE_URL, apiErrorMessage } from '../../utils/api.js';

const display = (value) => String(value || '—').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const roleLabel = (value) => display(value);
const messageText = (item) => typeof item === 'string' ? item : item?.message || item?.text || '';
const evidenceName = (item, index) => typeof item === 'string' ? item.split('/').pop() : item?.filename || item?.file_name || item?.name || `Evidence ${index + 1}`;
const evidenceHref = (item) => typeof item === 'string' ? item : item?.url || item?.file_url || item?.download_url || '';

export default function ComplaintDetail() {
  const { id } = useParams();
  const { accessToken, role } = useApp();
  const base = baseFor(role);
  const listPath = role === 'farmer' ? '/farmer/report-issue' : `${base}/complaints`;
  const listLabel = role === 'farmer' ? 'Report an Issue' : 'Complaints';
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messageError, setMessageError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true); setError('');
      if (!accessToken) { setError('Your session has expired. Sign in again to view this complaint.'); setLoading(false); return; }
      try {
        const response = await fetch(`${API_BASE_URL}/complaints/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }, signal: controller.signal });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(apiErrorMessage(payload, response.status === 404 ? 'This complaint could not be found.' : `Could not load complaint (${response.status}).`));
        setComplaint(payload || null);
      } catch (loadError) { if (loadError.name !== 'AbortError') { setComplaint(null); setError(loadError.message || 'Could not load complaint.'); } }
      finally { if (!controller.signal.aborted) setLoading(false); }
    };
    load(); return () => controller.abort();
  }, [accessToken, id, reloadKey]);

  const addMessage = async ({ text, files }) => {
    setMessageError('');
    try {
      if (!accessToken) throw new Error('Your session has expired. Sign in again to reply.');
      const body = new FormData();
      body.append('message', text);
      files.forEach((entry) => { if (entry.file) body.append('evidence', entry.file, entry.file.name); });
      const response = await fetch(`${API_BASE_URL}/complaints/${encodeURIComponent(id)}/messages`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }, body });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(apiErrorMessage(payload, `Could not post message (${response.status}).`));
      setReloadKey((key) => key + 1);
      return true;
    } catch (sendError) { setMessageError(sendError.message || 'Could not post message.'); return false; }
  };

  if (loading) return <PageSkeleton />;
  if (error || !complaint) return <div className="page shr-page"><Banner tone="warn" title={error ? 'Complaint unavailable' : 'Complaint not found'}>{error || 'This complaint could not be found.'}</Banner><div><Link className="btn btn--outline-green" to={listPath}>Back to {listLabel}</Link></div></div>;

  const status = display(complaint.status);
  const category = display(complaint.category);
  const evidence = Array.isArray(complaint.evidence) ? complaint.evidence : [];
  const messages = Array.isArray(complaint.messages) ? complaint.messages : [];
  const actions = Array.isArray(complaint.actions) ? complaint.actions : [];

  return <div className="page shr-page">
    <Breadcrumb items={[{ label: listLabel, to: listPath }, { label: complaint.reference || complaint.id }]} />
    <PageHeader title={complaint.subject || 'Complaint'} subtitle={`${complaint.reference || ''} · ${category} · raised ${whenLabel(complaint.created_at)}`} actions={<StatusPill>{status}</StatusPill>} />
    <Card><CardHeader title="Where this complaint is" subtitle={STATUS_HELP[status] || `Current status: ${status}`} /><StatusTrack status={status} /></Card>
    <div className="grid-main">
      <div className="stack-lg">
        <Card><CardHeader title="What was reported" /><p className="shr-prewrap">{complaint.description}</p><h3 className="shr-subhead"><FileText size={16} /> Evidence</h3>
          {evidence.length ? <ul className="shr-files">{evidence.map((file, index) => { const href = evidenceHref(file); const name = evidenceName(file, index); return <li key={`${name}-${index}`}><FileText size={16} />{href ? <a href={href} target="_blank" rel="noreferrer">{name}</a> : name}</li>; })}</ul> : <p className="small muted">No evidence has been attached.</p>}
        </Card>
        <Card><CardHeader title="Actions taken" subtitle="Recorded updates on this complaint." />
          {actions.length ? <ul className="stack-sm">{actions.map((action, index) => <li key={action.id || index}><div className="strong small">{action.action || action.text || action.description || 'Complaint updated'}</div><div className="caption muted">{action.actor_name || action.by || action.author_name || 'System'} · {whenLabel(action.created_at || action.at)}</div></li>)}</ul> : <p className="small muted">No actions have been recorded yet.</p>}
        </Card>
        <Card><CardHeader title="Conversation" subtitle="Messages and replies on this complaint." />
          {messages.length ? <div className="stack">{messages.map((item, index) => <article key={item.id || index} className="card card--tint"><div className="row between"><span className="strong small">{item.author_name || item.sender_name || 'Participant'} <span className="caption muted">{roleLabel(item.author_role || item.role)}</span></span><span className="caption muted">{whenLabel(item.created_at || item.sent_at)}</span></div><p className="shr-prewrap">{messageText(item)}</p>
            {Array.isArray(item.evidence) && item.evidence.length > 0 && <ul className="shr-files">{item.evidence.map((file, i) => { const href = evidenceHref(file); const name = evidenceName(file, i); return <li key={`${name}-${i}`}><FileText size={16} />{href ? <a href={href} target="_blank" rel="noreferrer">{name}</a> : name}</li>; })}</ul>}
          </article>)}</div> : <p className="small muted">No messages yet.</p>}
          {messageError && <Banner tone="warn" title="Message not sent">{messageError}</Banner>}
          <CommentBox key={id} label="Add a message or more information" onSubmit={addMessage} />
        </Card>
        {(complaint.outcome || complaint.explanation) && <Card><CardHeader title="Outcome and explanation" /><p className="shr-prewrap">{complaint.outcome || complaint.explanation}</p></Card>}
      </div>
      <div className="stack-lg"><Card><CardHeader title="Parties" /><InfoList compact items={[
        ['Raised by', complaint.raised_by_name || '—'], ['Role', roleLabel(complaint.raised_by_role)],
        ['Related package', complaint.package_title || 'Not package specific'], ['Cooperative', complaint.cooperative_name || '—'],
        ['Reviewer', complaint.reviewer_name || 'Unassigned'], ['Category', category], ['Raised', whenLabel(complaint.created_at)], ['Last updated', whenLabel(complaint.updated_at)],
      ]} /></Card><Card tone="tint"><h2 className="card__title" style={{ marginBottom: 8 }}>How reviews work</h2><p className="small">A reviewer looks at the facts and evidence, may ask for more information, then records an outcome and explanation.</p></Card></div>
    </div>
  </div>;
}
