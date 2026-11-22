'use client';

import { Fragment, useEffect, useId, useState } from 'react';
import { Search, Trash2 } from 'lucide-react';
import { StudioEntityMenu } from './StudioEntityMenu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { entryFields, glossaryRows, updateGlossaryRow, type GlossaryDocument, type GlossaryList, type GlossaryRow } from '@/lib/studioGlossaryDraft';
import type { JsonIssue } from '@/lib/studioJsonDraft';

type Props = {
  doc: GlossaryDocument; onChange: (doc: GlossaryDocument) => void; disabled: boolean; issue?: JsonIssue;
  canFind: boolean; onFind: (row: GlossaryRow) => void;
};
const cellStyle = 'w-full min-w-20 resize-y rounded-sm border-0 bg-transparent px-1 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] aria-invalid:ring-1 aria-invalid:ring-destructive';
const norm = (value: string) => value.normalize('NFC').trim().toLowerCase();
const groups = { named_entities: 'Имя', terminology: 'Термин' };
const pageSize = 50;

export function GlossaryTable({ doc, onChange, disabled, issue, canFind, onFind }: Props) {
  const [filter, setFilter] = useState(() => typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('term') || '');
  const [page, setPage] = useState(0);
  const [active, setActive] = useState('');
  const id = useId();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const term = params.get('term');
    if (!term) return;
    const kind = params.get('kind');
    const row = document.getElementById(id)?.querySelectorAll<HTMLTableRowElement>('tr[data-source]');
    const match = Array.from(row ?? []).find(el => norm(el.dataset.source || '') === norm(term) && (!kind || el.dataset.kind === kind));
    match?.querySelector<HTMLInputElement>('input[data-target]')?.focus();
  }, [id]);
  const rows = glossaryRows(doc);
  const conflicts = Array.isArray(doc.conflicts) ? doc.conflicts.filter((c): c is Record<string, unknown> => c && typeof c === 'object' && typeof c.source === 'string') : [];
  const visible = rows.filter(row => active === row.list + row.index || [row.source,row.target,...row.forms].some(v => norm(v).includes(norm(filter))));

  const lastPage = Math.max(0,Math.ceil(visible.length / pageSize) - 1);
  const currentPage = Math.min(page,lastPage);
  const pageRows = visible.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  function add(list: GlossaryList) {
    setFilter('');
    const index = doc[list]?.length ?? 0;
    const position = list === 'named_entities' ? index : (doc.named_entities?.length ?? 0) + index;
    setPage(Math.floor(position / pageSize));
    const { source, target } = entryFields[list];
    onChange({ ...doc, [list]: [...doc[list] ?? [], { [source]: '', [target]: '' }] });
    requestAnimationFrame(() => document.getElementById(id + '-' + list + index)?.focus());
  }

  return <div className="grid min-w-0 gap-3">
    <div className="flex flex-wrap items-end justify-between gap-2">
      <label className="pt-field min-w-28 flex-1 sm:max-w-xs">Найти запись<Input type="search" value={filter} onChange={e => { setFilter(e.target.value); setPage(0); }} /></label>
      <StudioEntityMenu label="Добавить запись" triggerText="Добавить" disabled={disabled} actions={[
        { label: 'Имя', onClick: () => add('named_entities') },
        { label: 'Термин', onClick: () => add('terminology') },
      ]}/>
    </div>
    <div className="relative max-w-full overflow-x-auto">
      <table id={id} className="w-full min-w-[42rem] border-collapse text-left text-sm" aria-label="Записи глоссария">
        <thead className="pt-muted border-b"><tr>{['Тип','Оригинал','Перевод','Словоформы','Примечание'].map(label => <th key={label} scope="col" className="px-1 py-2 font-medium">{label}</th>)}<th scope="col"><span className="sr-only">Действия с записью</span></th></tr></thead>
        <tbody>{pageRows.map(row => {
          const { list, index } = row;
          const key = list + index;
          const keys = entryFields[list];
          const kind = list === 'named_entities' ? 'named_entity' : 'terminology';
          const matches = conflicts.filter(c => c.kind === kind && norm(String(c.source)) === norm(row.source));
          const change = (field: string, value: unknown) => onChange(updateGlossaryRow(doc, row, { [field]: value }));
          const fieldProps = (field: string, label: string) => ({
            'aria-label': label + ' · ' + (row.source || groups[list] + ' ' + (index + 1)),
            'aria-invalid': issue?.path === `${list}[${index}].${field}`, readOnly: disabled, className: cellStyle,
          });
          return <Fragment key={key}>
            <tr data-source={row.source} data-kind={kind} className="border-b align-top" onFocus={() => setActive(key)} onBlur={e => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setActive('');
            }}>
              <td className="pt-muted px-1 py-2">{groups[list]}</td>
              <td><input id={id + '-' + key} {...fieldProps(keys.source,'Оригинал')} value={row.source} onChange={e => change(keys.source,e.target.value)}/></td>
              <td><input data-target {...fieldProps(keys.target,'Перевод')} value={row.target} onChange={e => change(keys.target,e.target.value)}/></td>
              <td><textarea {...fieldProps('forms','Словоформы, каждая с новой строки')} rows={Math.min(3, Math.max(1,row.forms.length))} value={row.forms.join('\n')} onChange={e => change('forms',e.target.value ? e.target.value.split('\n') : [])}/></td>
              <td><textarea {...fieldProps('note','Примечание')} rows={1} value={row.note} onChange={e => change('note',e.target.value)}/></td>
              <td><div className="flex">
                <Button size="icon-sm" variant="ghost" title="Найти употребления в проекте" aria-label={'Найти употребления в проекте · ' + row.source} disabled={!canFind || !row.source} onClick={() => onFind(row)}><Search aria-hidden="true"/></Button>
                <Button size="icon-sm" variant="ghost" title="Убрать запись" aria-label={'Убрать запись · ' + row.source} disabled={disabled} onClick={() => onChange(updateGlossaryRow(doc,row,null))}><Trash2 aria-hidden="true"/></Button>
              </div></td>
            </tr>
            {matches.map((conflict, i) => <tr key={i}><td colSpan={6} className="border-b px-2 py-2"><div className="flex flex-wrap items-center gap-2">
              <span>Расхождение{typeof conflict.chapter_index === 'number' ? ' · глава ' + (conflict.chapter_index + 1) : ''}</span>
              {!!conflict.proposed_target && <Button size="sm" variant="outline" disabled={disabled} onClick={() => onChange({
                ...updateGlossaryRow(doc,row,{ [keys.target]: conflict.proposed_target }), conflicts: conflicts.filter(c => c !== conflict),
              })}>Выбрать «{String(conflict.proposed_target)}»</Button>}
              <Button size="sm" variant="ghost" disabled={disabled || !row.target} onClick={() => onChange({ ...doc, conflicts: conflicts.filter(c => c !== conflict) })}>Подтвердить «{row.target}»</Button>
            </div></td></tr>)}
          </Fragment>;
        })}</tbody>
      </table>
    </div>
    {lastPage > 0 && <nav className="flex flex-wrap items-center justify-end gap-2 text-sm" aria-label="Страницы таблицы глоссария">
      <Button size="sm" variant="ghost" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Предыдущая</Button>
      <span>{currentPage + 1} из {lastPage + 1}</span>
      <Button size="sm" variant="ghost" disabled={currentPage === lastPage} onClick={() => setPage(currentPage + 1)}>Следующая</Button>
    </nav>}
    {!visible.length && <p className="pt-muted">{rows.length ? 'Подходящих записей нет.' : 'В словаре пока нет записей.'}</p>}
  </div>;
}
