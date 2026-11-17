import { jsPDF } from 'jspdf';
import { PatientInfo, Doctor, AppSettings, ReportStudy, Modality } from '../types';
import {
  stripSpellHighlights,
  A4PaginatedSheet,
  DEFAULT_CLINIC_LOGO_DATA_URI,
  getOfficialClinicLogoDataUri,
  isOfficialClinicLogoUri,
} from './typistUtils';

// ============================================================================
// Cached TrueType (.ttf) Font Loader for jsPDF Vector Text Embedding
// ============================================================================
let cachedVazirRegularB64: string | null = null;
let cachedVazirBoldB64: string | null = null;
let fontLoadPromise: Promise<{ regular: string; bold: string }> | null = null;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

async function fetchValidTtfBuffer(fileName: string): Promise<ArrayBuffer> {
  const candidates = [`/fonts/${fileName}`, `./fonts/${fileName}`, `fonts/${fileName}`];
  for (const url of candidates) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      if (buf.byteLength < 10000) continue;
      const head = new Uint8Array(buf, 0, 4);
      // Reject HTML fallback responses (starts with '<' = 0x3C)
      if (head[0] === 0x3c) continue;
      return buf;
    } catch {
      // try next candidate URL
    }
  }
  throw new Error(`Failed to fetch valid TTF font binary: ${fileName}`);
}

export async function ensureVectorPdfFontsLoaded(): Promise<{ regular: string; bold: string }> {
  if (cachedVazirRegularB64 && cachedVazirBoldB64) {
    return { regular: cachedVazirRegularB64, bold: cachedVazirBoldB64 };
  }
  if (fontLoadPromise) return fontLoadPromise;

  fontLoadPromise = (async () => {
    try {
      const [regBuf, boldBuf] = await Promise.all([
        fetchValidTtfBuffer('Vazirmatn-Regular.ttf'),
        fetchValidTtfBuffer('Vazirmatn-Bold.ttf'),
      ]);
      cachedVazirRegularB64 = arrayBufferToBase64(regBuf);
      cachedVazirBoldB64 = arrayBufferToBase64(boldBuf);
      return { regular: cachedVazirRegularB64, bold: cachedVazirBoldB64 };
    } catch (err) {
      fontLoadPromise = null;
      throw err;
    }
  })();

  return fontLoadPromise;
}

function savePdfBlobDownload(pdf: jsPDF, fileName: string): void {
  const safeFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  try {
    const arrayBuffer = pdf.output('arraybuffer');
    const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = safeFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch {
    pdf.save(safeFileName);
  }
}

// Warm up TTF fonts in background
if (typeof window !== 'undefined') {
  setTimeout(() => {
    ensureVectorPdfFontsLoaded().catch(() => {});
  }, 150);
}

// ============================================================================
// Helper: Image to High-Res PNG Data URL (for Logo, Watermark, QR, Signature)
// ============================================================================
function loadDecodedImage(src: string): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (img.decode) {
        img
          .decode()
          .then(() => resolve(img))
          .catch(() => resolve(img));
      } else {
        resolve(img);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function rasterizeImageToPngDataUrl(
  src: string,
  targetW: number,
  targetH: number,
  options?: { opacity?: number; grayscale?: boolean; whiteBackground?: boolean }
): Promise<{ dataUrl: string; aspect: number } | null> {
  const img = await loadDecodedImage(src);
  if (!img) return null;
  const natW = img.naturalWidth || targetW;
  const natH = img.naturalHeight || targetH;
  const aspect = natW / natH || 1;

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (options?.whiteBackground) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, targetH);
  }

  ctx.save();
  if (typeof options?.opacity === 'number') {
    ctx.globalAlpha = options.opacity;
  }
  if (options?.grayscale) {
    ctx.filter = 'grayscale(100%)';
  }

  let drawW = targetW;
  let drawH = targetH;
  if (aspect >= 1) {
    drawH = targetW / aspect;
  } else {
    drawW = targetH * aspect;
  }
  const dx = (targetW - drawW) / 2;
  const dy = (targetH - drawH) / 2;
  ctx.drawImage(img, dx, dy, drawW, drawH);
  ctx.restore();

  return {
    dataUrl: canvas.toDataURL('image/png'),
    aspect,
  };
}

// ============================================================================
// Helper: Color Conversion & Persian Text Shaping for jsPDF
// ============================================================================
function hexToRgb(hex: string): [number, number, number] {
  const clean = (hex || '#0f172a').replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16) || 0;
    const g = parseInt(clean[1] + clean[1], 16) || 0;
    const b = parseInt(clean[2] + clean[2], 16) || 0;
    return [r, g, b];
  }
  const r = parseInt(clean.slice(0, 2), 16) || 0;
  const g = parseInt(clean.slice(2, 4), 16) || 0;
  const b = parseInt(clean.slice(4, 6), 16) || 0;
  return [r, g, b];
}

function normalizePersianText(input: string): string {
  return (input || '')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '');
}

const MIRROR_BRACKETS: Record<string, string> = {
  '(': ')',
  ')': '(',
  '[': ']',
  ']': '[',
  '{': '}',
  '}': '{',
  '«': '»',
  '»': '«',
  '<': '>',
  '>': '<',
};

/**
 * Shapes a logical Persian string using jsPDF's Arabic presentation forms
 * and converts it into visual Left-to-Right order while keeping embedded
 * Persian/ASCII numbers (e.g. ۱۴۰۴/۰۸/۲۱ or ۱۲×۸) in LTR digit order.
 */
function shapePersianVisual(pdf: jsPDF, rawText: string): string {
  const normalized = normalizePersianText(rawText);
  if (!normalized) return '';

  // jsPDF processArabic shapes contextual initial/medial/final forms;
  // U+200C (ZWNJ) acts as a non-joiner during processArabic, then we strip U+200C so no .notdef glyph renders.
  const shaped: string =
    typeof (pdf as any).processArabic === 'function'
      ? (pdf as any).processArabic(normalized).replace(/\u200c/g, '')
      : normalized.replace(/\u200c/g, '');

  // Tokenize into LTR number/date/dimension groups vs single RTL characters
  const tokens: Array<{ type: 'ltr_num' | 'rtl_char'; val: string }> = [];
  const numRegex = /[۰-۹0-9]+(?:[./×xX:\-][۰-۹0-9]+)*/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = numRegex.exec(shaped)) !== null) {
    if (match.index > lastIdx) {
      const slice = shaped.slice(lastIdx, match.index);
      for (const ch of Array.from(slice)) {
        tokens.push({ type: 'rtl_char', val: MIRROR_BRACKETS[ch] || ch });
      }
    }
    tokens.push({ type: 'ltr_num', val: match[0] });
    lastIdx = match.index + match[0].length;
  }

  if (lastIdx < shaped.length) {
    const rem = shaped.slice(lastIdx);
    for (const ch of Array.from(rem)) {
      tokens.push({ type: 'rtl_char', val: MIRROR_BRACKETS[ch] || ch });
    }
  }

  return tokens
    .reverse()
    .map((t) => t.val)
    .join('');
}

// ============================================================================
// Mixed Persian (`Vazirmatn`) + English (`Times New Roman`) Run Tokenizer
// ============================================================================
interface TextSegment {
  text: string;
  bold: boolean;
  color?: string;
  fontFamily?: string;
}

interface ScriptRun {
  text: string;
  bold: boolean;
  color?: string;
  fontFamily?: string;
  script: 'latin' | 'persian';
}

/**
 * Splits a styled text segment into contiguous 'latin' (English/Times New Roman)
 * and 'persian' (Vazirmatn) runs so English words inside Persian reports
 * ALWAYS render in Times New Roman, and Persian words render in Vazirmatn
 * (or the custom inline fontFamily if specified on the segment).
 */
function splitSegmentIntoScriptRuns(
  seg: TextSegment,
  baseDir: 'rtl' | 'ltr'
): ScriptRun[] {
  const text = normalizePersianText(seg.text);
  if (!text) return [];

  const runs: ScriptRun[] = [];

  if (baseDir === 'ltr') {
    // In LTR mode, everything is 'latin' (Times New Roman) except Persian substrings
    const persianRegex = /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFC]+(?:\s+[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFC]+)*/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = persianRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        runs.push({
          text: text.slice(lastIndex, match.index),
          bold: seg.bold,
          color: seg.color,
          fontFamily: seg.fontFamily,
          script: 'latin',
        });
      }
      runs.push({
        text: match[0],
        bold: seg.bold,
        color: seg.color,
        fontFamily: seg.fontFamily,
        script: 'persian',
      });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      runs.push({
        text: text.slice(lastIndex),
        bold: seg.bold,
        color: seg.color,
        fontFamily: seg.fontFamily,
        script: 'latin',
      });
    }
    return runs;
  }

  // In RTL mode, any English word / ASCII number phrase (including leading hyphen placeholders like -mm, --mm, -cm) renders in Times New Roman ('latin')
  const latinInRtlRegex = /(?:[-–—_]+\s*)?[A-Za-z0-9]+(?:[ \t./\-+:,&×xX%][A-Za-z0-9%]+)*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = latinInRtlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push({
        text: text.slice(lastIndex, match.index),
        bold: seg.bold,
        color: seg.color,
        fontFamily: seg.fontFamily,
        script: 'persian',
      });
    }
    runs.push({
      text: match[0],
      bold: seg.bold,
      color: seg.color,
      fontFamily: seg.fontFamily,
      script: 'latin',
    });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    runs.push({
      text: text.slice(lastIndex),
      bold: seg.bold,
      color: seg.color,
      fontFamily: seg.fontFamily,
      script: 'persian',
    });
  }
  return runs;
}

// ============================================================================
// HTML Block Parser (Paragraphs, Headings, Bullet Lists, Tables)
// ============================================================================
interface ParsedParagraphBlock {
  type: 'paragraph';
  segments: TextSegment[];
  isBullet?: boolean;
  isHeading?: boolean;
  blockDir?: 'rtl' | 'ltr';
  blockAlign?: 'default' | 'center';
}

interface ParsedTableBlock {
  type: 'table';
  rows: Array<Array<{ text: string; bold: boolean }>>;
  widthRatio?: number;
}

type ParsedHtmlBlock = ParsedParagraphBlock | ParsedTableBlock;

function extractInlineSegments(
  node: Node,
  inheritedBold = false,
  inheritedColor?: string,
  inheritedFontFamily?: string
): TextSegment[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const val = (node.textContent || '').replace(/\s+/g, ' ');
    if (!val) return [];
    return [
      {
        text: val,
        bold: inheritedBold,
        color: inheritedColor,
        fontFamily: inheritedFontFamily,
      },
    ];
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return [];

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  if (tag === 'br') {
    return [
      {
        text: '\n',
        bold: inheritedBold,
        color: inheritedColor,
        fontFamily: inheritedFontFamily,
      },
    ];
  }

  const isBold =
    inheritedBold ||
    tag === 'strong' ||
    tag === 'b' ||
    tag === 'h1' ||
    tag === 'h2' ||
    tag === 'h3' ||
    tag === 'h4' ||
    el.style?.fontWeight === 'bold' ||
    Number(el.style?.fontWeight) >= 600;

  let color = inheritedColor;
  if (el.style?.color && !el.style.color.includes('inherit')) {
    color = el.style.color;
  }

  let fontFamily = inheritedFontFamily;
  const faceAttr = el.getAttribute('face');
  if (el.style?.fontFamily && !el.style.fontFamily.includes('inherit')) {
    fontFamily = el.style.fontFamily;
  } else if (faceAttr) {
    fontFamily = faceAttr;
  }

  const out: TextSegment[] = [];
  el.childNodes.forEach((child) => {
    out.push(...extractInlineSegments(child, isBold, color, fontFamily));
  });
  return out;
}

function getElementBlockDirection(el: HTMLElement): 'rtl' | 'ltr' | undefined {
  const dirAttr = (el.getAttribute('dir') || '').toLowerCase();
  if (dirAttr === 'ltr' || dirAttr === 'rtl') return dirAttr;
  const styleDir = (el.style?.direction || '').toLowerCase();
  if (styleDir === 'ltr' || styleDir === 'rtl') return styleDir;
  const align = (el.style?.textAlign || '').toLowerCase();
  if (align === 'left') return 'ltr';
  if (align === 'right') return 'rtl';
  return undefined;
}

function parseHtmlToBlocks(rawHtml: string): ParsedHtmlBlock[] {
  const cleanHtml = stripSpellHighlights(rawHtml || '', true);
  if (!cleanHtml.trim()) return [];

  const container = document.createElement('div');
  container.innerHTML = cleanHtml;

  const blocks: ParsedHtmlBlock[] = [];

  const flushInlineLinesAsParagraphs = (
    segments: TextSegment[],
    isBullet = false,
    isHeading = false,
    blockDir?: 'rtl' | 'ltr',
    blockAlign?: 'default' | 'center'
  ) => {
    let currentLine: TextSegment[] = [];
    const commitCurrent = () => {
      const joined = currentLine.map((s) => s.text).join('').trim();
      if (joined) {
        blocks.push({
          type: 'paragraph',
          segments: currentLine,
          isBullet,
          isHeading,
          blockDir,
          blockAlign,
        });
      }
      currentLine = [];
    };

    for (const seg of segments) {
      if (seg.text.includes('\n')) {
        const parts = seg.text.split('\n');
        parts.forEach((p, idx) => {
          if (p) {
            currentLine.push({
              text: p,
              bold: seg.bold,
              color: seg.color,
              fontFamily: seg.fontFamily,
            });
          }
          if (idx < parts.length - 1) {
            commitCurrent();
          }
        });
      } else {
        currentLine.push(seg);
      }
    }
    commitCurrent();
  };

  const walkBlockNodes = (parent: HTMLElement) => {
    let looseInlineSegments: TextSegment[] = [];
    const flushLoose = () => {
      if (looseInlineSegments.length > 0) {
        flushInlineLinesAsParagraphs(looseInlineSegments, false, false);
        looseInlineSegments = [];
      }
    };

    parent.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const txt = (node.textContent || '').replace(/\s+/g, ' ');
        if (txt.trim()) {
          looseInlineSegments.push({ text: txt, bold: false });
        }
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;

      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();

      if (tag === 'table') {
        flushLoose();
        const rows: Array<Array<{ text: string; bold: boolean }>> = [];
        el.querySelectorAll('tr').forEach((tr) => {
          const rowCells: Array<{ text: string; bold: boolean }> = [];
          tr.querySelectorAll('th, td').forEach((cell) => {
            const isTh = cell.tagName.toLowerCase() === 'th';
            const txt = (cell.textContent || '').replace(/\s+/g, ' ').trim();
            rowCells.push({ text: txt, bold: isTh });
          });
          if (rowCells.length > 0) {
            rows.push(rowCells);
          }
        });
        if (rows.length > 0) {
          const rawWidthAttr = (el.getAttribute('data-table-width') || el.style?.width || '').trim().toLowerCase();
          let widthRatio = 1;
          if (rawWidthAttr === 'auto' || rawWidthAttr === 'fit-content') {
            const numCols = Math.max(...rows.map((r) => r.length));
            widthRatio = Math.min(1, Math.max(0.45, numCols * 0.22));
          } else if (rawWidthAttr.endsWith('%')) {
            const pct = parseFloat(rawWidthAttr);
            if (!isNaN(pct) && pct >= 25 && pct <= 100) {
              widthRatio = pct / 100;
            }
          }
          blocks.push({ type: 'table', rows, widthRatio });
        }
      } else if (tag === 'ul' || tag === 'ol') {
        flushLoose();
        el.querySelectorAll('li').forEach((li) => {
          const liDir = getElementBlockDirection(li);
          const liFont = li.style?.fontFamily && !li.style.fontFamily.includes('inherit') ? li.style.fontFamily : undefined;
          const segs = extractInlineSegments(li, false, undefined, liFont);
          flushInlineLinesAsParagraphs(segs, true, false, liDir);
        });
      } else if (tag === 'li') {
        flushLoose();
        const liDir = getElementBlockDirection(el);
        const liFont = el.style?.fontFamily && !el.style.fontFamily.includes('inherit') ? el.style.fontFamily : undefined;
        const segs = extractInlineSegments(el, false, undefined, liFont);
        flushInlineLinesAsParagraphs(segs, true, false, liDir);
      } else if (tag === 'p' || tag === 'div' || tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4') {
        flushLoose();
        const hasNestedBlocks = el.querySelector('p, div, table, ul, ol, li, h1, h2, h3');
        if (hasNestedBlocks && tag === 'div') {
          walkBlockNodes(el);
        } else {
          const isHeading = tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4';
          const bDir = getElementBlockDirection(el);
          const bAlign: 'default' | 'center' =
            (el.style?.textAlign || '').toLowerCase() === 'center' ? 'center' : 'default';
          const bFont =
            el.style?.fontFamily && !el.style.fontFamily.includes('inherit')
              ? el.style.fontFamily
              : undefined;
          const segs = extractInlineSegments(el, isHeading, undefined, bFont);
          flushInlineLinesAsParagraphs(segs, false, isHeading, bDir, bAlign);
        }
      } else if (tag === 'br') {
        flushLoose();
      } else {
        looseInlineSegments.push(...extractInlineSegments(el, false));
      }
    });

    flushLoose();
  };

  walkBlockNodes(container);
  return blocks;
}

// ============================================================================
// Word Wrapper & Vector Line Renderer for jsPDF
// ============================================================================
function pxToPt(px: number): number {
  return Number((px * 0.75).toFixed(2));
}

function measureScriptRunWidthMm(
  pdf: jsPDF,
  run: ScriptRun,
  fontSizePt: number
): number {
  if (!run.text) return 0;
  pdf.setFontSize(fontSizePt);
  if (run.script === 'latin') {
    pdf.setFont('times', run.bold ? 'bold' : 'normal');
    return pdf.getTextWidth(run.text);
  } else {
    pdf.setFont('Vazirmatn', run.bold ? 'bold' : 'normal');
    const shaped = shapePersianVisual(pdf, run.text);
    return pdf.getTextWidth(shaped);
  }
}

function wrapSegmentsIntoLines(
  pdf: jsPDF,
  segments: TextSegment[],
  baseDir: 'rtl' | 'ltr',
  fontSizePt: number,
  maxWidthMm: number
): ScriptRun[][] {
  const rawRuns: ScriptRun[] = [];
  for (const seg of segments) {
    rawRuns.push(...splitSegmentIntoScriptRuns(seg, baseDir));
  }
  if (rawRuns.length === 0) return [];

  // Break into word-level tokens so lines wrap cleanly at spaces
  const wordTokens: ScriptRun[] = [];
  for (const run of rawRuns) {
    const parts = run.text.split(/(\s+)/);
    for (const part of parts) {
      if (!part) continue;
      wordTokens.push({
        text: part,
        bold: run.bold,
        color: run.color,
        script: run.script,
      });
    }
  }

  const linesOfTokens: ScriptRun[][] = [];
  let currentLine: ScriptRun[] = [];
  let currentWidth = 0;

  for (const tok of wordTokens) {
    const isWhitespaceOnly = /^\s+$/.test(tok.text);
    if (isWhitespaceOnly && currentLine.length === 0) {
      continue;
    }
    const w = measureScriptRunWidthMm(pdf, tok, fontSizePt);
    if (currentLine.length > 0 && currentWidth + w > maxWidthMm && !isWhitespaceOnly) {
      linesOfTokens.push(currentLine);
      currentLine = [tok];
      currentWidth = w;
    } else {
      currentLine.push(tok);
      currentWidth += w;
    }
  }
  if (currentLine.length > 0) {
    linesOfTokens.push(currentLine);
  }

  // Merge adjacent tokens on each line that share (bold, color, script)
  // so multi-word Persian phrases shape & reverse as a single natural unit!
  return linesOfTokens.map((tokens) => {
    // Trim leading/trailing whitespace tokens on the line
    while (tokens.length > 0 && /^\s+$/.test(tokens[0].text)) {
      tokens.shift();
    }
    while (tokens.length > 0 && /^\s+$/.test(tokens[tokens.length - 1].text)) {
      tokens.pop();
    }

    const merged: ScriptRun[] = [];
    for (const tok of tokens) {
      const prev = merged[merged.length - 1];
      if (
        prev &&
        prev.bold === tok.bold &&
        prev.color === tok.color &&
        prev.script === tok.script
      ) {
        prev.text += tok.text;
      } else if (
        prev &&
        /^\s+$/.test(tok.text)
      ) {
        prev.text += tok.text;
      } else {
        merged.push({ ...tok });
      }
    }
    return merged;
  });
}

function drawWrappedLineOnPdf(
  pdf: jsPDF,
  lineRuns: ScriptRun[],
  baseDir: 'rtl' | 'ltr',
  xLeft: number,
  xRight: number,
  baselineY: number,
  fontSizePt: number,
  defaultHexColor: string,
  align: 'default' | 'center' = 'default'
): void {
  if (lineRuns.length === 0) return;

  pdf.setFontSize(fontSizePt);

  // Measure space width once in current font size
  pdf.setFont('Vazirmatn', 'normal');
  const spaceW = pdf.getTextWidth(' ');

  // Calculate total line width if centered
  let startCursorX = baseDir === 'rtl' ? xRight : xLeft;
  if (align === 'center') {
    let totalW = 0;
    for (const r of lineRuns) {
      totalW += measureScriptRunWidthMm(pdf, r, fontSizePt);
    }
    const boxW = xRight - xLeft;
    if (baseDir === 'rtl') {
      startCursorX = xRight - Math.max(0, (boxW - totalW) / 2);
    } else {
      startCursorX = xLeft + Math.max(0, (boxW - totalW) / 2);
    }
  }

  let cursorX = startCursorX;

  for (const run of lineRuns) {
    const rgb = hexToRgb(run.color || defaultHexColor);
    pdf.setTextColor(rgb[0], rgb[1], rgb[2]);

    const leadSpacesMatch = run.text.match(/^\s+/);
    const trailSpacesMatch = run.text.match(/\s+$/);
    const coreText = run.text.trim();

    const leadW = leadSpacesMatch ? leadSpacesMatch[0].length * spaceW : 0;
    const trailW =
      coreText && trailSpacesMatch ? trailSpacesMatch[0].length * spaceW : 0;

    if (!coreText) {
      if (baseDir === 'rtl') {
        cursorX -= leadW;
      } else {
        cursorX += leadW;
      }
      continue;
    }

    if (run.script === 'latin') {
      pdf.setFont('times', run.bold ? 'bold' : 'normal');
      const coreW = pdf.getTextWidth(coreText);

      if (baseDir === 'rtl') {
        cursorX -= leadW;
        pdf.text(coreText, cursorX - coreW, baselineY);
        cursorX -= coreW + trailW;
      } else {
        cursorX += leadW;
        pdf.text(coreText, cursorX, baselineY);
        cursorX += coreW + trailW;
      }
    } else {
      pdf.setFont('Vazirmatn', run.bold ? 'bold' : 'normal');
      const visualStr = shapePersianVisual(pdf, coreText);
      const coreW = pdf.getTextWidth(visualStr);

      if (baseDir === 'rtl') {
        cursorX -= leadW;
        pdf.text(visualStr, cursorX - coreW, baselineY, {
          isInputVisual: true,
          isOutputVisual: true,
          isInputRtl: false,
          isOutputRtl: false,
        } as any);
        cursorX -= coreW + trailW;
      } else {
        cursorX += leadW;
        pdf.text(visualStr, cursorX, baselineY, {
          isInputVisual: true,
          isOutputVisual: true,
          isInputRtl: false,
          isOutputRtl: false,
        } as any);
        cursorX += coreW + trailW;
      }
    }
  }
}

// ============================================================================
// Main True Vector PDF Generator (100% Vector Text, Shapes, Tables & Stamp)
// ============================================================================
export interface VectorPdfExportParams {
  patientInfo: PatientInfo;
  studies: ReportStudy[];
  doctor: Doctor;
  settings: AppSettings;
  pages: A4PaginatedSheet[];
  totalPages: number;
  effectiveLogoUrl: string;
  effectiveSignatureUrl: string;
  qrDataUrl: string;
  qrMode: 'url' | 'text';
  monochromePrintMode: boolean;
  preprintedLetterheadMode: boolean;
  preprintedTopMarginMm: number;
  headerFontCss?: string;
  headerFontSize: number;
  headingFontCss?: string;
  headingFontSize: number;
  bodyFontCss?: string;
  bodyFontSize: number;
  doctorStampFontCss?: string;
  doctorStampFontSize?: number;
  lineHeight: number;
}

export async function exportTrueVectorPdfReport(
  params: VectorPdfExportParams
): Promise<void> {
  const {
    patientInfo,
    studies,
    doctor,
    settings,
    pages,
    totalPages,
    effectiveLogoUrl,
    effectiveSignatureUrl,
    qrDataUrl,
    qrMode,
    monochromePrintMode,
    preprintedLetterheadMode,
    preprintedTopMarginMm,
    headerFontCss = "'Vazirmatn', sans-serif",
    headerFontSize,
    headingFontCss = "'Vazirmatn', sans-serif",
    headingFontSize,
    bodyFontCss = "'Vazirmatn', sans-serif",
    bodyFontSize,
    doctorStampFontCss = doctor.stampFont || "'Vazirmatn', sans-serif",
    doctorStampFontSize = doctor.stampFontSize || 13,
    lineHeight,
  } = params;

  const baseName = `Report_PDF_${
    patientInfo.nationalId || patientInfo.admissionNumber || 'Radiology'
  }_${patientInfo.fullName || 'Patient'}`;

  try {

  const [{ regular: vazirRegB64, bold: vazirBoldB64 }, headerLogoPng, watermarkPng, signaturePng] =
    await Promise.all([
      ensureVectorPdfFontsLoaded(),
      !preprintedLetterheadMode && effectiveLogoUrl
        ? rasterizeImageToPngDataUrl(effectiveLogoUrl, 360, 360, {
            grayscale: monochromePrintMode,
          })
        : Promise.resolve(null),
      !preprintedLetterheadMode && effectiveLogoUrl
        ? rasterizeImageToPngDataUrl(effectiveLogoUrl, 720, 720, {
            opacity: 0.065,
            grayscale: monochromePrintMode,
            whiteBackground: true,
          })
        : Promise.resolve(null),
      effectiveSignatureUrl
        ? rasterizeImageToPngDataUrl(effectiveSignatureUrl, 480, 180, {
            grayscale: monochromePrintMode,
          })
        : Promise.resolve(null),
    ]);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  // Register embedded Persian Vazirmatn vector fonts
  // (English text uses jsPDF's built-in vector 'times' = Times New Roman!)
  pdf.addFileToVFS('Vazirmatn-Regular.ttf', vazirRegB64);
  pdf.addFont('Vazirmatn-Regular.ttf', 'Vazirmatn', 'normal');
  pdf.addFileToVFS('Vazirmatn-Bold.ttf', vazirBoldB64);
  pdf.addFont('Vazirmatn-Bold.ttf', 'Vazirmatn', 'bold');

  const modalityNames: Record<Modality, string> = {
    mri: 'ام‌آر‌آی (MRI)',
    ct: 'سی‌تی‌اسکن (CT Scan)',
    sonography: 'سونوگرافی (Ultrasound)',
  };

  const getModalityColorHex = (mod: Modality): string => {
    if (monochromePrintMode) return '#000000';
    return (
      settings.modalityColors?.[mod] ||
      (mod === 'mri' ? '#4f46e5' : mod === 'ct' ? '#059669' : '#0284c7')
    );
  };

  const primaryModality: Modality = studies[0]?.modality || 'sonography';
  const activeModalityColor = getModalityColorHex(primaryModality);

  const clinicNameDisplay = settings.clinicName || 'مرکز جامع تصویربرداری بیمارستان شفا';
  const clinicSubtitleDisplay =
    settings.clinicSubtitle || 'رادیولوژی، سونوگرافی، ام‌آر‌آی، ام‌آر‌آی قلب، سی‌تی‌اسکن';
  const clinicAddressDisplay =
    settings.clinicAddress || 'مازندران، ساری، کمربندی غربی، بلوار ولیعصر';
  const clinicPhoneDisplay = settings.clinicPhone || '۰۱۱-۳۳۲۰۵۰۰۶-۹';

  const marginLeft = 15;
  const marginRight = 195;
  const contentWidth = marginRight - marginLeft; // 180mm

  const bodyPt = pxToPt(bodyFontSize || 14);
  const headingPt = pxToPt(headingFontSize || 16);
  const headerTitlePt = pxToPt(headerFontSize || 18);
  const lineStepMm = Number(((bodyPt * 0.3528) * Math.max(1.45, Math.min(2.1, lineHeight || 1.75))).toFixed(2));

  pages.forEach((sheet, pageIdx) => {
    if (pageIdx > 0) {
      pdf.addPage('a4', 'portrait');
    }

    // 1. Background Centered Clinic Logo Watermark (6.5% opacity)
    if (watermarkPng && !preprintedLetterheadMode) {
      const wmSize = 88;
      const wmX = (210 - wmSize) / 2;
      const wmY = (297 - wmSize) / 2;
      pdf.addImage(watermarkPng.dataUrl, 'PNG', wmX, wmY, wmSize, wmSize, undefined, 'FAST');
    }

    let cursorY = preprintedLetterheadMode ? Math.max(15, preprintedTopMarginMm) : 12;

    // 2. Official Clinic Letterhead
    if (!preprintedLetterheadMode) {
      // Clinic Logo on Right (x = 178..195mm)
      if (headerLogoPng) {
        pdf.addImage(headerLogoPng.dataUrl, 'PNG', 178, cursorY, 17, 17, undefined, 'FAST');
      }

      const headerTextRightX = headerLogoPng ? 175 : marginRight;

      // Clinic Name
      const nameLines = wrapSegmentsIntoLines(
        pdf,
        [{ text: clinicNameDisplay, bold: true }],
        'rtl',
        headerTitlePt,
        118
      );
      if (nameLines[0]) {
        drawWrappedLineOnPdf(
          pdf,
          nameLines[0],
          'rtl',
          60,
          headerTextRightX,
          cursorY + 5.5,
          headerTitlePt,
          '#050811'
        );
      }

      // Clinic Subtitle
      const subPt = Math.max(8.5, Math.round(headerTitlePt * 0.67));
      const subLines = wrapSegmentsIntoLines(
        pdf,
        [{ text: clinicSubtitleDisplay, bold: true }],
        'rtl',
        subPt,
        118
      );
      if (subLines[0]) {
        drawWrappedLineOnPdf(
          pdf,
          subLines[0],
          'rtl',
          60,
          headerTextRightX,
          cursorY + 11.2,
          subPt,
          activeModalityColor
        );
      }

      // Clinic Address & Phone
      const addrPt = Math.max(7.8, Math.round(headerTitlePt * 0.58));
      const addrText = `${clinicAddressDisplay}  •  تلفن: ${clinicPhoneDisplay}`;
      const addrLines = wrapSegmentsIntoLines(
        pdf,
        [{ text: addrText, bold: false }],
        'rtl',
        addrPt,
        118
      );
      if (addrLines[0]) {
        drawWrappedLineOnPdf(
          pdf,
          addrLines[0],
          'rtl',
          60,
          headerTextRightX,
          cursorY + 16.2,
          addrPt,
          '#1e293b'
        );
      }

      // Left Side Admission & Date
      const admText = `شماره پذیرش: ${patientInfo.admissionNumber || 'ADM-001'}`;
      const admLines = wrapSegmentsIntoLines(
        pdf,
        [{ text: admText, bold: true }],
        'rtl',
        8.5,
        52
      );
      if (admLines[0]) {
        drawWrappedLineOnPdf(pdf, admLines[0], 'ltr', marginLeft, 65, cursorY + 6, 8.5, '#050811');
      }

      const dateText = `تاریخ: ${patientInfo.reportDate || '۱۴۰۴/۰۸/۲۱'}`;
      const dateLines = wrapSegmentsIntoLines(
        pdf,
        [{ text: dateText, bold: true }],
        'rtl',
        8.2,
        52
      );
      if (dateLines[0]) {
        drawWrappedLineOnPdf(pdf, dateLines[0], 'ltr', marginLeft, 65, cursorY + 11.2, 8.2, '#1e293b');
      }

      if (totalPages > 1) {
        const pageStr = `برگه ${sheet.pageNumber} از ${totalPages}`;
        const pageLines = wrapSegmentsIntoLines(
          pdf,
          [{ text: pageStr, bold: true }],
          'rtl',
          8,
          52
        );
        if (pageLines[0]) {
          drawWrappedLineOnPdf(
            pdf,
            pageLines[0],
            'ltr',
            marginLeft,
            65,
            cursorY + 16,
            8,
            activeModalityColor
          );
        }
      }

      cursorY += 20;
      const borderRgb = hexToRgb(activeModalityColor);
      pdf.setDrawColor(borderRgb[0], borderRgb[1], borderRgb[2]);
      pdf.setLineWidth(0.55);
      pdf.line(marginLeft, cursorY, marginRight, cursorY);
      cursorY += 3;
    }

    // 3. Patient Demographics Box
    const demoBoxH = 9.5;
    pdf.setFillColor(248, 250, 252);
    if (monochromePrintMode) {
      pdf.setDrawColor(0, 0, 0);
    } else {
      pdf.setDrawColor(148, 163, 184);
    }
    pdf.setLineWidth(0.3);
    pdf.roundedRect(marginLeft, cursorY, contentWidth, demoBoxH, 2, 2, 'FD');

    const demoPt = 8.6;
    const demoBaselineY = cursorY + 6.1;
    const genderFa =
      patientInfo.gender === 'female'
        ? 'زن'
        : patientInfo.gender === 'male'
        ? 'مرد'
        : 'نامشخص';
    const ageGenderStr = `${patientInfo.age ? `${patientInfo.age} سال` : '---'} / ${genderFa}`;

    // 4 Columns inside Demographics Box (Right-to-Left)
    const col1Lines = wrapSegmentsIntoLines(
      pdf,
      [
        { text: 'نام بیمار: ', bold: false, color: '#334155' },
        { text: patientInfo.fullName || '---', bold: true, color: '#050811' },
      ],
      'rtl',
      demoPt,
      48
    );
    if (col1Lines[0]) {
      drawWrappedLineOnPdf(pdf, col1Lines[0], 'rtl', 145, 192, demoBaselineY, demoPt, '#050811');
    }

    const col2Lines = wrapSegmentsIntoLines(
      pdf,
      [
        { text: 'کد ملی / شناسه: ', bold: false, color: '#334155' },
        { text: patientInfo.nationalId || '---', bold: true, color: '#050811' },
      ],
      'rtl',
      demoPt,
      44
    );
    if (col2Lines[0]) {
      drawWrappedLineOnPdf(pdf, col2Lines[0], 'rtl', 100, 144, demoBaselineY, demoPt, '#050811');
    }

    const col3Lines = wrapSegmentsIntoLines(
      pdf,
      [
        { text: 'سن و جنس: ', bold: false, color: '#334155' },
        { text: ageGenderStr, bold: true, color: '#050811' },
      ],
      'rtl',
      demoPt,
      36
    );
    if (col3Lines[0]) {
      drawWrappedLineOnPdf(pdf, col3Lines[0], 'rtl', 63, 99, demoBaselineY, demoPt, '#050811');
    }

    const col4Lines = wrapSegmentsIntoLines(
      pdf,
      [
        { text: 'پزشک معالج: ', bold: false, color: '#334155' },
        { text: patientInfo.referringPhysician || 'همکار گرامی', bold: true, color: '#050811' },
      ],
      'rtl',
      demoPt,
      45
    );
    if (col4Lines[0]) {
      drawWrappedLineOnPdf(pdf, col4Lines[0], 'rtl', 17, 62, demoBaselineY, demoPt, '#050811');
    }

    cursorY += demoBoxH + 5.5;

    const maxBodyY = preprintedLetterheadMode ? 276 : 254;

    // 4. Studies & Findings Slices
    sheet.slices.forEach((slice, sIdx) => {
      const { study } = slice;
      const studyModColor = getModalityColorHex(study.modality);
      const studyDir: 'rtl' | 'ltr' =
        study.direction || (study.modality === 'sonography' ? 'rtl' : 'ltr');
      const isLtr = studyDir === 'ltr';

      if (sIdx > 0 && cursorY < maxBodyY - 10) {
        pdf.setDrawColor(148, 163, 184);
        pdf.setLineWidth(0.3);
        pdf.setLineDashPattern([1.5, 1.5], 0);
        pdf.line(marginLeft, cursorY - 1.5, marginRight, cursorY - 1.5);
        pdf.setLineDashPattern([], 0);
        cursorY += 3.5;
      }

      // Study Title & Technique Heading
      const rawTitle =
        study.titleAndTechnique ||
        (isLtr
          ? `${study.modality.toUpperCase()} Study Report`
          : `گزارش ${modalityNames[study.modality]}`);
      const contSuffix = slice.isContinuation
        ? isLtr
          ? ` (Continued on page ${sheet.pageNumber})`
          : ` (ادامه در برگه ${sheet.pageNumber})`
        : '';

      const titleLines = wrapSegmentsIntoLines(
        pdf,
        [{ text: rawTitle + contSuffix, bold: true, color: studyModColor }],
        studyDir,
        headingPt,
        contentWidth
      );
      for (const tLine of titleLines) {
        if (cursorY > maxBodyY) break;
        drawWrappedLineOnPdf(
          pdf,
          tLine,
          studyDir,
          marginLeft,
          marginRight,
          cursorY + 3.5,
          headingPt,
          studyModColor
        );
        cursorY += lineStepMm + 0.8;
      }
      cursorY += 1.2;

      // Comparison
      if (slice.showComparisonSlice && study.comparison) {
        const compLabel = isLtr ? 'Comparison: ' : 'مقایسه با تصاویر پیشین (Comparison): ';
        const compLines = wrapSegmentsIntoLines(
          pdf,
          [
            { text: compLabel, bold: true, color: '#050811' },
            { text: study.comparison, bold: false, color: '#1e293b' },
          ],
          studyDir,
          Math.max(8.5, bodyPt - 1),
          contentWidth
        );
        for (const cLine of compLines) {
          if (cursorY > maxBodyY) break;
          drawWrappedLineOnPdf(
            pdf,
            cLine,
            studyDir,
            marginLeft,
            marginRight,
            cursorY + 3,
            Math.max(8.5, bodyPt - 1),
            '#050811'
          );
          cursorY += lineStepMm;
        }
        cursorY += 1.5;
      }

      // Findings HTML Blocks
      if (slice.findingsHtmlSlice) {
        const blocks = parseHtmlToBlocks(slice.findingsHtmlSlice);
        for (const block of blocks) {
          if (cursorY > maxBodyY) break;

          if (block.type === 'paragraph') {
            const effectiveDir: 'rtl' | 'ltr' = block.blockDir || studyDir;
            const effectiveIsLtr = effectiveDir === 'ltr';
            const segs = [...block.segments];
            if (block.isBullet) {
              segs.unshift({ text: '• ', bold: true, color: studyModColor });
            }
            const pPt = block.isHeading ? headingPt : bodyPt;
            const wrappedLines = wrapSegmentsIntoLines(
              pdf,
              segs,
              effectiveDir,
              pPt,
              block.isBullet ? contentWidth - 4 : contentWidth
            );
            const pXLeft = block.isBullet && effectiveIsLtr ? marginLeft + 4 : marginLeft;
            const pXRight = block.isBullet && !effectiveIsLtr ? marginRight - 4 : marginRight;

            for (const wLine of wrappedLines) {
              if (cursorY > maxBodyY) break;
              drawWrappedLineOnPdf(
                pdf,
                wLine,
                effectiveDir,
                pXLeft,
                pXRight,
                cursorY + 3.2,
                pPt,
                '#050811',
                block.blockAlign || 'default'
              );
              cursorY += lineStepMm;
            }
            cursorY += 1.1;
          } else if (block.type === 'table' && block.rows.length > 0) {
            const numCols = Math.max(...block.rows.map((r) => r.length));
            if (numCols > 0) {
              const tableW = contentWidth * (block.widthRatio || 1);
              const colW = tableW / numCols;
              const rowH = lineStepMm + 2.2;
              pdf.setDrawColor(148, 163, 184);
              pdf.setLineWidth(0.25);

              for (let rIdx = 0; rIdx < block.rows.length; rIdx++) {
                if (cursorY + rowH > maxBodyY) break;
                const row = block.rows[rIdx];
                for (let cIdx = 0; cIdx < numCols; cIdx++) {
                  const cell = row[cIdx] || { text: '', bold: false };
                  const cellX = isLtr
                    ? marginLeft + cIdx * colW
                    : marginRight - (cIdx + 1) * colW;
                  if (cell.bold || rIdx === 0) {
                    pdf.setFillColor(241, 245, 249);
                    pdf.rect(cellX, cursorY, colW, rowH, 'FD');
                  } else {
                    pdf.rect(cellX, cursorY, colW, rowH, 'S');
                  }
                  const cellLines = wrapSegmentsIntoLines(
                    pdf,
                    [{ text: cell.text, bold: cell.bold || rIdx === 0 }],
                    studyDir,
                    Math.max(8, bodyPt - 1),
                    colW - 3
                  );
                  if (cellLines[0]) {
                    drawWrappedLineOnPdf(
                      pdf,
                      cellLines[0],
                      studyDir,
                      cellX + 1.5,
                      cellX + colW - 1.5,
                      cursorY + rowH * 0.68,
                      Math.max(8, bodyPt - 1),
                      '#050811'
                    );
                  }
                }
                cursorY += rowH;
              }
              cursorY += 2;
            }
          }
        }
      }

      // Impression Box
      if (slice.showImpressionSlice && study.impressionHtml && cursorY < maxBodyY - 8) {
        const impBlocks = parseHtmlToBlocks(study.impressionHtml);
        const impWrappedLines: ScriptRun[][] = [];
        for (const b of impBlocks) {
          if (b.type === 'paragraph') {
            const segs = [...b.segments];
            if (b.isBullet) segs.unshift({ text: '• ', bold: true });
            impWrappedLines.push(
              ...wrapSegmentsIntoLines(pdf, segs, studyDir, bodyPt, contentWidth - 7)
            );
          }
        }

        const impHeaderPt = Math.max(9.5, headingPt - 0.8);
        const boxPaddingTop = 3.5;
        const boxPaddingBottom = 3;
        const impBoxH =
          boxPaddingTop +
          lineStepMm +
          1 +
          impWrappedLines.length * lineStepMm +
          boxPaddingBottom;

        cursorY += 1.5;
        const modRgb = hexToRgb(studyModColor);
        pdf.setFillColor(248, 250, 252);
        pdf.setDrawColor(modRgb[0], modRgb[1], modRgb[2]);
        pdf.setLineWidth(0.5);
        pdf.roundedRect(marginLeft, cursorY, contentWidth, impBoxH, 2.5, 2.5, 'FD');

        let impY = cursorY + boxPaddingTop + 3;
        const impTitle = isLtr ? 'IMPRESSION:' : 'نتیجه‌گیری نهایی (Impression):';
        const impTitleLines = wrapSegmentsIntoLines(
          pdf,
          [{ text: impTitle, bold: true, color: studyModColor }],
          studyDir,
          impHeaderPt,
          contentWidth - 7
        );
        if (impTitleLines[0]) {
          drawWrappedLineOnPdf(
            pdf,
            impTitleLines[0],
            studyDir,
            marginLeft + 3.5,
            marginRight - 3.5,
            impY,
            impHeaderPt,
            studyModColor
          );
        }
        impY += lineStepMm + 0.8;

        for (const iLine of impWrappedLines) {
          // Force bold weight inside Impression for crisp diagnostic emphasis
          const boldLine = iLine.map((r) => ({ ...r, bold: true }));
          drawWrappedLineOnPdf(
            pdf,
            boldLine,
            studyDir,
            marginLeft + 3.5,
            marginRight - 3.5,
            impY,
            bodyPt,
            '#050811'
          );
          impY += lineStepMm;
        }

        cursorY += impBoxH + 2.5;
      }

      // Recommendations Box
      if (slice.showRecommendationsSlice && study.recommendationsHtml && cursorY < maxBodyY - 6) {
        const recBlocks = parseHtmlToBlocks(study.recommendationsHtml);
        const recSegs: TextSegment[] = [
          {
            text: isLtr ? 'Recommendations: ' : 'توصیه‌ها (Recommendations): ',
            bold: true,
            color: '#050811',
          },
        ];
        recBlocks.forEach((b, idx) => {
          if (b.type === 'paragraph') {
            if (idx > 0) recSegs.push({ text: ' | ', bold: false });
            recSegs.push(...b.segments);
          }
        });

        const recLines = wrapSegmentsIntoLines(
          pdf,
          recSegs,
          studyDir,
          Math.max(8.5, bodyPt - 0.8),
          contentWidth - 6
        );
        const recBoxH = recLines.length * lineStepMm + 4.5;
        pdf.setFillColor(248, 250, 252);
        pdf.setDrawColor(203, 213, 225);
        pdf.setLineWidth(0.3);
        pdf.roundedRect(marginLeft, cursorY, contentWidth, recBoxH, 2, 2, 'FD');

        let recY = cursorY + 4.8;
        for (const rLine of recLines) {
          drawWrappedLineOnPdf(
            pdf,
            rLine,
            studyDir,
            marginLeft + 3,
            marginRight - 3,
            recY,
            Math.max(8.5, bodyPt - 0.8),
            '#050811'
          );
          recY += lineStepMm;
        }
        cursorY += recBoxH + 2;
      }
    });

    // 5. Pinned Bottom Footer (QR Code + Verification Text on Right, Doctor Stamp & Signature on Left)
    if (!preprintedLetterheadMode) {
      const footerTopY = 257;
      const borderRgb = hexToRgb(activeModalityColor);
      pdf.setDrawColor(borderRgb[0], borderRgb[1], borderRgb[2]);
      pdf.setLineWidth(0.45);
      pdf.line(marginLeft, footerTopY, marginRight, footerTopY);

      // Right Side: QR Code Box (x = 175.5..195mm, y = 260..279.5mm)
      const qrSize = 19.5;
      const qrX = marginRight - qrSize;
      const qrY = footerTopY + 3;
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(15, 23, 42);
      pdf.setLineWidth(0.4);
      pdf.roundedRect(qrX, qrY, qrSize, qrSize, 1.5, 1.5, 'FD');
      if (qrDataUrl) {
        pdf.addImage(qrDataUrl, 'PNG', qrX + 1, qrY + 1, qrSize - 2, qrSize - 2, undefined, 'FAST');
      }

      const qrTextRightX = qrX - 3;
      const pacCode = `کد اصالت‌سنجی: ${
        patientInfo.nationalId || patientInfo.admissionNumber || '88412'
      }-PAC`;
      const pacLines = wrapSegmentsIntoLines(
        pdf,
        [{ text: pacCode, bold: true }],
        'rtl',
        7.8,
        92
      );
      if (pacLines[0]) {
        drawWrappedLineOnPdf(pdf, pacLines[0], 'rtl', 80, qrTextRightX, qrY + 6.5, 7.8, '#050811');
      }

      const qrDesc =
        qrMode === 'url'
          ? 'اسکن بارکد با دوربین موبایل جهت باز شدن گواهی رسمی اصالت گزارش'
          : 'اسکن بارکد با دوربین موبایل جهت مشاهده کارت مشخصات تاییدشده گزارش';
      const descLines = wrapSegmentsIntoLines(
        pdf,
        [{ text: qrDesc, bold: false }],
        'rtl',
        7.2,
        92
      );
      if (descLines[0]) {
        drawWrappedLineOnPdf(pdf, descLines[0], 'rtl', 80, qrTextRightX, qrY + 11.5, 7.2, '#334155');
      }

      const footerClinicLines = wrapSegmentsIntoLines(
        pdf,
        [{ text: clinicNameDisplay, bold: true }],
        'rtl',
        7.4,
        92
      );
      if (footerClinicLines[0]) {
        drawWrappedLineOnPdf(
          pdf,
          footerClinicLines[0],
          'rtl',
          80,
          qrTextRightX,
          qrY + 16.5,
          7.4,
          activeModalityColor
        );
      }

      // Left Side: Radiologist Stamp & Digital Signature Box (Supports multi-line specialty & custom stamp font)
      const stampX = marginLeft;
      const stampW = 60;
      const stampNamePt = pxToPt(doctorStampFontSize || doctor.stampFontSize || 13);
      const stampSpecPt = Math.max(7.5, stampNamePt - 1.5);

      const rawSpecParagraphs = (doctor.specialty || '')
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      const docSpecLines: ScriptRun[][] = [];
      for (const sp of rawSpecParagraphs) {
        docSpecLines.push(
          ...wrapSegmentsIntoLines(pdf, [{ text: sp, bold: true }], 'rtl', stampSpecPt, stampW - 5)
        );
      }

      const extraSpecLines = Math.max(0, docSpecLines.length - 1);
      const stampH = 26 + extraSpecLines * 3.6;
      const stampY = Math.max(footerTopY + 1, footerTopY + 2.5 - Math.min(3.5, extraSpecLines * 1.6));

      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(borderRgb[0], borderRgb[1], borderRgb[2]);
      pdf.setLineWidth(0.45);
      pdf.setLineDashPattern([1.6, 1.2], 0);
      pdf.roundedRect(stampX, stampY, stampW, stampH, 2.5, 2.5, 'FD');
      pdf.setLineDashPattern([], 0);

      const isCustomStampFont =
        Boolean(doctorStampFontCss) &&
        !doctorStampFontCss
          .replace(/['"]/g, '')
          .split(',')[0]
          .trim()
          .toLowerCase()
          .startsWith('vazirmatn');

      let drewCustomStampText = false;
      if (isCustomStampFont && typeof document !== 'undefined') {
        try {
          const textBoxH = Math.max(11, 6 + docSpecLines.length * 3.6);
          const scalePxPerMm = 14; // ~355 DPI
          const c = document.createElement('canvas');
          c.width = Math.round(stampW * scalePxPerMm);
          c.height = Math.round(textBoxH * scalePxPerMm);
          const sCtx = c.getContext('2d');
          if (sCtx) {
            sCtx.scale(scalePxPerMm, scalePxPerMm);
            const stampNameMm = (doctorStampFontSize || doctor.stampFontSize || 13) * 0.2646;
            const stampSpecMm = Math.max(2.65, stampNameMm - 0.5);
            const cNameLines = wrapCanvasSegmentsIntoLines(
              sCtx,
              [{ text: doctor.name, bold: true }],
              'rtl',
              stampNameMm,
              stampW - 4,
              doctorStampFontCss
            );
            if (cNameLines[0]) {
              drawCanvasWrappedLine(
                sCtx,
                cNameLines[0],
                'rtl',
                2,
                stampW - 2,
                4.6,
                stampNameMm,
                doctorStampFontCss,
                activeModalityColor,
                'center'
              );
            }
            let cSpecY = 8.8;
            for (const sp of rawSpecParagraphs) {
              const wrappedSp = wrapCanvasSegmentsIntoLines(
                sCtx,
                [{ text: sp, bold: true }],
                'rtl',
                stampSpecMm,
                stampW - 5,
                doctorStampFontCss
              );
              for (const sLine of wrappedSp) {
                drawCanvasWrappedLine(
                  sCtx,
                  sLine,
                  'rtl',
                  2,
                  stampW - 2,
                  cSpecY,
                  stampSpecMm,
                  doctorStampFontCss,
                  '#0f172a',
                  'center'
                );
                cSpecY += 3.6;
              }
            }
            pdf.addImage(
              c.toDataURL('image/png'),
              'PNG',
              stampX,
              stampY + 0.6,
              stampW,
              textBoxH,
              undefined,
              'FAST'
            );
            drewCustomStampText = true;
          }
        } catch {
          drewCustomStampText = false;
        }
      }

      let specCursorY = stampY + 9.6;
      if (!drewCustomStampText) {
        const docNameLines = wrapSegmentsIntoLines(
          pdf,
          [{ text: doctor.name, bold: true }],
          'rtl',
          stampNamePt,
          stampW - 4
        );
        if (docNameLines[0]) {
          drawWrappedLineOnPdf(
            pdf,
            docNameLines[0],
            'rtl',
            stampX + 2,
            stampX + stampW - 2,
            stampY + 5.2,
            stampNamePt,
            activeModalityColor,
            'center'
          );
        }

        for (const sLine of docSpecLines) {
          drawWrappedLineOnPdf(
            pdf,
            sLine,
            'rtl',
            stampX + 2,
            stampX + stampW - 2,
            specCursorY,
            stampSpecPt,
            '#0f172a',
            'center'
          );
          specCursorY += 3.6;
        }
      } else {
        specCursorY = stampY + 9.6 + docSpecLines.length * 3.6;
      }

      const mcY = Math.max(stampY + 13.6, specCursorY + 0.3);
      const mcLines = wrapSegmentsIntoLines(
        pdf,
        [{ text: `شماره نظام پزشکی: ${doctor.medicalCouncilId || ''}`, bold: true }],
        'rtl',
        7.4,
        stampW - 4
      );
      if (mcLines[0]) {
        drawWrappedLineOnPdf(
          pdf,
          mcLines[0],
          'rtl',
          stampX + 2,
          stampX + stampW - 2,
          mcY,
          7.4,
          '#1e293b',
          'center'
        );
      }

      if (signaturePng) {
        const sigH = 9.2;
        const sigW = Math.min(42, sigH * signaturePng.aspect);
        const sigX = stampX + (stampW - sigW) / 2;
        const sigY = mcY + 1.3;
        pdf.addImage(signaturePng.dataUrl, 'PNG', sigX, sigY, sigW, sigH, undefined, 'FAST');
      }
    }
  });

  savePdfBlobDownload(pdf, `${baseName}.pdf`);
  } catch (vecErr) {
    console.warn('Vector PDF font fallback triggered, generating 300-DPI A4 PDF:', vecErr);
    const fallbackPdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });
    for (let i = 0; i < pages.length; i++) {
      if (i > 0) {
        fallbackPdf.addPage('a4', 'portrait');
      }
      const canvas = await renderTrueVectorCanvasPage({
        patientInfo,
        studies,
        doctor,
        settings,
        sheet: pages[i],
        totalPages,
        effectiveLogoUrl,
        effectiveSignatureUrl,
        qrDataUrl,
        qrMode,
        monochromePrintMode,
        preprintedLetterheadMode,
        preprintedTopMarginMm,
        headerFontCss,
        headerFontSize,
        headingFontCss,
        headingFontSize,
        bodyFontCss,
        bodyFontSize,
        doctorStampFontCss,
        doctorStampFontSize,
        lineHeight,
        dpiScale: 2.5,
      });
      const pageDataUrl = canvas.toDataURL('image/png');
      fallbackPdf.addImage(pageDataUrl, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
    }
    savePdfBlobDownload(fallbackPdf, `${baseName}.pdf`);
  }
}

// ============================================================================
// True 300-DPI Native HTML5 Canvas Renderer for Ultra-Sharp PNG Export
// (Bypasses <svg><foreignObject> completely so text is never blurry or broken!)
// ============================================================================
export interface HighResCanvasPageParams {
  patientInfo: PatientInfo;
  studies: ReportStudy[];
  doctor: Doctor;
  settings: AppSettings;
  sheet: A4PaginatedSheet;
  totalPages: number;
  effectiveLogoUrl: string;
  effectiveSignatureUrl: string;
  qrDataUrl: string;
  qrMode: 'url' | 'text';
  monochromePrintMode: boolean;
  preprintedLetterheadMode: boolean;
  preprintedTopMarginMm: number;
  headerFontCss: string;
  headerFontSize: number;
  headingFontCss: string;
  headingFontSize: number;
  bodyFontCss: string;
  bodyFontSize: number;
  doctorStampFontCss: string;
  doctorStampFontSize: number;
  lineHeight: number;
  dpiScale?: number;
}

function measureCanvasRunWidthMm(
  ctx: CanvasRenderingContext2D,
  run: ScriptRun,
  fontSizeMm: number,
  persianFontCss: string
): number {
  if (!run.text) return 0;
  const activeRunFont = run.fontFamily || persianFontCss;
  if (run.script === 'latin' && !run.fontFamily) {
    ctx.font = `${run.bold ? 700 : 400} ${fontSizeMm}px 'Times New Roman', 'TimesNewRomanLatin', serif`;
  } else {
    ctx.font = `${run.bold ? 800 : 500} ${fontSizeMm}px ${activeRunFont}`;
  }
  return ctx.measureText(run.text).width;
}

function wrapCanvasSegmentsIntoLines(
  ctx: CanvasRenderingContext2D,
  segments: TextSegment[],
  baseDir: 'rtl' | 'ltr',
  fontSizeMm: number,
  maxWidthMm: number,
  persianFontCss: string
): ScriptRun[][] {
  const rawRuns: ScriptRun[] = [];
  for (const seg of segments) {
    rawRuns.push(...splitSegmentIntoScriptRuns(seg, baseDir));
  }
  if (rawRuns.length === 0) return [];

  const wordTokens: ScriptRun[] = [];
  for (const run of rawRuns) {
    const parts = run.text.split(/(\s+)/);
    for (const part of parts) {
      if (!part) continue;
      wordTokens.push({
        text: part,
        bold: run.bold,
        color: run.color,
        fontFamily: run.fontFamily,
        script: run.script,
      });
    }
  }

  const linesOfTokens: ScriptRun[][] = [];
  let currentLine: ScriptRun[] = [];
  let currentWidth = 0;

  for (const tok of wordTokens) {
    const isWhitespaceOnly = /^\s+$/.test(tok.text);
    if (isWhitespaceOnly && currentLine.length === 0) {
      continue;
    }
    const w = measureCanvasRunWidthMm(ctx, tok, fontSizeMm, persianFontCss);
    if (currentLine.length > 0 && currentWidth + w > maxWidthMm && !isWhitespaceOnly) {
      linesOfTokens.push(currentLine);
      currentLine = [tok];
      currentWidth = w;
    } else {
      currentLine.push(tok);
      currentWidth += w;
    }
  }
  if (currentLine.length > 0) {
    linesOfTokens.push(currentLine);
  }

  return linesOfTokens.map((tokens) => {
    while (tokens.length > 0 && /^\s+$/.test(tokens[0].text)) {
      tokens.shift();
    }
    while (tokens.length > 0 && /^\s+$/.test(tokens[tokens.length - 1].text)) {
      tokens.pop();
    }

    const merged: ScriptRun[] = [];
    for (const tok of tokens) {
      const prev = merged[merged.length - 1];
      if (
        prev &&
        prev.bold === tok.bold &&
        prev.color === tok.color &&
        prev.fontFamily === tok.fontFamily &&
        prev.script === tok.script
      ) {
        prev.text += tok.text;
      } else if (prev && /^\s+$/.test(tok.text)) {
        prev.text += tok.text;
      } else {
        merged.push({ ...tok });
      }
    }
    return merged;
  });
}

function drawCanvasWrappedLine(
  ctx: CanvasRenderingContext2D,
  lineRuns: ScriptRun[],
  baseDir: 'rtl' | 'ltr',
  xLeft: number,
  xRight: number,
  baselineY: number,
  fontSizeMm: number,
  persianFontCss: string,
  defaultHexColor: string,
  align: 'default' | 'center' = 'default'
): void {
  if (lineRuns.length === 0) return;

  ctx.font = `500 ${fontSizeMm}px ${persianFontCss}`;
  const spaceW = ctx.measureText(' ').width;

  let startCursorX = baseDir === 'rtl' ? xRight : xLeft;
  if (align === 'center') {
    let totalW = 0;
    for (const r of lineRuns) {
      totalW += measureCanvasRunWidthMm(ctx, r, fontSizeMm, persianFontCss);
    }
    const boxW = xRight - xLeft;
    if (baseDir === 'rtl') {
      startCursorX = xRight - Math.max(0, (boxW - totalW) / 2);
    } else {
      startCursorX = xLeft + Math.max(0, (boxW - totalW) / 2);
    }
  }

  let cursorX = startCursorX;

  for (const run of lineRuns) {
    ctx.fillStyle = run.color || defaultHexColor;

    const leadSpacesMatch = run.text.match(/^\s+/);
    const trailSpacesMatch = run.text.match(/\s+$/);
    const coreText = run.text.trim();

    const leadW = leadSpacesMatch ? leadSpacesMatch[0].length * spaceW : 0;
    const trailW = coreText && trailSpacesMatch ? trailSpacesMatch[0].length * spaceW : 0;

    if (!coreText) {
      if (baseDir === 'rtl') {
        cursorX -= leadW;
      } else {
        cursorX += leadW;
      }
      continue;
    }

    const activeRunFont = run.fontFamily || persianFontCss;

    if (run.script === 'latin') {
      const latinFont = run.fontFamily || `'Times New Roman', 'TimesNewRomanLatin', serif`;
      ctx.font = `${run.bold ? 700 : 400} ${fontSizeMm}px ${latinFont}`;
      ctx.direction = 'ltr';
      ctx.textAlign = 'left';
      const coreW = ctx.measureText(coreText).width;

      if (baseDir === 'rtl') {
        cursorX -= leadW;
        ctx.fillText(coreText, cursorX - coreW, baselineY);
        cursorX -= coreW + trailW;
      } else {
        cursorX += leadW;
        ctx.fillText(coreText, cursorX, baselineY);
        cursorX += coreW + trailW;
      }
    } else {
      ctx.font = `${run.bold ? 800 : 500} ${fontSizeMm}px ${activeRunFont}`;
      ctx.direction = 'rtl';
      ctx.textAlign = 'right';
      const coreW = ctx.measureText(coreText).width;

      if (baseDir === 'rtl') {
        cursorX -= leadW;
        ctx.fillText(coreText, cursorX, baselineY);
        cursorX -= coreW + trailW;
      } else {
        cursorX += leadW;
        ctx.fillText(coreText, cursorX + coreW, baselineY);
        cursorX += coreW + trailW;
      }
    }
  }
}

export async function renderTrueVectorCanvasPage(
  params: HighResCanvasPageParams
): Promise<HTMLCanvasElement> {
  const {
    patientInfo,
    studies,
    doctor,
    settings,
    sheet,
    totalPages,
    effectiveLogoUrl,
    effectiveSignatureUrl,
    qrDataUrl,
    qrMode,
    monochromePrintMode,
    preprintedLetterheadMode,
    preprintedTopMarginMm,
    headerFontCss,
    headerFontSize,
    headingFontCss,
    headingFontSize,
    bodyFontCss,
    bodyFontSize,
    doctorStampFontCss,
    doctorStampFontSize,
    lineHeight,
    dpiScale = 11.811, // 2480 x 3508 pixels (True 300 DPI A4)
  } = params;

  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {}
  }

  const [logoImg, qrImg, sigImg] = await Promise.all([
    !preprintedLetterheadMode && effectiveLogoUrl
      ? loadDecodedImage(effectiveLogoUrl)
      : Promise.resolve(null),
    qrDataUrl ? loadDecodedImage(qrDataUrl) : Promise.resolve(null),
    effectiveSignatureUrl ? loadDecodedImage(effectiveSignatureUrl) : Promise.resolve(null),
  ]);

  const canvas = document.createElement('canvas');
  const widthPx = Math.round(210 * dpiScale);
  const heightPx = Math.round(297 * dpiScale);
  canvas.width = widthPx;
  canvas.height = heightPx;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Scale so all drawing coordinates are in exact A4 millimeters (0..210 x 0..297)
  ctx.scale(widthPx / 210, heightPx / 297);

  // 1. Pure White Paper Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 210, 297);

  // 2. Centered Faint Clinic Logo Watermark (6.5% opacity)
  if (logoImg && !preprintedLetterheadMode) {
    ctx.save();
    ctx.globalAlpha = 0.065;
    if (monochromePrintMode) {
      ctx.filter = 'grayscale(100%)';
    }
    const maxWm = 88;
    const natW = logoImg.naturalWidth || 800;
    const natH = logoImg.naturalHeight || 922;
    const aspect = natW / natH || 1;
    const wmW = aspect >= 1 ? maxWm : maxWm * aspect;
    const wmH = aspect >= 1 ? maxWm / aspect : maxWm;
    ctx.drawImage(logoImg, (210 - wmW) / 2, (297 - wmH) / 2, wmW, wmH);
    ctx.restore();
  }

  const modalityNames: Record<Modality, string> = {
    mri: 'ام‌آر‌آی (MRI)',
    ct: 'سی‌تی‌اسکن (CT Scan)',
    sonography: 'سونوگرافی (Ultrasound)',
  };

  const getModalityColorHex = (mod: Modality): string => {
    if (monochromePrintMode) return '#000000';
    return (
      settings.modalityColors?.[mod] ||
      (mod === 'mri' ? '#4f46e5' : mod === 'ct' ? '#059669' : '#0284c7')
    );
  };

  const primaryModality: Modality = studies[0]?.modality || 'sonography';
  const activeModalityColor = getModalityColorHex(primaryModality);

  const clinicNameDisplay = settings.clinicName || 'مرکز جامع تصویربرداری بیمارستان شفا';
  const clinicSubtitleDisplay =
    settings.clinicSubtitle || 'رادیولوژی، سونوگرافی، ام‌آر‌آی، ام‌آر‌آی قلب، سی‌تی‌اسکن';
  const clinicAddressDisplay =
    settings.clinicAddress || 'مازندران، ساری، کمربندی غربی، بلوار ولیعصر';
  const clinicPhoneDisplay = settings.clinicPhone || '۰۱۱-۳۳۲۰۵۰۰۶-۹';

  const marginLeft = 15;
  const marginRight = 195;
  const contentWidth = marginRight - marginLeft;

  // Convert CSS px (relative to 794px A4 width) to mm: 1px = 210 / 794 = 0.2645mm
  const pxToMm = (px: number) => Number((px * 0.2645).toFixed(3));
  const bodyMm = pxToMm(bodyFontSize || 14);
  const headingMm = pxToMm(headingFontSize || 16);
  const headerTitleMm = pxToMm(headerFontSize || 18);
  const lineStepMm = Number((bodyMm * Math.max(1.45, Math.min(2.1, lineHeight || 1.75))).toFixed(2));

  let cursorY = preprintedLetterheadMode ? Math.max(15, preprintedTopMarginMm) : 12;

  // 3. Official Clinic Letterhead
  if (!preprintedLetterheadMode) {
    if (logoImg) {
      ctx.save();
      if (monochromePrintMode) ctx.filter = 'grayscale(100%)';
      const natW = logoImg.naturalWidth || 800;
      const natH = logoImg.naturalHeight || 922;
      const aspect = natW / natH || 1;
      const boxS = 17;
      const lw = aspect >= 1 ? boxS : boxS * aspect;
      const lh = aspect >= 1 ? boxS / aspect : boxS;
      ctx.drawImage(logoImg, 178 + (boxS - lw) / 2, cursorY + (boxS - lh) / 2, lw, lh);
      ctx.restore();
    }

    const headerTextRightX = logoImg ? 175 : marginRight;

    const nameLines = wrapCanvasSegmentsIntoLines(
      ctx,
      [{ text: clinicNameDisplay, bold: true }],
      'rtl',
      headerTitleMm,
      118,
      headerFontCss
    );
    if (nameLines[0]) {
      drawCanvasWrappedLine(
        ctx,
        nameLines[0],
        'rtl',
        60,
        headerTextRightX,
        cursorY + 5.5,
        headerTitleMm,
        headerFontCss,
        '#050811'
      );
    }

    const subMm = Math.max(3.0, headerTitleMm * 0.67);
    const subLines = wrapCanvasSegmentsIntoLines(
      ctx,
      [{ text: clinicSubtitleDisplay, bold: true }],
      'rtl',
      subMm,
      118,
      headerFontCss
    );
    if (subLines[0]) {
      drawCanvasWrappedLine(
        ctx,
        subLines[0],
        'rtl',
        60,
        headerTextRightX,
        cursorY + 11.2,
        subMm,
        headerFontCss,
        activeModalityColor
      );
    }

    const addrMm = Math.max(2.75, headerTitleMm * 0.58);
    const addrText = `${clinicAddressDisplay}  •  تلفن: ${clinicPhoneDisplay}`;
    const addrLines = wrapCanvasSegmentsIntoLines(
      ctx,
      [{ text: addrText, bold: false }],
      'rtl',
      addrMm,
      118,
      headerFontCss
    );
    if (addrLines[0]) {
      drawCanvasWrappedLine(
        ctx,
        addrLines[0],
        'rtl',
        60,
        headerTextRightX,
        cursorY + 16.2,
        addrMm,
        headerFontCss,
        '#1e293b'
      );
    }

    // Left Side Admission & Date
    const admMm = 3.0;
    const admLines = wrapCanvasSegmentsIntoLines(
      ctx,
      [{ text: `شماره پذیرش: ${patientInfo.admissionNumber || 'ADM-001'}`, bold: true }],
      'rtl',
      admMm,
      52,
      headerFontCss
    );
    if (admLines[0]) {
      drawCanvasWrappedLine(
        ctx,
        admLines[0],
        'ltr',
        marginLeft,
        65,
        cursorY + 6,
        admMm,
        headerFontCss,
        '#050811'
      );
    }

    const dateLines = wrapCanvasSegmentsIntoLines(
      ctx,
      [{ text: `تاریخ: ${patientInfo.reportDate || '۱۴۰۴/۰۸/۲۱'}`, bold: true }],
      'rtl',
      2.9,
      52,
      headerFontCss
    );
    if (dateLines[0]) {
      drawCanvasWrappedLine(
        ctx,
        dateLines[0],
        'ltr',
        marginLeft,
        65,
        cursorY + 11.2,
        2.9,
        headerFontCss,
        '#1e293b'
      );
    }

    if (totalPages > 1) {
      const pageLines = wrapCanvasSegmentsIntoLines(
        ctx,
        [{ text: `برگه ${sheet.pageNumber} از ${totalPages}`, bold: true }],
        'rtl',
        2.8,
        52,
        headerFontCss
      );
      if (pageLines[0]) {
        drawCanvasWrappedLine(
          ctx,
          pageLines[0],
          'ltr',
          marginLeft,
          65,
          cursorY + 16,
          2.8,
          headerFontCss,
          activeModalityColor
        );
      }
    }

    cursorY += 20;
    ctx.strokeStyle = activeModalityColor;
    ctx.lineWidth = 0.55;
    ctx.beginPath();
    ctx.moveTo(marginLeft, cursorY);
    ctx.lineTo(marginRight, cursorY);
    ctx.stroke();
    cursorY += 3;
  }

  // 4. Patient Demographics Box
  const demoBoxH = 9.5;
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = monochromePrintMode ? '#000000' : '#94a3b8';
  ctx.lineWidth = 0.3;
  ctx.beginPath();
  ctx.roundRect(marginLeft, cursorY, contentWidth, demoBoxH, 2);
  ctx.fill();
  ctx.stroke();

  const demoMm = 3.05;
  const demoBaselineY = cursorY + 6.1;
  const genderFa =
    patientInfo.gender === 'female'
      ? 'زن'
      : patientInfo.gender === 'male'
      ? 'مرد'
      : 'نامشخص';
  const ageGenderStr = `${patientInfo.age ? `${patientInfo.age} سال` : '---'} / ${genderFa}`;

  const col1Lines = wrapCanvasSegmentsIntoLines(
    ctx,
    [
      { text: 'نام بیمار: ', bold: false, color: '#334155' },
      { text: patientInfo.fullName || '---', bold: true, color: '#050811' },
    ],
    'rtl',
    demoMm,
    48,
    headerFontCss
  );
  if (col1Lines[0]) {
    drawCanvasWrappedLine(
      ctx,
      col1Lines[0],
      'rtl',
      145,
      192,
      demoBaselineY,
      demoMm,
      headerFontCss,
      '#050811'
    );
  }

  const col2Lines = wrapCanvasSegmentsIntoLines(
    ctx,
    [
      { text: 'کد ملی / شناسه: ', bold: false, color: '#334155' },
      { text: patientInfo.nationalId || '---', bold: true, color: '#050811' },
    ],
    'rtl',
    demoMm,
    44,
    headerFontCss
  );
  if (col2Lines[0]) {
    drawCanvasWrappedLine(
      ctx,
      col2Lines[0],
      'rtl',
      100,
      144,
      demoBaselineY,
      demoMm,
      headerFontCss,
      '#050811'
    );
  }

  const col3Lines = wrapCanvasSegmentsIntoLines(
    ctx,
    [
      { text: 'سن و جنس: ', bold: false, color: '#334155' },
      { text: ageGenderStr, bold: true, color: '#050811' },
    ],
    'rtl',
    demoMm,
    36,
    headerFontCss
  );
  if (col3Lines[0]) {
    drawCanvasWrappedLine(
      ctx,
      col3Lines[0],
      'rtl',
      63,
      99,
      demoBaselineY,
      demoMm,
      headerFontCss,
      '#050811'
    );
  }

  const col4Lines = wrapCanvasSegmentsIntoLines(
    ctx,
    [
      { text: 'پزشک معالج: ', bold: false, color: '#334155' },
      { text: patientInfo.referringPhysician || 'همکار گرامی', bold: true, color: '#050811' },
    ],
    'rtl',
    demoMm,
    45,
    headerFontCss
  );
  if (col4Lines[0]) {
    drawCanvasWrappedLine(
      ctx,
      col4Lines[0],
      'rtl',
      17,
      62,
      demoBaselineY,
      demoMm,
      headerFontCss,
      '#050811'
    );
  }

  cursorY += demoBoxH + 5.5;
  const maxBodyY = preprintedLetterheadMode ? 276 : 254;

  // 5. Studies & Findings Slices
  sheet.slices.forEach((slice, sIdx) => {
    const { study } = slice;
    const studyModColor = getModalityColorHex(study.modality);
    const studyDir: 'rtl' | 'ltr' =
      study.direction || (study.modality === 'sonography' ? 'rtl' : 'ltr');
    const isLtr = studyDir === 'ltr';

    if (sIdx > 0 && cursorY < maxBodyY - 10) {
      ctx.save();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.3;
      ctx.setLineDash([1.5, 1.5]);
      ctx.beginPath();
      ctx.moveTo(marginLeft, cursorY - 1.5);
      ctx.lineTo(marginRight, cursorY - 1.5);
      ctx.stroke();
      ctx.restore();
      cursorY += 3.5;
    }

    const rawTitle =
      study.titleAndTechnique ||
      (isLtr
        ? `${study.modality.toUpperCase()} Study Report`
        : `گزارش ${modalityNames[study.modality]}`);
    const contSuffix = slice.isContinuation
      ? isLtr
        ? ` (Continued on page ${sheet.pageNumber})`
        : ` (ادامه در برگه ${sheet.pageNumber})`
      : '';

    const titleLines = wrapCanvasSegmentsIntoLines(
      ctx,
      [{ text: rawTitle + contSuffix, bold: true, color: studyModColor }],
      studyDir,
      headingMm,
      contentWidth,
      headingFontCss
    );
    for (const tLine of titleLines) {
      if (cursorY > maxBodyY) break;
      drawCanvasWrappedLine(
        ctx,
        tLine,
        studyDir,
        marginLeft,
        marginRight,
        cursorY + 3.5,
        headingMm,
        headingFontCss,
        studyModColor
      );
      cursorY += lineStepMm + 0.8;
    }
    cursorY += 1.2;

    if (slice.showComparisonSlice && study.comparison) {
      const compLabel = isLtr ? 'Comparison: ' : 'مقایسه با تصاویر پیشین (Comparison): ';
      const compMm = Math.max(3.0, bodyMm - 0.35);
      const compLines = wrapCanvasSegmentsIntoLines(
        ctx,
        [
          { text: compLabel, bold: true, color: '#050811' },
          { text: study.comparison, bold: false, color: '#1e293b' },
        ],
        studyDir,
        compMm,
        contentWidth,
        bodyFontCss
      );
      for (const cLine of compLines) {
        if (cursorY > maxBodyY) break;
        drawCanvasWrappedLine(
          ctx,
          cLine,
          studyDir,
          marginLeft,
          marginRight,
          cursorY + 3,
          compMm,
          bodyFontCss,
          '#050811'
        );
        cursorY += lineStepMm;
      }
      cursorY += 1.5;
    }

    if (slice.findingsHtmlSlice) {
      const blocks = parseHtmlToBlocks(slice.findingsHtmlSlice);
      for (const block of blocks) {
        if (cursorY > maxBodyY) break;

        if (block.type === 'paragraph') {
          const effectiveDir: 'rtl' | 'ltr' = block.blockDir || studyDir;
          const effectiveIsLtr = effectiveDir === 'ltr';
          const segs = [...block.segments];
          if (block.isBullet) {
            segs.unshift({ text: '• ', bold: true, color: studyModColor });
          }
          const pMm = block.isHeading ? headingMm : bodyMm;
          const pFont = block.isHeading ? headingFontCss : bodyFontCss;
          const wrappedLines = wrapCanvasSegmentsIntoLines(
            ctx,
            segs,
            effectiveDir,
            pMm,
            block.isBullet ? contentWidth - 4 : contentWidth,
            pFont
          );
          const pXLeft = block.isBullet && effectiveIsLtr ? marginLeft + 4 : marginLeft;
          const pXRight = block.isBullet && !effectiveIsLtr ? marginRight - 4 : marginRight;

          for (const wLine of wrappedLines) {
            if (cursorY > maxBodyY) break;
            drawCanvasWrappedLine(
              ctx,
              wLine,
              effectiveDir,
              pXLeft,
              pXRight,
              cursorY + 3.2,
              pMm,
              pFont,
              '#050811',
              block.blockAlign || 'default'
            );
            cursorY += lineStepMm;
          }
          cursorY += 1.1;
        } else if (block.type === 'table' && block.rows.length > 0) {
          const numCols = Math.max(...block.rows.map((r) => r.length));
          if (numCols > 0) {
            const tableW = contentWidth * (block.widthRatio || 1);
            const colW = tableW / numCols;
            const rowH = lineStepMm + 2.2;
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 0.25;

            for (let rIdx = 0; rIdx < block.rows.length; rIdx++) {
              if (cursorY + rowH > maxBodyY) break;
              const row = block.rows[rIdx];
              for (let cIdx = 0; cIdx < numCols; cIdx++) {
                const cell = row[cIdx] || { text: '', bold: false };
                const cellX = isLtr
                  ? marginLeft + cIdx * colW
                  : marginRight - (cIdx + 1) * colW;
                if (cell.bold || rIdx === 0) {
                  ctx.fillStyle = '#f1f5f9';
                  ctx.fillRect(cellX, cursorY, colW, rowH);
                }
                ctx.strokeRect(cellX, cursorY, colW, rowH);

                const cellMm = Math.max(2.8, bodyMm - 0.35);
                const cellLines = wrapCanvasSegmentsIntoLines(
                  ctx,
                  [{ text: cell.text, bold: cell.bold || rIdx === 0 }],
                  studyDir,
                  cellMm,
                  colW - 3,
                  bodyFontCss
                );
                if (cellLines[0]) {
                  drawCanvasWrappedLine(
                    ctx,
                    cellLines[0],
                    studyDir,
                    cellX + 1.5,
                    cellX + colW - 1.5,
                    cursorY + rowH * 0.68,
                    cellMm,
                    bodyFontCss,
                    '#050811'
                  );
                }
              }
              cursorY += rowH;
            }
            cursorY += 2;
          }
        }
      }
    }

    // Impression Box
    if (slice.showImpressionSlice && study.impressionHtml && cursorY < maxBodyY - 8) {
      const impBlocks = parseHtmlToBlocks(study.impressionHtml);
      const impWrappedLines: ScriptRun[][] = [];
      for (const b of impBlocks) {
        if (b.type === 'paragraph') {
          const segs = [...b.segments];
          if (b.isBullet) segs.unshift({ text: '• ', bold: true });
          impWrappedLines.push(
            ...wrapCanvasSegmentsIntoLines(
              ctx,
              segs,
              studyDir,
              bodyMm,
              contentWidth - 7,
              bodyFontCss
            )
          );
        }
      }

      const impHeaderMm = Math.max(3.3, headingMm - 0.25);
      const boxPaddingTop = 3.5;
      const boxPaddingBottom = 3;
      const impBoxH =
        boxPaddingTop +
        lineStepMm +
        1 +
        impWrappedLines.length * lineStepMm +
        boxPaddingBottom;

      cursorY += 1.5;
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = studyModColor;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.roundRect(marginLeft, cursorY, contentWidth, impBoxH, 2.5);
      ctx.fill();
      ctx.stroke();

      let impY = cursorY + boxPaddingTop + 3;
      const impTitle = isLtr ? 'IMPRESSION:' : 'نتیجه‌گیری نهایی (Impression):';
      const impTitleLines = wrapCanvasSegmentsIntoLines(
        ctx,
        [{ text: impTitle, bold: true, color: studyModColor }],
        studyDir,
        impHeaderMm,
        contentWidth - 7,
        headingFontCss
      );
      if (impTitleLines[0]) {
        drawCanvasWrappedLine(
          ctx,
          impTitleLines[0],
          studyDir,
          marginLeft + 3.5,
          marginRight - 3.5,
          impY,
          impHeaderMm,
          headingFontCss,
          studyModColor
        );
      }
      impY += lineStepMm + 0.8;

      for (const iLine of impWrappedLines) {
        const boldLine = iLine.map((r) => ({ ...r, bold: true }));
        drawCanvasWrappedLine(
          ctx,
          boldLine,
          studyDir,
          marginLeft + 3.5,
          marginRight - 3.5,
          impY,
          bodyMm,
          bodyFontCss,
          '#050811'
        );
        impY += lineStepMm;
      }

      cursorY += impBoxH + 2.5;
    }

    // Recommendations Box
    if (slice.showRecommendationsSlice && study.recommendationsHtml && cursorY < maxBodyY - 6) {
      const recBlocks = parseHtmlToBlocks(study.recommendationsHtml);
      const recSegs: TextSegment[] = [
        {
          text: isLtr ? 'Recommendations: ' : 'توصیه‌ها (Recommendations): ',
          bold: true,
          color: '#050811',
        },
      ];
      recBlocks.forEach((b, idx) => {
        if (b.type === 'paragraph') {
          if (idx > 0) recSegs.push({ text: ' | ', bold: false });
          recSegs.push(...b.segments);
        }
      });

      const recMm = Math.max(3.0, bodyMm - 0.3);
      const recLines = wrapCanvasSegmentsIntoLines(
        ctx,
        recSegs,
        studyDir,
        recMm,
        contentWidth - 6,
        bodyFontCss
      );
      const recBoxH = recLines.length * lineStepMm + 4.5;

      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.3;
      ctx.beginPath();
      ctx.roundRect(marginLeft, cursorY, contentWidth, recBoxH, 2);
      ctx.fill();
      ctx.stroke();

      let recY = cursorY + 4.8;
      for (const rLine of recLines) {
        drawCanvasWrappedLine(
          ctx,
          rLine,
          studyDir,
          marginLeft + 3,
          marginRight - 3,
          recY,
          recMm,
          bodyFontCss,
          '#050811'
        );
        recY += lineStepMm;
      }
      cursorY += recBoxH + 2;
    }
  });

  // 6. Pinned Bottom Footer
  if (!preprintedLetterheadMode) {
    const footerTopY = 257;
    ctx.strokeStyle = activeModalityColor;
    ctx.lineWidth = 0.45;
    ctx.beginPath();
    ctx.moveTo(marginLeft, footerTopY);
    ctx.lineTo(marginRight, footerTopY);
    ctx.stroke();

    const qrSize = 19.5;
    const qrX = marginRight - qrSize;
    const qrY = footerTopY + 3;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.roundRect(qrX, qrY, qrSize, qrSize, 1.5);
    ctx.fill();
    ctx.stroke();

    if (qrImg) {
      ctx.drawImage(qrImg, qrX + 1, qrY + 1, qrSize - 2, qrSize - 2);
    }

    const qrTextRightX = qrX - 3;
    const pacCode = `کد اصالت‌سنجی: ${
      patientInfo.nationalId || patientInfo.admissionNumber || '88412'
    }-PAC`;
    const pacLines = wrapCanvasSegmentsIntoLines(
      ctx,
      [{ text: pacCode, bold: true }],
      'rtl',
      2.75,
      92,
      bodyFontCss
    );
    if (pacLines[0]) {
      drawCanvasWrappedLine(
        ctx,
        pacLines[0],
        'rtl',
        80,
        qrTextRightX,
        qrY + 6.5,
        2.75,
        bodyFontCss,
        '#050811'
      );
    }

    const qrDesc =
      qrMode === 'url'
        ? 'اسکن بارکد با دوربین موبایل جهت باز شدن گواهی رسمی اصالت گزارش'
        : 'اسکن بارکد با دوربین موبایل جهت مشاهده کارت مشخصات تاییدشده گزارش';
    const descLines = wrapCanvasSegmentsIntoLines(
      ctx,
      [{ text: qrDesc, bold: false }],
      'rtl',
      2.55,
      92,
      bodyFontCss
    );
    if (descLines[0]) {
      drawCanvasWrappedLine(
        ctx,
        descLines[0],
        'rtl',
        80,
        qrTextRightX,
        qrY + 11.5,
        2.55,
        bodyFontCss,
        '#334155'
      );
    }

    const footerClinicLines = wrapCanvasSegmentsIntoLines(
      ctx,
      [{ text: clinicNameDisplay, bold: true }],
      'rtl',
      2.65,
      92,
      bodyFontCss
    );
    if (footerClinicLines[0]) {
      drawCanvasWrappedLine(
        ctx,
        footerClinicLines[0],
        'rtl',
        80,
        qrTextRightX,
        qrY + 16.5,
        2.65,
        bodyFontCss,
        activeModalityColor
      );
    }

    // Left Side: Doctor Stamp & Signature Box (Supports multi-line specialty & custom stamp font)
    const stampX = marginLeft;
    const stampW = 60;
    const stampNameMm = pxToMm(doctorStampFontSize || 13);
    const stampSpecMm = Math.max(2.65, stampNameMm - 0.5);

    const rawSpecParagraphs = (doctor.specialty || '')
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    const docSpecLines: ScriptRun[][] = [];
    for (const sp of rawSpecParagraphs) {
      docSpecLines.push(
        ...wrapCanvasSegmentsIntoLines(
          ctx,
          [{ text: sp, bold: true }],
          'rtl',
          stampSpecMm,
          stampW - 5,
          doctorStampFontCss
        )
      );
    }

    const extraSpecLines = Math.max(0, docSpecLines.length - 1);
    const stampH = 26 + extraSpecLines * 3.6;
    const stampY = Math.max(footerTopY + 1, footerTopY + 2.5 - Math.min(3.5, extraSpecLines * 1.6));

    ctx.save();
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = activeModalityColor;
    ctx.lineWidth = 0.45;
    ctx.setLineDash([1.6, 1.2]);
    ctx.beginPath();
    ctx.roundRect(stampX, stampY, stampW, stampH, 2.5);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    const docNameLines = wrapCanvasSegmentsIntoLines(
      ctx,
      [{ text: doctor.name, bold: true }],
      'rtl',
      stampNameMm,
      stampW - 4,
      doctorStampFontCss
    );
    if (docNameLines[0]) {
      drawCanvasWrappedLine(
        ctx,
        docNameLines[0],
        'rtl',
        stampX + 2,
        stampX + stampW - 2,
        stampY + 5.2,
        stampNameMm,
        doctorStampFontCss,
        activeModalityColor,
        'center'
      );
    }

    let specCursorY = stampY + 9.6;
    for (const sLine of docSpecLines) {
      drawCanvasWrappedLine(
        ctx,
        sLine,
        'rtl',
        stampX + 2,
        stampX + stampW - 2,
        specCursorY,
        stampSpecMm,
        doctorStampFontCss,
        '#0f172a',
        'center'
      );
      specCursorY += 3.6;
    }

    const mcY = Math.max(stampY + 13.6, specCursorY + 0.3);
    const mcLines = wrapCanvasSegmentsIntoLines(
      ctx,
      [{ text: `شماره نظام پزشکی: ${doctor.medicalCouncilId || ''}`, bold: true }],
      'rtl',
      2.6,
      stampW - 4,
      doctorStampFontCss
    );
    if (mcLines[0]) {
      drawCanvasWrappedLine(
        ctx,
        mcLines[0],
        'rtl',
        stampX + 2,
        stampX + stampW - 2,
        mcY,
        2.6,
        doctorStampFontCss,
        '#1e293b',
        'center'
      );
    }

    if (sigImg) {
      ctx.save();
      if (monochromePrintMode) ctx.filter = 'grayscale(100%)';
      const natW = sigImg.naturalWidth || 300;
      const natH = sigImg.naturalHeight || 110;
      const aspect = natW / natH || 2.5;
      const sigH = 9.2;
      const sigW = Math.min(42, sigH * aspect);
      const sigX = stampX + (stampW - sigW) / 2;
      const sigY = mcY + 1.3;
      ctx.drawImage(sigImg, sigX, sigY, sigW, sigH);
      ctx.restore();
    }
  }

  return canvas;
}

