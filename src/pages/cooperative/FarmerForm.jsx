import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ClipboardCheck, FileDown, IdCard, Save, ShieldCheck, Sprout, UserRound } from 'lucide-react';
import {
  Banner, Breadcrumb, Button, Card, Checkbox, ConfirmDialog, EmptyState, FileDrop, LinkButton, PageHeader, PageSkeleton, SectionHead, SelectField, TextField,
} from '../../components/ui/index.js';
import { useApp, useSimulatedLoad } from '../../context/AppContext.jsx';
import { API_BASE_URL, apiErrorMessage } from '../../utils/api.js';
import { UnverifiedBanner } from '../../components/coopa/Bits.jsx';
import {
  GENDER_OPTIONS, checkUpload, isEmail, isValidNin, normalisePhone, splitName, useCoop,
} from '../../components/coopa/helpers.js';
import '../../styles/pages/coopa.css';

const DRAFT_KEY = 'collabfarm-coopa-farmer-draft-v1';
const FARMING_CATEGORIES = ['Crop Farming', 'Fishery', 'Mixed Farming', 'Poultry', 'Livestock', 'Others'];
const FARMING_CATEGORY_API = { 'Crop Farming': 'crop_farming', Fishery: 'fishery', 'Mixed Farming': 'mixed_farming', Poultry: 'poultry', Livestock: 'livestock', Others: 'others' };
const API_CATEGORY_LABEL = Object.fromEntries(Object.entries(FARMING_CATEGORY_API).map(([label, value]) => [value, label]));
const FARMER_GENDER_OPTIONS = ['Female', 'Male'];
const BLANK = {
  firstName: '', lastName: '', gender: '', phone: '', email: '', dob: '', nin: '', bankName: '', accountNumber: '', farmingCategory: '', experienceYears: '',
  consent: false,
};

const readDraft = () => { try { return JSON.parse(window.localStorage.getItem(DRAFT_KEY)); } catch { return null; } };
const writeDraft = (v) => { try { window.localStorage.setItem(DRAFT_KEY, JSON.stringify(v)); return true; } catch { return false; } };
const clearDraft = () => { try { window.localStorage.removeItem(DRAFT_KEY); } catch { /* storage unavailable */ } };

function normaliseStatus(value) {
  const status = String(value || '').toLowerCase();
  if (status === 'verified' || status === 'approved') return 'Verified';
  if (status === 'rejected') return 'Rejected';
  return 'Pending';
}

function fromFarmer(f) {
  const parts = f.firstName ? { first: f.firstName, last: f.lastName || '' } : splitName(f.name);
  return {
    firstName: parts.first, lastName: parts.last, gender: f.gender || '', phone: f.phone || '', email: f.email || '', dob: f.dob || '', nin: f.nin || '', bankName: f.bankName || '', accountNumber: f.accountNumber || '',
    farmingCategory: f.farmingCategory || (FARMING_CATEGORIES.includes(f.cropType) ? f.cropType : f.cropType ? 'Crop Farming' : ''),
    experienceYears: f.experienceYears == null ? '' : String(f.experienceYears),
    consent: Boolean(f.consent),
  };
}

export default function FarmerForm() {
  const { id } = useParams();
  const edit = Boolean(id);
  const navigate = useNavigate();
  const { data, add, update, toast, accessToken } = useApp();
  const { coop, farmers } = useCoop();
  const loading = useSimulatedLoad(300);
  const cachedFarmer = edit ? farmers.find((f) => f.id === id) : null;
  const [remoteFarmer, setRemoteFarmer] = useState(null);
  const [profileLoading, setProfileLoading] = useState(edit);
  const [profileError, setProfileError] = useState('');
  const farmer = edit ? (remoteFarmer || (!profileLoading && cachedFarmer)) : null;

  const [v, setV] = useState(BLANK);
  const [initial, setInitial] = useState(BLANK);
  const [ready, setReady] = useState(false);
  const [errors, setErrors] = useState({});
  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState('');
  const [busy, setBusy] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [leave, setLeave] = useState(false);
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    if (!edit) return undefined;
    const controller = new AbortController();
    const load = async () => {
      if (!accessToken) { setProfileError('Your session has expired. Sign in again to edit this farmer.'); setProfileLoading(false); return; }
      setProfileLoading(true); setProfileError('');
      try {
        const response = await fetch(`${API_BASE_URL}/farmers/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }, signal: controller.signal });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(apiErrorMessage(payload, `Could not load farmer (${response.status}).`));
        const category = API_CATEGORY_LABEL[payload?.farming_category] || '';
        setRemoteFarmer({
          ...payload, id: payload?.id || id, name: payload?.full_name || [payload?.first_name, payload?.last_name].filter(Boolean).join(' '),
          firstName: payload?.first_name || '', lastName: payload?.last_name || '', gender: payload?.gender === 'FEMALE' ? 'Female' : payload?.gender === 'MALE' ? 'Male' : '',
          phone: payload?.phone_number || '', email: payload?.email || '', dob: payload?.date_of_birth || '', nin: payload?.nin || '',
          bankName: payload?.bank_name || '', accountNumber: payload?.account_number || '', farmingCategory: category, cropType: category,
          experienceYears: payload?.years_of_experience ?? '', consent: Boolean(payload?.terms_accepted), idFile: payload?.id_photo || '',
          status: normaliseStatus(payload?.verification_status), identityStatus: String(payload?.verification_status || '').toLowerCase() === 'approved' ? 'Verified' : 'Pending',
          coopId: payload?.cooperative_id || coop?.id,
        });
      } catch (error) { if (error.name !== 'AbortError') setProfileError(error.message || 'Could not load farmer details.'); }
      finally { if (!controller.signal.aborted) setProfileLoading(false); }
    };
    load();
    return () => controller.abort();
  }, [edit, id, accessToken, coop]);

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
    setRequestError('');
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
    if (!v.bankName.trim()) e.bankName = 'Enter the farmer’s bank name.';
    if (!/^\d{10}$/.test(v.accountNumber)) e.accountNumber = 'Enter the farmer’s 10-digit account number.';
    if (!edit && !v.email.trim()) e.email = 'Enter the farmer’s email address.';
    else if (v.email.trim() && !isEmail(v.email)) e.email = 'Enter a valid email address.';
    if (!edit && !v.dob) e.dob = 'Enter the farmer’s date of birth.';
    if (v.dob) {
      const d = new Date(v.dob);
      const age = (Date.now() - d.getTime()) / (365.25 * 86400000);
      if (Number.isNaN(d.getTime()) || age < 0) e.dob = 'Enter a date of birth in the past.';
      else if (age < 18) e.dob = 'The farmer must be at least 18 years old to sign agreements.';
      else if (age > 100) e.dob = 'Check this date of birth.';
    }
    if (!edit && !v.gender) e.gender = 'Select the farmer’s gender.';
    const nin = ninProblem(v.nin);
    if (nin) e.nin = nin;
    if (!edit && files.length === 0) e.idFile = 'Upload an ID document or photo.';
    if (!v.farmingCategory) e.farmingCategory = 'Choose a farming category.';
    if (!edit && v.experienceYears === '') e.experienceYears = 'Enter the farmer’s years of experience.';
    else if (!(Number.isInteger(Number(v.experienceYears)) && Number(v.experienceYears) >= 0 && Number(v.experienceYears) <= 80)) e.experienceYears = 'Enter whole years from 0 to 80.';
    if (!v.consent) e.consent = 'Consent is required before a farmer can be saved.';
    setErrors(e);
    return e;
  };

  const changeSummary = (patch, old) => {
    const parts = [];
    if (patch.name !== old.name) parts.push('Name changed');
    if (patch.nin !== old.nin) parts.push('NIN changed');
    if (patch.phone !== old.phone) parts.push('Phone number changed');
    if ((patch.bankName || '') !== (old.bankName || '')) parts.push('Bank name changed');
    if ((patch.accountNumber || '') !== (old.accountNumber || '')) parts.push('Bank account number changed');
    if ((patch.email || '') !== (old.email || '')) parts.push('Email changed');
    if ((patch.dob || '') !== (old.dob || '')) parts.push('Date of birth changed');
    if ((patch.gender || '') !== (old.gender || '')) parts.push(`Gender: ${old.gender || 'blank'} to ${patch.gender || 'blank'}`);
    if ((patch.farmingCategory || patch.cropType) !== (old.farmingCategory || old.cropType)) parts.push(`Farming category: ${old.farmingCategory || old.cropType || 'blank'} to ${patch.farmingCategory || patch.cropType}`);
    if (String(patch.experienceYears ?? '') !== String(old.experienceYears ?? '')) parts.push(`Experience: ${old.experienceYears ?? 'blank'} to ${patch.experienceYears ?? 'blank'} years`);
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
      name, firstName: first, lastName: last, nin: v.nin, phone, email: v.email.trim(), gender: v.gender, dob: v.dob || '', bankName: v.bankName.trim(), accountNumber: v.accountNumber, farmingCategory: v.farmingCategory, cropType: v.farmingCategory,
      farmSize: edit ? farmer?.farmSize ?? '' : '', farmSizeUnit: edit ? farmer?.farmSizeUnit || 'Acres' : 'Acres', experienceYears: v.experienceYears === '' ? null : Number(v.experienceYears),
      skills: edit ? farmer?.skills || [] : [], farmId: edit ? farmer?.farmId || null : null, membership: edit ? farmer?.membership || 'Active member' : 'Active member', consent: true, notes: edit ? farmer?.notes || '' : '', idFile: files[0]?.name || null,
    };
    setBusy(true);
    if (edit) {
      const parts = changeSummary(body, farmer);
      if (!parts.length) {
        setBusy(false);
        toast('No changes to save.', 'info');
        navigate(`/coop/farmers/${farmer.id}`);
        return;
      }
      try {
        if (!accessToken) throw new Error('Your session has expired. Sign in again before editing a farmer.');
        const multipart = new FormData();
        const fields = {
          first_name: first, last_name: last, date_of_birth: v.dob, email: v.email.trim(), nin: v.nin, phone_number: phone,
          account_number: v.accountNumber, bank_name: v.bankName.trim(), gender: v.gender.toUpperCase(),
          farming_category: FARMING_CATEGORY_API[v.farmingCategory], additional_info: farmer?.notes || '',
          years_of_experience: String(Number(v.experienceYears)),
        };
        Object.entries(fields).forEach(([key, value]) => { if (value != null && value !== '') multipart.append(key, value); });
        if (files[0]?.file) multipart.append('id_photo', files[0].file);
        const response = await fetch(`${API_BASE_URL}/farmers/${encodeURIComponent(farmer.id)}`, {
          method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }, body: multipart,
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(apiErrorMessage(payload, `Could not update farmer (${response.status}).`));
        const updated = payload?.farmer || payload?.data || payload || {};
        const ninChanged = body.nin !== farmer.nin;
        update('farmers', farmer.id, {
          ...body, name: updated.full_name || name, phone: updated.phone_number || phone,
          farmingCategory: API_CATEGORY_LABEL[updated.farming_category] || v.farmingCategory,
          status: normaliseStatus(updated.verification_status || farmer.status),
          duplicateFlag: softFlag?.text || (ninChanged ? null : farmer.duplicateFlag || null),
        }, { action: 'Farmer details updated', entityType: 'Farmer', summary: parts.join('. '), reason: 'Edited by cooperative' });
        toast(`${name} was updated.`, 'success');
        navigate(`/coop/farmers/${farmer.id}`);
      } catch (error) { setRequestError(error.message || 'Could not update farmer.'); }
      finally { setBusy(false); }
      return;
    }
    setRequestError('');
    try {
      if (!accessToken) {
        setRequestError('Your session has expired. Sign in again before adding a farmer.');
        return;
      }
      const multipart = new FormData();
      multipart.append('first_name', first);
      multipart.append('last_name', last);
      multipart.append('date_of_birth', v.dob);
      multipart.append('email', v.email.trim());
      multipart.append('nin', v.nin);
      multipart.append('years_of_experience', String(Number(v.experienceYears)));
      multipart.append('terms_accepted', String(v.consent));
      multipart.append('id_photo', files[0].file);
      multipart.append('phone_number', phone);
      multipart.append('account_number', v.accountNumber);
      multipart.append('bank_name', v.bankName.trim());
      multipart.append('gender', v.gender.toUpperCase());
      multipart.append('farming_category', FARMING_CATEGORY_API[v.farmingCategory]);

      const response = await fetch(`${API_BASE_URL}/farmers`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
        body: multipart,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setRequestError(apiErrorMessage(payload, `Could not add farmer (${response.status}). Please try again.`));
        return;
      }
      const created = payload?.farmer || payload?.data || payload;
      if (!created?.id) {
        clearDraft();
        toast(`${name} was added successfully.`, 'success');
        navigate('/coop/farmers');
        return;
      }
      const category = API_CATEGORY_LABEL[created.farming_category] || v.farmingCategory;
      const verificationStatus = String(created.verification_status || 'PENDING').toLowerCase();
      const record = add('farmers', {
        id: created.id,
        coopId: created.cooperative_id || coop.id,
        name: created.full_name || `${created.first_name || first} ${created.last_name || last}`,
        firstName: created.first_name || first,
        lastName: created.last_name || last,
        dob: created.date_of_birth || v.dob,
        email: created.email || v.email.trim(),
        nin: created.nin || v.nin,
        phone: created.phone_number || phone,
        accountNumber: created.account_number || v.accountNumber,
        accountName: created.account_name || '',
        bankName: created.bank_name || v.bankName.trim(),
        gender: created.gender === 'FEMALE' ? 'Female' : created.gender === 'MALE' ? 'Male' : v.gender,
        farmingCategory: category,
        cropType: category,
        experienceYears: created.years_of_experience ?? Number(v.experienceYears),
        consent: created.terms_accepted ?? v.consent,
        idFile: created.id_photo || files[0].name,
        status: verificationStatus === 'approved' ? 'Verified' : verificationStatus === 'rejected' ? 'Rejected' : 'Pending',
        identityStatus: verificationStatus === 'approved' ? 'Verified' : 'Pending',
        agreementStatus: 'Not Signed',
        dateAdded: created.date_added || created.created_at || new Date().toISOString(),
        allocationPackageId: null,
        allocatedAmount: 0,
        duplicateFlag: softFlag?.text || null,
      }, { action: 'Farmer added', entityType: 'Farmer', summary: `${name} added. Farming category: ${category}.`, reason: 'Added by cooperative' });
      clearDraft();
      toast(`${record.name} was added.`, 'success');
      navigate(`/coop/farmers/${record.id}`);
    } catch {
      setRequestError('Could not connect to the farmer service. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const saveDraft = () => {
    // The NIN is a sensitive identifier and consent must be given fresh, so neither is kept in the draft.
    const ok = writeDraft({ values: { ...v, nin: '', accountNumber: '', bankName: '', consent: false }, savedAt: new Date().toISOString() });
    toast(ok ? 'Draft saved on this device without the NIN, bank details or consent. It is not added to your farmer list yet.' : 'The draft could not be saved on this device.', ok ? 'success' : 'error');
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

  if (loading || profileLoading || (!ready && (edit ? Boolean(farmer) : Boolean(coop)))) return <PageSkeleton />;
  if (!coop) return <div className="page"><EmptyState title="We could not find your cooperative record" action={<LinkButton to="/coop" variant="outline">Back to dashboard</LinkButton>}>Sign in again with a cooperative account.</EmptyState></div>;
  if (edit && !farmer) {
    return <div className="page"><EmptyState title={profileError ? 'Could not load farmer' : 'Farmer not found'} action={<LinkButton to="/coop/farmers" variant="outline">Back to Farmer Directory</LinkButton>}>{profileError || 'This farmer does not exist in your cooperative, or the link is out of date.'}</EmptyState></div>;
  }
  if (edit && farmer.status === 'Removed') {
    return <div className="page"><EmptyState title="Removed farmers cannot be edited" action={<LinkButton to={`/coop/farmers/${farmer.id}`} variant="outline">View record</LinkButton>}>{farmer.name} was removed from your list. Their record is kept for history and cannot be changed.</EmptyState></div>;
  }

  const ninLocked = edit && farmer.identityStatus === 'Verified';
  const errorCount = Object.values(errors).filter(Boolean).length;
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
      {requestError && <Banner tone="danger" title="Unable to add farmer">{requestError}</Banner>}
      {errorCount > 0 && <Banner tone="danger" title={`Please fix ${errorCount} ${errorCount === 1 ? 'field' : 'fields'} before saving`}>Each field with a problem is marked in red below.</Banner>}

      <Card>
        <SectionHead icon={<UserRound size={18} />} title="Personal Information" />
        <div className="form-grid">
          <TextField label="First name" required placeholder="Enter first name" autoComplete="off" value={v.firstName} onChange={set('firstName')} error={errors.firstName} />
          <TextField label="Last name" required placeholder="Enter last name" autoComplete="off" value={v.lastName} onChange={set('lastName')} error={errors.lastName} />
          <SelectField label="Gender" required={!edit} placeholder="Select gender" options={edit ? GENDER_OPTIONS : FARMER_GENDER_OPTIONS} value={v.gender} onChange={set('gender')} error={errors.gender} />
          <TextField label="Phone number" required type="tel" inputMode="tel" placeholder="Enter phone number" value={v.phone} onChange={set('phone')} error={errors.phone} hint={softFlag?.hint || 'For example 0803 123 4567'} />
          <TextField label="Email address" required={!edit} type="email" placeholder="name@example.com" value={v.email} onChange={set('email')} error={errors.email} />
          <TextField label="Date of birth" required={!edit} type="date" max={new Date().toISOString().slice(0, 10)} value={v.dob} onChange={set('dob')} error={errors.dob} />
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
          <FileDrop label="ID photo" required includeFile={!edit} files={files} onFiles={(list) => { pickFile(list); if (list?.length) setErrors((s) => ({ ...s, idFile: '' })); }} error={fileError || errors.idFile} accept="JPG, PNG or PDF (Max 5MB)" prompt="Click to upload or drag and drop" />
        </div>
      </Card>

      <Card>
        <SectionHead icon={<ClipboardCheck size={18} />} title="Bank details" />
        <div className="form-grid">
          <TextField label="Bank name" required placeholder="Enter bank name" autoComplete="off" value={v.bankName} onChange={set('bankName')} error={errors.bankName} />
          <TextField label="Account number" required inputMode="numeric" maxLength={10} autoComplete="off" placeholder="10-digit account number" value={v.accountNumber} onChange={(e) => { setV((s) => ({ ...s, accountNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })); if (errors.accountNumber) setErrors((s) => ({ ...s, accountNumber: '' })); }} error={errors.accountNumber} />
        </div>
      </Card>

      <Card>
        <SectionHead icon={<Sprout size={18} />} title="Farming information" />
        <div className="form-grid">
          <SelectField label="Farming category" required placeholder="Select farming category" options={FARMING_CATEGORIES} value={v.farmingCategory} onChange={set('farmingCategory')} error={errors.farmingCategory} />
          <TextField label="Years of farming experience" required={!edit} inputMode="numeric" placeholder="For example 5" value={v.experienceYears} onChange={set('experienceYears')} error={errors.experienceYears} />
        </div>
      </Card>

      <Card>
        <SectionHead icon={<ClipboardCheck size={18} />} title="Consent" />
        <div className="form-grid">
          <div className="full stack-sm">
            <p className="small">Please give the farmer this agreement to read, or explain it in a language they understand, before recording their consent.</p>
            <a className="btn btn--outline btn--sm" href="/farmer-consent-agreement.pdf" download="Farmer-Consent-Agreement.pdf" style={{ width: 'fit-content' }}>
              <FileDown size={16} />Download Farmer Consent Agreement (PDF)
            </a>
          </div>
          <div className="full">
            <Checkbox checked={v.consent} onChange={(c) => { setV((s) => ({ ...s, consent: c })); if (c) setErrors((s) => ({ ...s, consent: '' })); }} error={errors.consent}>
              <strong>I confirm the farmer read or had the agreement explained to them, understood it, and agreed to the uses described.</strong>
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
