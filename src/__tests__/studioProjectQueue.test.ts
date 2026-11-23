import { describe, expect, it } from 'vitest';
import type { WorkspaceBook } from '@/lib/translationWorkspaceTypes';
import { projectLanguages, queueBooks, runScope } from '@/app/studio/_components/projectQueue';

function book(id: string, position: number, other: Partial<WorkspaceBook> = {}): WorkspaceBook {
  return { id, title: id, author: null, projectId:'mine', projectPosition:position, processingStatus:'ready',
    sourceLanguage:'RU', volumeNumber:null, seriesId:null, ...other };
}

describe('project queue', () => {
  const first = book('volume-7',1), second = book('volume-8',2), last = book('volume-9',3);
  it('keeps the saved project order regardless of catalog order, title and legacy series', () => {
    const books = [last,book('outside',1,{projectId:'other',seriesId:'s'}),second,book('hidden',5,{projectArchived:true}),first];
    expect(queueBooks(books,'mine')).toEqual([first,second,last]);
    expect(queueBooks(books,'mine',true).map(b => b.id)).toEqual(['hidden']);
  });
  it('retains skipped predecessors for glossary work and excludes the unused tail', () => {
    expect(runScope([first,second,last],new Set([second.id]),'EN')).toEqual({scope:[first,second],reason:''});
    expect(runScope([first,second,last],new Set([first.id]),'EN').scope).toEqual([first]);
    expect(runScope([first,second,last],new Set(),'EN').reason).toBeTruthy();
  });
  it('validates the scope including required predecessors and ignores incompatible later books', () => {
    const invalid = book('later',2,{sourceLanguage:'EN'});
    expect(projectLanguages([first,invalid])).toEqual(['EN','FR','RU']);
    expect(runScope([first,invalid],new Set([first.id]),'EN').reason).toBe('');
    expect(runScope([invalid,first],new Set([first.id]),'EN').reason).toContain(invalid.title);
    expect(runScope([book('preparing',1,{processingStatus:'pending'}),second],new Set([second.id]),'EN').reason).toContain('preparing');
  });
});
