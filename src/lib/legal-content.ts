export type LegalSection = { heading: string; body: string };
export type LegalDoc = { title: string; updated: string; sections: LegalSection[] };

export const PRIVACY_POLICY: LegalDoc = {
  title: 'Privacy Policy — MyKhata Book',
  updated: 'Last updated: June 2026',
  sections: [
    {
      heading: '1. Information We Collect',
      body: 'We collect information you provide: name, email address, and financial entries you add to your books. We do not share your personal data with third parties.',
    },
    {
      heading: '2. How We Use Your Information',
      body: 'Your data is used solely to provide the MyKhata Book service. Financial entries are stored securely and are only accessible by you.',
    },
    {
      heading: '3. Data Storage & Security',
      body: 'Your data is stored on secure servers. We use industry-standard encryption to protect your information.',
    },
    {
      heading: '4. Google Sign-In',
      body: 'If you sign in with Google, we receive your name and email address from Google. We do not access any other Google account data.',
    },
    {
      heading: '5. Data Deletion',
      body: 'You may delete your account and all associated data at any time by contacting us or using the delete account option in Settings.',
    },
    {
      heading: '6. Contact Us',
      body: 'For any privacy concerns, contact us at: support@mykhatabook.com',
    },
    {
      heading: '7. Changes to This Policy',
      body: 'We may update this policy. Changes will be reflected with an updated date at the top of this page.',
    },
  ],
};

export const ABOUT_DOC: LegalDoc = {
  title: 'About MyKhata Book',
  updated: 'Version 1.0.0',
  sections: [
    {
      heading: 'What is MyKhata Book?',
      body: 'MyKhata Book is a simple, fast ledger for tracking money in and money out. Organise your finances into separate books — one per month, business, or project — and always know your balance.',
    },
    {
      heading: 'Key Features',
      body: 'Multiple books with running balances, quick Cash In / Cash Out entries, categories and payment methods, spending insights, and one-tap Excel and PDF export.',
    },
    {
      heading: 'Your Data, Your Control',
      body: 'You own all the data you enter. Everything is private to your account and protected by row-level security. Export or delete your data anytime.',
    },
    {
      heading: 'Contact',
      body: 'Questions, feedback, or support: support@mykhatabook.com',
    },
  ],
};

export const TERMS_OF_SERVICE: LegalDoc = {
  title: 'Terms of Service — MyKhata Book',
  updated: 'Last updated: June 2026',
  sections: [
    {
      heading: '1. Acceptance of Terms',
      body: 'By using MyKhata Book you agree to these terms. If you do not agree, please do not use the app.',
    },
    {
      heading: '2. Use of the App',
      body: 'MyKhata Book is for personal and small business expense tracking. You agree not to misuse the service.',
    },
    {
      heading: '3. Your Data',
      body: 'You own all financial data you enter. We do not claim ownership of your data.',
    },
    {
      heading: '4. Account Responsibility',
      body: 'You are responsible for maintaining the security of your account credentials.',
    },
    {
      heading: '5. Disclaimer',
      body: 'MyKhata Book is provided as-is. We are not responsible for financial decisions made based on data in the app.',
    },
    {
      heading: '6. Termination',
      body: 'We reserve the right to suspend accounts that violate these terms.',
    },
    {
      heading: '7. Contact',
      body: 'Questions about these terms: support@mykhatabook.com',
    },
  ],
};
