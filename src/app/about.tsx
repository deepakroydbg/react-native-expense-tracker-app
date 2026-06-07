import { LegalScreen } from '@/components/legal-screen';
import { ABOUT_DOC } from '@/lib/legal-content';

export default function AboutScreen() {
  return <LegalScreen doc={ABOUT_DOC} logo />;
}
