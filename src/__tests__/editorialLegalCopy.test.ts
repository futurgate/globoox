import { describe, expect, it } from 'vitest';
import {
  createEditorialLegalMetadata,
  getEditorialLegalDocument,
} from '@/components/landing-editorial/editorialLegalCopy';

describe('legal review drafts remain isolated previews', () => {
  it.each(['terms', 'privacy'] as const)('%s has a self-canonical non-indexable review URL', (kind) => {
    const document = getEditorialLegalDocument(kind);
    const metadata = createEditorialLegalMetadata(kind);
    expect(document.path).toBe(`/landing-editorial/legal/${kind}`);
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.alternates).toEqual({ canonical: document.path });
    expect(metadata.openGraph?.url).toBe(document.path);
    expect(metadata.title).toContain('Review draft');
  });
});
