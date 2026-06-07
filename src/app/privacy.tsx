import { LegalScreen } from '@/components/legal-screen';
import { PRIVACY_POLICY } from '@/lib/legal-content';

export default function PrivacyScreen() {
  return <LegalScreen doc={PRIVACY_POLICY} />;
}
