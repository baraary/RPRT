import * as XLSX from 'xlsx';
import { HisWorklistPatient, Modality } from '../types';
import { detectGenderFromPersianName } from './typistUtils';

export interface HisColumnMapping {
  fullName: string;
  firstName: string;
  lastName: string;
  nationalId: string;
  admissionNumber: string;
  age: string;
  gender: string;
  referringPhysician: string;
  reportDate: string;
  serviceName: string;
}

export interface HisColumnMeta {
  header: string;
  colIndex: number;
  excelLetter: string;
  nonEmptyCount: number;
  samples: string[];
}

export interface ParsedHisTable {
  sheetName: string;
  rawMatrix: string[][];
  headerRowIndex: number;
  headers: string[];
  columnMetas: HisColumnMeta[];
  rows: Record<string, string>[];
  suggestedMapping: HisColumnMapping;
  matchedFieldCount: number;
  fileName?: string;
}

export interface ParsedHisWorkbook {
  fileName: string;
  sheets: ParsedHisTable[];
  defaultSheetIndex: number;
}

const COLUMN_MAP_STORAGE_KEY = 'radioreport_his_column_map_v1';
const FORMAT_MAP_STORAGE_KEY = 'radioreport_his_format_maps_v2';

export function indexToExcelLetter(index: number): string {
  let n = index;
  let result = '';
  while (n >= 0) {
    result = String.fromCharCode((n % 26) + 65) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
}

export function normalizeDigitsToEnglish(input: string): string {
  if (!input) return '';
  return String(input)
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .trim();
}

function normalizeHeader(h: string): string {
  return String(h || '')
    .replace(/\uFEFF/g, '')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/ة/g, 'ه')
    .replace(/[\u200C\u200B]/g, ' ')
    .replace(/[_\-/.()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function getTodayJalaliFormatted(): string {
  try {
    const formatted = new Intl.DateTimeFormat('fa-IR-u-nu-latn', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const clean = normalizeDigitsToEnglish(formatted);
    const parts = clean.split('/').map((n) => parseInt(n, 10));
    if (parts.length === 3 && !isNaN(parts[0])) {
      return `${parts[0]}/${String(parts[1]).padStart(2, '0')}/${String(parts[2]).padStart(2, '0')}`;
    }
  } catch {}
  return '1404/08/21';
}

export function detectModalityFromService(serviceText: string): Modality | undefined {
  const s = normalizeHeader(serviceText);
  if (!s) return undefined;
  if (
    s.includes('mri') ||
    s.includes('ام ار ای') ||
    s.includes('ام آر آی') ||
    s.includes('امارای') ||
    s.includes('ام آر ای')
  ) {
    return 'mri';
  }
  if (
    s.includes('ct') ||
    s.includes('سی تی') ||
    s.includes('سیتی') ||
    s.includes('اسپیرال') ||
    s.includes('توموگرافی')
  ) {
    return 'ct';
  }
  if (
    s.includes('سونو') ||
    s.includes('داپلر') ||
    s.includes('ultrasound') ||
    s.includes('sono') ||
    s.includes('doppler') ||
    /\bus\b/.test(s)
  ) {
    return 'sonography';
  }
  return undefined;
}

export function parseGenderValue(rawGender: string, fullNameFallback: string): 'female' | 'male' | 'other' {
  const g = normalizeHeader(rawGender);
  if (g) {
    if (
      g === 'زن' ||
      g === 'مونث' ||
      g === 'مؤنث' ||
      g === 'خانم' ||
      g === 'دختر' ||
      g === 'f' ||
      g === 'female' ||
      g.includes('زن') ||
      g.includes('مونث') ||
      g.includes('مؤنث') ||
      g.includes('female')
    ) {
      return 'female';
    }
    if (
      g === 'مرد' ||
      g === 'مذکر' ||
      g === 'آقا' ||
      g === 'پسر' ||
      g === 'm' ||
      g === 'male' ||
      g.includes('مرد') ||
      g.includes('مذکر') ||
      g.includes('male')
    ) {
      return 'male';
    }
  }
  const inferred = detectGenderFromPersianName(fullNameFallback);
  return inferred || 'female';
}

export function cleanAgeValue(rawAge: string): string {
  const eng = normalizeDigitsToEnglish(rawAge);
  const match = eng.match(/\d{1,3}/);
  return match ? match[0] : eng;
}

export function cleanDateValue(rawDate: string): string {
  const eng = normalizeDigitsToEnglish(rawDate).replace(/-/g, '/').trim();
  if (!eng) return getTodayJalaliFormatted();
  const dateOnly = eng.split(/\s+/)[0];
  return dateOnly || getTodayJalaliFormatted();
}

function buildHeadersFingerprint(headers: string[]): string {
  return headers
    .map((h) => normalizeHeader(h))
    .filter(Boolean)
    .slice(0, 40)
    .join('|');
}

export function loadSavedColumnMapping(headers?: string[]): Partial<HisColumnMapping> {
  try {
    if (headers && headers.length > 0) {
      const fp = buildHeadersFingerprint(headers);
      const rawFormats = localStorage.getItem(FORMAT_MAP_STORAGE_KEY);
      if (rawFormats) {
        const formatMap = JSON.parse(rawFormats);
        if (formatMap && typeof formatMap === 'object' && formatMap[fp]) {
          return formatMap[fp];
        }
      }
    }
    const raw = localStorage.getItem(COLUMN_MAP_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveColumnMapping(mapping: HisColumnMapping, headers?: string[]): void {
  try {
    localStorage.setItem(COLUMN_MAP_STORAGE_KEY, JSON.stringify(mapping));
    if (headers && headers.length > 0) {
      const fp = buildHeadersFingerprint(headers);
      const rawFormats = localStorage.getItem(FORMAT_MAP_STORAGE_KEY);
      const existing: Record<string, HisColumnMapping> = rawFormats ? JSON.parse(rawFormats) : {};
      existing[fp] = mapping;
      // Keep last 12 HIS export formats so multiple HIS screens/reports are remembered independently
      const keys = Object.keys(existing);
      if (keys.length > 12) {
        delete existing[keys[0]];
      }
      localStorage.setItem(FORMAT_MAP_STORAGE_KEY, JSON.stringify(existing));
    }
  } catch {}
}

function buildColumnMetas(headers: string[], rows: Record<string, string>[]): HisColumnMeta[] {
  const sampleLimit = Math.min(rows.length, 40);
  return headers.map((header, colIndex) => {
    let nonEmptyCount = 0;
    const samples: string[] = [];
    const seenSamples = new Set<string>();

    for (let r = 0; r < rows.length; r++) {
      const val = (rows[r][header] || '').trim();
      if (val) {
        nonEmptyCount++;
        if (r < sampleLimit && samples.length < 3 && !seenSamples.has(val)) {
          seenSamples.add(val);
          samples.push(val);
        }
      }
    }

    return {
      header,
      colIndex,
      excelLetter: indexToExcelLetter(colIndex),
      nonEmptyCount,
      samples,
    };
  });
}

/**
 * Auto-detect HIS column mapping using:
 * 1) Saved per-format mapping (remembers exact HIS layouts with 50+ columns)
 * 2) Persian/English HIS header keywords
 * 3) Data-content pattern fallback (10-digit national ID, Jalali date, gender, age)
 */
export function autoDetectHisMapping(
  headers: string[],
  columnMetas: HisColumnMeta[] = []
): HisColumnMapping {
  const saved = loadSavedColumnMapping(headers);
  const normHeaders = headers.map((h) => ({ raw: h, norm: normalizeHeader(h) }));
  const usedHeaders = new Set<string>();

  const claim = (h: string): string => {
    if (h) usedHeaders.add(h);
    return h;
  };

  const findHeader = (
    savedKey: keyof HisColumnMapping,
    exactPatterns: string[],
    partialPatterns: string[],
    excludePatterns: string[] = []
  ): string => {
    // 1. Saved mapping takes top priority if present in this sheet's headers
    const savedVal = saved[savedKey];
    if (savedVal && headers.includes(savedVal)) {
      return claim(savedVal);
    }

    // 2. Exact match (prefer columns with actual data if columnMetas provided)
    const metaByHeader = new Map(columnMetas.map((m) => [m.header, m]));
    const hasData = (raw: string) => {
      const m = metaByHeader.get(raw);
      return !m || m.nonEmptyCount > 0;
    };

    for (const pat of exactPatterns) {
      const hit = normHeaders.find(
        (h) =>
          !usedHeaders.has(h.raw) &&
          h.norm === pat &&
          !excludePatterns.some((ex) => h.norm.includes(ex)) &&
          hasData(h.raw)
      );
      if (hit) return claim(hit.raw);
    }

    // 3. Partial match
    for (const pat of partialPatterns) {
      const hit = normHeaders.find(
        (h) =>
          !usedHeaders.has(h.raw) &&
          h.norm.includes(pat) &&
          !excludePatterns.some((ex) => h.norm.includes(ex)) &&
          hasData(h.raw)
      );
      if (hit) return claim(hit.raw);
    }
    return '';
  };

  const fullName = findHeader(
    'fullName',
    [
      'نام و نام خانوادگی',
      'نام و نام خانوادگی بیمار',
      'نام بیمار',
      'نام کامل',
      'بیمار',
      'مشخصات بیمار',
      'patient name',
      'full name',
      'fullname',
      'patient',
    ],
    ['نام و نام خانوادگ', 'نام بیمار', 'نام کامل', 'patient name', 'full name'],
    ['پزشک', 'دکتر', 'خدمت', 'تایپیست', 'معالج', 'doctor', 'physician', 'service', 'پدر']
  );

  const firstName = fullName
    ? ''
    : findHeader(
        'firstName',
        ['نام', 'نام کوچک', 'first name', 'firstname', 'name'],
        ['نام کوچک', 'first name'],
        [
          'خانوادگی',
          'پزشک',
          'دکتر',
          'خدمت',
          'سرویس',
          'بخش',
          'بیمارستان',
          'مرکز',
          'پدر',
          'بیمه',
          'doctor',
          'service',
        ]
      );

  const lastName = fullName
    ? ''
    : findHeader(
        'lastName',
        ['نام خانوادگی', 'نام خانوادگی بیمار', 'فامیل', 'فامیلی', 'last name', 'lastname', 'family', 'surname'],
        ['خانوادگی', 'فامیل', 'last name', 'family'],
        ['پزشک', 'دکتر', 'پدر']
      );

  let nationalId = findHeader(
    'nationalId',
    ['کد ملی', 'کدملی', 'شماره ملی', 'شناسه ملی', 'national id', 'nationalid', 'national code', 'ssn'],
    ['کد ملی', 'کدملی', 'شماره ملی', 'شناسه ملی', 'national'],
    ['پزشک']
  );

  const admissionNumber = findHeader(
    'admissionNumber',
    [
      'شماره پذیرش',
      'کد پذیرش',
      'پذیرش',
      'شماره پرونده',
      'پرونده',
      'شماره قبض',
      'شماره بستری',
      'کد رهگیری',
      'شماره نوبت',
      'admission',
      'admission number',
      'admission no',
      'visit id',
      'accession',
      'file no',
      'reception',
    ],
    ['پذیرش', 'پرونده', 'قبض', 'بستری', 'admission', 'accession', 'visit', 'reception'],
    ['تاریخ', 'ساعت', 'زمان', 'date', 'time', 'نوع', 'وضعیت']
  );

  let age = findHeader(
    'age',
    ['سن', 'سن بیمار', 'age'],
    ['سن بیمار', 'age'],
    ['جنس', 'جنسیت', 'سند', 'رسان', 'استان']
  );

  let gender = findHeader(
    'gender',
    ['جنسیت', 'جنس', 'gender', 'sex'],
    ['جنسیت', 'جنس', 'gender', 'sex'],
    []
  );

  const referringPhysician = findHeader(
    'referringPhysician',
    [
      'پزشک معالج',
      'پزشک ارجاع دهنده',
      'پزشک درخواست کننده',
      'پزشک معرف',
      'نام پزشک معالج',
      'معالج',
      'referring physician',
      'referring doctor',
      'physician',
      'doctor',
    ],
    ['پزشک معالج', 'ارجاع', 'درخواست کننده', 'معرف', 'معالج', 'پزشک', 'referring', 'physician'],
    ['رادیولوژیست', 'گزارش', 'تایپیست', 'کد نظام', 'شماره نظام']
  );

  let reportDate = findHeader(
    'reportDate',
    ['تاریخ پذیرش', 'تاریخ مراجعه', 'تاریخ انجام', 'تاریخ ثبت', 'تاریخ', 'date', 'visit date', 'admission date'],
    ['تاریخ پذیرش', 'تاریخ مراجعه', 'تاریخ انجام', 'تاریخ', 'date'],
    ['تولد', 'ترخیص', 'birth', 'discharge']
  );

  const serviceName = findHeader(
    'serviceName',
    [
      'نام خدمت',
      'خدمت',
      'شرح خدمت',
      'عنوان خدمت',
      'نوع بررسی',
      'نام سرویس',
      'سرویس',
      'service',
      'service name',
      'study',
      'procedure',
      'exam',
      'modality',
    ],
    ['خدمت', 'بررسی', 'سرویس', 'تصویربرداری', 'پروتکل', 'service', 'study', 'procedure', 'exam'],
    ['کد خدمت', 'تعرفه', 'مبلغ', 'قیمت', 'تعداد']
  );

  // 4. Content-based heuristic fallbacks for messy HIS exports with cryptic/English column names
  if (columnMetas.length > 0) {
    const unusedWithSamples = columnMetas.filter(
      (m) => !usedHeaders.has(m.header) && m.samples.length > 0
    );

    if (!nationalId) {
      const natHit = unusedWithSamples.find((m) => {
        const matches = m.samples.filter((s) => /^\d{10}$/.test(normalizeDigitsToEnglish(s).replace(/[\s-]/g, '')));
        return matches.length >= Math.max(1, Math.ceil(m.samples.length * 0.65));
      });
      if (natHit) nationalId = claim(natHit.header);
    }

    if (!gender) {
      const genderHit = unusedWithSamples.find((m) => {
        const matches = m.samples.filter((s) => {
          const n = normalizeHeader(s);
          return ['زن', 'مرد', 'مونث', 'مذکر', 'خانم', 'آقا', 'f', 'm', 'female', 'male'].includes(n);
        });
        return matches.length >= Math.max(1, Math.ceil(m.samples.length * 0.7));
      });
      if (genderHit) gender = claim(genderHit.header);
    }

    if (!reportDate) {
      const dateHit = unusedWithSamples.find((m) => {
        const normH = normalizeHeader(m.header);
        if (normH.includes('تولد') || normH.includes('birth')) return false;
        const matches = m.samples.filter((s) =>
          /^1[34]\d{2}[/-]\d{1,2}[/-]\d{1,2}/.test(normalizeDigitsToEnglish(s))
        );
        return matches.length >= Math.max(1, Math.ceil(m.samples.length * 0.65));
      });
      if (dateHit) reportDate = claim(dateHit.header);
    }

    if (!age) {
      const ageHit = unusedWithSamples.find((m) => {
        const normH = normalizeHeader(m.header);
        if (
          normH.includes('ردیف') ||
          normH.includes('کد') ||
          normH.includes('شماره') ||
          normH.includes('تعداد') ||
          normH.includes('مبلغ') ||
          normH.includes('قیمت')
        ) {
          return false;
        }
        const matches = m.samples.filter((s) => {
          const eng = normalizeDigitsToEnglish(s);
          const mNum = eng.match(/^(\d{1,3})\s*(سال|ساله|y|yr)?$/i);
          if (!mNum) return false;
          const v = parseInt(mNum[1], 10);
          return v >= 1 && v <= 110;
        });
        return matches.length >= Math.max(2, Math.ceil(m.samples.length * 0.8));
      });
      if (ageHit) age = claim(ageHit.header);
    }
  }

  return {
    fullName,
    firstName,
    lastName,
    nationalId,
    admissionNumber,
    age,
    gender,
    referringPhysician,
    reportDate,
    serviceName,
  };
}

const HIS_HEADER_KEYWORDS = [
  'نام',
  'خانوادگی',
  'بیمار',
  'کد ملی',
  'کدملی',
  'پذیرش',
  'پرونده',
  'سن',
  'جنسیت',
  'جنس',
  'پزشک',
  'خدمت',
  'تاریخ',
  'patient',
  'name',
  'national',
  'admission',
  'age',
  'gender',
  'doctor',
  'service',
  'date',
];

function detectBestHeaderRowIndex(rawMatrix: string[][]): number {
  const maxScan = Math.min(rawMatrix.length, 20);
  let bestIdx = 0;
  let bestScore = -1;

  for (let i = 0; i < maxScan; i++) {
    const row = rawMatrix[i] || [];
    const nonEmpty = row.map((c) => String(c ?? '').trim()).filter(Boolean);
    if (nonEmpty.length < 2) continue;

    // Count distinct non-numeric text headers + HIS keyword matches
    let keywordHits = 0;
    let textCells = 0;
    for (const cell of nonEmpty) {
      const norm = normalizeHeader(cell);
      if (!/^\d+([.,/:-]\d+)*$/.test(normalizeDigitsToEnglish(cell))) {
        textCells++;
      }
      if (HIS_HEADER_KEYWORDS.some((kw) => norm.includes(kw))) {
        keywordHits++;
      }
    }

    const score = keywordHits * 10 + Math.min(textCells, 20);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestIdx;
}

export function rebuildHisTableFromHeaderRow(
  rawMatrix: string[][],
  headerRowIndex: number,
  sheetName: string,
  fileName?: string
): ParsedHisTable {
  if (!rawMatrix || rawMatrix.length === 0) {
    const emptyMapping = autoDetectHisMapping([]);
    return {
      sheetName,
      rawMatrix: [],
      headerRowIndex: 0,
      headers: [],
      columnMetas: [],
      rows: [],
      suggestedMapping: emptyMapping,
      matchedFieldCount: 0,
      fileName,
    };
  }

  const safeIdx = Math.max(0, Math.min(headerRowIndex, rawMatrix.length - 1));
  const headerLine = rawMatrix[safeIdx] || [];
  // Determine max width across header + first 50 data rows so trailing unnamed columns aren't cut off
  let maxCols = headerLine.length;
  for (let i = safeIdx + 1; i < Math.min(rawMatrix.length, safeIdx + 50); i++) {
    if ((rawMatrix[i]?.length || 0) > maxCols) {
      maxCols = rawMatrix[i].length;
    }
  }

  const rawHeaders: string[] = [];
  for (let c = 0; c < maxCols; c++) {
    const val = String(headerLine[c] ?? '').trim();
    rawHeaders.push(val || `ستون ${indexToExcelLetter(c)}`);
  }

  const seen = new Map<string, number>();
  const headers = rawHeaders.map((h) => {
    const count = seen.get(h) || 0;
    seen.set(h, count + 1);
    return count > 0 ? `${h} (${count + 1})` : h;
  });

  const rows: Record<string, string>[] = [];
  for (let i = safeIdx + 1; i < rawMatrix.length; i++) {
    const line = rawMatrix[i] || [];
    const hasContent = line.some((cell) => String(cell ?? '').trim() !== '');
    if (!hasContent) continue;
    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = String(line[idx] ?? '').trim();
    });
    rows.push(rowObj);
  }

  const columnMetas = buildColumnMetas(headers, rows);
  const suggestedMapping = autoDetectHisMapping(headers, columnMetas);
  const matchedFieldCount = Object.values(suggestedMapping).filter(Boolean).length;

  return {
    sheetName,
    rawMatrix,
    headerRowIndex: safeIdx,
    headers,
    columnMetas,
    rows,
    suggestedMapping,
    matchedFieldCount,
    fileName,
  };
}

function splitDelimitedLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parses CSV / TSV / direct Excel copy-paste text into a 1-sheet ParsedHisWorkbook
 */
export function parseDelimitedText(rawText: string, fileName = 'فایل متنی / کپی اکسل'): ParsedHisWorkbook {
  const cleanText = rawText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = cleanText
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);

  if (lines.length === 0) {
    const emptySheet = rebuildHisTableFromHeaderRow([], 0, 'داده اصلی', fileName);
    return { fileName, sheets: [emptySheet], defaultSheetIndex: 0 };
  }

  // Detect best delimiter across first 5 non-empty lines
  const sampleText = lines.slice(0, 5).join('\n');
  const tabCount = (sampleText.match(/\t/g) || []).length;
  const semiCount = (sampleText.match(/;/g) || []).length;
  const commaCount = (sampleText.match(/,/g) || []).length;

  let delimiter = ',';
  if (tabCount >= semiCount && tabCount >= commaCount && tabCount > 0) {
    delimiter = '\t';
  } else if (semiCount > commaCount && semiCount > 0) {
    delimiter = ';';
  }

  const rawMatrix = lines.map((line) => splitDelimitedLine(line, delimiter));
  const bestHeaderIdx = detectBestHeaderRowIndex(rawMatrix);
  const sheet = rebuildHisTableFromHeaderRow(rawMatrix, bestHeaderIdx, 'برگه اصلی', fileName);

  return {
    fileName,
    sheets: [sheet],
    defaultSheetIndex: 0,
  };
}

/**
 * Parses an uploaded Excel (.xlsx / .xls with ALL sheets) or CSV (.csv / .txt) file completely offline.
 * Automatically decodes Windows-1256 Persian CSV files exported by Iranian HIS software!
 */
export async function parseHisSpreadsheetFile(file: File): Promise<ParsedHisWorkbook> {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const buffer = await file.arrayBuffer();

  if (ext === 'csv' || ext === 'txt' || ext === 'tsv') {
    let decodedText = '';
    const bytes = new Uint8Array(buffer);

    if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
      decodedText = new TextDecoder('utf-16le').decode(bytes);
    } else if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
      decodedText = new TextDecoder('utf-16be').decode(bytes);
    } else {
      try {
        decodedText = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      } catch {
        try {
          decodedText = new TextDecoder('windows-1256').decode(bytes);
        } catch {
          decodedText = new TextDecoder('utf-8').decode(bytes);
        }
      }
    }

    return parseDelimitedText(decodedText, file.name);
  }

  // Excel .xlsx / .xls via SheetJS — parse ALL sheets so multi-tab HIS workbooks work seamlessly!
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
  const sheetNames = workbook.SheetNames || [];
  if (sheetNames.length === 0) {
    const emptySheet = rebuildHisTableFromHeaderRow([], 0, 'خالی', file.name);
    return { fileName: file.name, sheets: [emptySheet], defaultSheetIndex: 0 };
  }

  const parsedSheets: ParsedHisTable[] = sheetNames.map((sheetName) => {
    const ws = workbook.Sheets[sheetName];
    const rawMatrix = XLSX.utils
      .sheet_to_json<any[]>(ws, {
        header: 1,
        defval: '',
        blankrows: false,
      })
      .map((row) => (Array.isArray(row) ? row.map((cell) => String(cell ?? '').trim()) : []));

    const bestHeaderIdx = detectBestHeaderRowIndex(rawMatrix);
    return rebuildHisTableFromHeaderRow(rawMatrix, bestHeaderIdx, sheetName, file.name);
  });

  // Pick the sheet with the highest score (most auto-matched HIS fields + actual rows)
  let defaultSheetIndex = 0;
  let bestSheetScore = -1;
  parsedSheets.forEach((s, idx) => {
    const hasName = Boolean(
      s.suggestedMapping.fullName || s.suggestedMapping.firstName || s.suggestedMapping.lastName
    );
    const score =
      (s.rows.length > 0 ? 50 : 0) +
      (hasName ? 40 : 0) +
      s.matchedFieldCount * 10 +
      Math.min(s.rows.length, 30);
    if (score > bestSheetScore) {
      bestSheetScore = score;
      defaultSheetIndex = idx;
    }
  });

  return {
    fileName: file.name,
    sheets: parsedSheets,
    defaultSheetIndex,
  };
}

/**
 * Converts parsed rows + column mapping into clean HisWorklistPatient records
 */
export function buildHisWorklistPatients(
  rows: Record<string, string>[],
  mapping: HisColumnMapping
): HisWorklistPatient[] {
  const nowIso = new Date().toISOString();
  const todayJalali = getTodayJalaliFormatted();
  const results: HisWorklistPatient[] = [];

  rows.forEach((row, idx) => {
    let fullName = '';
    if (mapping.fullName && row[mapping.fullName]) {
      fullName = row[mapping.fullName].trim();
    } else {
      const first = mapping.firstName ? (row[mapping.firstName] || '').trim() : '';
      const last = mapping.lastName ? (row[mapping.lastName] || '').trim() : '';
      fullName = `${first} ${last}`.trim();
    }

    const nationalId = mapping.nationalId
      ? normalizeDigitsToEnglish(row[mapping.nationalId] || '').replace(/\s+/g, '')
      : '';
    const admissionNumber = mapping.admissionNumber
      ? normalizeDigitsToEnglish(row[mapping.admissionNumber] || '').trim()
      : '';
    const age = mapping.age ? cleanAgeValue(row[mapping.age] || '') : '';
    const gender = parseGenderValue(mapping.gender ? row[mapping.gender] || '' : '', fullName);
    const referringPhysician = mapping.referringPhysician
      ? (row[mapping.referringPhysician] || '').trim()
      : '';
    const reportDate = mapping.reportDate
      ? cleanDateValue(row[mapping.reportDate] || '')
      : todayJalali;
    const serviceName = mapping.serviceName ? (row[mapping.serviceName] || '').trim() : '';

    if (!fullName && !admissionNumber && !nationalId) return;

    const stableSeed = admissionNumber || nationalId || `${fullName}-${idx}`;
    const cleanSeed = stableSeed.replace(/[^a-zA-Z0-9\u0600-\u06FF_-]/g, '').slice(0, 32);

    results.push({
      id: `his-${cleanSeed}-${idx}`,
      fullName: fullName || `بیمار #${idx + 1}`,
      nationalId,
      age,
      gender,
      admissionNumber: admissionNumber || `HIS-${idx + 1}`,
      reportDate,
      referringPhysician,
      serviceName: serviceName || undefined,
      detectedModality: detectModalityFromService(serviceName),
      importedAt: nowIso,
      updatedAt: nowIso,
    });
  });

  return results;
}

/**
 * Downloads a ready-to-use Persian Excel (.xlsx) sample matching typical Iranian HIS exports
 */
export function downloadSampleHisExcel(): void {
  const sampleData = [
    {
      'شماره پذیرش': '1404-8821',
      'نام و نام خانوادگی': 'فاطمه کریمی',
      'کد ملی': '2091234567',
      'سن': '38',
      'جنسیت': 'زن',
      'پزشک معالج': 'دکتر علوی (متخصص داخلی)',
      'تاریخ پذیرش': getTodayJalaliFormatted(),
      'نام خدمت': 'سونوگرافی کامل شکم و لگن',
    },
    {
      'شماره پذیرش': '1404-8822',
      'نام و نام خانوادگی': 'محمدرضا حسینی',
      'کد ملی': '2097654321',
      'سن': '54',
      'جنسیت': 'مرد',
      'پزشک معالج': 'دکتر صابری (مغز و اعصاب)',
      'تاریخ پذیرش': getTodayJalaliFormatted(),
      'نام خدمت': 'MRI مغز بدون تزریق',
    },
    {
      'شماره پذیرش': '1404-8823',
      'نام و نام خانوادگی': 'مریم اکبری',
      'کد ملی': '2094455667',
      'سن': '46',
      'جنسیت': 'زن',
      'پزشک معالج': 'دکتر معتمدی (فوق تخصص ریه)',
      'تاریخ پذیرش': getTodayJalaliFormatted(),
      'نام خدمت': 'سی‌تی‌اسکن ریه HRCT',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'HIS_Worklist');
  XLSX.writeFile(wb, 'Sample_HIS_Patients.xlsx');
}
