import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ClipboardCheck, IdCard, Save, ShieldCheck, Sprout, UserRound } from 'lucide-react';
import {
  Banner, Breadcrumb, Button, Card, Checkbox, ConfirmDialog, EmptyState, Field, FileDrop, LinkButton, PageHeader, PageSkeleton, SectionHead, SelectField, TextAreaField, TextField,
} from '../../components/ui/index.js';
import { useApp, simulate, useSimulatedLoad } from '../../context/AppContext.jsx';
import { UnverifiedBanner } from '../../components/coopa/Bits.jsx';
import {
  CROP_OPTIONS, GENDER_OPTIONS, MEMBERSHIP_OPTIONS, SIZE_UNITS, SKILL_OPTIONS, checkUpload, isEmail, isValidNin, maskNin, nextFarmerId, normalisePhone, splitName, useCoop,
} from '../../components/coopa/helpers.js';
import '../../styles/pages/coopa.css';

const DRAFT_KEY = 'collabfarm-coopa-farmer-draft-v1';
const BLANK = {
  firstName: '', lastName: '', gender: '', phone: '', email: '', dob: '', nin: '', cropType: '', farmSize: '', farmSizeUnit: 'Acres', experienceYears: '',
  skills: [], farmId: '', membership: 'Active member', consent: false, notes: '',
};

const readDraft = () => { try { return JSON.parse(window.localStorage.getItem(DRAFT_KEY)); } catch { return null; } };
const writeDraft = (v) => { try { window.localStorage.setItem(DRAFT_KEY, JSON.stringify(v)); return true; } catch { return false; } };
const clearDraft = () => { try { window.localStorage.removeItem(DRAFT_KEY); } catch { /* storage unavailable */ } };

function fromFarmer(f) {
  const parts = f.firstName ? { first: f.firstName, last: f.lastName || '' } : splitName(f.name);
  return {
    firstName: parts.first, lastName: parts.last, gender: f.gender || '', phone: f.phone || '', email: f.email || '', dob: f.dob || '', nin: f.nin || '',
    cropType: f.cropType || '', farmSize: f.farmSize === '' || f.farmSize == null ? '' : String(f.farmSize), farmSizeUnit: f.farmSizeUnit || 'Acres',
    experienceYears: f.experienceYears == null ? '' : String(f.experienceYears), skills: f.skills || [], farmId: f.farmId || '', membership: f.membership || 'Active member',
    consent: Boolean(f.consent), notes: f.notes || '',
  };
}

export default function FarmerForm() {
  const { id } = useParams();
  const edit = Boolean(id);
  const navigate = useNavigate();
  const { data, add, update, notify, toast } = useApp();
  const { coop, farmers, farms, verified } = useCoop();
  const loading = useSimulatedLoad(300);
  const farmer = edit ? farmers.find((f) => f.id === id) : null;

  const [v, setV] = useState(BLANK);
  const [initial, setInitial] = useState(BLANK);
  const [ready, setReady] = useState(false);
  const [errors, setErrors] = useState({});
  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState('');
  const [busy, setBusy] = useState(false);
  const [leave, setLeave] = useState(false);
  const [draft, setDraft] = useState(null);

  // Prefill once the record is known (edit) or look for an unsent draft (add).
  useEffect(() => {
    if (ready) return;
    if (edit && farmer) {
      const base = fromFarmer(farmer);
      setV(base); setInitial(base);
      setFiles(farmer.idFile ? [{ name: farmer.idFile, size: 0 }] : []);
      setReady(true);
    } else if (!edit && coop) {
      setDraft(readDraft());
      setReady(true);
    }
  }, [edit, farmer, coop, ready]);

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setV((s) => ({ ...s, [key]: value }));
    if (errors[key]) setErrors((s) => ({ ...s, [key]: '' }));
  };

  const allOthers = useMemo(() => data.farmers.filter((f) => f.id !== id), [data.farmers, id]);
  const dirty = JSON.stringify(v) !== JSON.stringify(initial) || (!edit && files.length > 0);

  const ninProblem = (value) => {
    if (!value) return 'Enter the 11-digit NIN.';
    if (!isValidNin(value)) return 'NIN not valid. Enter exactly 11 digits.';
    const clash = allOthers.find((f) => f.nin === value);
    if (clash) {
      return (
        <>
          This NIN is already registered to {clash.coopId === coop?.id ? clash.name : 'another farmer'}.
          {clash.coopId === coop?.id && <> <Link to={`/coop/farmers/${clash.id}`}>Open the existing record</Link></>}
        </>
      );
    }
    return '';
  };

  // A matching phone number or name is a soft flag: saving is allowed, a reviewer is told.
  const softFlag = useMemo(() => {
    const digits = normalisePhone(v.phone);
    const fullName = `${v.firstName} ${v.lastName}`.trim().toLowerCase();
    const samePhone = digits.ok ? allOthers.find((f) => f.status !== 'Removed' && normalisePhone(f.phone).display === digits.display) : null;
    if (samePhone) return { text: `Possible duplicate phone number with ${samePhone.id}`, hint: `This number is also used by ${samePhone.name}. You can still save. A reviewer will check it.` };
    const sameName = fullName.includes(' ') ? allOthers.find((f) => f.status !== 'Removed' && f.name.toLowerCase() === fullName) : null;
    if (sameName) return { text: `Possible duplicate name with ${sameName.id}`, hint: '' };
    return null;
  }, [v.phone, v.firstName, v.lastName, allOthers]);

  const validate = () => {
    const e = {};
    const nameOk = (s) => /^[\p{L}][\p{L}\s'.-]*$/u.test(s.trim()) && s.trim().length >= 2;
    if (!v.firstName.trim()) e.firstName = 'Enter the first name.'; else if (!nameOk(v.firstName)) e.firstName = 'Use letters only, at least 2 characters.';
    if (!v.lastName.trim()) e.lastName = 'Enter the last name.'; else if (!nameOk(v.lastName)) e.lastName = 'Use letters only, at least 2 characters.';
    if (!normalisePhone(v.phone).ok) e.phone = v.phone.trim() ? 'Enter an 11-digit phone number, for example 0803 123 4567.' : 'Enter a phone number.';
    if (v.email.trim() && !isEmail(v.email)) e.email = 'Enter a valid email address or leave it blank.';
    if (v.dob) {
      const d = new Date(v.dob);
      const age = (Date.now() - d.getTime()) / (365.25 * 86400000);
      if (Number.isNaN(d.getTime()) || age < 0) e.dob = 'Enter a date of birth in the past.';
      else if (age < 18) e.dob = 'The farmer must be at least 18 years old to sign agreements.';
      else if (age > 100) e.dob = 'Check this date of birth.';
    }
    const nin = ninProblem(v.nin);
    if (nin) e.nin = nin;
    if (!v.cropType) e.cropType = 'Choose the main crop.';
    if (v.farmSize !== '' && !(Number(v.farmSize) > 0 && Number(v.farmSize) <= 100000)) e.farmSize = 'Enter a number above 0, or leave it blank.';
    if (v.experienceYears !== '' && !(Number.isInteger(Number(v.experienceYears)) && Number(v.experienceYears) >= 0 && Number(v.experienceYears) <= 80)) e.experienceYears = 'Enter whole years from 0 to 80.';
    if (!v.membership) e.membership = 'Choose a membership status.';
    if (!v.consent) e.consent = 'Consent is required before a farmer can be saved.';
    setErrors(e);
    return e;
  };

  const changeSummary = (patch, old) => {
    const parts = [];
    const farmName = (fid) => farms.find((f) => f.id === fid)?.name || 'none';
    if (patch.name !== old.name) parts.push('Name changed');
    if (patch.nin !== old.nin) parts.push('NIN changed');
    if (patch.phone !== old.phone) parts.push('Phone number changed');
    if ((patch.email || '') !== (old.email || '')) parts.push('Email changed');
    if ((patch.dob || '') !== (old.dob || '')) parts.push('Date of birth changed');
    if ((patch.gender || '') !== (old.gender || '')) parts.push(`Gender: ${old.gender || 'blank'} to ${patch.gender || 'blank'}`);
    if (patch.cropType !== old.cropType) parts.push(`Crop type: ${old.cropType} to ${patch.cropType}`);
    if (String(patch.farmSize) !== String(old.farmSize ?? '') || patch.farmSizeUnit !== old.farmSizeUnit) parts.push(`Farm size: ${old.farmSize || 'blank'} ${old.farmSizeUnit || ''} to ${patch.farmSize || 'blank'} ${patch.farmSizeUnit}`.replace(/\s+/g, ' '));
    if (String(patch.experienceYears ?? '') !== String(old.experienceYears ?? '')) parts.push(`Experience: ${old.experienceYears ?? 'blank'} to ${patch.experienceYears ?? 'blank'} years`);
    if (JSON.stringify(patch.skills) !== JSON.stringify(old.skills || [])) parts.push('Skills changed');
    if ((patch.farmId || null) !== (old.farmId || null)) parts.push(`Assigned farm: ${farmName(old.farmId)} to ${farmName(patch.farmId)}`);
    if (patch.membership !== old.membership) parts.push(`Membership: ${old.membership} to ${patch.membership}`);
    if (Boolean(patch.consent) !== Boolean(old.consent)) parts.push('Consent recorded');
    if ((patch.notes || '') !== (old.notes || '')) parts.push('Notes updated');
    if ((patch.idFile || null) !== (old.idFile || null)) parts.push('ID document replaced');
    return parts;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    const found = validate();
    if (Object.keys(found).length) {
      setTimeout(() => document.querySelector('[aria-invalid="true"]')?.focus(), 0);
      return;
    }
    const first = v.firstName.trim();
    const last = v.lastName.trim();
    const name = `${first} ${last}`;
    const phone = normalisePhone(v.phone).display;
    const body = {
      name, firstName: first, lastName: last, nin: v.nin, phone, email: v.email.trim(), gender: v.gender, dob: v.dob || '', cropType: v.cropType,
      farmSize: v.farmSize === '' ? '' : Number(v.farmSize), farmSizeUnit: v.farmSizeUnit, experienceYears: v.experienceYears === '' ? null : Number(v.experienceYears),
      skills: v.skills, farmId: v.farmId || null, membership: v.membership, consent: true, notes: v.notes.trim(), idFile: files[0]?.name || null,
    };
    setBusy(true);
    await simulate(700);
    if (edit) {
      const parts = changeSummary(body, farmer);
      if (!parts.length) {
        setBusy(false);
        toast('No changes to save.', 'info');
        navigate(`/coop/farmers/${farmer.id}`);
        return;
      }
      const ninChanged = body.nin !== farmer.nin;
      update('farmers', farmer.id, { ...body, duplicateFlag: softFlag?.text || (ninChanged ? null : farmer.duplicateFlag || null) }, {
        action: 'Farmer details updated', entityType: 'Farmer', summary: parts.join('. '), reason: 'Edited by cooperative',
      });
      toast(`${name} was updated.`, 'success');
      setBusy(false);
      navigate(`/coop/farmers/${farmer.id}`);
      return;
    }
    const record = add('farmers', {
      id: nextFarmerId(data.farmers), coopId: coop.id, ...body, status: 'Pending', identityStatus: 'Pending', agreementStatus: 'Not Signed',
      dateAdded: new Date().toISOString(), allocationPackageId: null, allocatedAmount: 0, duplicateFlag: softFlag?.text || null,
    }, { action: 'Farmer added', entityType: 'Farmer', summary: `${name} added as Pending. Crop: ${v.cropType}. NIN ${maskNin(v.nin)}.`, reason: 'Added by cooperative' });
    notify('admin', softFlag ? 'Farmer added with a possible duplicate flag' : 'New farmer awaiting identity check', `${name} was added by ${coop.name}.${softFlag ? ` ${softFlag.text}.` : ''}`, '/admin/farmers-farms', 'verification');
    clearDraft();
    toast(`${name} was added as Pending. A reviewer will check their identity.`, 'success');
    setBusy(false);
    navigate(`/coop/farmers/${record.id}`);
  };

  const saveDraft = () => {
    // The NIN is a sensitive identifier and consent must be given fresh, so neither is kept in the draft.
    const ok = writeDraft({ values: { ...v, nin: '', consent: false }, savedAt: new Date().toISOString() });
    toast(ok ? 'Draft saved on this device without the NIN or consent. It is not added to your farmer list yet.' : 'The draft could not be saved on this device.', ok ? 'success' : 'error');
  };

  const pickFile = (list) => {
    const f = list[0];
    if (!f) { setFiles([]); setFileError(''); return; }
    const problem = checkUpload(f);
    if (problem) { setFileError(problem); return; }
    setFileError('');
    setFiles([f]);
  };

  const cancel = () => (dirty ? setLeave(true) : navigate(edit ? `/coop/farmers/${id}` : '/coop/farmers'));

  if (loading || (!ready && (edit ? Boolean(farmer) : Boolean(coop)))) return <PageSkeleton />;
  if (!coop) return <div className="page"><EmptyState title="We could not find your cooperative record" action={<LinkButton to="/coop" variant="outline">Back to dashboard</LinkButton>}>Sign in again with a cooperative account.</EmptyState></div>;
  if (edit && !farmer) {
    return <div className="page"><EmptyState title="Farmer not found" action={<LinkButton to="/coop/farmers" variant="outline">Back to Farmer Directory</LinkButton>}>This farmer does not exist in your cooperative, or the link is out of date.</EmptyState></div>;
  }
  if (edit && farmer.status === 'Removed') {
    return <div className="page"><EmptyState title="Removed farmers cannot be edited" action={<LinkButton to={`/coop/farmers/${farmer.id}`} variant="outline">View record</LinkButton>}>{farmer.name} was removed from your list. Their record is kept for history and cannot be changed.</EmptyState></div>;
  }

  const ninLocked = edit && farmer.identityStatus === 'Verified';
  const errorCount = Object.values(errors).filter(Boolean).length;
  const farmOptions = farms.map((f) => ({ value: f.id, label: `${f.name} (${f.areaHa} ha)${f.status === 'Inactive' ? ', inactive' : ''}` }));

  return (
    <form className="page coopa" onSubmit={onSubmit} noValidate>
      <Breadcrumb items={edit
        ? [{ label: 'Farmer Directory', to: '/coop/farmers' }, { label: 'Farmer Details', to: `/coop/farmers/${farmer.id}` }, { label: 'Edit Farmer' }]
        : [{ label: 'Farmer Directory', to: '/coop/farmers' }, { label: 'Add Farmer' }]}
      />
      <PageHeader
        title={edit ? 'Edit Farmer' : 'Add Farmer'}
        subtitle={edit ? "Update the farmer's details. Changes are saved in the audit history." : "Enter the farmer's details to register them on the platform."}
        actions={(
          <>
            <Button variant="outline" onClick={cancel} disabled={busy}>Cancel</Button>
            {!edit && <Button variant="outline-green" onClick={saveDraft} disabled={busy}>Save draft</Button>}
            <Button type="submit" loading={busy}><Save size={18} />{edit ? 'Save Changes' : 'Save Farmer'}</Button>
          </>
        )}
      />

      {!edit && <UnverifiedBanner coop={coop}>You can add farmers now. They are saved as Pending and cannot be allocated to funding until your cooperative is verified.</UnverifiedBanner>}
      {!edit && draft && !dirty && (
        <Banner tone="info" title="You have a saved draft">
          Saved on {new Date(draft.savedAt).toLocaleString('en-NG')}.{' '}
          <button type="button" className="link-btn" onClick={() => { setV({ ...BLANK, ...draft.values }); setDraft(null); }}>Restore draft</button>
          {' or '}
          <button type="button" className="link-btn" onClick={() => { clearDraft(); setDraft(null); toast('Draft discarded.', 'info'); }}>discard it</button>.
        </Banner>
      )}
      {errorCount > 0 && <Banner tone="danger" title={`Please fix ${errorCount} ${errorCount === 1 ? 'field' : 'fields'} before saving`}>Each field with a problem is marked in red below.</Banner>}

      <Card>
        <SectionHead icon={<UserRound size={18} />} title="Personal Information" />
        <div className="form-grid">
          <TextField label="First name" required placeholder="Enter first name" autoComplete="off" value={v.firstName} onChange={set('firstName')} error={errors.firstName} />
          <TextField label="Last name" required placeholder="Enter last name" autoComplete="off" value={v.lastName} onChange={set('lastName')} error={errors.lastName} />
          <SelectField label="Gender" optional placeholder="Select gender" options={GENDER_OPTIONS} value={v.gender} onChange={set('gender')} />
          <TextField label="Phone number" required type="tel" inputMode="tel" placeholder="Enter phone number" value={v.phone} onChange={set('phone')} error={errors.phone} hint={softFlag?.hint || 'For example 0803 123 4567'} />
          <TextField label="Email address" optional type="email" placeholder="name@example.com" value={v.email} onChange={set('email')} error={errors.email} />
          <TextField label="Date of birth" optional type="date" max={new Date().toISOString().slice(0, 10)} value={v.dob} onChange={set('dob')} error={errors.dob} />
        </div>
      </Card>

      <Card>
        <SectionHead icon={<IdCard size={18} />} title="Identity" />
        <div className="form-grid">
          <div className="stack">
            <TextField
              label="NIN (National Identification Number)"
              required
              inputMode="numeric"
              maxLength={11}
              placeholder="Enter 11-digit NIN"
              autoComplete="off"
              value={v.nin}
              disabled={ninLocked}
              onChange={(e) => { setV((s) => ({ ...s, nin: e.target.value.replace(/\D/g, '') })); if (errors.nin) setErrors((s) => ({ ...s, nin: '' })); }}
              onBlur={() => { if (!ninLocked && v.nin) { const p = ninProblem(v.nin); setErrors((s) => ({ ...s, nin: p })); } }}
              error={errors.nin}
              hint={ninLocked ? 'NIN is verified and cannot be edited.' : 'We check the NIN against records already on the platform. Never share it outside your cooperative.'}
            />
            {ninLocked && <p className="caption muted coopa-inline"><ShieldCheck size={14} />A CollabFarm reviewer verified this identity.</p>}
          </div>
          <FileDrop label="ID or photo (optional)" files={files} onFiles={pickFile} error={fileError} accept="JPG, PNG or PDF (Max 5MB)" prompt="Click to upload or drag and drop" />
        </div>
      </Card>

      <Card>
        <SectionHead icon={<Sprout size={18} />} title="Farming information" />
        <div className="form-grid">
          <SelectField label="Crop type" required placeholder="Select crop type" options={CROP_OPTIONS} value={v.cropType} onChange={set('cropType')} error={errors.cropType} />
          <Field label="Farm size" optional error={errors.farmSize}>
            {({ id: fid, describedBy, invalid }) => (
              <div className="coopa-size">
                <input id={fid} className={`input${invalid ? ' input--error' : ''}`} inputMode="decimal" placeholder="Enter farm size" aria-invalid={invalid || undefined} aria-describedby={describedBy} value={v.farmSize} onChange={set('farmSize')} />
                <select className="select" aria-label="Farm size unit" value={v.farmSizeUnit} onChange={set('farmSizeUnit')}>{SIZE_UNITS.map((u) => <option key={u}>{u}</option>)}</select>
              </div>
            )}
          </Field>
          <TextField label="Years of farming experience" optional inputMode="numeric" placeholder="For example 5" value={v.experienceYears} onChange={set('experienceYears')} error={errors.experienceYears} />
          <SelectField label="Assigned farm" optional placeholder={farmOptions.length ? 'No farm assigned yet' : 'No farms registered yet'} options={farmOptions} value={v.farmId} onChange={set('farmId')} hint={farmOptions.length ? undefined : 'Register a farm first, then assign farmers to it.'} />
          <fieldset className="coopa-skills full">
            <legend className="field__label">Skills <span className="opt">(Optional)</span></legend>
            <div className="coopa-chips">
              {SKILL_OPTIONS.map((s) => (
                <label key={s} className={`coopa-chip${v.skills.includes(s) ? ' coopa-chip--on' : ''}`}>
                  <input type="checkbox" checked={v.skills.includes(s)} onChange={() => setV((st) => ({ ...st, skills: st.skills.includes(s) ? st.skills.filter((x) => x !== s) : [...st.skills, s] }))} />
                  {s}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </Card>

      <Card>
        <SectionHead icon={<ClipboardCheck size={18} />} title="Membership and consent" />
        <div className="form-grid">
          <SelectField label="Membership status" required options={MEMBERSHIP_OPTIONS} value={v.membership} onChange={set('membership')} error={errors.membership} hint="A farmer is not active in a project until identity, membership and consent checks are complete." />
          <TextAreaField className="full" label="Notes" optional rows={3} placeholder="Any additional notes about this farmer..." value={v.notes} onChange={set('notes')} />
          <div className="full">
            <Checkbox checked={v.consent} onChange={(c) => { setV((s) => ({ ...s, consent: c })); if (c) setErrors((s) => ({ ...s, consent: '' })); }} error={errors.consent}>
              <strong>The farmer has agreed to the use of their details.</strong> Their details may be used to verify identity, to take part in funded projects, and to share limited information with investors that does not include their NIN, phone number or exact address.
            </Checkbox>
          </div>
        </div>
      </Card>

      <div className="row-wrap" style={{ justifyContent: 'flex-end' }}>
        <Button variant="outline" onClick={cancel} disabled={busy}>Cancel</Button>
        <Button type="submit" loading={busy}><Save size={18} />{edit ? 'Save Changes' : 'Save Farmer'}</Button>
      </div>

      <ConfirmDialog
        open={leave}
        onClose={() => setLeave(false)}
        onConfirm={() => navigate(edit ? `/coop/farmers/${id}` : '/coop/farmers')}
        tone="amber"
        title="Discard your changes?"
        message="You have changes that are not saved. If you leave now they will be lost."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
      />
    </form>
  );
}
