import 'server-only';
import { strFromU8, unzipSync } from 'fflate';

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9,
  september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};
const DATE_PATTERN = /\b(?:\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?[,]?\s+\d{4}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2}[,]?\s+\d{4})\b/gi;
const EXPIRY_CUE = /(?:expir(?:y|es|ation)|valid\s+(?:until|through|to)|renew(?:al)?\s+by|good\s+through)/i;

function isoDate(raw: string): string | null {
  let year: number, month: number, day: number;
  let m: RegExpMatchArray | null;
  if ((m = raw.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/))) [, year, month, day] = [null, +m[1]!, +m[2]!, +m[3]!];
  else if ((m = raw.match(/^(\d{1,2})\s+([A-Za-z]+)\.?[,]?\s+(\d{4})$/))) { day = +m[1]!; month = MONTHS[m[2]!.toLowerCase()]!; year = +m[3]!; }
  else if ((m = raw.match(/^([A-Za-z]+)\.?\s+(\d{1,2})[,]?\s+(\d{4})$/))) { month = MONTHS[m[1]!.toLowerCase()]!; day = +m[2]!; year = +m[3]!; }
  else if ((m = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/))) {
    // Numeric dates are interpreted day/month/year (the common government-document convention).
    day = +m[1]!; month = +m[2]!; year = +m[3]!; if (year < 100) year += year < 50 ? 2000 : 1900;
  } else return null;
  if (!month || month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2200) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function detectExpiryDate(text: string): string | null {
  const cues = [...text.matchAll(new RegExp(EXPIRY_CUE.source, 'ig'))];
  for (const cue of cues) {
    const start = Math.max(0, (cue.index || 0) - 12);
    const windowText = text.slice(start, start + 180);
    const dates = [...windowText.matchAll(new RegExp(DATE_PATTERN.source, 'ig'))];
    for (const match of dates) {
      const value = isoDate(match[0]);
      if (value) return value;
    }
  }
  return null;
}

export async function extractExpiryFromUpload(buffer: Buffer, mimeType: string): Promise<string | null> {
  // Extracted text exists only transiently in memory; no text, OCR output, or unrelated fields are persisted.
  let text = '';
  if (mimeType === 'application/pdf') {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const task = pdfjs.getDocument({ data: new Uint8Array(buffer), disableFontFace: true, useSystemFonts: true });
    const document = await task.promise;
    try {
      const pages: string[] = [];
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
        const page = await document.getPage(pageNumber);
        const content = await page.getTextContent();
        pages.push(content.items.map((item) => 'str' in item ? item.str : '').join(' '));
      }
      text = pages.join('\n');
    } finally { await task.destroy(); }
  } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const archive = unzipSync(new Uint8Array(buffer));
    const xml = archive['word/document.xml'] ? strFromU8(archive['word/document.xml']!) : '';
    text = xml.split(/<w:t(?:\s[^>]*)?>/g).slice(1).map((segment) => (segment.split('</w:t>')[0] || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")).join(' ');
  } else if (mimeType === 'text/plain' || mimeType === 'text/csv') {
    text = buffer.toString('utf8');
  } else {
    return null;
  }
  return detectExpiryDate(text);
}
