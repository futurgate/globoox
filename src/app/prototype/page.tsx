import Link from 'next/link';
import { workspaceBase } from '@/lib/translationWorkspacePath';
import { Card } from '@/components/ui/card';
import { ArrowUpRight, BookOpenText, Layers3 } from 'lucide-react';

export default function PrototypeIndex() {
  return (
    <main className="pt-index">
      <div className="pt-wordmark">Globoox</div>
      <h1>Перевод книг</h1>
      <p className="pt-lead">
        <Link href={workspaceBase} className="pt-editor-link">Открыть кабинет перевода своих книг <ArrowUpRight size={17} /></Link>
      </p>
      <div className="pt-role-cards">
        <Card>
          <Link href="/prototype/admin" className="pt-role-card">
            <BookOpenText size={28} strokeWidth={1.6} />
            <h2>Демо кабинета администратора</h2>
            <p>Настроить перевод книги, проверить правки и скачать EPUB.</p>
            <span>
              Открыть кабинет <ArrowUpRight size={17} />
            </span>
          </Link>
        </Card>
        <Card>
          <Link href="/prototype/author" className="pt-role-card">
            <Layers3 size={28} strokeWidth={1.6} />
            <h2>Демо кабинета автора</h2>
            <p>
              Подготовить книгу или серию, согласовать перевод и получить
              издание.
            </p>
            <span>
              Открыть кабинет <ArrowUpRight size={17} />
            </span>
          </Link>
        </Card>
      </div>
      <Link href="/prototype/author/editor" className="pt-editor-link">
        Служебные настройки авторского кабинета <ArrowUpRight size={15} />
      </Link>
    </main>
  );
}
