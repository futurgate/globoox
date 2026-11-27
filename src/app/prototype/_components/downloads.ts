const EPUB_MIME = 'application/epub+zip';

function saveBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser time to acquire the file before releasing its backing data.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(
  filename: string,
  contents: string,
  mimeType = 'text/plain;charset=utf-8',
) {
  saveBlob(filename, new Blob([contents], { type: mimeType }));
}

export function downloadCsv(
  filename: string,
  rows: readonly (readonly string[])[],
) {
  const csv = rows
    .map((row) =>
      row
        .map((value) => {
          const safe = /^\s*[=+@-]/.test(value) ? "'" + value : value;
          return '"' + safe.replaceAll('"', '""') + '"';
        })
        .join(','),
    )
    .join('\r\n');
  downloadText(filename, '\uFEFF' + csv + '\r\n', 'text/csv;charset=utf-8');
}

function xmlText(value: string) {
  return (
    value
      // XML 1.0 excludes most control characters and unpaired surrogates.
      .replace(
        /[^\u{9}\u{A}\u{D}\u{20}-\u{D7FF}\u{E000}-\u{FFFD}\u{10000}-\u{10FFFF}]/gu,
        '',
      )
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
  );
}

const samples = {
  en: {
    chapter: 'The archive',
    notice: 'Sample edition from the Globoox prototype.',
    text: 'Vera reached the northern archive just before dawn. Behind the frosted glass, a single lamp was still burning.',
  },
  ru: {
    chapter: 'Архив',
    notice: 'Демонстрационное издание прототипа Globoox.',
    text: 'Вера добралась до северного архива перед самым рассветом. За морозным стеклом всё ещё горела лампа.',
  },
  fr: {
    chapter: 'Les archives',
    notice: 'Édition de démonstration du prototype Globoox.',
    text: 'Véra arriva aux archives du Nord juste avant l’aube. Derrière la vitre givrée, une lampe brillait encore.',
  },
};

export async function downloadDemoEpub(
  title: string,
  paragraphs?: string[],
  language = 'en',
) {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const lang = language.toLowerCase().split('-')[0];
  const code = lang === 'ru' || lang === 'fr' ? lang : 'en';
  const sample = samples[code];
  const label = xmlText(title.trim()) || 'Globoox';
  const identifier = 'urn:uuid:' + crypto.randomUUID();
  const modified = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const body = paragraphs?.some((text) => text.trim())
    ? paragraphs
    : [sample.text];

  // The EPUB container requires the uncompressed mimetype as the very first entry.
  zip.file('mimetype', EPUB_MIME, { compression: 'STORE' });
  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`,
    { createFolders: false },
  );
  zip.file(
    'EPUB/package.opf',
    `<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="id">${identifier}</dc:identifier><dc:title>${label}</dc:title><dc:language>${code}</dc:language>
    <meta property="dcterms:modified">${modified}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine><itemref idref="chapter"/></spine>
</package>`,
    { createFolders: false },
  );
  zip.file(
    'EPUB/nav.xhtml',
    `<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${code}" lang="${code}">
  <head><title>${label}</title></head>
  <body><nav epub:type="toc"><h1>${label}</h1><ol><li><a href="chapter.xhtml">${sample.chapter}</a></li></ol></nav></body>
</html>`,
    { createFolders: false },
  );
  zip.file(
    'EPUB/chapter.xhtml',
    `<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${code}" lang="${code}">
  <head><title>${sample.chapter}</title></head>
  <body><h1>${label}</h1><p>${sample.notice}</p><h2>${sample.chapter}</h2>
    ${body.map((text) => '<p>' + xmlText(text) + '</p>').join('\n')}
  </body>
</html>`,
    { createFolders: false },
  );

  const safeTitle =
    Array.from(title.trim().replace(/[/\\:*?"<>|]/g, '_'))
      .slice(0, 95)
      .join('') || 'Globoox';
  const file = await zip.generateAsync({
    type: 'blob',
    mimeType: EPUB_MIME,
    compression: 'STORE',
  });
  saveBlob(safeTitle + ' (' + code.toUpperCase() + ').epub', file);
}
