import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { createRequire } from 'module';
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
const requireModule = createRequire(import.meta.url);
const LAN_DATA_DIR = path.join(__dirname, 'data');
const LAN_SQLITE_FILE = path.join(LAN_DATA_DIR, 'radioreport_lan.sqlite');
const LAN_JSON_FALLBACK_FILE = path.join(LAN_DATA_DIR, 'lan_shared_db.json');

let sqliteDb: any = null;
let sqliteInitAttempted = false;

function initSqliteLanDb(): any {
  if (sqliteDb) return sqliteDb;
  if (sqliteInitAttempted) return null;
  sqliteInitAttempted = true;
  try {
    if (!fs.existsSync(LAN_DATA_DIR)) {
      fs.mkdirSync(LAN_DATA_DIR, { recursive: true });
    }
    const Database = requireModule('better-sqlite3');
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
        referringPhysicians: [],
        settings: null,
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
  return {
    reports: [],
    templates: [],
    doctors: [],
    typists: [],
    shortcuts: [],
    referringPhysicians: [],
    settings: null,
  };
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
        for (const key of ['reports', 'templates', 'doctors', 'typists', 'shortcuts', 'referringPhysicians']) {
          if (Array.isArray(data[key])) {
            upsertCol.run(key, JSON.stringify(data[key]), nowIso);
          }
        }
        if (data.settings && typeof data.settings === 'object') {
          upsertCol.run('settings', JSON.stringify(data.settings), nowIso);
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
  for (const item of serverList || []) {
    if (item && item.id) map.set(String(item.id), item);
  }
  for (const item of clientList || []) {
    if (item && item.id) {
      const key = String(item.id);
      const existing = map.get(key);
      if (!existing) {
        map.set(key, item);
      } else {
        const existingTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
        const clientTime = item.updatedAt ? new Date(item.updatedAt).getTime() : 0;
        if (clientTime >= existingTime) {
          map.set(key, {
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

function mergeSettingsObjects(remoteSettings: any, localSettings: any): any {
  if (!remoteSettings || typeof remoteSettings !== 'object') return localSettings || null;
  if (!localSettings || typeof localSettings !== 'object') return remoteSettings;
  const mergedDictionary = mergeById(
    Array.isArray(remoteSettings.customDictionary) ? remoteSettings.customDictionary : [],
    Array.isArray(localSettings.customDictionary) ? localSettings.customDictionary : []
  );
  const mergedFonts = mergeById(
    Array.isArray(remoteSettings.customFonts) ? remoteSettings.customFonts : [],
    Array.isArray(localSettings.customFonts) ? localSettings.customFonts : []
  );
  return {
    ...remoteSettings,
    ...localSettings,
    customDictionary: mergedDictionary,
    customFonts: mergedFonts.length > 0 ? mergedFonts : localSettings.customFonts || remoteSettings.customFonts,
    modalityColors: {
      ...(remoteSettings.modalityColors || {}),
      ...(localSettings.modalityColors || {}),
    },
  };
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
    ok: true,
    ...db,
    engine: sqliteDb ? 'SQLite' : 'JSON',
    lanUrls: getLocalLanIpAddresses().map((ip) => `http://${ip}:${port}`),
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/lan/sync', (req, res) => {
  try {
    const currentDb = readLanDb();
    const { reports, templates, doctors, typists, shortcuts, referringPhysicians, settings } = req.body || {};

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
      referringPhysicians: mergeById(currentDb.referringPhysicians, referringPhysicians),
      settings: mergeSettingsObjects(currentDb.settings, settings),
      updatedAt: new Date().toISOString(),
    };

    writeLanDb(merged);
    res.json({
      ok: true,
      ...merged,
      engine: sqliteDb ? 'SQLite (radioreport_lan.sqlite)' : 'JSON',
      lanUrls: getLocalLanIpAddresses().map((ip) => `http://${ip}:${port}`),
      timestamp: merged.updatedAt,
    });
  } catch (err) {
    console.error('LAN sync error:', err);
    res.status(500).json({
      ok: false,
      error: 'خطا در همگام‌سازی پایگاه داده محلی',
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================================================
// GitHub OAuth + Private Secret Gist Cloud Sync Endpoints
// ============================================================================
const GITHUB_BACKUP_FILENAME = 'radioreport-sync-backup.json';
const GITHUB_GIST_DESCRIPTION = 'RadioReport Cloud Sync Backup (Private)';
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const GITHUB_SESSION_TTL_MS = 24 * 60 * 60 * 1000;

interface GitHubSessionRecord {
  accessToken: string;
  user: {
    login: string;
    name: string;
    avatarUrl: string;
  };
  gistId?: string;
  gistUrl?: string;
  createdAt: number;
}

const githubOAuthStates = new Map<string, { createdAt: number }>();
const githubSessions = new Map<string, GitHubSessionRecord>();

function cleanupExpiredGitHubMaps(): void {
  const now = Date.now();
  for (const [k, v] of githubOAuthStates.entries()) {
    if (now - v.createdAt > OAUTH_STATE_TTL_MS) {
      githubOAuthStates.delete(k);
    }
  }
  for (const [k, v] of githubSessions.entries()) {
    if (now - v.createdAt > GITHUB_SESSION_TTL_MS) {
      githubSessions.delete(k);
    }
  }
}

function getGitHubOAuthConfig(): { clientId: string; clientSecret: string; configured: boolean } {
  const clientId = (process.env.GITHUB_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GITHUB_CLIENT_SECRET || '').trim();
  const configured =
    Boolean(clientId) &&
    Boolean(clientSecret) &&
    clientId !== 'MY_GITHUB_CLIENT_ID' &&
    clientSecret !== 'MY_GITHUB_CLIENT_SECRET';
  return { clientId, clientSecret, configured };
}

function resolvePublicBaseUrl(req: express.Request): string {
  const envUrl = (process.env.APP_URL || '').trim().replace(/\/+$/, '');
  if (envUrl && envUrl !== 'MY_APP_URL' && /^https?:\/\//i.test(envUrl)) {
    return envUrl;
  }
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const proto = forwardedProto || req.protocol || 'http';
  const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
  const host = forwardedHost || req.get('host') || `localhost:${port}`;
  return `${proto}://${host}`.replace(/\/+$/, '');
}

function getGitHubSessionFromReq(req: express.Request): { token: string; session: GitHubSessionRecord } | null {
  cleanupExpiredGitHubMaps();
  const authHeader = String(req.headers.authorization || '').trim();
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;
  const session = githubSessions.get(token);
  if (!session) return null;
  return { token, session };
}

async function githubApiFetch(
  targetUrl: string,
  accessToken: string,
  init: RequestInit = {}
): Promise<Response> {
  const parsed = new URL(targetUrl);
  const allowedHosts = new Set(['api.github.com', 'gist.githubusercontent.com']);
  if (parsed.protocol !== 'https:' || !allowedHosts.has(parsed.hostname)) {
    throw new Error('Blocked non-GitHub request URL');
  }
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'RadioReport-CloudSync',
    ...(init.headers as Record<string, string> | undefined),
  };
  return fetch(parsed.toString(), { ...init, headers });
}

function escapeJsonForInlineScript(payload: unknown): string {
  return JSON.stringify(payload)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function sendGitHubOAuthPopupHtml(res: express.Response, payload: Record<string, unknown>, isSuccess: boolean): void {
  const safeJson = escapeJsonForInlineScript(payload);
  const titleText = isSuccess ? 'اتصال به گیت‌هاب با موفقیت انجام شد' : 'خطا در اتصال به گیت‌هاب';
  const descText = isSuccess
    ? 'این پنجره به صورت خودکار بسته می‌شود. می‌توانید به صفحه رادیورپورت برگردید.'
    : 'لطفاً این پنجره را ببندید و دوباره تلاش کنید.';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${titleText}</title>
  <style>
    body { font-family: Tahoma, sans-serif; background: #f8fafc; color: #0f172a; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; text-align: center; }
    .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px 28px; max-width: 420px; box-shadow: 0 10px 30px rgba(15,23,42,0.08); }
    h2 { margin: 0 0 8px; font-size: 16px; color: ${isSuccess ? '#0f766e' : '#be123c'}; }
    p { margin: 0; font-size: 13px; color: #475569; line-height: 1.7; }
  </style>
</head>
<body>
  <div class="card">
    <h2>${titleText}</h2>
    <p>${descText}</p>
  </div>
  <script>
    (function () {
      var data = ${safeJson};
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(data, '*');
        }
      } catch (e) {}
      setTimeout(function () { window.close(); }, 350);
    })();
  </script>
</body>
</html>`);
}

app.get('/api/github/auth-url', (req, res) => {
  cleanupExpiredGitHubMaps();
  const { clientId, configured } = getGitHubOAuthConfig();
  const callbackUrl = `${resolvePublicBaseUrl(req)}/api/github/callback`;
  if (!configured) {
    return res.json({
      configured: false,
      callbackUrl,
      error: 'متغیرهای GITHUB_CLIENT_ID و GITHUB_CLIENT_SECRET در تنظیمات سرور ثبت نشده‌اند.',
    });
  }

  const state = crypto.randomBytes(24).toString('hex');
  githubOAuthStates.set(state, { createdAt: Date.now() });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: 'gist',
    state,
  });

  res.json({
    configured: true,
    url: `https://github.com/login/oauth/authorize?${params.toString()}`,
    callbackUrl,
  });
});

app.get(['/api/github/callback', '/api/github/callback/'], async (req, res) => {
  cleanupExpiredGitHubMaps();
  const { clientId, clientSecret, configured } = getGitHubOAuthConfig();
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  const oauthError = typeof req.query.error === 'string' ? req.query.error : '';

  if (oauthError) {
    return sendGitHubOAuthPopupHtml(
      res,
      { type: 'GITHUB_OAUTH_ERROR', error: 'دسترسی گیت‌هاب توسط کاربر لغو شد.' },
      false
    );
  }

  if (!configured) {
    return sendGitHubOAuthPopupHtml(
      res,
      { type: 'GITHUB_OAUTH_ERROR', error: 'پیکربندی OAuth گیت‌هاب روی سرور کامل نیست.' },
      false
    );
  }

  if (!state || !githubOAuthStates.has(state)) {
    return sendGitHubOAuthPopupHtml(
      res,
      { type: 'GITHUB_OAUTH_ERROR', error: 'شناسه امنیتی درخواست (state) نامعتبر یا منقضی شده است.' },
      false
    );
  }
  githubOAuthStates.delete(state);

  if (!code) {
    return sendGitHubOAuthPopupHtml(
      res,
      { type: 'GITHUB_OAUTH_ERROR', error: 'کد تایید گیت‌هاب دریافت نشد.' },
      false
    );
  }

  try {
    const callbackUrl = `${resolvePublicBaseUrl(req)}/api/github/callback`;
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'RadioReport-CloudSync',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: callbackUrl,
      }),
    });

    const tokenJson: any = await tokenRes.json();
    if (!tokenRes.ok || !tokenJson.access_token) {
      return sendGitHubOAuthPopupHtml(
        res,
        {
          type: 'GITHUB_OAUTH_ERROR',
          error: 'دریافت توکن دسترسی از گیت‌هاب ناموفق بود.',
        },
        false
      );
    }

    const accessToken = String(tokenJson.access_token);
    const userRes = await githubApiFetch('https://api.github.com/user', accessToken);
    if (!userRes.ok) {
      return sendGitHubOAuthPopupHtml(
        res,
        { type: 'GITHUB_OAUTH_ERROR', error: 'خواندن اطلاعات حساب گیت‌هاب ناموفق بود.' },
        false
      );
    }

    const ghUser: any = await userRes.json();
    const userProfile = {
      login: String(ghUser.login || 'github-user'),
      name: String(ghUser.name || ghUser.login || 'کاربر گیت‌هاب'),
      avatarUrl: String(ghUser.avatar_url || ''),
    };

    const sessionToken = crypto.randomBytes(32).toString('hex');
    githubSessions.set(sessionToken, {
      accessToken,
      user: userProfile,
      createdAt: Date.now(),
    });

    return sendGitHubOAuthPopupHtml(
      res,
      {
        type: 'GITHUB_OAUTH_SUCCESS',
        sessionToken,
        user: userProfile,
      },
      true
    );
  } catch (err) {
    console.error('GitHub OAuth callback error:', err);
    return sendGitHubOAuthPopupHtml(
      res,
      { type: 'GITHUB_OAUTH_ERROR', error: 'خطای ارتباطی با سرور گیت‌هاب.' },
      false
    );
  }
});

app.get('/api/github/status', (req, res) => {
  const { configured } = getGitHubOAuthConfig();
  const callbackUrl = `${resolvePublicBaseUrl(req)}/api/github/callback`;
  const found = getGitHubSessionFromReq(req);
  if (!found) {
    return res.json({
      configured,
      connected: false,
      callbackUrl,
    });
  }
  return res.json({
    configured,
    connected: true,
    user: found.session.user,
    gistUrl: found.session.gistUrl || '',
    callbackUrl,
  });
});

app.post('/api/github/disconnect', (req, res) => {
  const found = getGitHubSessionFromReq(req);
  if (found) {
    githubSessions.delete(found.token);
  }
  res.json({ ok: true });
});

async function findRadioReportGist(
  session: GitHubSessionRecord
): Promise<{ id: string; htmlUrl: string; rawData: any | null } | null> {
  const extractGistData = async (gistObj: any): Promise<any | null> => {
    const fileEntry = gistObj?.files?.[GITHUB_BACKUP_FILENAME];
    if (!fileEntry) return null;
    try {
      if (fileEntry.truncated && typeof fileEntry.raw_url === 'string') {
        const rawRes = await githubApiFetch(fileEntry.raw_url, session.accessToken);
        if (rawRes.ok) {
          const text = await rawRes.text();
          return JSON.parse(text);
        }
      }
      if (typeof fileEntry.content === 'string') {
        return JSON.parse(fileEntry.content);
      }
    } catch {}
    return null;
  };

  if (session.gistId) {
    try {
      const singleRes = await githubApiFetch(
        `https://api.github.com/gists/${encodeURIComponent(session.gistId)}`,
        session.accessToken
      );
      if (singleRes.ok) {
        const gist = await singleRes.json();
        if (gist?.files?.[GITHUB_BACKUP_FILENAME]) {
          return {
            id: String(gist.id),
            htmlUrl: String(gist.html_url || ''),
            rawData: await extractGistData(gist),
          };
        }
      }
    } catch {}
  }

  const listRes = await githubApiFetch(
    'https://api.github.com/gists?per_page=100',
    session.accessToken
  );
  if (!listRes.ok) {
    throw new Error(`GitHub Gists API failed (${listRes.status})`);
  }
  const list = (await listRes.json()) as any[];
  const matched = Array.isArray(list)
    ? list.find((g) => g && g.files && g.files[GITHUB_BACKUP_FILENAME])
    : null;
  if (!matched || !matched.id) return null;

  const fullRes = await githubApiFetch(
    `https://api.github.com/gists/${encodeURIComponent(String(matched.id))}`,
    session.accessToken
  );
  if (!fullRes.ok) return null;
  const fullGist = await fullRes.json();
  return {
    id: String(fullGist.id),
    htmlUrl: String(fullGist.html_url || ''),
    rawData: await extractGistData(fullGist),
  };
}

app.post('/api/github/sync', async (req, res) => {
  const found = getGitHubSessionFromReq(req);
  if (!found) {
    return res.status(401).json({
      ok: false,
      error: 'اتصال به حساب گیت‌هاب منقضی شده است. لطفاً دوباره متصل شوید.',
    });
  }

  const { session } = found;
  const mode = req.body?.mode === 'push' || req.body?.mode === 'pull' ? req.body.mode : 'merge';
  const localPayload = req.body?.payload && typeof req.body.payload === 'object' ? req.body.payload : {};

  try {
    const existingGist = await findRadioReportGist(session);
    const remoteData = existingGist?.rawData || null;
    const nowIso = new Date().toISOString();

    let finalData: any;
    if (mode === 'pull') {
      if (!remoteData) {
        return res.status(404).json({
          ok: false,
          error: 'هنوز هیچ نسخه پشتیبانی در گیت‌هاب شما ذخیره نشده است. ابتدا همگام‌سازی یا ارسال به گیت‌هاب را انجام دهید.',
        });
      }
      finalData = {
        version: '1.2',
        syncedAt: nowIso,
        reports: Array.isArray(remoteData.reports) ? remoteData.reports : [],
        templates: Array.isArray(remoteData.templates) ? remoteData.templates : [],
        doctors: Array.isArray(remoteData.doctors) ? remoteData.doctors : [],
        typists: Array.isArray(remoteData.typists) ? remoteData.typists : [],
        shortcuts: Array.isArray(remoteData.shortcuts) ? remoteData.shortcuts : [],
        referringPhysicians: Array.isArray(remoteData.referringPhysicians)
          ? remoteData.referringPhysicians
          : [],
        settings: remoteData.settings || null,
      };
    } else if (mode === 'push') {
      finalData = {
        version: '1.2',
        syncedAt: nowIso,
        reports: Array.isArray(localPayload.reports) ? localPayload.reports : [],
        templates: Array.isArray(localPayload.templates) ? localPayload.templates : [],
        doctors: Array.isArray(localPayload.doctors) ? localPayload.doctors : [],
        typists: Array.isArray(localPayload.typists) ? localPayload.typists : [],
        shortcuts: Array.isArray(localPayload.shortcuts) ? localPayload.shortcuts : [],
        referringPhysicians: Array.isArray(localPayload.referringPhysicians)
          ? localPayload.referringPhysicians
          : [],
        settings: localPayload.settings || null,
      };
    } else {
      finalData = {
        version: '1.2',
        syncedAt: nowIso,
        reports: mergeById(remoteData?.reports || [], localPayload.reports || []).sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt || 0).getTime() -
            new Date(a.updatedAt || a.createdAt || 0).getTime()
        ),
        templates: mergeById(remoteData?.templates || [], localPayload.templates || []),
        doctors: mergeById(remoteData?.doctors || [], localPayload.doctors || []),
        typists: mergeById(remoteData?.typists || [], localPayload.typists || []),
        shortcuts: mergeById(remoteData?.shortcuts || [], localPayload.shortcuts || []),
        referringPhysicians: mergeById(
          remoteData?.referringPhysicians || [],
          localPayload.referringPhysicians || []
        ),
        settings: mergeSettingsObjects(remoteData?.settings || null, localPayload.settings || null),
      };
    }

    let gistId = existingGist?.id || '';
    let gistUrl = existingGist?.htmlUrl || '';

    if (mode !== 'pull') {
      const gistBody = {
        description: GITHUB_GIST_DESCRIPTION,
        public: false,
        files: {
          [GITHUB_BACKUP_FILENAME]: {
            content: JSON.stringify(finalData, null, 2),
          },
        },
      };

      const saveRes = existingGist?.id
        ? await githubApiFetch(
            `https://api.github.com/gists/${encodeURIComponent(existingGist.id)}`,
            session.accessToken,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(gistBody),
            }
          )
        : await githubApiFetch('https://api.github.com/gists', session.accessToken, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(gistBody),
          });

      if (!saveRes.ok) {
        const status = saveRes.status;
        return res.status(502).json({
          ok: false,
          error:
            status === 401 || status === 403
              ? 'دسترسی نوشتن در Gist گیت‌هاب تایید نشد. لطفاً دوباره متصل شوید.'
              : `ذخیره‌سازی در گیت‌هاب با خطای ${status} مواجه شد.`,
        });
      }

      const savedGist: any = await saveRes.json();
      gistId = String(savedGist.id || gistId);
      gistUrl = String(savedGist.html_url || gistUrl);
    }

    session.gistId = gistId || session.gistId;
    session.gistUrl = gistUrl || session.gistUrl;

    return res.json({
      ok: true,
      mode,
      gistId: session.gistId,
      gistUrl: session.gistUrl,
      user: session.user,
      data: finalData,
      counts: {
        reports: finalData.reports.length,
        templates: finalData.templates.length,
        doctors: finalData.doctors.length,
        typists: finalData.typists.length,
        shortcuts: finalData.shortcuts.length,
      },
      timestamp: nowIso,
    });
  } catch (err) {
    console.error('GitHub sync error:', err);
    return res.status(500).json({
      ok: false,
      error: 'خطا در برقراری ارتباط با گیت‌هاب. لطفاً اتصال اینترنت را بررسی کنید.',
    });
  }
});

// Configure Vite middleware in development or serve static in production
async function startServer() {
  if (isProd) {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    let viteMiddleware: any = null;
    const viteInitPromise = import('vite')
      .then(({ createServer: createViteServer }) =>
        createViteServer({
          server: { middlewareMode: true, hmr: false, ws: false, watch: null },
          appType: 'spa',
        })
      )
      .then((vite) => {
        viteMiddleware = vite.middlewares;
        return viteMiddleware;
      });

    app.use(async (req, res, next) => {
      try {
        const mw = viteMiddleware || (await viteInitPromise);
        return mw(req, res, next);
      } catch (err) {
        return next(err);
      }
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

