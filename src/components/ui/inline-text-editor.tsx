'use client';

import { useEffect, useId, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import type { JSONContent } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import { UndoRedo } from '@tiptap/extensions';
import { Bold as BoldIcon, Italic as ItalicIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CopyTextButton } from '@/components/ui/copy-text';
import { appendReviewRun, readReviewText, writeReviewText, type ReviewRun } from '@/lib/studio/reviewText';

type Format = 'bold' | 'italic';
const defaultFormats: readonly Format[] = ['bold', 'italic'];
const extensions = { bold: Bold, italic: Italic };

function toDocument(value: string): JSONContent {
  const paragraphs: JSONContent[] = [{ type: 'paragraph', content: [] }];
  for (const run of readReviewText(value)) {
    const marks = [run.bold && { type: 'bold' }, run.italic && { type: 'italic' }].filter(Boolean) as { type: string }[];
    for (const [index, text] of run.text.split('\n').entries()) {
      if (index) paragraphs.push({ type: 'paragraph', content: [] });
      if (text) paragraphs[paragraphs.length - 1].content!.push({ type: 'text', text, marks });
    }
  }
  return { type: 'doc', content: paragraphs };
}

function fromDocument(doc: JSONContent): string {
  const runs: ReviewRun[] = [];
  for (const [index, paragraph] of (doc.content ?? []).entries()) {
    if (index) appendReviewRun(runs, '\n', false, false);
    for (const item of paragraph.content ?? []) {
      const marks = item.marks ?? [];
      appendReviewRun(runs, item.text ?? '', marks.some(m => m.type === 'bold'), marks.some(m => m.type === 'italic'));
    }
  }
  return writeReviewText(runs);
}

export default function InlineTextEditor({ label, value, onChange, disabled = false, formats = defaultFormats }: {
  label: string; value: string; onChange: (value: string) => void; disabled?: boolean; formats?: readonly Format[];
}) {
  const labelId = useId();
  const lastEmitted = useRef(value);
  const formatKey = formats.join(' ');
  const editor = useEditor({
    extensions: [Document, Paragraph, Text, UndoRedo, ...formats.map(name => extensions[name])],
    content: toDocument(value),
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    enableInputRules: false,
    enablePasteRules: false,
    editable: !disabled,
    editorProps: {
      attributes: {
        role: 'textbox', 'aria-multiline': 'true', 'aria-labelledby': labelId,
        class: 'min-h-24 whitespace-pre-wrap break-words px-3 py-2 focus-visible:outline-2 focus-visible:outline-[var(--app-accent)] [&_strong]:font-bold [&_em]:italic',
      },
    },
    onUpdate: ({ editor: active }) => {
      const next = fromDocument(active.getJSON());
      lastEmitted.current = next;
      onChange(next);
    },
  }, [formatKey]);
  useEffect(() => {
    if (!editor || lastEmitted.current === value) return;
    editor.commands.setContent(toDocument(value), { emitUpdate: false });
    lastEmitted.current = value;
  }, [editor, value]);
  useEffect(() => { editor?.setEditable(!disabled, false); }, [editor, disabled]);
  const plainText = readReviewText(value).map(run => run.text).join('');

  return <div className="pt-field">
    <span id={labelId}>{label}</span>
    <div className="rounded-lg border border-[var(--app-border)]">
      <div role="group" aria-label="Форматирование текста" className="flex items-center gap-1 border-b border-[var(--app-border)] px-1">
        {formats.map(name => {
          const bold = name === 'bold';
          const Icon = bold ? BoldIcon : ItalicIcon;
          const title = bold ? 'Полужирный' : 'Курсив';
          return <Button key={name} type="button" variant="ghost" size="icon-sm" title={title} aria-label={title}
            aria-pressed={editor?.isActive(name) ?? false} disabled={disabled || !editor}
            className="aria-pressed:bg-[var(--app-surface-bg)] aria-pressed:text-[var(--app-accent)]"
            onMouseDown={event => event.preventDefault()}
            onClick={() => editor?.chain().focus().toggleMark(name).run()}><Icon aria-hidden="true"/></Button>;
        })}
        <span className="ms-auto"><CopyTextButton text={plainText} subject={label}/></span>
      </div>
      {editor ? <EditorContent editor={editor}/> : <p role="status" className="px-3 py-2">Загружаем редактор…</p>}
    </div>
  </div>;
}
