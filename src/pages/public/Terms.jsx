import '../../styles/pages/pub.css';
import { useDocTitle } from '../../components/pub/hooks.js';
import { LegalDoc } from '../../components/pub/LegalDoc.jsx';
import { TERMS } from '../../components/pub/legal.js';

export default function Terms() {
  useDocTitle('Terms of Service');
  return (
    <LegalDoc
      doc={TERMS}
      eyebrow="Legal"
      related={[
        { to: '/privacy', label: 'Privacy notice' },
        { to: '/complaints-information', label: 'Complaints information' },
        { to: '/contact', label: 'Contact us' },
      ]}
    />
  );
}
