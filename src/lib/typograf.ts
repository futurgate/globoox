import Typograf from 'typograf';
import { ContentBlock } from '@/lib/api';
import { carryBlockEmphasis } from '@/lib/inlineMarks';

const typografByLocale = new Map<string, Typograf>();

function getLocale(lang?: string | null): string | null {
    if (!lang) return null;
    const normalized = lang.toLowerCase();
    if (normalized === 'en') return 'en-US';
    if (normalized === 'en-gb') return 'en-GB';
    if (normalized === 'en-us') return 'en-US';

    const short = normalized.split('-')[0];
    if (Typograf.hasLocale(normalized)) return normalized;
    if (short && Typograf.hasLocale(short)) return short;
    return null;
}

function getTypograf(locale: string): Typograf {
    const cached = typografByLocale.get(locale);
    if (cached) return cached;
    const tp = new Typograf({ locale: [locale] });
    typografByLocale.set(locale, tp);
    return tp;
}

function processText(tp: Typograf, value: string, isFrenchLocale: boolean): string {
    const processed = tp.execute(normalizeSoftWrapHyphens(value));
    return isFrenchLocale ? normalizeFrenchGuillemets(processed) : processed;
}

// EPUB/OCR sources sometimes store legacy line-wrap hyphenation as "fu- ture".
// Join only when hyphen is followed by whitespace and both sides look like word letters.
function normalizeSoftWrapHyphens(value: string): string {
    return value
        .replace(/([A-Za-zÀ-ÖØ-öø-ÿА-Яа-яЁё]{2,})-\s+([A-Za-zÀ-ÖØ-öø-ÿА-Яа-яЁё]{2,})/g, '$1$2')
        .replace(/\u00AD/g, '');
}

function normalizeFrenchGuillemets(value: string): string {
    // Keep French spacing inside guillemets as narrow no-break spaces.
    return value
        .replace(/«(?:\u0020|\u00A0|\u202F)*/g, '«\u202F')
        .replace(/(?:\u0020|\u00A0|\u202F)*»/g, '\u202F»');
}

export function applyTypografToBlocks(blocks: ContentBlock[], lang?: string | null): ContentBlock[] {
    const locale = getLocale(lang);
    if (!locale || blocks.length === 0) return blocks;

    const tp = getTypograf(locale);
    const isFrenchLocale = locale.toLowerCase().startsWith('fr');

    return blocks.map((block) => {
        switch (block.type) {
            case 'paragraph':
            case 'quote':
            case 'heading': {
                const source = block.text;
                try {
                    const text = processText(tp, source, isFrenchLocale);
                    if (text === source) return block;
                    // Typografed text may change length (…, —, nbsp) — offset marks no
                    // longer align, so keep only block-level emphasis.
                    return { ...block, text, marks: carryBlockEmphasis(source, block.marks, text) };
                } catch {
                    if (!isFrenchLocale) return block;
                    const text = normalizeFrenchGuillemets(normalizeSoftWrapHyphens(source));
                    if (text === source) return block;
                    return { ...block, text, marks: carryBlockEmphasis(source, block.marks, text) };
                }
            }
            case 'list': {
                if (!block.items?.length) return block;
                let changed = false;
                const items = block.items.map((item) => {
                    try {
                        const next = processText(tp, item, isFrenchLocale);
                        if (next !== item) changed = true;
                        return next;
                    } catch {
                        if (!isFrenchLocale) return item;
                        const next = normalizeFrenchGuillemets(normalizeSoftWrapHyphens(item));
                        if (next !== item) changed = true;
                        return next;
                    }
                });
                if (!changed) return block;
                return { ...block, items };
            }
            default:
                return block;
        }
    });
}
