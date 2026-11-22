import { describe, expect, it } from 'vitest';
import { emptyGlossary, glossaryRows, inspectGlossary, updateGlossaryRow } from '../lib/studioGlossaryDraft';
import { readJson } from '../lib/studioJsonDraft';

describe('Studio glossary drafts', () => {
  const original = {
    prose_style_profile: { register:'informal' }, unknown_future_field:{ v:2 },
    named_entities:[{ entity:'Двор',preferred_target:'Court',forms:['Двора'],type:'place',origin_chapter:1 }],
    terminology:[{ source_term:'меч',preferred_translation:'sword' }],
  };
  it('changes one cell without rewriting voice, unknown fields, other rows, or the saved snapshot', () => {
    const { doc, issue } = inspectGlossary(JSON.stringify(original));
    expect(issue).toBeUndefined();
    const row = glossaryRows(doc!)[0];
    const next = updateGlossaryRow(doc!,row,{preferred_target:'The Court'});
    expect(next).toEqual({ ...original, named_entities:[{...original.named_entities[0], preferred_target:'The Court'}] });
    expect(glossaryRows(doc!)[0].target).toBe('Court');
    expect(inspectGlossary(JSON.stringify(next)).doc).toEqual(next);
  });
  it('locates a schema error in an editable row and rejects protected metadata', () => {
    const invalid = updateGlossaryRow(original,{list:'terminology',index:0},{forms:'bad'});
    const parsed = inspectGlossary(JSON.stringify(invalid));
    expect(parsed.doc).toEqual(invalid);
    expect(parsed.issue?.path).toBe('terminology[0].forms');
    for (const field of ['_build','_frozen']) expect(inspectGlossary(JSON.stringify({ ...original,[field]:true })).issue?.path).toBe(field);
  });
  it('can remove the last entry and diagnoses ambiguous duplicate sources per group', () => {
    expect(inspectGlossary(JSON.stringify(emptyGlossary)).issue).toBeUndefined();
    expect(updateGlossaryRow(original,{list:'named_entities',index:0},null).named_entities).toEqual([]);
    const duplicate = { ...original, named_entities:[...original.named_entities,{entity:' двор ',preferred_target:'Courtyard'}] };
    expect(inspectGlossary(JSON.stringify(duplicate)).issue?.path).toBe('named_entities[1].entity');
  });
  it('keeps a renamed term linked to its own open conflict and removes only its conflict on deletion', () => {
    const conflict = {kind:'named_entity', source:'Двор', existing_target:'Court', proposed_target:'Courtyard'};
    const other = {kind:'terminology', source:'меч', existing_target:'sword', proposed_target:'blade'};
    const doc = {...original, conflicts:[conflict,other]};
    const row = {list:'named_entities',index:0} as const;
    const renamed = updateGlossaryRow(doc,row,{entity:'Дворец'});
    expect(renamed.conflicts).toEqual([{...conflict,source:'Дворец'},other]);
    expect(updateGlossaryRow(renamed,row,null).conflicts).toEqual([other]);
  });
  it('handles malformed documents without presenting a fabricated table', () => {
    expect(inspectGlossary('{"named_entities":false}').doc).toBeUndefined();
    expect(inspectGlossary('null').doc).toBeUndefined();
    const broken = '{\n  "items": ]';
    const { issue } = readJson(broken);
    expect(issue?.message).toContain('JSON');
    expect(issue?.offset).toBe(broken.indexOf(']'));
    expect(issue?.message).toContain('Строка 2');
    expect(readJson('{"items": []}').issue).toBeNull();
  });
});
