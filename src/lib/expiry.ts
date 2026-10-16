import { parse, isValid } from 'date-fns';

const DATE_REGEXES = [
  /\b\d{4}-\d{2}-\d{2}\b/g,
  /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/g,
  /\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}\b/gi,
  /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{2,4}\b/gi,
];

const FORMATS = [
  'yyyy-MM-dd',
  'dd/MM/yyyy', 'MM/dd/yyyy', 'dd-MM-yyyy', 'MM-dd-yyyy',
  'd MMMM yyyy', 'd MMM yyyy', 'MMMM d, yyyy', 'MMM d, yyyy',
  'd MMMM yy', 'd MMM yy',
];

export function extractDates(text: string): string[] {
  const found = new Set<string>();
  for (const rx of DATE_REGEXES) {
    const m = text.match(rx);
    if (m) m.forEach((s) => found.add(s.trim()));
  }
  const out: string[] = [];
  for (const s of found) {
    const d = tryParse(s);
    if (d) out.push(d.toISOString().slice(0, 10));
  }
  // dedupe
  return Array.from(new Set(out)).sort();
}

function tryParse(s: string): Date | null {
  for (const f of FORMATS) {
    try {
      const d = parse(s, f, new Date());
      if (isValid(d)) {
        // sanity: year between 2000 and 2100
        const y = d.getFullYear();
        if (y >= 2000 && y <= 2100) return d;
      }
    } catch {}
  }
  // fallback native
  const n = new Date(s);
  if (isValid(n)) {
    const y = n.getFullYear();
    if (y >= 2000 && y <= 2100) return n;
  }
  return null;
}

export async function extractTextFromFile(buffer: Buffer, mimeType: string, filename: string): Promise<string> {
  const lower = filename.toLowerCase();
  if (mimeType === 'application/pdf' || lower.endsWith('.pdf')) {
    try {
      const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const data = new Uint8Array(buffer);
      const doc = await pdfjs.getDocument({ data }).promise;
      let text = '';
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const tc = await page.getTextContent();
        text += tc.items.map((it: any) => it.str).join(' ') + '\n';
      }
      return text;
    } catch (e) {
      console.error('pdf parse error', e);
      return '';
    }
  }
  if (mimeType.startsWith('text/') || lower.endsWith('.txt') || lower.endsWith('.csv')) {
    return buffer.toString('utf8');
  }
  return '';
}
