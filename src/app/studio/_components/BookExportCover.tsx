'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { studioFetch } from '@/lib/studioFetch';
import { ActionFeedback } from './BookStage';
import { checkedResponse, type useBookAction, useBookData } from './bookRequests';

type ExportCover = {
  source: 'original' | 'custom' | 'none';
  preview: string | null;
};

const sourceLabels = {
  original: 'Для этого перевода выбрана исходная обложка книги.',
  custom: 'Для этого перевода сохранена своя обложка.',
  none: 'У этого перевода пока нет обложки.',
};

export function BookExportCover({ bookId, lang, action, disabled }: {
  bookId: string; lang: string; action: ReturnType<typeof useBookAction>; disabled: boolean;
}) {
  const endpoint = `/api/books/${encodeURIComponent(bookId)}/export-cover?lang=${encodeURIComponent(lang)}`;
  const input = useRef<HTMLInputElement>(null);
  const [reload, setReload] = useState(0);
  const [saved, setSaved] = useState<ExportCover>();
  const loaded = useBookData<ExportCover>(endpoint, reload);
  const current = saved ?? loaded?.data;
  const locked = action.busy || disabled;

  function change(file?: File) {
    void action.run(async signal => {
      let body: FormData | undefined;
      if (file) {
        if (file.size > 3 * 1024 * 1024) throw new Error('Выберите изображение размером до 3 МБ.');
        if (!file.size) throw new Error('Файл пуст. Выберите изображение JPEG или PNG.');
        body = new FormData();
        body.append('file', file);
      }
      const response = await checkedResponse(await studioFetch(endpoint, {
        method: file ? 'PUT' : 'DELETE', body, signal, cache: 'no-store',
      }));
      const updated: ExportCover = await response.json();
      if (!signal.aborted) setSaved(updated);
      if (!file && updated.source === 'none') return 'Обложка удалена. EPUB можно скачать без неё.';
      return file ? 'Обложка сохранена для следующего экспорта EPUB.' : 'Исходная обложка восстановлена.';
    });
  }

  return <Card className="gap-3 p-5">
    <h2>Обложка перевода</h2>
    {!current && !loaded?.error && <p role="status">Загружаем обложку…</p>}
    {loaded?.error && !current && <div className="grid justify-items-start gap-2">
      <ActionFeedback error={loaded.error}/>
      <Button variant="outline" onClick={() => setReload(n => n + 1)}>Повторить загрузку</Button>
    </div>}
    {current && <div className="flex flex-wrap items-start gap-4">
      {current.preview && <Image unoptimized src={current.preview} width={112} height={160}
        className="h-auto max-h-40 w-auto max-w-28 rounded object-contain" alt="Обложка для экспорта перевода"/>}
      <div className="grid min-w-0 flex-1 basis-56 gap-2">
        <p>{sourceLabels[current.source]}</p>
        <p className="pt-muted text-sm">JPEG или PNG до 3 МБ. Обложка войдёт в EPUB на выбранном языке.</p>
        <input ref={input} type="file" hidden accept="image/jpeg,image/png,.jpg,.jpeg,.png" onChange={event => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (file) change(file);
        }}/>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={locked} onClick={() => input.current?.click()}>
            {current.source === 'none' ? 'Добавить обложку' : 'Заменить обложку'}
          </Button>
          {current.source === 'custom' && <Button variant="ghost" disabled={locked} onClick={() => change()}>
            Убрать свою обложку
          </Button>}
        </div>
      </div>
    </div>}
    {action.busy && <p className="pt-muted" role="status">Сохраняем обложку…</p>}
    <ActionFeedback error={action.error} notice={action.notice}/>
  </Card>;
}
