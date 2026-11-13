import { Modality, PatientInfo } from '../types';
import { getOfflineSmartSuggestions } from '../data/medicalPhraseDictionary';
import { StorageService } from './storage';

export interface SmartSuggestionResult {
  suggestions: string[];
  isOnline: boolean;
}

export interface ReviewResult {
  hasCritical: boolean;
  criticalAlert?: string;
  missingOrgans?: string[];
  recommendation?: string;
}

function getPrioritizedCustomDictionarySuggestions(
  currentText: string,
  modality: Modality
): string[] {
  try {
    const settings = StorageService.getSettings();
    const activeDocId = settings.activeDoctorId || 'doc-1';
    const customList = settings.customDictionary || [];
    if (customList.length === 0) return [];

    const plainText = (currentText || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const segments = plainText.split(/[.؟!؛\n]+/);
    const lastSentence = (segments[segments.length - 1] || plainText).trim();
    const recentWindow = plainText.slice(-140);

    const matchingModality = customList.filter(
      (item) =>
        (item.modality === 'all' || item.modality === modality) &&
        item.phrase &&
        !plainText.includes(item.phrase.trim())
    );

    const docKeywordMatches: string[] = [];
    const generalKeywordMatches: string[] = [];
    const docModalityFallback: string[] = [];
    const generalModalityFallback: string[] = [];

    for (const term of matchingModality) {
      const kw = (term.keyword || '').trim();
      const phraseWords = term.phrase.split(/\s+/).filter((w) => w.length >= 3);
      const hasKeywordHit =
        (kw && (lastSentence.includes(kw) || recentWindow.includes(kw))) ||
        phraseWords.some((w) => lastSentence.includes(w));

      const isActiveDoc = term.doctorId === activeDocId;
      const isGeneralDoc = term.doctorId === 'all';

      if (!isActiveDoc && !isGeneralDoc) continue;

      if (hasKeywordHit) {
        if (isActiveDoc) {
          docKeywordMatches.push(term.phrase);
        } else {
          generalKeywordMatches.push(term.phrase);
        }
      } else {
        if (isActiveDoc) {
          docModalityFallback.push(term.phrase);
        } else {
          generalModalityFallback.push(term.phrase);
        }
      }
    }

    return [
      ...docKeywordMatches,
      ...generalKeywordMatches,
      ...docModalityFallback,
      ...generalModalityFallback,
    ];
  } catch {
    return [];
  }
}

// Client-side cache & rate-limit protection to respect Gemini Free Tier (5 RPM)
const clientSuggestCache = new Map<string, string[]>();
let clientCooldownUntil = 0;
let lastOnlineCallTime = 0;
const MIN_ONLINE_CALL_INTERVAL_MS = 15000; // Max 4 calls per minute

export const AiService = {
  /**
   * Instant 0ms offline suggestions for immediate keystroke feedback,
   * prioritizing the active doctor's custom medical dictionary terms first!
   */
  getInstantOfflineSuggestions(currentText: string, modality: Modality): string[] {
    const customPriority = getPrioritizedCustomDictionarySuggestions(currentText, modality);
    const builtIn = getOfflineSmartSuggestions(currentText, modality, 3);
    return Array.from(new Set([...customPriority, ...builtIn])).slice(0, 4);
  },

  /**
   * Suggest next sentences intelligently based on current context.
   * Works offline instantly (prioritizing active doctor's custom dictionary), and enhances via Gemini API when online & within rate limits.
   */
  async getNextSentenceSuggestions(
    currentText: string,
    modality: Modality,
    organOrTitle = 'عمومی',
    allowOnline = true
  ): Promise<SmartSuggestionResult> {
    // 1. Instant offline heuristic suggestions + active doctor's custom dictionary
    const customPriority = getPrioritizedCustomDictionarySuggestions(currentText, modality);
    const builtIn = getOfflineSmartSuggestions(currentText, modality, 3);
    const offlineSuggestions = Array.from(new Set([...customPriority, ...builtIn])).slice(0, 4);
    const lastSentence = (currentText.trim().split(/[.؛\n]/).pop() || '').trim();

    // If offline, user opted out, or text is too short to warrant an API call
    if (
      !allowOnline ||
      (typeof navigator !== 'undefined' && !navigator.onLine) ||
      lastSentence.length < 6
    ) {
      return {
        suggestions: offlineSuggestions,
        isOnline: false,
      };
    }

    const cacheKey = `${modality}:${lastSentence.slice(-80)}`;
    if (clientSuggestCache.has(cacheKey)) {
      const cached = clientSuggestCache.get(cacheKey)!;
      return {
        suggestions: Array.from(new Set([...customPriority, ...cached, ...offlineSuggestions])).slice(0, 4),
        isOnline: true,
      };
    }

    const now = Date.now();
    if (now < clientCooldownUntil || now - lastOnlineCallTime < MIN_ONLINE_CALL_INTERVAL_MS) {
      return {
        suggestions: offlineSuggestions,
        isOnline: false,
      };
    }

    // 2. Fetch Gemini AI suggestions with 2.5s timeout so UI never stutters
    try {
      lastOnlineCallTime = now;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modality,
          organOrTitle,
          currentText,
          lastSentence,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.rateLimited) {
          clientCooldownUntil = Date.now() + 60_000;
        }
        if (data.suggestions && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
          if (!data.fallback) {
            clientSuggestCache.set(cacheKey, data.suggestions);
          }
          const combined = Array.from(
            new Set([...customPriority, ...data.suggestions, ...offlineSuggestions])
          ).slice(0, 4);
          return {
            suggestions: combined,
            isOnline: !data.fallback,
          };
        }
      } else if (res.status === 429) {
        clientCooldownUntil = Date.now() + 60_000;
      }
    } catch {
      // Fallback silently to offline suggestions
    }

    return {
      suggestions: offlineSuggestions,
      isOnline: false,
    };
  },

  /**
   * Generate professional Impression from Findings
   */
  async generateImpressionFromFindings(
    modality: Modality,
    findingsHtml: string,
    patientInfo: PatientInfo
  ): Promise<string> {
    // Clean HTML to plain text for AI
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = findingsHtml;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';

    if (!plainText.trim()) {
      return '<p><strong>نتیجه‌گیری:</strong> بررسی در حد طبیعی است و پاتولوژی بارزی دیده نشد.</p>';
    }

    if (Date.now() >= clientCooldownUntil) {
      try {
        const res = await fetch('/api/ai/impression', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            modality,
            findingsText: plainText,
            patientInfo,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.impression && data.impression.trim()) {
            let formatted = data.impression
              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              .replace(/\n\*/g, '<br/>• ')
              .replace(/\n-/g, '<br/>• ')
              .replace(/\n/g, '<br/>');
            return `<p>${formatted}</p>`;
          }
        }
      } catch {
        // Fallback to local summary below
      }
    }

    // Local heuristic fallback
    const hasFatty = plainText.includes('کبد چرب');
    const hasStone = plainText.includes('سنگ') || plainText.includes('Cholelithiasis');
    const hasDisc = plainText.includes('دیسک') || plainText.includes('فتق');
    const hasEffusion = plainText.includes('افیوژن') || plainText.includes('مایع');

    const points: string[] = [];
    if (hasFatty) points.push('تغییرات کبد چرب در پارانشیم کبد.');
    if (hasStone) points.push('شواهد سنگ (Calculus) مطابق با شرح یافته‌ها.');
    if (hasDisc) points.push('تغییرات دژنراتیو دیسک بین‌مهره‌ای همراه با تماس یا فشار بر عناصر عصبی.');
    if (hasEffusion) points.push('افیوژن مایع در موضع بررسی شده.');

    if (points.length === 0) {
      return '<p><strong>نتیجه‌گیری نهایی:</strong></p><ul><li>بررسی در حد نرمال فیزیولوژیک سن بیمار می‌باشد (Unremarkable Exam).</li><li>شواهدی از ضایعه فضاگیر یا تغییر پاتولوژیک بارز مشاهده نشد.</li></ul>';
    }

    return `<p><strong>خلاصه یافته‌ها و نتیجه‌گیری (Impression):</strong></p><ul>${points.map((p) => `<li>${p}</li>`).join('')}</ul>`;
  },

  /**
   * Check report for emergency/critical red flags
   */
  async checkCriticalFindings(fullReport: string, modality: Modality): Promise<ReviewResult> {
    const criticalRegexes = [
      { pattern: /(خونریزی حاد|اپیدورال هماتوم|ساب‌دورال حاد|EDH|SDH|SAH|ICH|خونریزی مغزی)/i, alert: 'خونریزی حاد داخل جمجمه‌ای (Intracranial Hemorrhage)' },
      { pattern: /(پنوموتوراکس|Pneumothorax|تنش|Tension)/i, alert: 'پنوموتوراکس حاد قفسه سینه' },
      { pattern: /(آپاندیسیت حاد|Acute Appendicitis|پرفوراسیون|سوراخ‌شدگی|هوا زیر دیافراگم|Free air)/i, alert: 'شکم حاد جراحی / آپاندیسیت حاد یا پرفوراسیون روده' },
      { pattern: /(دیسکسیون آئورت|Aortic Dissection|آنوریسم پاره)/i, alert: 'دیسکسیون یا آنوریسم حاد عروقی' },
      { pattern: /(تورشن|پیچش تخمدان|تورسیون بیضه|Ovarian Torsion|Testicular Torsion)/i, alert: 'تورشن و ایسکمی حاد تخمدان/بیضه' },
    ];

    for (const item of criticalRegexes) {
      if (item.pattern.test(fullReport)) {
        return {
          hasCritical: true,
          criticalAlert: `هشدار یافته بحرانی (Critical Alert): ${item.alert} رویت شد. اطلاع‌رسانی فوری به پزشک ارجاع‌دهنده ضروری است.`,
        };
      }
    }

    return { hasCritical: false };
  },
};
