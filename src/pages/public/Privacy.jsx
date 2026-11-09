import '../../styles/pages/pub.css';
import { useDocTitle } from '../../components/pub/hooks.js';
import { LegalDoc } from '../../components/pub/LegalDoc.jsx';
import { PRIVACY } from '../../components/pub/legal.js';

export default function Privacy() {
  useDocTitle('Privacy Notice');
  return (
    <LegalDoc
      doc={PRIVACY}
      eyebrow="Legal"
      related={[
        { to: '/terms', label: 'Terms of service' },
        { to: '/contact', label: 'Make a privacy request' },
        { to: '/complaints-information', label: 'Complaints information' },
      ]}
    />
  );
}
