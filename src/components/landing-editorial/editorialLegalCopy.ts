import type { Metadata } from 'next';

export type EditorialLegalKind = 'terms' | 'privacy';

export type EditorialLegalSection = {
  id: string;
  heading: string;
  paragraphs: readonly string[];
  items?: readonly string[];
  pending?: readonly string[];
  contact?: { label: string; email: string };
};

export type EditorialLegalDocument = {
  kind: EditorialLegalKind;
  title: string;
  path: string;
  description: string;
  introduction: string;
  sections: readonly EditorialLegalSection[];
};

export const editorialLegalDraftLabel = 'Draft for review · Not yet published';
export const editorialLegalContactEmail = 'support@globoox.co';

// Provenance: the original English legal bodies remain untouched in
// src/components/landing/Footer.tsx (TERMS_SECTIONS / PRIVACY_SECTIONS).
// These new review drafts describe verified current behavior rather than the
// original text's prospective purchases, audio and publishing features.
const documents: Record<EditorialLegalKind, EditorialLegalDocument> = {
  terms: {
    kind: 'terms',
    title: 'Terms of Use',
    path: '/landing-editorial/legal/terms',
    description: 'Review draft of the terms for Globoox’s current reading and translation beta.',
    introduction: 'A working draft for the current Globoox beta. These terms are not yet in effect; the details marked below still need to be confirmed before publication.',
    sections: [
      {
        id: 'beta',
        heading: '1. The current beta',
        paragraphs: [
          'Globoox lets readers upload EPUB files, read their books and request AI-generated translations. The beta access offered here is free of charge. Paid checkout is not currently available in this preview.',
          'This draft covers the current reading and translation experience. It does not set terms for future book purchases, subscriptions or audio services.',
        ],
      },
      {
        id: 'accounts',
        heading: '2. Your account',
        paragraphs: [
          'Some features require an account. Globoox supports email and password sign-in and Google sign-in through Supabase.',
          'Keep your sign-in details secure, use accurate account information and do not access another person’s account without permission.',
        ],
        pending: ['Minimum age and any eligibility restrictions must be confirmed before publication.'],
      },
      {
        id: 'your-books',
        heading: '3. Your books and permissions',
        paragraphs: [
          'Only upload books or other materials that you have the right to upload, read and use with translation services. Uploading a file does not transfer ownership of its content to Globoox.',
          'Providing the features you request requires permission to store, parse, display and transmit your uploaded content, and to produce and store translations. This processing uses cloud services and the translation backend described in the Privacy Policy draft.',
        ],
      },
      {
        id: 'translations',
        heading: '4. Automated translations',
        paragraphs: [
          'Translations are generated automatically and may contain errors, omissions or changes in meaning. They are not a promise of complete accuracy or human review.',
          'Check the original text where accuracy matters. Keep your own copy of the source book.',
        ],
      },
      {
        id: 'acceptable-use',
        heading: '5. Using Globoox responsibly',
        paragraphs: ['Do not use Globoox to:'],
        items: [
          'Upload or use content without the necessary rights or permissions.',
          'Access other people’s accounts or private data without authorization.',
          'Bypass access controls, disrupt the service or deliberately overload its systems.',
          'Use the service for unlawful or abusive activity.',
        ],
      },
      {
        id: 'availability',
        heading: '6. Beta availability',
        paragraphs: [
          'The beta is still being developed. Features, supported files and languages may change, and the service may be interrupted or unavailable.',
          'Do not use Globoox as the only place you keep a book. This draft does not promise uninterrupted access or permanent storage.',
        ],
      },
      {
        id: 'removal',
        heading: '7. Removing a book or leaving',
        paragraphs: [
          'The library includes a Delete action that removes a book from the visible library. This is not a promise that every associated copy, translation, backup or diagnostic record is immediately erased.',
          'You can sign out or stop using the beta. Account-deletion requests can be sent to the contact below. The complete data-removal scope still needs to be confirmed; the Privacy Policy draft identifies these open details.',
        ],
      },
      {
        id: 'operator',
        heading: '8. Operator and final terms',
        paragraphs: ['The following details are unresolved. This document remains a review draft until they are confirmed and the final terms are published.'],
        contact: { label: 'Service and account requests', email: editorialLegalContactEmail },
        pending: [
          'Operator’s legal name, country and address.',
          'Applicable contractual law and jurisdiction, if any.',
          'Final liability, termination and changes-to-terms provisions.',
        ],
      },
    ],
  },
  privacy: {
    kind: 'privacy',
    title: 'Privacy Policy',
    path: '/landing-editorial/legal/privacy',
    description: 'Review draft describing the current data flows in Globoox and the details still to be confirmed.',
    introduction: 'A working account of how the current product handles data. This policy is not yet published. It identifies confirmed data flows and keeps unresolved details visible for review.',
    sections: [
      {
        id: 'operator',
        heading: '1. Who operates Globoox',
        paragraphs: ['The operator’s legal identity has not yet been confirmed for this document. Privacy questions and data requests can be sent to the contact below.'],
        contact: { label: 'Privacy contact', email: editorialLegalContactEmail },
        pending: [
          'Operator’s legal name, country and address.',
        ],
      },
      {
        id: 'information',
        heading: '2. Information handled by the product',
        paragraphs: ['Depending on how you use Globoox, the product handles:'],
        items: [
          'Account identifiers, email address and sign-in information provided through the authentication service.',
          'Uploaded EPUB files, filenames, file sizes and book metadata.',
          'Book content, generated translations, library activity, reading position and language or display preferences.',
          'Browser and request information, usage events, performance measurements and error diagnostics.',
          'Campaign parameters from a link you followed, when present.',
        ],
      },
      {
        id: 'books',
        heading: '3. Books, translation and local storage',
        paragraphs: [
          'EPUB files are uploaded to Supabase Storage using a signed upload URL. The backend then processes the uploaded file. Reading and translation requests pass through the service’s backend; this is not processing that happens only on your device.',
          'The browser also stores book metadata, chapter structure and text, generated translations and reading-related data in local caches, including IndexedDB. Reading position is synchronized with the server.',
        ],
        pending: ['The production AI provider, processing region, provider retention settings and any provider use of submitted data must be confirmed.'],
      },
      {
        id: 'providers',
        heading: '4. Services involved',
        paragraphs: ['The current implementation uses the following services. Their inclusion here describes the product’s integrations, not a guarantee about their retention or contractual terms.'],
        items: [
          'Supabase provides account authentication and cloud file storage. Google sign-in is available through the authentication flow.',
          'PostHog provides product analytics. Events can include account identifiers and email, book titles or filenames, reading activity and translation performance. These events are not described as anonymous.',
          'Microsoft Clarity is currently disabled.',
          'Sentry provides error and performance diagnostics. Server and edge configurations allow personal data; upload error reports can include the filename and file size.',
        ],
        pending: ['Confirm the complete production provider list, hosting locations and data-processing arrangements.'],
      },
      {
        id: 'cookies',
        heading: '5. Cookies and your choices',
        paragraphs: [
          'The marketing-page banner offers Necessary only and Accept all. It controls PostHog capture for those pages through a saved choice in localStorage. That saved choice expires after 24 hours, when the banner asks again.',
          'The product also uses authentication cookies, a language-preference cookie, browser caches and session storage. Campaign parameters can be stored in session storage when present in the page URL.',
          'The marketing-page choice does not currently control every diagnostic or application integration. Application analytics have a separate scope. Clearing browser storage removes local preferences and caches, but does not by itself delete server-held data.',
        ],
      },
      {
        id: 'retention',
        heading: '6. Retention and deletion',
        paragraphs: [
          'The library’s Delete action removes a book from the visible library. The implementation does not establish a complete deletion timetable for the original upload, translations, local caches, backups or analytics records.',
          'A self-service account-deletion or personal-data export flow has not yet been confirmed for this policy. Requests can be sent to the privacy contact below. No specific retention period or complete-erasure guarantee is made in this draft.',
        ],
        pending: ['Define retention periods, backup handling, the account-deletion process and the scope of data-request responses.'],
      },
      {
        id: 'locations',
        heading: '7. Processing locations and legal details',
        paragraphs: ['Cloud storage, translation and diagnostic services may involve processing outside your device. The relevant locations and arrangements have not yet been confirmed for publication.'],
        pending: [
          'Processing locations and any international-transfer arrangements.',
          'Applicable legal framework and the basis for each category of processing.',
          'Any age-related requirements and the final explanation of user rights.',
        ],
      },
      {
        id: 'requests',
        heading: '8. Questions and requests',
        paragraphs: [
          'For privacy questions or requests to access, correct or delete personal data, email the contact below. The full handling process and scope of data removal still need to be confirmed.',
          'This document has no effective date. It remains a review draft while the operator, providers, retention practices and request process are being confirmed.',
        ],
        contact: { label: 'Privacy and data requests', email: editorialLegalContactEmail },
      },
    ],
  },
};

export function getEditorialLegalDocument(kind: EditorialLegalKind): EditorialLegalDocument {
  return documents[kind];
}

export function createEditorialLegalMetadata(kind: EditorialLegalKind): Metadata {
  const document = getEditorialLegalDocument(kind);
  return {
    title: `${document.title} — Review draft | Globoox`,
    description: document.description,
    robots: { index: false, follow: false },
    alternates: { canonical: document.path },
    openGraph: {
      title: `${document.title} — Review draft | Globoox`,
      description: document.description,
      type: 'website',
      url: document.path,
    },
    twitter: {
      card: 'summary',
      title: `${document.title} — Review draft | Globoox`,
      description: document.description,
    },
  };
}
