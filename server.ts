import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '250mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', online: true, timestamp: new Date().toISOString() });
});

// Gemini AI Setup with modern @google/genai SDK
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Rate-limit & Quota Protection State (Free Tier safe: max ~4 RPM)
let geminiCooldownUntil = 0;
let lastSuggestCallAt = 0;
const MIN_SUGGEST_INTERVAL_MS = 15000; // Max 4 suggest calls per minute
const suggestCache = new Map<string, string[]>();

const isQuotaOrRateLimitError = (error: any): boolean => {
  const msg = String(error?.message || error || '');
  const status = error?.status || error?.code || error?.error?.code;
  return (
    status === 429 ||
    status === 'RESOURCE_EXHAUSTED' ||
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('quota') ||
    msg.includes('rate-limit')
  );
};

const getDefaultFallbackSuggestions = (modality?: string): string[] => {
  if (modality === 'mri') {
    return [
      'شواهدی از ضایعه فضاگیر، تغییر سیگنال پاتولوژیک یا اثر فشاری مشاهده نمی‌شود.',
      'بطن‌های مغزی و فضاهای ساب‌آراکنوئید ابعاد و شکل طبیعی دارند.',
      'خط وسط در جایگاه طبیعی قرار داشته و شیفت دیده نمی‌شود.',
    ];
  }
  if (modality === 'ct') {
    return [
      'در پارانشیم هر دو ریه تصویر ندول یا ضایعه فضاگیر فعال رویت نشد.',
      'افیوژن پلورال یا پریکاردال و لنفادنوپاتی مدیاستینال مشاهده نمی‌شود.',
      'ساختارهای استخوانی و بافت نرم جدار قفسه سینه طبیعی هستند.',
    ];
  }
  return [
    'ابعاد و اکوپترن پارانشیمال در محدوده نرمال فیزیولوژیک قرار دارد.',
    'شواهدی از سنگ، ضایعه فضاگیر یا هیدرونفروز مشاهده نشد.',
    'مایع آزاد در حفره شکم و لگن یا کل‌دوساک خلفی رویت نشد.',
  ];
};

// AI Suggestion & Next Sentence Autocomplete Endpoint
app.post('/api/ai/suggest', async (req, res) => {
  try {
    const { modality, organOrTitle, currentText, lastSentence } = req.body;
    const cacheKey = `${modality || ''}:${(lastSentence || '').trim().slice(-80)}`;

    // 1. Check in-memory cache first
    if (suggestCache.has(cacheKey)) {
      return res.status(200).json({
        suggestions: suggestCache.get(cacheKey),
        cached: true,
      });
    }

    const now = Date.now();
    const ai = getGeminiClient();

    // 2. If no API key, or in quota cooldown, or throttled to protect RPM limit -> return fast fallback
    if (
      !ai ||
      now < geminiCooldownUntil ||
      now - lastSuggestCallAt < MIN_SUGGEST_INTERVAL_MS
    ) {
      return res.status(200).json({
        fallback: true,
        rateLimited: now < geminiCooldownUntil,
        suggestions: getDefaultFallbackSuggestions(modality),
      });
    }

    lastSuggestCallAt = now;

    const systemInstruction = `شما یک رادیولوژیست فوق‌تخصص و دستیار هوشمند گزارش‌نویسی تصویربرداری پزشکی (ام‌آر‌آی، سی‌تی‌اسکن و سونوگرافی) به زبان فارسی و اصطلاحات متداول پزشکی هستید.
وظیفه شما این است که بر اساس متن نوشته شده، نوع مدالیته و زمینه فعلی گزارش، ۱ الی ۳ پیشنهاد دقیق، علمی و استاندارد برای تکمیل یا ادامه جمله بعدی پیشنهاد دهید.
پاسخ شما باید صرفاً یک آرایه متنی JSON از جملات پیشنهادی کوتاه و حرفه‌ای باشد (حداکثر ۱۰ تا ۱۵ کلمه برای هر پیشنهاد). هیچ متن اضافی ننویسید.`;

    const prompt = `نوع تصویربرداری: ${modality || 'رادیولوژی'}
بخش یا ارگان مورد بررسی: ${organOrTitle || 'عمومی'}
متن تاکنون گزارش:
${(currentText || '').slice(-600)}

آخرین کلمات یا جمله در حال تایپ:
"${lastSentence || ''}"

لطفاً ۱ تا ۳ پیشنهاد برای جمله بعدی ارائه دهید:`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '[]';
    let suggestions: string[] = [];
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        suggestions = parsed.map(String);
      } else if (typeof parsed === 'object' && parsed !== null) {
        suggestions = Object.values(parsed).flat().map(String);
      } else {
        suggestions = [String(parsed)];
      }
    } catch {
      suggestions = getDefaultFallbackSuggestions(modality);
    }

    const finalSuggestions = suggestions.filter(Boolean).slice(0, 3);
    if (finalSuggestions.length > 0) {
      if (suggestCache.size > 200) {
        const firstKey = suggestCache.keys().next().value;
        if (firstKey) suggestCache.delete(firstKey);
      }
      suggestCache.set(cacheKey, finalSuggestions);
    }

    res.json({ suggestions: finalSuggestions });
  } catch (error: any) {
    if (isQuotaOrRateLimitError(error)) {
      // Activate 60-second cooldown so we don't hit quota limits repeatedly
      geminiCooldownUntil = Date.now() + 60_000;
      return res.status(200).json({
        fallback: true,
        rateLimited: true,
        suggestions: getDefaultFallbackSuggestions(req.body?.modality),
      });
    }

    res.status(200).json({
      fallback: true,
      suggestions: getDefaultFallbackSuggestions(req.body?.modality),
    });
  }
});

// AI Impression Generator Endpoint
app.post('/api/ai/impression', async (req, res) => {
  try {
    const { modality, findingsText, patientInfo } = req.body;
    const ai = getGeminiClient();

    if (!ai || Date.now() < geminiCooldownUntil) {
      return res.status(200).json({
        fallback: true,
        impression: '',
      });
    }

    const systemInstruction = `شما یک پزشک متخصص رادیولوژی برجسته هستید. وظیفه شما خواندن بخش یافته‌ها (Findings) یک گزارش تصویربرداری (${modality || 'تصویربرداری'}) و استخراج بخش نتیجه‌گیری نهایی (Impression / Conclusion) به شیوه علمی، خلاصه، رتبه‌بندی شده و دقیق به زبان فارسی و با رعایت عبارات استاندارد پزشکی است.
در صورتی که بررسی کاملاً نرمال است، صراحتاً نرمال بودن را اعلام کنید (Unremarkable exam).
در صورت وجود پاتولوژی، آنها را به ترتیب اهمیت به صورت بالت‌پوینت خلاصه نمایید.`;

    const prompt = `مشخصات بیمار: سن ${patientInfo?.age || 'نامشخص'}، جنسیت ${patientInfo?.gender || 'نامشخص'}
یافته‌ها (Findings):
${findingsText}

لطفاً بخش Impression را تولید کنید:`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
      },
    });

    res.json({ impression: response.text || '' });
  } catch (error: any) {
    if (isQuotaOrRateLimitError(error)) {
      geminiCooldownUntil = Date.now() + 60_000;
    }
    res.status(200).json({
      fallback: true,
      impression: '',
    });
  }
});

// AI Critical Alert & Quality Check Endpoint
app.post('/api/ai/review', async (req, res) => {
  try {
    const { fullReport, modality } = req.body;
    const ai = getGeminiClient();

    if (!ai || Date.now() < geminiCooldownUntil) {
      return res.status(200).json({
        hasCritical: false,
        warnings: [],
      });
    }

    const systemInstruction = `شما ناظر کیفیت و ایمنی گزارش‌های رادیولوژی هستید. وظیفه شما بررسی گزارش جهت شناسایی:
1. یافته‌های بحرانی اورژانسی (Critical / Red-flag Findings مانند: خونریزی حاد مغزی، پنوموتوراکس، پرفوراسیون روده، آپاندیسیت حاد، دیسکسیون آئورت، پیچش تخمدان/بیضه، شکستگی ناپایدار).
2. ارگان‌های کلیدی از قلم افتاده در شرح یافته‌ها متناسب با مدالیته.
پاسخ را به صورت شیء JSON با ساختار { "hasCritical": boolean, "criticalAlert": string, "missingOrgans": string[], "recommendation": string } برگردانید.`;

    const prompt = `مدالیته: ${modality}
متن گزارش:
${fullReport}

بررسی تخصصی:`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    if (isQuotaOrRateLimitError(error)) {
      geminiCooldownUntil = Date.now() + 60_000;
    }
    res.status(200).json({ hasCritical: false, warnings: [] });
  }
});

// Multi-Typist Local Network (LAN) Shared SQLite Database Sync Endpoints
import fs from 'fs';
import os from 'os';
import Database from 'better-sqlite3';

const LAN_DATA_DIR = path.join(__dirname, 'data');
const LAN_SQLITE_FILE = path.join(LAN_DATA_DIR, 'radioreport_lan.sqlite');
const LAN_JSON_FALLBACK_FILE = path.join(LAN_DATA_DIR, 'lan_shared_db.json');

let sqliteDb: Database.Database | null = null;

function initSqliteLanDb(): Database.Database | null {
  if (sqliteDb) return sqliteDb;
  try {
    if (!fs.existsSync(LAN_DATA_DIR)) {
      fs.mkdirSync(LAN_DATA_DIR, { recursive: true });
    }
    const db = new Database(LAN_SQLITE_FILE);
    db.pragma('journal_mode = WAL');
    db.exec(`
      CREATE TABLE IF NOT EXISTS lan_collections (
        collection_key TEXT PRIMARY KEY,
        payload_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS lan_reports_index (
        id TEXT PRIMARY KEY,
        admission_number TEXT,
        patient_name TEXT,
        national_id TEXT,
        typist_id TEXT,
        typist_name TEXT,
        doctor_id TEXT,
        status TEXT,
        updated_at TEXT,
        payload_json TEXT NOT NULL
      );
    `);
    sqliteDb = db;
    return db;
  } catch (err) {
    console.warn('SQLite initialization fallback to JSON:', err);
    return null;
  }
}

function getLocalLanIpAddresses(): string[] {
  const ips: string[] = [];
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      const netList = interfaces[name];
      if (!netList) continue;
      for (const net of netList) {
        if (net.family === 'IPv4' && !net.internal) {
          ips.push(net.address);
        }
      }
    }
  } catch {}
  return ips.length > 0 ? ips : ['192.168.1.100'];
}

function readLanDb(): any {
  const db = initSqliteLanDb();
  if (db) {
    try {
      const rows = db
        .prepare('SELECT collection_key, payload_json FROM lan_collections')
        .all() as Array<{ collection_key: string; payload_json: string }>;
      const result: Record<string, any> = {
        reports: [],
        templates: [],
        doctors: [],
        typists: [],
        shortcuts: [],
      };
      for (const row of rows) {
        try {
          result[row.collection_key] = JSON.parse(row.payload_json);
        } catch {}
      }

      // Also merge any individual indexed rows from lan_reports_index (scales to millions of rows)
      try {
        const indexedRows = db
          .prepare('SELECT payload_json FROM lan_reports_index ORDER BY updated_at DESC')
          .all() as Array<{ payload_json: string }>;
        if (indexedRows.length > 0) {
          const parsedIndexed = indexedRows
            .map((r) => {
              try {
                return JSON.parse(r.payload_json);
              } catch {
                return null;
              }
            })
            .filter(Boolean);
          result.reports = mergeById(result.reports, parsedIndexed);
        }
      } catch {}

      return result;
    } catch {}
  }

  try {
    if (fs.existsSync(LAN_JSON_FALLBACK_FILE)) {
      return JSON.parse(fs.readFileSync(LAN_JSON_FALLBACK_FILE, 'utf-8'));
    }
  } catch {}
  return { reports: [], templates: [], doctors: [], typists: [], shortcuts: [] };
}

function writeLanDb(data: any): void {
  const nowIso = new Date().toISOString();
  const db = initSqliteLanDb();
  if (db) {
    try {
      const upsertCol = db.prepare(`
        INSERT INTO lan_collections (collection_key, payload_json, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(collection_key) DO UPDATE SET
          payload_json = excluded.payload_json,
          updated_at = excluded.updated_at
      `);

      const upsertRep = db.prepare(`
        INSERT INTO lan_reports_index (
          id, admission_number, patient_name, national_id, typist_id, typist_name, doctor_id, status, updated_at, payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          admission_number = excluded.admission_number,
          patient_name = excluded.patient_name,
          national_id = excluded.national_id,
          typist_id = excluded.typist_id,
          typist_name = excluded.typist_name,
          doctor_id = excluded.doctor_id,
          status = excluded.status,
          updated_at = excluded.updated_at,
          payload_json = excluded.payload_json
      `);

      const tx = db.transaction(() => {
        for (const key of ['reports', 'templates', 'doctors', 'typists', 'shortcuts']) {
          if (Array.isArray(data[key])) {
            upsertCol.run(key, JSON.stringify(data[key]), nowIso);
          }
        }
        if (Array.isArray(data.reports)) {
          for (const rep of data.reports) {
            if (rep && rep.id) {
              upsertRep.run(
                String(rep.id),
                String(rep.patientInfo?.admissionNumber || ''),
                String(rep.patientInfo?.fullName || ''),
                String(rep.patientInfo?.nationalId || ''),
                String(rep.typistId || ''),
                String(rep.typistName || ''),
                String(rep.doctorId || ''),
                String(rep.status || 'finalized'),
                String(rep.updatedAt || rep.createdAt || nowIso),
                JSON.stringify(rep)
              );
            }
          }
        }
      });
      tx();
    } catch (err) {
      console.warn('SQLite write warning:', err);
    }
  }

  try {
    if (!fs.existsSync(LAN_DATA_DIR)) {
      fs.mkdirSync(LAN_DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(LAN_JSON_FALLBACK_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch {}
}

function mergeById(serverList: any[] = [], clientList: any[] = []): any[] {
  const map = new Map<string, any>();
  for (const item of serverList) {
    if (item && item.id) map.set(item.id, item);
  }
  for (const item of clientList) {
    if (item && item.id) {
      const existing = map.get(item.id);
      if (!existing) {
        map.set(item.id, item);
      } else {
        const existingTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
        const clientTime = item.updatedAt ? new Date(item.updatedAt).getTime() : 0;
        if (clientTime >= existingTime) {
          map.set(item.id, {
            ...existing,
            ...item,
            usageCount: Math.max(existing.usageCount || 0, item.usageCount || 0),
          });
        }
      }
    }
  }
  return Array.from(map.values());
}

app.get('/api/lan/status', (req, res) => {
  const db = readLanDb();
  const ips = getLocalLanIpAddresses();
  res.json({
    online: true,
    engine: sqliteDb ? 'SQLite (WAL Mode)' : 'Local JSON DB',
    dbPath: 'data/radioreport_lan.sqlite',
    lanUrls: ips.map((ip) => `http://${ip}:${port}`),
    counts: {
      reports: Array.isArray(db.reports) ? db.reports.length : 0,
      templates: Array.isArray(db.templates) ? db.templates.length : 0,
      doctors: Array.isArray(db.doctors) ? db.doctors.length : 0,
      typists: Array.isArray(db.typists) ? db.typists.length : 0,
      shortcuts: Array.isArray(db.shortcuts) ? db.shortcuts.length : 0,
    },
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/lan/sync', (req, res) => {
  const db = readLanDb();
  res.json({
    ...db,
    engine: sqliteDb ? 'SQLite' : 'JSON',
    lanUrls: getLocalLanIpAddresses().map((ip) => `http://${ip}:${port}`),
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/lan/sync', (req, res) => {
  try {
    const currentDb = readLanDb();
    const { reports, templates, doctors, typists, shortcuts } = req.body || {};

    const merged = {
      reports: mergeById(currentDb.reports, reports).sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.updatedAt || a.createdAt || 0).getTime()
      ),
      templates: mergeById(currentDb.templates, templates),
      doctors: mergeById(currentDb.doctors, doctors),
      typists: mergeById(currentDb.typists, typists),
      shortcuts: mergeById(currentDb.shortcuts, shortcuts),
      updatedAt: new Date().toISOString(),
    };

    writeLanDb(merged);
    res.json({
      ...merged,
      engine: sqliteDb ? 'SQLite (radioreport_lan.sqlite)' : 'JSON',
      lanUrls: getLocalLanIpAddresses().map((ip) => `http://${ip}:${port}`),
      timestamp: merged.updatedAt,
    });
  } catch (err) {
    res.status(200).json({ ...readLanDb(), timestamp: new Date().toISOString() });
  }
});

// Configure Vite middleware in development or serve static in production
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false, watch: null },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    const lanIps = getLocalLanIpAddresses();
    console.log('============================================================');
    console.log(`✅ RadioReport Server Running (SQLite WAL Mode Active)`);
    console.log(`🖥️  Local Access (This PC):   http://localhost:${port}`);
    lanIps.forEach((ip) => {
      console.log(`🌐 Network Access (LAN):     http://${ip}:${port}`);
    });
    console.log('============================================================');
  });
}

startServer();
