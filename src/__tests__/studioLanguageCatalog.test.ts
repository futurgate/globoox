import { expect, it } from 'vitest';
import { catalogChoices, defaultCatalog, validLanguageCode } from '../lib/studioLanguages';

const catalog = {
  ...defaultCatalog,
  languages: [
    ...defaultCatalog.languages.map(item => item.code === 'en' ? { ...item, label: 'Мой английский', hidden: true } : item),
    { code: 'pt-br', label: 'Португальский', hidden: false, builtin: false, revision: 2 },
  ],
};

it('keeps a hidden target accessible from an existing translation and filters it from other choices', () => {
  const active = catalogChoices(catalog, ['EN', 'FR'], 'EN');
  expect(active.find(c => c.code === 'EN')).toMatchObject({language: { label: 'Мой английский', hidden: true }, available: true});
  expect(catalogChoices(catalog, ['EN','FR'], 'FR').map(c => c.code)).toEqual(['FR', 'PT-BR']);
});

it('keeps a personal language editable without authorizing an unsupported target', () => {
  const choices = catalogChoices(catalog, ['FR'], 'FR');
  expect(choices.find(c => c.code === 'PT-BR')).toMatchObject({available: false, selectable: false});
  expect(choices.find(c => c.code === 'FR')).toMatchObject({available: true});
});

it('accepts codes supported by the personal catalog and rejects free-form text', () => {
  for (const code of ['DE', 'pt-BR', 'zh-Hant', 'es-419', 'zh-Hant-TW']) expect(validLanguageCode(code)).toBe(true);
  for (const code of ['', 'italian', 'ru/fr', 'e', 'en-*']) expect(validLanguageCode(code)).toBe(false);
});

it('offers a personal or otherwise unsupported language for manual project glossaries only', () => {
  const project = catalogChoices(catalog, ['EN', 'FR'], 'PT-BR', true);
  expect(project.find(c => c.code === 'PT-BR')).toMatchObject({ selectable: true, available: false });
  expect(project.find(c => c.code === 'RU')).toMatchObject({ selectable: true, available: false });
  expect(project.map(c => c.code)).not.toContain('EN');
  expect(catalogChoices(catalog, ['FR'], 'FR').some(c => c.code === 'RU')).toBe(false);
});
