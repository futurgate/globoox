'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import IOSSettingsRow from '@/components/ui/ios-settings-row';
import { Textarea } from '@/components/ui/textarea';

const genres = [
  { id:'', label:'Не выбран' }, { id:'litrpg', label:'ЛитРПГ' },
  { id:'nonfiction', label:'Нон-фикшн' }, { id:'other', label:'Другой жанр' },
];
const unitChoices = [
  { id:'', label:'Не выбраны' }, { id:'preserve', label:'Сохранить единицы оригинала' },
  { id:'metric', label:'Метрические' }, { id:'imperial', label:'Английские и американские' },
];
type Brief = { genre: string; units: string; wishes: string };
const blank: Brief = { genre:'', units:'', wishes:'' };

export function BookBrief({ ownerId, bookId, lang, source, isAdmin, inSeries }: {
  ownerId: string; bookId: string; lang: string; source: string; isAdmin: boolean; inSeries: boolean;
}) {
  const storageKey = ['globoox','translation-brief','v1',ownerId,bookId,lang].join(':');
  const [brief,setBrief] = useState<Brief>(blank);
  const [saved,setSaved] = useState<Brief>(blank);
  const [loaded,setLoaded] = useState(false);
  const [notice,setNotice] = useState('');
  const [error,setError] = useState('');
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      const decoded = stored ? JSON.parse(stored) : blank;
      if (!decoded || typeof decoded.wishes !== 'string' || !genres.some(g => g.id === decoded.genre)
          || !unitChoices.some(u => u.id === decoded.units)) throw new Error();
      const initial = { genre: decoded.genre, units: decoded.units, wishes: decoded.wishes };
      setBrief(initial); setSaved(initial);
    } catch { setError('Не удалось прочитать черновик на этом устройстве.'); }
    setLoaded(true);
  }, [storageKey]);
  const dirty = brief.genre !== saved.genre || brief.units !== saved.units || brief.wishes !== saved.wishes;
  function change(key: keyof Brief, value: string) {
    setNotice(''); setError(''); setBrief(prev => ({ ...prev, [key]:value }));
  }
  function save() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(brief));
      setSaved(brief); setError(''); setNotice('Черновик сохранён в этом браузере.');
    } catch { setError('Браузер не смог сохранить черновик. Ваши изменения остаются в открытой форме.'); }
  }
  return <Card className="p-5 gap-3">
    <h3>Пожелания к переводу</h3>
    <p className="pt-muted">{source} → {lang} · черновик для этой книги на этом устройстве</p>
    <IOSSettingsRow label="Жанр" value={brief.genre} onChange={g => change('genre',g)} options={genres} disabled={!loaded}/>
    <IOSSettingsRow label="Единицы измерения" value={brief.units} onChange={v => change('units',v)} options={unitChoices} disabled={!loaded}/>
    <label className="pt-field">Пожелания своими словами<Textarea rows={3} value={brief.wishes} disabled={!loaded} onChange={e => change('wishes',e.target.value)}/></label>
    {error && <p role="alert" className="pt-callout">{error}</p>}
    {notice && <p role="status" className="pt-muted">{notice}</p>}
    <div><Button variant="outline" disabled={!loaded || !dirty} onClick={save}>Сохранить черновик</Button></div>
    <details><summary>Как применяются параметры</summary>
      <p className="pt-muted pt-2">Жанр, единицы и пожелания из этой формы сохраняются на устройстве. Их автоматическая передача в перевод планируется.</p>
      {isAdmin && <p className="pt-muted pt-2">При ручном запуске сервер получает язык перевода и выбранную для этапа модель. Для перевода текста можно включить глоссарий. {inSeries && 'Серия использует жанр, сохранённый при её импорте.'}</p>}
    </details>
  </Card>;
}
