const { PassThrough } = require('stream');
const path = require('path');

let PDFDocument = null;
let archiver = null;
try {
  // Optional at runtime: local dev can still render a minimal PDF fallback if the package is absent.
  // In deployed environments, pdfkit provides the higher-fidelity version.
  // eslint-disable-next-line global-require
  PDFDocument = require('pdfkit');
} catch (_err) {
  PDFDocument = null;
}

try {
  // eslint-disable-next-line global-require
  archiver = require('archiver');
} catch (_err) {
  archiver = null;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeMarkdownInline(value) {
  const escaped = escapeHtml(value);
  return escaped
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function renderMarkdownToHtml(markdown) {
  const lines = String(markdown || '').split('\n');
  const html = [];
  let inList = false;
  let inQuote = false;

  const closeList = () => {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
  };

  const closeQuote = () => {
    if (inQuote) {
      html.push('</blockquote>');
      inQuote = false;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      closeList();
      closeQuote();
      continue;
    }

    if (trimmed === '---') {
      closeList();
      closeQuote();
      html.push('<hr />');
      continue;
    }

    if (trimmed.startsWith('> ')) {
      closeList();
      if (!inQuote) {
        html.push('<blockquote>');
        inQuote = true;
      }
      html.push(`<p>${sanitizeMarkdownInline(trimmed.slice(2))}</p>`);
      continue;
    }

    closeQuote();

    if (trimmed.startsWith('### ')) {
      closeList();
      html.push(`<h3>${sanitizeMarkdownInline(trimmed.slice(4))}</h3>`);
      continue;
    }

    if (trimmed.startsWith('## ')) {
      closeList();
      html.push(`<h2>${sanitizeMarkdownInline(trimmed.slice(3))}</h2>`);
      continue;
    }

    if (trimmed.startsWith('# ')) {
      closeList();
      html.push(`<h1>${sanitizeMarkdownInline(trimmed.slice(2))}</h1>`);
      continue;
    }

    if (/^[-*] /.test(trimmed)) {
      if (!inList) {
        html.push('<ul>');
        inList = true;
      }
      html.push(`<li>${sanitizeMarkdownInline(trimmed.slice(2))}</li>`);
      continue;
    }

    closeList();
    html.push(`<p>${sanitizeMarkdownInline(trimmed)}</p>`);
  }

  closeList();
  closeQuote();
  return html.join('\n');
}

function renderBookBody(book) {
  const subtitle = book.subtitle ? `<p class="book-subtitle">${escapeHtml(book.subtitle)}</p>` : '';
  const authorName = book.authorName
    ? `<p class="book-author">${escapeHtml(book.authorName)}</p>`
    : '';
  const description = book.description
    ? `<section class="book-section"><h2>Overview</h2><p>${escapeHtml(book.description)}</p></section>`
    : '';
  const metadata = [
    book.genre ? `<span>${escapeHtml(book.genre)}</span>` : '',
    book.audience ? `<span>${escapeHtml(book.audience)}</span>` : '',
    book.language ? `<span>${escapeHtml(book.language.toUpperCase())}</span>` : '',
    book.wordCount ? `<span>${Number(book.wordCount).toLocaleString()} words</span>` : '',
  ]
    .filter(Boolean)
    .join('');

  const frontCover = book.frontCover?.url
    ? `<figure class="book-cover"><img src="${escapeHtml(book.frontCover.url)}" alt="Front cover for ${escapeHtml(book.title)}" /></figure>`
    : '';
  const backCover = book.backCover?.url
    ? `<figure class="book-cover book-cover--back"><img src="${escapeHtml(book.backCover.url)}" alt="Back cover for ${escapeHtml(book.title)}" /></figure>`
    : '';

  return `
    <header class="book-hero">
      <p class="book-pill">Book edition</p>
      <h1>${escapeHtml(book.title)}</h1>
      ${subtitle}
      ${authorName}
      ${metadata ? `<div class="book-meta">${metadata}</div>` : ''}
    </header>
    ${description}
    ${frontCover}
    <section class="book-section">
      <h2>Manuscript</h2>
      <div class="book-body">${renderMarkdownToHtml(book.manuscriptMarkdown)}</div>
    </section>
    ${backCover}
  `;
}

function renderBookHtml(book) {
  const title = escapeHtml(book.title || 'Book');
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8">',
    `  <title>${title}</title>`,
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    '  <style>',
    '    :root{color-scheme:light;}',
    '    body{margin:0;background:#f6f2e8;color:#171717;font-family:Georgia,Times,serif;line-height:1.7;}',
    '    .page{max-width:920px;margin:0 auto;padding:2rem 1.25rem 3rem;}',
    '    .book-hero{padding:1.5rem;border:1px solid #d4c8b4;border-radius:22px;background:#fffdf8;box-shadow:0 10px 30px rgba(60,40,10,.06);}',
    '    .book-pill{margin:0 0 .6rem;text-transform:uppercase;letter-spacing:.12em;font-size:.76rem;color:#755b2f;font-weight:700;}',
    '    h1,h2,h3{line-height:1.15;margin:0;color:#1d2d46;}',
    '    h1{font-size:clamp(2.1rem,5vw,3.6rem);margin-bottom:.35rem;}',
    '    .book-subtitle,.book-author{margin:.15rem 0;color:#574f43;font-size:1.02rem;}',
    '    .book-meta{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.9rem;}',
    '    .book-meta span{border:1px solid #d8cab0;border-radius:999px;padding:.32rem .7rem;background:#faf2df;color:#7b5c2b;font-size:.86rem;font-weight:700;}',
    '    .book-section{margin-top:1.4rem;padding:1.2rem 1.25rem;border:1px solid #d7d0c2;border-radius:20px;background:rgba(255,255,255,.72);}',
    '    .book-body p,.book-body li,.book-section p{font-size:1.03rem;}',
    '    .book-body h2,.book-body h3{margin-top:1.2rem;}',
    '    .book-body blockquote{margin:1rem 0;padding:0 0 0 1rem;border-left:4px solid #a08b66;color:#5f5546;}',
    '    .book-body ul{padding-left:1.25rem;}',
    '    .book-cover{margin:1.2rem 0 0;}',
    '    .book-cover img{width:100%;display:block;border-radius:18px;border:1px solid #d7d0c2;background:#fff;object-fit:cover;}',
    '    .book-cover--back img{max-height:760px;object-fit:contain;background:#fdfaf4;}',
    '  </style>',
    '</head>',
    '<body>',
    `  <main class="page">${renderBookBody(book)}</main>`,
    '</body>',
    '</html>',
  ].join('\n');
}

async function collectStream(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

async function buildPdfBuffer(book, resolveAssetBuffer) {
  if (!PDFDocument) {
    return buildFallbackPdfBuffer(book);
  }

  const doc = new PDFDocument({
    autoFirstPage: false,
    margin: 54,
    size: 'A4',
  });

  const output = new PassThrough();
  doc.pipe(output);

  const frontCoverBuffer = await resolveAssetBuffer(book.frontCover);
  const backCoverBuffer = await resolveAssetBuffer(book.backCover);

  if (frontCoverBuffer) {
    doc.addPage({ margin: 0, size: 'A4' });
    doc.image(frontCoverBuffer, 0, 0, { fit: [595, 842], align: 'center', valign: 'center' });
  }

  doc.addPage();
  doc
    .font('Times-Bold')
    .fontSize(24)
    .fillColor('#111111')
    .text(book.title || 'Book', {
      align: 'center',
    });
  if (book.subtitle) {
    doc.moveDown(0.4).font('Times-Italic').fontSize(14).fillColor('#444444').text(book.subtitle, {
      align: 'center',
    });
  }
  if (book.authorName) {
    doc
      .moveDown(0.4)
      .font('Times-Roman')
      .fontSize(12)
      .fillColor('#444444')
      .text(`by ${book.authorName}`, {
        align: 'center',
      });
  }
  if (book.description) {
    doc.moveDown(1).font('Times-Roman').fontSize(11).fillColor('#222222').text(book.description, {
      align: 'left',
    });
  }

  doc.moveDown(1.1);
  doc.font('Times-Bold').fontSize(15).fillColor('#1f3552').text('Manuscript');
  doc.moveDown(0.4);

  const lines = String(book.manuscriptMarkdown || '').split('\n');
  for (const rawLine of lines) {
    const line = String(rawLine || '').trimEnd();
    const trimmed = line.trim();
    if (!trimmed) {
      doc.moveDown(0.35);
      continue;
    }

    if (trimmed.startsWith('# ')) {
      doc.moveDown(0.5).font('Times-Bold').fontSize(18).fillColor('#1f3552').text(trimmed.slice(2));
      doc.moveDown(0.15);
      continue;
    }

    if (trimmed.startsWith('## ')) {
      doc
        .moveDown(0.35)
        .font('Times-Bold')
        .fontSize(14)
        .fillColor('#1f3552')
        .text(trimmed.slice(3));
      doc.moveDown(0.1);
      continue;
    }

    if (trimmed.startsWith('### ')) {
      doc
        .moveDown(0.25)
        .font('Times-Bold')
        .fontSize(12)
        .fillColor('#1f3552')
        .text(trimmed.slice(4));
      doc.moveDown(0.05);
      continue;
    }

    if (/^[-*] /.test(trimmed)) {
      doc
        .font('Times-Roman')
        .fontSize(11)
        .fillColor('#202020')
        .text(`• ${trimmed.slice(2)}`, {
          indent: 14,
          paragraphGap: 3,
        });
      continue;
    }

    if (trimmed.startsWith('> ')) {
      doc.font('Times-Italic').fontSize(11).fillColor('#4b4b4b').text(trimmed.slice(2), {
        indent: 18,
        paragraphGap: 4,
      });
      continue;
    }

    doc.font('Times-Roman').fontSize(11).fillColor('#202020').text(trimmed, {
      paragraphGap: 4,
      lineGap: 1.8,
    });
  }

  if (backCoverBuffer) {
    doc.addPage({ margin: 0, size: 'A4' });
    doc.image(backCoverBuffer, 0, 0, { fit: [595, 842], align: 'center', valign: 'center' });
  }

  doc.end();
  return collectStream(output);
}

function pdfTextEscape(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function buildFallbackPdfBuffer(book) {
  const title = String(book.title || 'Book').trim();
  const subtitle = String(book.subtitle || '').trim();
  const author = String(book.authorName || '').trim();
  const description = String(book.description || '').trim();
  const body = String(book.manuscriptMarkdown || '').trim();
  const lines = [
    title,
    subtitle,
    author ? `by ${author}` : '',
    '',
    description,
    '',
    'Manuscript',
    '',
    ...body.split('\n'),
  ].filter((line, index, arr) => line !== '' || arr[index - 1] !== '');

  const contentLines = ['BT', '/F1 16 Tf', '72 760 Td'];
  let firstLine = true;
  for (const line of lines) {
    const escaped = pdfTextEscape(line);
    if (firstLine) {
      contentLines.push(`(${escaped}) Tj`);
      firstLine = false;
    } else {
      contentLines.push('T*');
      contentLines.push(`(${escaped}) Tj`);
    }
  }
  contentLines.push('ET');

  const contentStream = contentLines.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(contentStream, 'utf8')} >>\nstream\n${contentStream}\nendstream`,
  ];

  const header = '%PDF-1.4\n';
  const chunks = [header];
  const offsets = ['0000000000 65535 f '];
  let currentOffset = Buffer.byteLength(header, 'utf8');

  objects.forEach((object, index) => {
    offsets.push(String(currentOffset).padStart(10, '0') + ' 00000 n ');
    const objText = `${index + 1} 0 obj\n${object}\nendobj\n`;
    chunks.push(objText);
    currentOffset += Buffer.byteLength(objText, 'utf8');
  });

  const xrefOffset = currentOffset;
  const xref = [
    'xref',
    `0 ${objects.length + 1}`,
    ...offsets,
    'trailer << /Size 6 /Root 1 0 R >>',
    'startxref',
    String(xrefOffset),
    '%%EOF',
  ].join('\n');

  chunks.push(xref);
  return Buffer.from(chunks.join(''), 'utf8');
}

function inferAssetFileName(asset, fallbackName) {
  const originalName = String(asset?.originalName || fallbackName || 'asset').trim();
  const ext = path.extname(originalName) || '';
  return originalName.replace(/[^a-zA-Z0-9._-]/g, '_') || fallbackName || 'asset';
}

function normalizeMediaType(asset) {
  const mime = String(asset?.mimeType || '').toLowerCase();
  if (mime.startsWith('image/jpeg') || mime.startsWith('image/jpg')) return 'image/jpeg';
  if (mime.startsWith('image/png')) return 'image/png';
  if (mime.startsWith('image/webp')) return 'image/webp';
  if (mime.startsWith('image/gif')) return 'image/gif';
  return 'image/jpeg';
}

async function buildEpubBuffer(book, resolveAssetBuffer) {
  if (!archiver) {
    return Buffer.from(
      `EPUB generation unavailable for ${String(book.title || 'this book')}.`,
      'utf8',
    );
  }

  const archive = archiver('zip', { zlib: { level: 9 } });
  const output = new PassThrough();
  archive.pipe(output);

  const frontCoverBuffer = await resolveAssetBuffer(book.frontCover);
  const backCoverBuffer = await resolveAssetBuffer(book.backCover);

  archive.append('application/epub+zip', { name: 'mimetype', store: true });

  archive.append(
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
    { name: 'META-INF/container.xml' },
  );

  const manifestItems = [
    '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
    '<item id="style" href="styles.css" media-type="text/css"/>',
    '<item id="content" href="content.xhtml" media-type="application/xhtml+xml"/>',
  ];
  const spineItems = ['<itemref idref="content"/>'];

  let frontCoverItem = '';
  let backCoverItem = '';
  let coverImagePath = '';
  let backImagePath = '';
  let coverMediaType = '';
  let backMediaType = '';

  if (frontCoverBuffer) {
    coverMediaType = normalizeMediaType(book.frontCover);
    const coverName = inferAssetFileName(book.frontCover, 'front-cover.jpg');
    const coverExt = path.extname(coverName) || (coverMediaType === 'image/png' ? '.png' : '.jpg');
    coverImagePath = `images/front-cover${coverExt}`;
    archive.append(frontCoverBuffer, { name: `OEBPS/${coverImagePath}` });
    manifestItems.push(
      `<item id="cover-image" href="${coverImagePath}" media-type="${coverMediaType}" properties="cover-image"/>`,
    );
    manifestItems.push('<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>');
    spineItems.unshift('<itemref idref="cover"/>');
    frontCoverItem = `
      <section class="cover-page">
        <img src="${coverImagePath}" alt="Front cover" />
      </section>`;
  }

  if (backCoverBuffer) {
    backMediaType = normalizeMediaType(book.backCover);
    const backName = inferAssetFileName(book.backCover, 'back-cover.jpg');
    const backExt = path.extname(backName) || (backMediaType === 'image/png' ? '.png' : '.jpg');
    backImagePath = `images/back-cover${backExt}`;
    archive.append(backCoverBuffer, { name: `OEBPS/${backImagePath}` });
    backCoverItem = `
      <section class="cover-page cover-page--back">
        <img src="${backImagePath}" alt="Back cover" />
      </section>`;
  }

  const contentXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${escapeHtml(book.language || 'en')}" lang="${escapeHtml(book.language || 'en')}">
  <head>
    <title>${escapeHtml(book.title || 'Book')}</title>
    <link rel="stylesheet" type="text/css" href="styles.css"/>
  </head>
  <body>
    <article class="book">
      <header>
        <h1>${escapeHtml(book.title || 'Book')}</h1>
        ${book.subtitle ? `<p class="subtitle">${escapeHtml(book.subtitle)}</p>` : ''}
        ${book.authorName ? `<p class="author">by ${escapeHtml(book.authorName)}</p>` : ''}
        ${book.description ? `<p class="description">${escapeHtml(book.description)}</p>` : ''}
      </header>
      ${frontCoverItem}
      <section class="manuscript">
        <h2>Manuscript</h2>
        ${renderMarkdownToHtml(book.manuscriptMarkdown)}
      </section>
      ${backCoverItem}
    </article>
  </body>
</html>`;

  const navXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
  <head>
    <title>Navigation</title>
  </head>
  <body>
    <nav epub:type="toc" id="toc">
      <h1>Contents</h1>
      <ol>
        <li><a href="content.xhtml">${escapeHtml(book.title || 'Book')}</a></li>
      </ol>
    </nav>
  </body>
</html>`;

  const coverXhtml = frontCoverBuffer
    ? `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>Cover</title>
    <link rel="stylesheet" type="text/css" href="styles.css"/>
  </head>
  <body>
    <section class="cover-page">
      <img src="${coverImagePath}" alt="Front cover" />
    </section>
  </body>
</html>`
    : '';

  const stylesCss = `
    body { font-family: Georgia, serif; line-height: 1.7; color: #1d1d1d; background: #faf7f0; }
    .book { max-width: 40rem; margin: 0 auto; }
    h1, h2, h3 { color: #1f3552; line-height: 1.2; }
    .subtitle, .author, .description { color: #575048; }
    .cover-page { margin: 1rem 0 1.5rem; text-align: center; }
    .cover-page img { max-width: 100%; height: auto; }
    blockquote { border-left: 4px solid #a08b66; padding-left: 1rem; color: #5d5446; }
    ul { padding-left: 1.25rem; }
    p { margin: 0.7rem 0; }
  `;

  const packageOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="book-id" version="3.0" xml:lang="${escapeHtml(book.language || 'en')}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">${escapeHtml(book.slug || book.title || 'book')}</dc:identifier>
    <dc:title>${escapeHtml(book.title || 'Book')}</dc:title>
    <dc:language>${escapeHtml(book.language || 'en')}</dc:language>
    ${book.authorName ? `<dc:creator>${escapeHtml(book.authorName)}</dc:creator>` : ''}
    ${book.description ? `<dc:description>${escapeHtml(book.description)}</dc:description>` : ''}
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}</meta>
    ${frontCoverBuffer ? '<meta name="cover" content="cover-image"/>' : ''}
  </metadata>
  <manifest>
    ${manifestItems.join('\n    ')}
  </manifest>
  <spine>
    ${spineItems.join('\n    ')}
  </spine>
</package>`;

  archive.append(stylesCss, { name: 'OEBPS/styles.css' });
  archive.append(navXhtml, { name: 'OEBPS/nav.xhtml' });
  if (coverXhtml) {
    archive.append(coverXhtml, { name: 'OEBPS/cover.xhtml' });
  }
  archive.append(contentXhtml, { name: 'OEBPS/content.xhtml' });
  archive.append(packageOpf, { name: 'OEBPS/content.opf' });

  await archive.finalize();
  return collectStream(output);
}

module.exports = {
  escapeHtml,
  renderMarkdownToHtml,
  renderBookHtml,
  buildPdfBuffer,
  buildEpubBuffer,
};
