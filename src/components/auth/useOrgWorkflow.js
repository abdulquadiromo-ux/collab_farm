import { useCallback, useMemo } from 'react';
import { useApp, newId } from '../../context/AppContext.jsx';
import { nowISO, todayISO } from './authUtils.js';

// Finds the organisation that belongs to the signed in user, and tells the page why it cannot (signed out, wrong role, no org).
export function useOrgContext() {
  const { user, data } = useApp();
  return useMemo(() => {
    if (!user) return { state: 'signed-out' };
    if (user.role !== 'cooperative' && user.role !== 'investor') return { state: 'wrong-role', user };
    const kind = user.role;
    const collection = kind === 'cooperative' ? 'cooperatives' : 'investors';
    const org = data[collection].find((o) => o.id === user.orgId);
    if (!org) return { state: 'no-org', kind, user };
    return { state: 'ok', kind, collection, org, user };
  }, [user, data]);
}

const ENTITY = { cooperative: 'Cooperative', investor: 'Investor' };
const DECISION_STATUS = { review: 'Under Review', approve: 'Verified', info: 'Additional Information Required', reject: 'Rejected' };

// Store writes for the two things that change an organisation's verification status:
//   submitOrg  the person submits the wizard for review
//   decide     the clearly labelled demo box simulates the admin decision
// The real admin pages move the same records through the same statuses (see the workflow contracts).
export function useOrgWorkflow() {
  const { user, data, update, add, notify } = useApp();

  const submitOrg = useCallback(({ kind, org, patch, lastStep }) => {
    const collection = kind === 'cooperative' ? 'cooperatives' : 'investors';
    const at = nowISO();
    const resubmission = org.status === 'Additional Information Required';
    update(
      collection,
      org.id,
      (r) => ({
        ...patch,
        status: 'Submitted',
        submittedAt: at,
        adminNote: null,
        onboarding: { step: lastStep, submittedAt: at },
        statusHistory: [...(r.statusHistory || []), { status: 'Submitted', at, note: resubmission ? 'Resubmitted with the information requested' : 'Submitted for review' }],
      }),
      {
        action: resubmission ? 'Resubmitted additional information' : 'Submitted registration documents',
        entityType: ENTITY[kind],
        reason: 'Onboarding',
        summary: `Status ${org.status} to Submitted`,
      },
    );
    update('users', user.id, { status: 'Submitted' });

    let link = `/admin/verification/cooperatives/${org.id}`;
    if (kind === 'investor') {
      // Investors are reviewed from the user verification queue.
      const existing = data.userVerification.find((v) => v.orgId === org.id);
      const checks = { identity: 'Uploaded', eligibility: 'Pending', riskAck: 'Done', emailVerified: !!user.contactVerifiedAt };
      if (existing) {
        update('userVerification', existing.id, { status: 'Submitted', submittedAt: todayISO(), checks });
        link = `/admin/verification/users/${existing.id}`;
      } else {
        const uvId = newId('uv');
        add('userVerification', { id: uvId, name: patch.org && patch.org !== 'Individual' ? patch.org : org.name, role: 'investor', email: org.email, submittedAt: todayISO(), status: 'Submitted', checks, orgId: org.id, userId: user.id });
        link = `/admin/verification/users/${uvId}`;
      }
    }
    notify(
      'admin',
      kind === 'cooperative' ? 'New cooperative submitted' : 'New investor submitted',
      `${patch.name || org.name} ${resubmission ? 'resubmitted with additional information' : 'submitted registration details for verification'}.`,
      link,
      'verification',
    );
  }, [user, data.userVerification, update, add, notify]);

  const decide = useCallback(({ kind, org, decision, note }) => {
    const collection = kind === 'cooperative' ? 'cooperatives' : 'investors';
    const status = DECISION_STATUS[decision];
    const at = nowISO();
    const owner = data.users.find((u) => u.orgId === org.id && u.role === kind);
    const audits = {
      review: ['Started verification review', 'Reviewer picked up the submission'],
      approve: ['Verified organisation', 'Documents and details checked'],
      info: ['Requested additional information', note],
      reject: ['Rejected registration', note],
    }[decision];
    update(
      collection,
      org.id,
      (r) => {
        const base = {
          status,
          reviewedAt: at,
          adminNote: decision === 'info' || decision === 'reject' ? note : decision === 'approve' ? null : r.adminNote || null,
          statusHistory: [...(r.statusHistory || []), { status, at, note: note || audits[1] }],
        };
        if (decision === 'approve') {
          base.verifiedAt = todayISO();
          if (kind === 'cooperative') base.documents = (r.documents || []).map((d) => ({ ...d, status: 'Verified', reviewer: 'Zainab Bello', reviewedAt: todayISO() }));
          else base.eligibility = 'Eligible';
        }
        return base;
      },
      {
        action: audits[0],
        entityType: ENTITY[kind],
        actor: 'Zainab Bello',
        role: 'admin',
        reason: `Demo simulation of an administrator decision. ${audits[1]}`,
        summary: `Status ${org.status} to ${status}`,
      },
    );
    if (owner) update('users', owner.id, { status });
    if (kind === 'investor') {
      const uv = data.userVerification.find((v) => v.orgId === org.id);
      if (uv) {
        update('userVerification', uv.id, (v) => ({
          status,
          checks: decision === 'approve' ? { ...v.checks, identity: 'Verified', eligibility: 'Eligible' } : v.checks,
        }));
      }
    }
    const base = kind === 'cooperative' ? '/coop' : '/investor';
    const copy = {
      review: ['Review started', `A reviewer started checking ${org.name}. You will be told the result here.`, '/onboarding/status'],
      approve: ['Registration verified', `${org.name} is now verified. You can go to your dashboard. Verification is not a guarantee of funding or returns.`, base],
      info: ['More information needed', `${org.name}: ${note}`, '/onboarding/status'],
      reject: ['Registration not approved', `${org.name}: ${note}`, '/onboarding/status'],
    }[decision];
    notify(kind, copy[0], copy[1], copy[2], 'verification');
    return status;
  }, [data.users, data.userVerification, update, notify]);

  return { submitOrg, decide };
}
