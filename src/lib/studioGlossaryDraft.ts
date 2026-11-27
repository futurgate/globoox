import { readJson, type JsonIssue } from './studioJsonDraft';

type Fields = Record<string, unknown>;
export type GlossaryList = 'named_entities' | 'terminology';
export type GlossaryDocument = Fields & Partial<Record<GlossaryList, Fields[]>>;
export type GlossaryRow = {
  list: GlossaryList; index: number; source: string; target: string; forms: string[]; note: string;
};
export const entryFields = {
  named_entities: { source: 'entity', target: 'preferred_target' },
  terminology: { source: 'source_term', target: 'preferred_translation' },
} as const;
export const emptyGlossary: GlossaryDocument = { named_entities: [], terminology: [] };
const lists: GlossaryList[] = ['named_entities', 'terminology'];
const isRecord = (v: unknown): v is Fields => !!v && typeof v === 'object' && !Array.isArray(v);
const isText = (v: unknown): v is string => typeof v === 'string';

export function glossaryRows(doc: GlossaryDocument): GlossaryRow[] {
  return lists.flatMap(list => (doc[list] ?? []).map((entry, index) => {
    const keys = entryFields[list];
    return { list, index,
      source: isText(entry[keys.source]) ? entry[keys.source] as string : '',
      target: isText(entry[keys.target]) ? entry[keys.target] as string : '',
      note: isText(entry.note) ? entry.note : '',
      forms: Array.isArray(entry.forms) ? entry.forms.filter(isText) : [],
    };
  }));
}

export function inspectGlossary(raw: string): { doc?: GlossaryDocument; issue?: JsonIssue } {
  const parsed = readJson(raw);
  if (parsed.issue) return { issue: parsed.issue };
  if (!isRecord(parsed.value)) return { issue: { message: 'Для глоссария нужен объект JSON.' } };
  const obj = parsed.value;
  for (const list of lists) {
    const rows = obj[list];
    if (rows !== undefined && !(Array.isArray(rows) && rows.every(isRecord))) {
      return { issue: { path: list, message: 'Нужен список записей.' } };
    }
  }
  const doc = obj as GlossaryDocument;
  for (const field of ['_frozen', '_build']) {
    if (Object.hasOwn(doc, field)) return { doc, issue: { path: field, message: 'Служебное поле. Удалите его из редактируемого JSON.' } };
  }
  for (const list of lists) {
    const seen = new Set<string>();
    for (const [index, entry] of (doc[list] ?? []).entries()) {
      const prefix = `${list}[${index}]`;
      const { source, target } = entryFields[list];
      for (const [field, label] of [[source, 'оригинал'], [target, 'перевод']] as const) {
        if (!isText(entry[field]) || !entry[field].trim()) return { doc, issue: { path: prefix + '.' + field, message: 'Укажите ' + label + ' текстом.' } };
      }
      const key = (entry[source] as string).normalize('NFC').trim().toLowerCase();
      if (seen.has(key)) return { doc, issue: { path: prefix + '.' + source, message: 'Такая запись уже есть в этой группе.' } };
      seen.add(key);
      if (entry.type !== undefined && !isText(entry.type)) return { doc, issue: { path: prefix + '.type', message: 'Тип должен быть текстом.' } };
      if (entry.note !== undefined && !isText(entry.note)) return { doc, issue: { path: prefix + '.note', message: 'Примечание должно быть текстом.' } };
      if (entry.forms !== undefined && !(Array.isArray(entry.forms) && entry.forms.every(isText))) return { doc, issue: { path: prefix + '.forms', message: 'Укажите словоформы списком строк.' } };
    }
  }
  for (const list of ['character_voice_profiles', 'conflicts']) {
    if (doc[list] !== undefined && !(Array.isArray(doc[list]) && doc[list].every(isRecord))) {
      return { doc, issue: { path: list, message: 'Нужен список объектов.' } };
    }
  }
  if (doc.prose_style_profile !== undefined && !isRecord(doc.prose_style_profile)) {
    return { doc, issue: { path: 'prose_style_profile', message: 'Профиль стиля должен быть объектом.' } };
  }
  return { doc };
}

export function updateGlossaryRow(doc: GlossaryDocument, row: Pick<GlossaryRow,'list'|'index'>, patch: Fields | null): GlossaryDocument {
  const entries = [...(doc[row.list] ?? [])];
  const sourceField = entryFields[row.list].source;
  const oldSource = entries[row.index]?.[sourceField];
  if (patch) entries[row.index] = { ...entries[row.index], ...patch };
  else entries.splice(row.index, 1);
  const next = { ...doc, [row.list]: entries };
  const sourceChanged = !patch || (sourceField in patch && patch[sourceField] !== oldSource);
  if (sourceChanged && typeof oldSource === 'string' && Array.isArray(doc.conflicts)) {
    const kind = row.list === 'named_entities' ? 'named_entity' : 'terminology';
    const key = (s: string) => s.normalize('NFC').trim().toLowerCase();
    next.conflicts = doc.conflicts.flatMap(c => {
      if (!isRecord(c) || c.kind !== kind || typeof c.source !== 'string' || key(c.source) !== key(oldSource)) return [c];
      return patch ? [{ ...c, source: patch[sourceField] }] : [];
    });
  }
  return next;
}
