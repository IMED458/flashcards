/**
 * Client-side text extraction for uploaded study files.
 * Heavy libraries are loaded lazily, only when a file of that type is uploaded.
 *
 * Output is plain text with Markdown-style headings (`# `, `## `) and blank lines
 * between paragraphs, which is what the engine's structure parser expects.
 */

export type ProgressFn = (message: string) => void;

export class ExtractionError extends Error {}

/** Hard cap on text passed to the engine (keeps processing time bounded). */
export const MAX_TEXT_CHARS = 120_000;

/** Max pages OCR'd for scanned PDFs (OCR is slow: ~2-5 s per page). */
const MAX_OCR_PAGES = 15;

const OCR_LANGS = 'kat+eng';

export const ACCEPTED_FILE_TYPES = '.pdf,.docx,.pptx,.txt,.md,.jpg,.jpeg,.png,.webp';

function extOf(name: string): string {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

/** Remove control characters and binary noise, collapse whitespace. */
export function cleanExtractedText(text: string): string {
  return text
    .replace(/\u0000/g, '')
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F�]/g, ' ')
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Share of characters that are letters/digits/common punctuation — detects binary garbage. */
function readableRatio(text: string): number {
  if (!text) return 0;
  const sample = text.slice(0, 20_000);
  const readable = sample.match(/[\p{L}\p{N}\s.,;:!?()„“"'\-–—%/]/gu)?.length ?? 0;
  return readable / sample.length;
}

function truncate(text: string): { text: string; truncated: boolean } {
  if (text.length <= MAX_TEXT_CHARS) return { text, truncated: false };
  const cut = text.lastIndexOf('\n', MAX_TEXT_CHARS);
  return { text: text.slice(0, cut > MAX_TEXT_CHARS * 0.8 ? cut : MAX_TEXT_CHARS), truncated: true };
}

export interface ExtractResult {
  text: string;
  truncated: boolean;
  usedOcr: boolean;
}

export async function extractTextFromFile(file: File, onProgress: ProgressFn = () => {}): Promise<ExtractResult> {
  const ext = extOf(file.name);
  let text = '';
  let usedOcr = false;

  switch (ext) {
    case 'txt':
    case 'md':
      onProgress('ტექსტის წაკითხვა…');
      text = await file.text();
      break;
    case 'pdf': {
      const r = await extractPdf(file, onProgress);
      text = r.text;
      usedOcr = r.usedOcr;
      break;
    }
    case 'docx':
      text = await extractDocx(file, onProgress);
      break;
    case 'pptx':
      text = await extractPptx(file, onProgress);
      break;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'webp':
      text = await ocrImages([file], onProgress);
      usedOcr = true;
      break;
    case 'doc':
    case 'ppt':
      throw new ExtractionError('ძველი ფორმატი (.doc / .ppt) არ არის მხარდაჭერილი. შეინახეთ როგორც .docx / .pptx ან PDF.');
    default:
      throw new ExtractionError(`ფაილის ტიპი „.${ext || '?'}“ არ არის მხარდაჭერილი. ატვირთეთ PDF, DOCX, PPTX, TXT ან სურათი.`);
  }

  text = cleanExtractedText(text);

  if (text.replace(/\s/g, '').length < 40) {
    throw new ExtractionError(
      usedOcr
        ? 'სურათზე/დოკუმენტში ტექსტი ვერ ამოვიცანით. სცადეთ უფრო მკაფიო ფაილი.'
        : 'ფაილიდან ტექსტის ამოღება ვერ მოხერხდა (შესაძლოა ცარიელია ან დაცულია).'
    );
  }
  if (readableRatio(text) < 0.85) {
    throw new ExtractionError('ფაილის შიგთავსი ვერ წავიკითხეთ როგორც ტექსტი. სცადეთ PDF ან DOCX ფორმატი.');
  }

  const t = truncate(text);
  return { text: t.text, truncated: t.truncated, usedOcr };
}

/* ------------------------------------------------------------------ PDF -- */

type PdfTextItem = { str: string; transform: number[]; height: number; hasEOL?: boolean };

async function loadPdfJs() {
  const pdfjs = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  return pdfjs;
}

async function extractPdf(file: File, onProgress: ProgressFn): Promise<{ text: string; usedOcr: boolean }> {
  onProgress('PDF-ის გახსნა…');
  const pdfjs = await loadPdfJs();
  let pdf;
  try {
    pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  } catch (e: any) {
    if (e?.name === 'PasswordException') throw new ExtractionError('PDF დაცულია პაროლით.');
    throw new ExtractionError('PDF ფაილი დაზიანებულია ან ვერ იხსნება.');
  }

  const pages: string[] = [];
  let totalChars = 0;
  for (let p = 1; p <= pdf.numPages; p++) {
    onProgress(`PDF: გვერდი ${p} / ${pdf.numPages}`);
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const pageText = pdfItemsToText(content.items as PdfTextItem[]);
    pages.push(pageText);
    totalChars += pageText.length;
    page.cleanup();
    if (totalChars > MAX_TEXT_CHARS * 1.2) break;
    // Yield to the browser so the UI stays responsive on big documents.
    if (p % 5 === 0) await new Promise(r => setTimeout(r, 0));
  }

  const text = pages.join('\n\n');
  // Text-based PDF: done.
  if (text.replace(/\s/g, '').length >= 40 * Math.min(pdf.numPages, 3)) {
    await pdf.destroy();
    return { text, usedOcr: false };
  }

  // Scanned PDF (no text layer): render pages and OCR them.
  const pageCount = Math.min(pdf.numPages, MAX_OCR_PAGES);
  const canvases: HTMLCanvasElement[] = [];
  for (let p = 1; p <= pageCount; p++) {
    onProgress(`სკანირებული PDF: გვერდის მომზადება ${p} / ${pageCount}`);
    const page = await pdf.getPage(p);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
    canvases.push(canvas);
    page.cleanup();
  }
  await pdf.destroy();
  const ocrText = await ocrImages(canvases, onProgress);
  return { text: ocrText, usedOcr: true };
}

/**
 * Rebuild readable paragraphs from positioned PDF text items:
 * items -> visual lines (by y) -> paragraphs (by vertical gap),
 * lines in a noticeably larger font become `## ` headings.
 */
function pdfItemsToText(items: PdfTextItem[]): string {
  type Line = { y: number; size: number; text: string };
  const lines: Line[] = [];
  let cur: Line | null = null;

  for (const it of items) {
    if (!it || typeof it.str !== 'string') continue;
    const y = it.transform?.[5] ?? 0;
    const size = Math.abs(it.transform?.[3] || it.height || 0);
    if (!cur || Math.abs(cur.y - y) > Math.max(2, size * 0.5)) {
      if (cur && cur.text.trim()) lines.push(cur);
      cur = { y, size, text: '' };
    }
    cur.text += it.str;
    cur.size = Math.max(cur.size, size);
    if (it.hasEOL) {
      if (cur.text.trim()) lines.push(cur);
      cur = null;
    }
  }
  if (cur && cur.text.trim()) lines.push(cur);
  if (lines.length === 0) return '';

  const sizes = lines.map(l => l.size).filter(s => s > 0).sort((a, b) => a - b);
  const bodySize = sizes[Math.floor(sizes.length / 2)] || 10;
  const gaps: number[] = [];
  for (let i = 1; i < lines.length; i++) {
    const g = lines[i - 1].y - lines[i].y;
    if (g > 0) gaps.push(g);
  }
  gaps.sort((a, b) => a - b);
  const lineGap = gaps[Math.floor(gaps.length / 2)] || bodySize * 1.2;

  const out: string[] = [];
  let para = '';
  const flush = () => {
    if (para.trim()) out.push(para.trim());
    para = '';
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const t = line.text.replace(/\s+/g, ' ').trim();
    if (!t) continue;
    const isHeading = line.size >= bodySize * 1.25 && t.length <= 100 && !/[.;,]$/.test(t);
    const prev = lines[i - 1];
    if (isHeading) {
      flush();
      // A heading wrapped over two lines: merge it with the previous heading line.
      const last = out[out.length - 1];
      if (last?.startsWith('## ') && prev && Math.abs(prev.size - line.size) < 0.5 && prev.y - line.y < line.size * 2) {
        out[out.length - 1] = last + ' ' + t;
      } else {
        out.push('## ' + t);
      }
      continue;
    }
    const gap = prev ? prev.y - line.y : 0;
    if (prev && (gap > lineGap * 1.6 || gap < 0)) flush();
    if (para.endsWith('-')) para = para.slice(0, -1) + t;
    else para += (para ? ' ' : '') + t;
  }
  flush();
  return out.join('\n\n');
}

/* ----------------------------------------------------------------- DOCX -- */

async function extractDocx(file: File, onProgress: ProgressFn): Promise<string> {
  onProgress('Word დოკუმენტის წაკითხვა…');
  const mammoth: any = await import('mammoth');
  const lib = mammoth.default ?? mammoth;
  let html: string;
  try {
    const res = await lib.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
    html = res.value;
  } catch {
    throw new ExtractionError('Word ფაილი დაზიანებულია ან ვერ იხსნება.');
  }
  return htmlToStructuredText(html);
}

function htmlToStructuredText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const out: string[] = [];
  const walk = (el: Element) => {
    for (const child of Array.from(el.children)) {
      const tag = child.tagName.toLowerCase();
      const text = (child.textContent || '').replace(/\s+/g, ' ').trim();
      if (/^h[1-6]$/.test(tag)) {
        if (text) out.push('#'.repeat(Math.min(3, Number(tag[1]))) + ' ' + text);
      } else if (tag === 'p') {
        if (text) out.push(text);
      } else if (tag === 'li') {
        if (text) out.push('- ' + text);
      } else if (tag === 'tr') {
        const cells = Array.from(child.children).map(c => (c.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
        if (cells.length) out.push(cells.join(' — '));
      } else {
        walk(child);
      }
    }
  };
  walk(doc.body);
  return out.join('\n\n');
}

/* ----------------------------------------------------------------- PPTX -- */

async function extractPptx(file: File, onProgress: ProgressFn): Promise<string> {
  onProgress('პრეზენტაციის წაკითხვა…');
  const { default: JSZip } = await import('jszip');
  let zip;
  try {
    zip = await JSZip.loadAsync(await file.arrayBuffer());
  } catch {
    throw new ExtractionError('PowerPoint ფაილი დაზიანებულია ან ვერ იხსნება.');
  }
  const slideFiles = Object.keys(zip.files)
    .filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/(\d+)\.xml$/)![1]) - Number(b.match(/(\d+)\.xml$/)![1]));

  const out: string[] = [];
  for (let i = 0; i < slideFiles.length; i++) {
    onProgress(`სლაიდი ${i + 1} / ${slideFiles.length}`);
    const xml = await zip.file(slideFiles[i])!.async('string');
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const paras = Array.from(doc.getElementsByTagNameNS('*', 'p'))
      .map(p =>
        Array.from(p.getElementsByTagNameNS('*', 't'))
          .map(t => t.textContent || '')
          .join('')
          .replace(/\s+/g, ' ')
          .trim()
      )
      .filter(Boolean);
    if (paras.length === 0) continue;
    const [title, ...body] = paras;
    out.push('## ' + title);
    // Slide bullets are usually fragments: end them with a period so they form sentences.
    for (const b of body) out.push(/[.!?:;]$/.test(b) ? b : b + '.');
  }
  return out.join('\n\n');
}

/* ------------------------------------------------------------------ OCR -- */

async function ocrImages(images: (File | HTMLCanvasElement)[], onProgress: ProgressFn): Promise<string> {
  onProgress('OCR-ის ჩატვირთვა (პირველად შეიძლება ცოტა დრო დასჭირდეს)…');
  const { createWorker } = await import('tesseract.js');
  let pageIdx = 0;
  const worker = await createWorker(OCR_LANGS, 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') {
        onProgress(`ტექსტის ამოცნობა (OCR): ${pageIdx + 1} / ${images.length} — ${Math.round(m.progress * 100)}%`);
      }
    }
  });
  try {
    const parts: string[] = [];
    for (pageIdx = 0; pageIdx < images.length; pageIdx++) {
      const { data } = await worker.recognize(images[pageIdx]);
      // OCR gives one line per visual line: rejoin lines into paragraphs.
      const paras = (data.text || '')
        .split(/\n\s*\n/)
        .map(p => p.replace(/-\n/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim())
        .filter(Boolean);
      parts.push(paras.join('\n\n'));
    }
    return parts.join('\n\n');
  } finally {
    await worker.terminate();
  }
}
