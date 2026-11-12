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

app.use(express.json({ limit: '10mb' }));

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

// Configure Vite middleware in development or serve static in production
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, watch: null },
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
    console.log(`RadioReport server running on http://0.0.0.0:${port}`);
  });
}

startServer();
