import { LegalScreen } from '@/components/legal-screen';
import { TERMS_OF_SERVICE } from '@/lib/legal-content';

export default function TermsScreen() {
  return <LegalScreen doc={TERMS_OF_SERVICE} />;
}
