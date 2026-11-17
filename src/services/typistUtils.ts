import { MedicalShortcut, ReportStudy } from '../types';

const ZWNJ = '\u200C'; // نیم‌فاصله استاندارد فارسی

export interface AutoCorrectResult {
  corrected: string;
  fixCount: number;
}

export interface SpellIssueItem {
  id: string;
  studyId: string;
  field: 'title' | 'findings';
  original: string;
  suggestion: string;
  ruleLabel: string;
}

/**
 * Dictionary of Radiology & Persian Typist Spell & Half-Space Rules (کاملاً آفلاین)
 */
const RADIOLOGY_AUTOCORRECT_RULES: Array<{
  pattern: RegExp;
  replacement: string;
  label: string;
}> = [
  // ۱. اصطلاحات پرتکرار تصویربرداری (تایپ سریع بدون فاصله یا با فاصله معمولی)
  {
    pattern: /سیتیاسکن|سی\s+تی\s+اسکن|سیتی\s+اسکن|سی‌تی\s+اسکن|سی\s+تی‌اسکن/g,
    replacement: `سی${ZWNJ}تی${ZWNJ}اسکن`,
    label: 'نیم‌فاصله استاندارد اصطلاح پزشکی',
  },
  {
    pattern: /امارای|ام‌آرآی|ام\s+آر\s+آی|ام\s+ار\s+ای|ام‌ار‌ای/g,
    replacement: `ام${ZWNJ}آر${ZWNJ}آی`,
    label: 'املای استاندارد ام‌آر‌آی',
  },
  {
    pattern: /سونو\s+گرافی/g,
    replacement: 'سونوگرافی',
    label: 'پیوستگی املایی',
  },
  {
    pattern: /مامو\s+گرافی/g,
    replacement: 'ماموگرافی',
    label: 'پیوستگی املایی',
  },
  {
    pattern: /رادیو\s+لوژی/g,
    replacement: 'رادیولوژی',
    label: 'پیوستگی املایی',
  },
  {
    pattern: /پرتو\s+پزشکی/g,
    replacement: 'پرتوپزشکی',
    label: 'پیوستگی املایی',
  },
  {
    pattern: /کالرداپلر/g,
    replacement: 'کالر داپلر',
    label: 'فاصله‌گذاری صحیح',
  },
  {
    pattern: /تصویر\s+برداری/g,
    replacement: 'تصویربرداری',
    label: 'پیوستگی املایی',
  },

  // ۲. واحدهای اندازه‌گیری رادیولوژی
  {
    pattern: /میلی\s+متر|میلیمتر/g,
    replacement: `میلی${ZWNJ}متر`,
    label: 'نیم‌فاصله واحد اندازه‌گیری',
  },
  {
    pattern: /سانتی\s+متر|سانتیمتر/g,
    replacement: `سانتی${ZWNJ}متر`,
    label: 'نیم‌فاصله واحد اندازه‌گیری',
  },
  {
    pattern: /میلی\s+لیتر|میلیلیتر/g,
    replacement: `میلی${ZWNJ}لیتر`,
    label: 'نیم‌فاصله واحد اندازه‌گیری',
  },
  {
    pattern: /مگا\s+هرتز/g,
    replacement: 'مگاهرتز',
    label: 'پیوستگی واحد فرکانس',
  },

  // ۳. اصطلاحات آناتومیک و پاتولوژی رادیولوژی
  {
    pattern: /اکو\s+پترن/g,
    replacement: 'اکوپترن',
    label: 'اصطلاح سونوگرافی',
  },
  {
    pattern: /اکو\s+ژنیسیته|اکوژنسیته/g,
    replacement: 'اکوژنیسیته',
    label: 'املای صحیح اکوژنیسیته',
  },
  {
    pattern: /هایپر\s+اکو|هایپراکوا/g,
    replacement: 'هایپراکو',
    label: 'املای صحیح هایپراکو',
  },
  {
    pattern: /هایپو\s+اکو/g,
    replacement: 'هایپواکو',
    label: 'املای صحیح هایپواکو',
  },
  {
    pattern: /ایزو\s+اکو/g,
    replacement: 'ایزواکو',
    label: 'املای صحیح ایزواکو',
  },
  {
    pattern: /هایپر\s+دنس/g,
    replacement: 'هایپردنس',
    label: 'املای صحیح هایپردنس',
  },
  {
    pattern: /هایپو\s+دنس/g,
    replacement: 'هایپودنس',
    label: 'املای صحیح هایپودنس',
  },
  {
    pattern: /هایپر\s+سیگنال/g,
    replacement: 'هایپرسیگنال',
    label: 'املای صحیح هایپرسیگنال',
  },
  {
    pattern: /هایپو\s+سیگنال/g,
    replacement: 'هایپوسیگنال',
    label: 'املای صحیح هایپوسیگنال',
  },
  {
    pattern: /هیدرو\s+نفروز/g,
    replacement: 'هیدرونفروز',
    label: 'املای صحیح هیدرونفروز',
  },
  {
    pattern: /لنف\s+ادنوپاتی|لنف‌آدنوپاتی/g,
    replacement: 'لنفادنوپاتی',
    label: 'املای صحیح لنفادنوپاتی',
  },
  {
    pattern: /کلدوساک|کل\s+دوساک/g,
    replacement: `کل${ZWNJ}دوساک`,
    label: 'نیم‌فاصله کل‌دوساک',
  },
  {
    pattern: /ساب\s+دورال/g,
    replacement: `ساب${ZWNJ}دورال`,
    label: 'نیم‌فاصله ساب‌دورال',
  },
  {
    pattern: /اپی\s+دورال/g,
    replacement: 'اپیدورال',
    label: 'املای صحیح اپیدورال',
  },
  {
    pattern: /ساب\s+آراکنوئید|ساب\s+اراکنوئید/g,
    replacement: `ساب${ZWNJ}آراکنوئید`,
    label: 'نیم‌فاصله ساب‌آراکنوئید',
  },
  {
    pattern: /پری\s+آئورتیک|پری\s+ائورتیک/g,
    replacement: `پری${ZWNJ}آئورتیک`,
    label: 'نیم‌فاصله پری‌آئورتیک',
  },
  {
    pattern: /پارا\s+آئورتیک/g,
    replacement: 'پاراآئورتیک',
    label: 'املای صحیح پاراآئورتیک',
  },
  {
    pattern: /بین\s+مهره\s+ای|بین\s+مهره‌ای|بین‌مهره\s+ای/g,
    replacement: `بین${ZWNJ}مهره${ZWNJ}ای`,
    label: 'نیم‌فاصله بین‌مهره‌ای',
  },
  {
    pattern: /ضایعه\s+فضا\s+گیر/g,
    replacement: 'ضایعه فضاگیر',
    label: 'املای صحیح فضاگیر',
  },
  {
    pattern: /خوش\s+خیم/g,
    replacement: `خوش${ZWNJ}خیم`,
    label: 'نیم‌فاصله خوش‌خیم',
  },
  {
    pattern: /بد\s+خیم/g,
    replacement: 'بدخیم',
    label: 'املای صحیح بدخیم',
  },
  {
    pattern: /غیر\s+طبیعی/g,
    replacement: 'غیرطبیعی',
    label: 'پیوستگی غیرطبیعی',
  },
  {
    pattern: /هیچ\s+گونه/g,
    replacement: `هیچ${ZWNJ}گونه`,
    label: 'نیم‌فاصله هیچ‌گونه',
  },

  // ۴. نیم‌فاصله افعال پرتکرار در گزارش‌نویسی پزشکی
  {
    pattern: /می\s+باشد/g,
    replacement: `می${ZWNJ}باشد`,
    label: 'نیم‌فاصله فعل (می‌باشد)',
  },
  {
    pattern: /نمی\s+باشد/g,
    replacement: `نمی${ZWNJ}باشد`,
    label: 'نیم‌فاصله فعل (نمی‌باشد)',
  },
  {
    pattern: /می\s+باشند/g,
    replacement: `می${ZWNJ}باشند`,
    label: 'نیم‌فاصله فعل (می‌باشند)',
  },
  {
    pattern: /نمی\s+باشند/g,
    replacement: `نمی${ZWNJ}باشند`,
    label: 'نیم‌فاصله فعل (نمی‌باشند)',
  },
  {
    pattern: /می\s+شود/g,
    replacement: `می${ZWNJ}شود`,
    label: 'نیم‌فاصله فعل (می‌شود)',
  },
  {
    pattern: /نمی\s+شود/g,
    replacement: `نمی${ZWNJ}شود`,
    label: 'نیم‌فاصله فعل (نمی‌شود)',
  },
  {
    pattern: /می\s+شوند/g,
    replacement: `می${ZWNJ}شوند`,
    label: 'نیم‌فاصله فعل (می‌شوند)',
  },
  {
    pattern: /نمی\s+شوند/g,
    replacement: `نمی${ZWNJ}شوند`,
    label: 'نیم‌فاصله فعل (نمی‌شوند)',
  },
  {
    pattern: /می\s+گردد/g,
    replacement: `می${ZWNJ}گردد`,
    label: 'نیم‌فاصله فعل (می‌گردد)',
  },
  {
    pattern: /نمی\s+گردد/g,
    replacement: `نمی${ZWNJ}گردد`,
    label: 'نیم‌فاصله فعل (نمی‌گردد)',
  },
  {
    pattern: /می\s+گردند/g,
    replacement: `می${ZWNJ}گردند`,
    label: 'نیم‌فاصله فعل (می‌گردند)',
  },
  {
    pattern: /می\s+رسد/g,
    replacement: `می${ZWNJ}رسد`,
    label: 'نیم‌فاصله فعل (می‌رسد)',
  },
  {
    pattern: /نمی\s+رسد/g,
    replacement: `نمی${ZWNJ}رسد`,
    label: 'نیم‌فاصله فعل (نمی‌رسد)',
  },
  {
    pattern: /می\s+دهد/g,
    replacement: `می${ZWNJ}دهد`,
    label: 'نیم‌فاصله فعل (می‌دهد)',
  },
  {
    pattern: /نمی\s+دهد/g,
    replacement: `نمی${ZWNJ}دهد`,
    label: 'نیم‌فاصله فعل (نمی‌دهد)',
  },
  {
    pattern: /می\s+خورد/g,
    replacement: `می${ZWNJ}خورد`,
    label: 'نیم‌فاصله فعل (می‌خورد)',
  },
  {
    pattern: /نمی\s+خورد/g,
    replacement: `نمی${ZWNJ}خورد`,
    label: 'نیم‌فاصله فعل (نمی‌خورد)',
  },

  // ۵. نیم‌فاصله جمع‌های پرتکرار رادیولوژی (ها / های / هایی)
  {
    pattern:
      /(یافته|کلیه|ریه|مهره|سکانس|بررسی|توصیه|نتیجه|ضایعه|کیست|ندول|مفصل|تاندون|لیگامان|رباط|بطن|شیار|شاخه|مجرا|حالب|تخمدان|بیضه|پستان|غده|ورید|شریان|تصویر|مقطع|لبه|جدار|بافت|ساختار|کانون|فورامن|ریشه)\s+(ها|های|هایی)(?=\s|[.،؛:!؟)\]]|$)/g,
    replacement: `$1${ZWNJ}$2`,
    label: 'نیم‌فاصله علامت جمع',
  },
];

export interface RadSlotItem {
  id: string;
  label: string;
  value: string;
  unit?: string;
}

export const PRESET_RADIOLOGY_SLOTS: Array<{
  label: string;
  defaultValue: string;
  unit: string;
  category: string;
}> = [
  { label: 'سایز کلیه راست', defaultValue: '۱۱۰', unit: 'میلی‌متر', category: 'کلیه و مجاری' },
  { label: 'سایز کلیه چپ', defaultValue: '۱۱۲', unit: 'میلی‌متر', category: 'کلیه و مجاری' },
  { label: 'ضخامت کورتکس کلیه', defaultValue: '۱۴', unit: 'میلی‌متر', category: 'کلیه و مجاری' },
  { label: 'قطر سنگ کلیه', defaultValue: '۵', unit: 'میلی‌متر', category: 'کلیه و مجاری' },
  { label: 'حجم پروستات', defaultValue: '۳۰', unit: 'سی‌سی', category: 'کلیه و مجاری' },
  { label: 'اسپن کبد', defaultValue: '۱۴۰', unit: 'میلی‌متر', category: 'شکم و لگن' },
  { label: 'قطر CBD', defaultValue: '۴', unit: 'میلی‌متر', category: 'شکم و لگن' },
  { label: 'طول طحال', defaultValue: '۱۰۵', unit: 'میلی‌متر', category: 'شکم و لگن' },
  { label: 'لوب راست تیروئید', defaultValue: '۴۲×۱۵×۱۷', unit: 'میلی‌متر', category: 'تیروئید و گردن' },
  { label: 'لوب چپ تیروئید', defaultValue: '۴۰×۱۴×۱۶', unit: 'میلی‌متر', category: 'تیروئید و گردن' },
  { label: 'ضخامت ایسموس', defaultValue: '۳', unit: 'میلی‌متر', category: 'تیروئید و گردن' },
  { label: 'ابعاد ندول تیروئید', defaultValue: '۶×۴', unit: 'میلی‌متر', category: 'تیروئید و گردن' },
  { label: 'سن جنین (GA)', defaultValue: '۱۹w + ۲d', unit: '', category: 'بارداری و زنان' },
  { label: 'ضربان قلب جنین (FHR)', defaultValue: '۱۴۵', unit: 'bpm', category: 'بارداری و زنان' },
  { label: 'وزن تخمینی جنین (EFW)', defaultValue: '۳۱۰', unit: 'گرم', category: 'بارداری و زنان' },
  { label: 'طول سرویکس', defaultValue: '۳۵', unit: 'میلی‌متر', category: 'بارداری و زنان' },
  { label: 'ضخامت آندومتر', defaultValue: '۶', unit: 'میلی‌متر', category: 'بارداری و زنان' },
  { label: 'ابعاد رحم', defaultValue: '۷۸×۴۵×۳۸', unit: 'میلی‌متر', category: 'بارداری و زنان' },
  { label: 'ابعاد ضایعه / کیست', defaultValue: '۱۲×۹', unit: 'میلی‌متر', category: 'عمومی' },
];

/**
 * Creates an HTML snippet for a protected inline number/parameter slot
 */
export function createSlotHtml(label: string, value: string, id?: string): string {
  const slotId = id || `slot-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const safeLabel = label.replace(/"/g, '&quot;');
  return `<span class="rad-slot" data-slot="true" data-slot-id="${slotId}" data-slot-label="${safeLabel}" dir="ltr" title="فیلد جایگذاری: ${safeLabel}">${value}</span>`;
}

/**
 * Extracts all active <span data-slot="true"> items from an HTML string
 * Also converts any bracketed syntax like [سایز کلیه راست: ۱۱۰] into proper <span data-slot="true"> tags
 */
export function normalizeAndExtractSlots(html: string): {
  normalizedHtml: string;
  slots: RadSlotItem[];
} {
  if (!html) return { normalizedHtml: '', slots: [] };

  let slotCounter = 1;
  // Convert bracket syntax e.g. [[سایز کلیه: ۱۱۰]] or [سایز کلیه: ۱۱۰] outside HTML tags into .rad-slot spans
  const parts = html.split(/(<[^>]+>)/g);
  const normalizedParts = parts.map((part) => {
    if (part.startsWith('<') && part.endsWith('>')) return part;
    return part.replace(/\[\[?([^\]\n:：]{2,35})[:：]\s*([^\]\n]{1,25})\]?\]/g, (_, lbl, val) => {
      const id = `slot-auto-${Date.now()}-${slotCounter++}`;
      return createSlotHtml(lbl.trim(), val.trim(), id);
    });
  });

  const normalizedHtml = normalizedParts.join('');
  const slots: RadSlotItem[] = [];

  const regex = /<span\b[^>]*data-slot="true"[^>]*>([\s\S]*?)<\/span>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(normalizedHtml)) !== null) {
    const fullTag = match[0];
    const innerValue = match[1].replace(/<[^>]+>/g, '').trim();
    const idMatch = fullTag.match(/data-slot-id="([^"]+)"/i);
    const labelMatch = fullTag.match(/data-slot-label="([^"]+)"/i);
    slots.push({
      id: idMatch ? idMatch[1] : `slot-${slots.length + 1}`,
      label: labelMatch ? labelMatch[1] : `عدد ${slots.length + 1}`,
      value: innerValue,
    });
  }

  return { normalizedHtml, slots };
}

/**
 * Automatically detects numbers/measurements in any raw template HTML and wraps them
 * in safe fillable <span class="rad-slot"> badges so typists can edit numbers without breaking the text!
 */
export function autoWrapNumbersAsSlotsInHtml(html: string): {
  updatedHtml: string;
  count: number;
} {
  if (!html) return { updatedHtml: html, count: 0 };

  let count = 0;
  // Split HTML into tags and text nodes, tracking whether we are already inside a .rad-slot span
  const tokens = html.split(/(<[^>]+>)/g);
  let insideSlot = false;
  let lastContextText = '';

  const inferLabelFromContext = (beforeText: string, indexNum: number): string => {
    const clean = beforeText.replace(/[:：(（=]/g, ' ').trim();
    const words = clean.split(/\s+/).filter(Boolean);
    const tail = words.slice(-4).join(' ');
    if (tail.includes('کلیه راست')) return 'کلیه راست';
    if (tail.includes('کلیه چپ')) return 'کلیه چپ';
    if (tail.includes('کورتکس') || tail.includes('قشر')) return 'ضخامت کورتکس';
    if (tail.includes('کبد') || tail.includes('اسپن')) return 'اسپن کبد';
    if (tail.includes('CBD') || tail.includes('صفراوی')) return 'قطر CBD';
    if (tail.includes('طحال')) return 'طول طحال';
    if (tail.includes('لوب راست')) return 'لوب راست تیروئید';
    if (tail.includes('لوب چپ')) return 'لوب چپ تیروئید';
    if (tail.includes('ایستموس') || tail.includes('ایسموس')) return 'ضخامت ایسموس';
    if (tail.includes('ندول')) return 'ابعاد ندول';
    if (tail.includes('کیست')) return 'قطر کیست';
    if (tail.includes('سرویکس')) return 'طول سرویکس';
    if (tail.includes('FHR') || tail.includes('ضربان')) return 'ضربان قلب (FHR)';
    if (tail.includes('BPD')) return 'شاخص BPD';
    if (tail.includes('HC')) return 'شاخص HC';
    if (tail.includes('AC')) return 'شاخص AC';
    if (tail.includes('FL')) return 'شاخص FL';
    if (tail.length >= 2 && tail.length <= 26) return tail;
    return `مقدار عددی ${indexNum}`;
  };

  const resultTokens = tokens.map((tok) => {
    if (tok.startsWith('<') && tok.endsWith('>')) {
      if (/^<span\b[^>]*data-slot="true"/i.test(tok)) {
        insideSlot = true;
      } else if (insideSlot && /^<\/span>/i.test(tok)) {
        insideSlot = false;
      }
      return tok;
    }

    if (insideSlot) {
      return tok;
    }

    // Match dimension patterns or numbers followed by radiology units
    const numPattern =
      /([۰-۹0-9]+(?:\.[۰-۹0-9]+)?(?:\s*[×xX*]\s*[۰-۹0-9]+(?:\.[۰-۹0-9]+)?)+|[۰-۹0-9]+w\s*\+\s*[۰-۹0-9]+d|[۰-۹0-9]+(?:\.[۰-۹0-9]+)?(?=\s*(?:میلی‌متر|میلیمتر|سانتی‌متر|سانتیمتر|سی‌سی|گرم|هفته|روز|درجه|mm|cm|cc|ml|bpm|MHz|مگاهرتز)))/g;

    let lastIdx = 0;
    let out = '';
    let m: RegExpExecArray | null;
    while ((m = numPattern.exec(tok)) !== null) {
      const before = tok.slice(lastIdx, m.index);
      out += before;
      lastContextText = (lastContextText + ' ' + before).slice(-80);
      count++;
      const label = inferLabelFromContext(lastContextText, count);
      const slotId = `slot-gen-${Date.now()}-${count}`;
      out += createSlotHtml(label, m[1].trim(), slotId);
      lastIdx = m.index + m[0].length;
    }
    out += tok.slice(lastIdx);
    lastContextText = (lastContextText + ' ' + tok).slice(-80);
    return out;
  });

  return {
    updatedHtml: resultTokens.join(''),
    count,
  };
}

/**
 * Fixes Unicode Bidi ordering for hyphen/dash placeholders before English medical units
 * inside Persian RTL text (e.g., `-mm`, `--mm`, `-cm`, `-cc`, `-ml`, `-gr`) so that
 * the hyphen `-` stays on the LEFT of `mm` (`-mm`) instead of jumping to the right (`mm-`).
 */
export function fixRtlUnitPlaceholderBidi(input: string): string {
  if (!input) return input;
  return input.replace(
    /(?<![\u200E\u200FA-Za-z0-9۰-۹])([-–—_]+\s*(?:mm|cm|cc|ml|mg|gr|kg|bpm|kPa|MHz|Hz|w|d|%)(?![A-Za-z]))/gi,
    '\u200E$1'
  );
}

/**
 * Applies `fixRtlUnitPlaceholderBidi` directly to text nodes inside a contentEditable element
 * while keeping the user's exact caret position intact.
 */
export function fixRtlUnitPlaceholdersInDom(editorEl: HTMLElement): boolean {
  const sel = window.getSelection();
  const anchorNode = sel && sel.rangeCount > 0 ? sel.anchorNode : null;
  const anchorOffset = sel && sel.rangeCount > 0 ? sel.anchorOffset : 0;

  let modified = false;
  const walker = document.createTreeWalker(editorEl, NodeFilter.SHOW_TEXT, null);
  let node = walker.nextNode() as Text | null;

  while (node) {
    const val = node.nodeValue || '';
    if (val.includes('-') || val.includes('–') || val.includes('—') || val.includes('_')) {
      const fixed = fixRtlUnitPlaceholderBidi(val);
      if (fixed !== val) {
        modified = true;
        const delta = fixed.length - val.length;
        node.nodeValue = fixed;
        if (sel && node === anchorNode) {
          try {
            const nextOffset = Math.min(fixed.length, anchorOffset + delta);
            sel.collapse(node, nextOffset);
          } catch {}
        }
      }
    }
    node = walker.nextNode() as Text | null;
  }

  return modified;
}

/**
 * Pre-built Radiology Tables with embedded Smart Number Slots
 */
export function getRadiologyTablePresetHtml(
  presetId: 'kidneys' | 'thyroid' | 'fetal' | 'pelvis' | 'lesions',
  widthStyle: string = '100%'
): string {
  const ts = Date.now();
  const resolvedWidth = widthStyle === 'auto' ? 'width: auto; max-width: 100%;' : `width: ${widthStyle};`;
  const baseTableStyle = `${resolvedWidth} border-collapse: collapse; margin: 12px 0; font-size: 13px; text-align: right; direction: rtl;`;
  const thStyle =
    'padding: 8px 10px; background-color: #f0fdfa; color: #0f766e; border: 1px solid #99f6e4; font-weight: 800; text-align: center;';
  const tdStyle = 'padding: 7px 10px; border: 1px solid #cbd5e1; text-align: center;';
  const tdRightStyle = 'padding: 7px 10px; border: 1px solid #cbd5e1; font-weight: 700; background-color: #f8fafc;';

  if (presetId === 'kidneys') {
    return `<table style="${baseTableStyle}">
      <thead>
        <tr>
          <th style="${thStyle} text-align: right;">ارگان مورد بررسی</th>
          <th style="${thStyle}">طول قطبی (mm)</th>
          <th style="${thStyle}">ضخامت کورتکس (mm)</th>
          <th style="${thStyle}">هیدرونفروز / استاز</th>
          <th style="${thStyle}">سنگ یا ضایعه فضاگیر</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="${tdRightStyle}">کلیه راست (Right Kidney)</td>
          <td style="${tdStyle}">${createSlotHtml('طول کلیه راست', '۱۱۰', `slot-kr-${ts}`)} میلی‌متر</td>
          <td style="${tdStyle}">${createSlotHtml('کورتکس کلیه راست', '۱۴', `slot-krc-${ts}`)} میلی‌متر</td>
          <td style="${tdStyle}">ندارد</td>
          <td style="${tdStyle}">رویت نشد</td>
        </tr>
        <tr>
          <td style="${tdRightStyle}">کلیه چپ (Left Kidney)</td>
          <td style="${tdStyle}">${createSlotHtml('طول کلیه چپ', '۱۱۲', `slot-kl-${ts}`)} میلی‌متر</td>
          <td style="${tdStyle}">${createSlotHtml('کورتکس کلیه چپ', '۱۴', `slot-klc-${ts}`)} میلی‌متر</td>
          <td style="${tdStyle}">ندارد</td>
          <td style="${tdStyle}">رویت نشد</td>
        </tr>
      </tbody>
    </table><p></p>`;
  }

  if (presetId === 'thyroid') {
    return `<table style="${baseTableStyle}">
      <thead>
        <tr>
          <th style="${thStyle} text-align: right;">بخش تیروئید</th>
          <th style="${thStyle}">ابعاد (میلی‌متر)</th>
          <th style="${thStyle}">حجم تقریبی (cc)</th>
          <th style="${thStyle}">اکوپترن پارانشیم</th>
          <th style="${thStyle}">ندول / ضایعه</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="${tdRightStyle}">لوب راست (Right Lobe)</td>
          <td style="${tdStyle}">${createSlotHtml('ابعاد لوب راست تیروئید', '۴۲×۱۵×۱۷', `slot-tr-${ts}`)}</td>
          <td style="${tdStyle}">${createSlotHtml('حجم لوب راست تیروئید', '۵.۵', `slot-trv-${ts}`)} سی‌سی</td>
          <td style="${tdStyle}">هموژن و یکنواخت</td>
          <td style="${tdStyle}">${createSlotHtml('ندول لوب راست', 'ندارد', `slot-trn-${ts}`)}</td>
        </tr>
        <tr>
          <td style="${tdRightStyle}">لوب چپ (Left Lobe)</td>
          <td style="${tdStyle}">${createSlotHtml('ابعاد لوب چپ تیروئید', '۴۰×۱۴×۱۶', `slot-tl-${ts}`)}</td>
          <td style="${tdStyle}">${createSlotHtml('حجم لوب چپ تیروئید', '۴.۸', `slot-tlv-${ts}`)} سی‌سی</td>
          <td style="${tdStyle}">هموژن و یکنواخت</td>
          <td style="${tdStyle}">${createSlotHtml('ندول لوب چپ', 'ندارد', `slot-tln-${ts}`)}</td>
        </tr>
        <tr>
          <td style="${tdRightStyle}">ایسموس (Isthmus)</td>
          <td style="${tdStyle}">ضخامت: ${createSlotHtml('ضخامت ایسموس تیروئید', '۳', `slot-ti-${ts}`)} میلی‌متر</td>
          <td style="${tdStyle}">---</td>
          <td style="${tdStyle}">طبیعی</td>
          <td style="${tdStyle}">فاقد ضایعه</td>
        </tr>
      </tbody>
    </table><p></p>`;
  }

  if (presetId === 'fetal') {
    return `<table style="${baseTableStyle}">
      <thead>
        <tr>
          <th style="${thStyle} text-align: right;">شاخص بیومتری جنین</th>
          <th style="${thStyle}">اندازه (میلی‌متر)</th>
          <th style="${thStyle}">سن بارداری معادل (GA)</th>
          <th style="${thStyle}">صدک رشد</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="${tdRightStyle}">قطر بای‌پاریتال (BPD)</td>
          <td style="${tdStyle}">${createSlotHtml('اندازه BPD', '۴۴', `slot-bpd-${ts}`)} میلی‌متر</td>
          <td style="${tdStyle}">${createSlotHtml('سن جنین BPD', '۱۹w + ۲d', `slot-bpd-ga-${ts}`)}</td>
          <td style="${tdStyle}">نرمال</td>
        </tr>
        <tr>
          <td style="${tdRightStyle}">محیط سر (HC)</td>
          <td style="${tdStyle}">${createSlotHtml('اندازه HC', '۱۶۵', `slot-hc-${ts}`)} میلی‌متر</td>
          <td style="${tdStyle}">${createSlotHtml('سن جنین HC', '۱۹w + ۳d', `slot-hc-ga-${ts}`)}</td>
          <td style="${tdStyle}">نرمال</td>
        </tr>
        <tr>
          <td style="${tdRightStyle}">محیط شکم (AC)</td>
          <td style="${tdStyle}">${createSlotHtml('اندازه AC', '۱۴۲', `slot-ac-${ts}`)} میلی‌متر</td>
          <td style="${tdStyle}">${createSlotHtml('سن جنین AC', '۱۹w + ۱d', `slot-ac-ga-${ts}`)}</td>
          <td style="${tdStyle}">نرمال</td>
        </tr>
        <tr>
          <td style="${tdRightStyle}">طول استخوان فمور (FL)</td>
          <td style="${tdStyle}">${createSlotHtml('اندازه FL', '۳۰', `slot-fl-${ts}`)} میلی‌متر</td>
          <td style="${tdStyle}">${createSlotHtml('سن جنین FL', '۱۹w + ۲d', `slot-fl-ga-${ts}`)}</td>
          <td style="${tdStyle}">نرمال</td>
        </tr>
      </tbody>
    </table><p></p>`;
  }

  if (presetId === 'pelvis') {
    return `<table style="${baseTableStyle}">
      <thead>
        <tr>
          <th style="${thStyle} text-align: right;">ساختار لگنی</th>
          <th style="${thStyle}">ابعاد (میلی‌متر)</th>
          <th style="${thStyle}">حجم / ضخامت</th>
          <th style="${thStyle}">یافته‌های تکمیلی</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="${tdRightStyle}">رحم و آندومتر</td>
          <td style="${tdStyle}">${createSlotHtml('ابعاد رحم', '۷۸×۴۵×۳۸', `slot-ut-${ts}`)}</td>
          <td style="${tdStyle}">آندومتر: ${createSlotHtml('ضخامت آندومتر', '۶', `slot-endo-${ts}`)} میلی‌متر</td>
          <td style="${tdStyle}">میومتر هموژن و طبیعی</td>
        </tr>
        <tr>
          <td style="${tdRightStyle}">تخمدان راست (Right Ovary)</td>
          <td style="${tdStyle}">${createSlotHtml('ابعاد تخمدان راست', '۳۲×۲۰', `slot-ro-${ts}`)}</td>
          <td style="${tdStyle}">${createSlotHtml('حجم تخمدان راست', '۶.۵', `slot-rov-${ts}`)} سی‌سی</td>
          <td style="${tdStyle}">فاقد کیست یا توده</td>
        </tr>
        <tr>
          <td style="${tdRightStyle}">تخمدان چپ (Left Ovary)</td>
          <td style="${tdStyle}">${createSlotHtml('ابعاد تخمدان چپ', '۳۰×۱۹', `slot-lo-${ts}`)}</td>
          <td style="${tdStyle}">${createSlotHtml('حجم تخمدان چپ', '۶.۰', `slot-lov-${ts}`)} سی‌سی</td>
          <td style="${tdStyle}">فاقد کیست یا توده</td>
        </tr>
      </tbody>
    </table><p></p>`;
  }

  // 'lesions'
  return `<table style="${baseTableStyle}">
    <thead>
      <tr>
        <th style="${thStyle} text-align: right;">ردیف</th>
        <th style="${thStyle}">موقعیت آناتومیک</th>
        <th style="${thStyle}">ابعاد (میلی‌متر)</th>
        <th style="${thStyle}">ویژگی سونوگرافیک / رادیولوژیک</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="${tdRightStyle}">ضایعه ۱</td>
        <td style="${tdStyle}">${createSlotHtml('موقعیت ضایعه ۱', 'لوب راست', `slot-l1-loc-${ts}`)}</td>
        <td style="${tdStyle}">${createSlotHtml('ابعاد ضایعه ۱', '۱۲×۸', `slot-l1-dim-${ts}`)} میلی‌متر</td>
        <td style="${tdStyle}">حدود منظم و خوش‌خیم</td>
      </tr>
      <tr>
        <td style="${tdRightStyle}">ضایعه ۲</td>
        <td style="${tdStyle}">${createSlotHtml('موقعیت ضایعه ۲', 'لوب چپ', `slot-l2-loc-${ts}`)}</td>
        <td style="${tdStyle}">${createSlotHtml('ابعاد ضایعه ۲', '۷×۵', `slot-l2-dim-${ts}`)} میلی‌متر</td>
        <td style="${tdStyle}">حدود منظم و خوش‌خیم</td>
      </tr>
    </tbody>
  </table><p></p>`;
}

/**
 * Strips any temporary <mark class="spell-issue-highlight" ...> wrapper tags
 * and unwraps <span class="rad-slot" ...> tags into clean text for printing/saving if needed
 */
export function stripSpellHighlights(html: string, unwrapSlotsForPrint = false): string {
  if (!html) return html;
  let res = html.replace(/<mark\b[^>]*data-spell-issue="true"[^>]*>([\s\S]*?)<\/mark>/gi, '$1');
  if (unwrapSlotsForPrint) {
    res = res.replace(/<span\b[^>]*data-slot="true"[^>]*>([\s\S]*?)<\/span>/gi, '$1');
  }
  return res;
}

/**
 * Scans HTML (or plain text) and wraps every detected radiology typo / missing half-space
 * in an interactive <mark class="spell-issue-highlight"> tag so the user can click it to see & accept the suggestion.
 */
export function highlightRadiologyIssuesInHtml(
  inputHtml: string,
  studyId: string
): { highlightedHtml: string; issues: SpellIssueItem[] } {
  const cleanHtml = stripSpellHighlights(inputHtml);
  const issues: SpellIssueItem[] = [];
  let counter = 0;

  // Split into HTML tags and text nodes so we only highlight inside text nodes
  const parts = cleanHtml.split(/(<[^>]+>)/g);

  const processedParts = parts.map((part) => {
    if (part.startsWith('<') && part.endsWith('>')) {
      return part;
    }

    // Standardize Arabic Yeh/Kaf and convert &nbsp; to space character for accurate space/duplicate detection
    let text = part
      .replace(/&nbsp;/gi, ' ')
      .replace(/\u00A0/g, ' ')
      .replace(/ي/g, 'ی')
      .replace(/ى/g, 'ی')
      .replace(/ك/g, 'ک');

    // Collect matches across rules without double-wrapping
    // We use placeholders `\uE000INDEX\uE001` during rule pass and expand them after
    const placeholders: Array<{ id: string; original: string; suggestion: string; label: string }> = [];

    // 1. Detect consecutive duplicate words (کلمات تکراری متوالی، مثلاً: «کبد کبد» یا «طبیعی طبیعی»)
    text = text.replace(
      /([آ-یa-zA-Z\u200C]{2,}|و)[ \t]+\1/g,
      (match, word, offset, fullStr) => {
        const prevChar = offset > 0 ? fullStr[offset - 1] : '';
        const nextChar = offset + match.length < fullStr.length ? fullStr[offset + match.length] : '';
        if (
          /[آ-یa-zA-Z0-9۰-۹\u200C\uE000\uE001]/.test(prevChar) ||
          /[آ-یa-zA-Z0-9۰-۹\u200C\uE000\uE001]/.test(nextChar)
        ) {
          return match;
        }
        const id = `spell-${studyId}-${counter++}`;
        const idx = placeholders.length;
        placeholders.push({
          id,
          original: match,
          suggestion: word,
          label: 'حذف کلمه تکراری متوالی',
        });
        issues.push({
          id,
          studyId,
          field: 'findings',
          original: match,
          suggestion: word,
          ruleLabel: 'حذف کلمه تکراری متوالی',
        });
        return `\uE000${idx}\uE001`;
      }
    );

    // 2. Apply Radiology & Persian Half-Space Rules
    for (const rule of RADIOLOGY_AUTOCORRECT_RULES) {
      text = text.replace(rule.pattern, (match, ...args) => {
        let suggestion = rule.replacement;
        if (suggestion.includes('$1') && args.length >= 2) {
          suggestion = suggestion.replace('$1', args[0]).replace('$2', args[1]);
        }
        if (match === suggestion) return match;

        const id = `spell-${studyId}-${counter++}`;
        const idx = placeholders.length;
        placeholders.push({
          id,
          original: match,
          suggestion,
          label: rule.label,
        });
        issues.push({
          id,
          studyId,
          field: 'findings',
          original: match,
          suggestion,
          ruleLabel: rule.label,
        });
        return `\uE000${idx}\uE001`;
      });
    }

    // Expand placeholders into <mark> elements
    text = text.replace(/\uE000(\d+)\uE001/g, (_, idxStr) => {
      const item = placeholders[parseInt(idxStr, 10)];
      if (!item) return '';
      const safeOrig = item.original.replace(/"/g, '&quot;');
      const safeSug = item.suggestion.replace(/"/g, '&quot;');
      const safeLabel = item.label.replace(/"/g, '&quot;');
      return `<mark class="spell-issue-highlight" data-spell-issue="true" data-spell-id="${item.id}" data-original="${safeOrig}" data-suggestion="${safeSug}" data-label="${safeLabel}">${item.original}</mark>`;
    });

    return text;
  });

  return {
    highlightedHtml: processedParts.join(''),
    issues,
  };
}

/**
 * Detects issues in plain text (such as the Title & Technique textarea) without adding HTML tags
 */
export function detectRadiologyIssuesInPlainText(
  plainText: string,
  studyId: string
): SpellIssueItem[] {
  if (!plainText) return [];
  const issues: SpellIssueItem[] = [];
  let counter = 0;
  let tempText = plainText.replace(/ي/g, 'ی').replace(/ى/g, 'ی').replace(/ك/g, 'ک');

  // 1. Consecutive duplicate words in title
  tempText = tempText.replace(
    /([آ-یa-zA-Z\u200C]{2,}|و)[ \t\u00A0]+\1/g,
    (match, word, offset, fullStr) => {
      const prevChar = offset > 0 ? fullStr[offset - 1] : '';
      const nextChar = offset + match.length < fullStr.length ? fullStr[offset + match.length] : '';
      if (/[آ-یa-zA-Z0-9۰-۹\u200C]/.test(prevChar) || /[آ-یa-zA-Z0-9۰-۹\u200C]/.test(nextChar)) {
        return match;
      }
      issues.push({
        id: `spell-title-${studyId}-${counter++}`,
        studyId,
        field: 'title',
        original: match,
        suggestion: word,
        ruleLabel: 'حذف کلمه تکراری متوالی',
      });
      return word;
    }
  );

  // 2. Radiology & Half-space rules
  for (const rule of RADIOLOGY_AUTOCORRECT_RULES) {
    tempText = tempText.replace(rule.pattern, (match, ...args) => {
      let suggestion = rule.replacement;
      if (suggestion.includes('$1') && args.length >= 2) {
        suggestion = suggestion.replace('$1', args[0]).replace('$2', args[1]);
      }
      if (match !== suggestion) {
        issues.push({
          id: `spell-title-${studyId}-${counter++}`,
          studyId,
          field: 'title',
          original: match,
          suggestion,
          ruleLabel: rule.label,
        });
      }
      return suggestion;
    });
  }

  return issues;
}

export interface TextCleanupResult {
  cleaned: string;
  duplicateWordsRemoved: number;
  extraSpacesRemoved: number;
  spellAndZwnjFixed: number;
  totalFixes: number;
}

/**
 * 1-Click Automated Medical Text Cleanup:
 * Identifies and removes consecutive duplicate words (کلمات تکراری متوالی),
 * collapses extra spaces (فاصله‌های اضافه / Space), fixes spacing before punctuation,
 * and applies standard Persian half-spaces (نیم‌فاصله‌ها) & radiology spelling corrections.
 */
export function cleanMedicalTextWhitespaceAndDuplicates(
  input: string,
  isHtml = false
): TextCleanupResult {
  if (!input) {
    return {
      cleaned: input,
      duplicateWordsRemoved: 0,
      extraSpacesRemoved: 0,
      spellAndZwnjFixed: 0,
      totalFixes: 0,
    };
  }

  const cleanInput = isHtml ? stripSpellHighlights(input) : input;
  let duplicateWordsRemoved = 0;
  let extraSpacesRemoved = 0;
  let spellAndZwnjFixed = 0;

  const cleanPlainSegment = (segment: string): string => {
    // Skip pure newline/indentation segments between HTML block tags
    if (isHtml && /^\s*[\r\n]+\s*$/.test(segment)) {
      return segment;
    }

    let result = segment
      .replace(/&nbsp;/gi, ' ')
      .replace(/\u00A0/g, ' ')
      .replace(/ي/g, 'ی')
      .replace(/ى/g, 'ی')
      .replace(/ك/g, 'ک');

    // 1. Collapse multiple consecutive horizontal spaces (Space) into a single space
    result = result.replace(/([^\s\r\n])[ \t]{2,}(?=[^\r\n])/g, (_, prevCh) => {
      extraSpacesRemoved++;
      return `${prevCh} `;
    });
    // Also clean leading multiple spaces at the beginning of a paragraph text node
    result = result.replace(/^[ \t]{2,}(?=\S)/, () => {
      extraSpacesRemoved++;
      return '';
    });

    // 2. Remove consecutive duplicate words (up to 3 passes to handle triple repeats like «در در در»)
    for (let pass = 0; pass < 3; pass++) {
      let changedInPass = false;
      result = result.replace(
        /([آ-یa-zA-Z\u200C]{2,}|و)[ \t]+\1/g,
        (match, word, offset, fullStr) => {
          const prevChar = offset > 0 ? fullStr[offset - 1] : '';
          const nextChar = offset + match.length < fullStr.length ? fullStr[offset + match.length] : '';
          if (
            /[آ-یa-zA-Z0-9۰-۹\u200C]/.test(prevChar) ||
            /[آ-یa-zA-Z0-9۰-۹\u200C]/.test(nextChar)
          ) {
            return match;
          }
          duplicateWordsRemoved++;
          changedInPass = true;
          return word;
        }
      );
      if (!changedInPass) break;
    }

    // 3. Remove extra spaces before punctuation marks (، ؛ : . ؟ ! ) »)
    result = result.replace(/([^\s\r\n])[ \t]+([،؛:.؟!)\]»])/g, (_, prevCh, punct) => {
      extraSpacesRemoved++;
      return `${prevCh}${punct}`;
    });

    // 4. Apply radiology spelling & Persian half-space rules
    for (const rule of RADIOLOGY_AUTOCORRECT_RULES) {
      result = result.replace(rule.pattern, (match, ...args) => {
        let rep = rule.replacement;
        if (rep.includes('$1') && args.length >= 2) {
          rep = rep.replace('$1', args[0]).replace('$2', args[1]);
        }
        if (match !== rep) {
          spellAndZwnjFixed++;
        }
        return rep;
      });
    }

    // 5. Final pass to ensure no double spaces remained after replacements
    result = result.replace(/([^\s\r\n])[ \t]{2,}(?=[^\r\n])/g, (_, prevCh) => {
      extraSpacesRemoved++;
      return `${prevCh} `;
    });

    return result;
  };

  if (!isHtml) {
    const cleaned = cleanPlainSegment(cleanInput);
    return {
      cleaned,
      duplicateWordsRemoved,
      extraSpacesRemoved,
      spellAndZwnjFixed,
      totalFixes: duplicateWordsRemoved + extraSpacesRemoved + spellAndZwnjFixed,
    };
  }

  const parts = cleanInput.split(/(<[^>]+>)/g);
  const processedParts = parts.map((part) => {
    if (part.startsWith('<') && part.endsWith('>')) {
      return part;
    }
    return cleanPlainSegment(part);
  });

  return {
    cleaned: processedParts.join(''),
    duplicateWordsRemoved,
    extraSpacesRemoved,
    spellAndZwnjFixed,
    totalFixes: duplicateWordsRemoved + extraSpacesRemoved + spellAndZwnjFixed,
  };
}

/**
 * Applies all radiology spell-check and Persian half-space (ZWNJ) rules at once
 */
export function autoCorrectRadiologyText(input: string, isHtml = false): AutoCorrectResult {
  const res = cleanMedicalTextWhitespaceAndDuplicates(input, isHtml);
  return {
    corrected: res.cleaned,
    fixCount: res.totalFixes,
  };
}

/**
 * Converts English digits to Persian digits
 */
export function toPersianDigits(str: string): string {
  return str.replace(/\d/g, (d) => String.fromCharCode(d.charCodeAt(0) + 1728));
}

/**
 * Converts Persian/Arabic digits to English ASCII digits
 */
export function toEnglishDigits(str: string): string {
  return str
    .replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1728))
    .replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1584));
}

/**
 * Increments the admission number by +1 for Batch Mode (Ctrl + Enter)
 */
export function incrementAdmissionNumber(current: string): string {
  if (!current || !current.trim()) {
    return 'ADM-1001';
  }

  const normalized = toEnglishDigits(current.trim());
  const match = normalized.match(/^(.*?)(\d+)(\D*)$/);

  if (!match) {
    return `${current.trim()}-2`;
  }

  const [, prefix, numStr, suffix] = match;
  const nextNum = parseInt(numStr, 10) + 1;
  const paddedNext = String(nextNum).padStart(numStr.length, '0');

  const hadPersianDigits = /[۰-۹]/.test(current);
  const finalDigits = hadPersianDigits ? toPersianDigits(paddedNext) : paddedNext;

  return `${prefix}${finalDigits}${suffix}`;
}

/**
 * Caret-preserving Auto-Text Expander & Medical Autocorrect for contentEditable elements when pressing Space or Tab.
 * Supports both dot-prefixed triggers (`.abd`) and plain word autocorrect (`abd` -> `abdomen`).
 */
export function expandShortcutInContentEditable(
  container: HTMLDivElement,
  shortcuts: MedicalShortcut[]
): { expanded: boolean; trigger?: string; label?: string } {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return { expanded: false };
  }

  const range = selection.getRangeAt(0);
  const node = range.startContainer;
  const offset = range.startOffset;

  const sortedShortcuts = [...shortcuts]
    .filter((s) => Boolean(s.trigger))
    .sort((a, b) => b.trigger.length - a.trigger.length);

  if (node.nodeType === Node.TEXT_NODE && node.textContent !== null) {
    const textBeforeCaret = node.textContent.slice(0, offset);
    const trimmedRight = textBeforeCaret.replace(/[\s\u00A0]+$/, '');
    const lowerTrimmed = trimmedRight.toLowerCase();

    for (const sc of sortedShortcuts) {
      const trigLower = sc.trigger.toLowerCase();
      if (lowerTrimmed.endsWith(trigLower)) {
        const triggerStartIdx = trimmedRight.length - sc.trigger.length;
        const charBefore = triggerStartIdx > 0 ? trimmedRight[triggerStartIdx - 1] : ' ';
        if (
          triggerStartIdx === 0 ||
          /\s|[.،؛:()[\]«»\u00A0]/.test(charBefore) ||
          sc.trigger.startsWith('.') ||
          sc.trigger.startsWith('!')
        ) {
          const beforeTrigger = node.textContent.slice(0, triggerStartIdx);
          const afterCaret = node.textContent.slice(offset);
          const expansionWithSpace = `${sc.expansion} `;

          node.textContent = beforeTrigger + expansionWithSpace + afterCaret;

          const newCursorOffset = beforeTrigger.length + expansionWithSpace.length;
          const newRange = document.createRange();
          newRange.setStart(node, Math.min(newCursorOffset, node.textContent.length));
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);

          return { expanded: true, trigger: sc.trigger, label: sc.label };
        }
      }
    }
  }

  return { expanded: false };
}

/**
 * Auto-Text Expander & Medical Autocorrect for <textarea> and <input> elements
 */
export function expandShortcutInInput(
  el: HTMLTextAreaElement | HTMLInputElement,
  shortcuts: MedicalShortcut[]
): { expanded: boolean; newValue: string; newCursorPos: number; trigger?: string; label?: string } {
  const value = el.value;
  const cursorPos = el.selectionStart ?? value.length;
  const textBeforeCursor = value.slice(0, cursorPos);
  const trimmedRight = textBeforeCursor.replace(/\s+$/, '');
  const lowerTrimmed = trimmedRight.toLowerCase();

  const sortedShortcuts = [...shortcuts]
    .filter((s) => Boolean(s.trigger))
    .sort((a, b) => b.trigger.length - a.trigger.length);

  for (const sc of sortedShortcuts) {
    const trigLower = sc.trigger.toLowerCase();
    if (lowerTrimmed.endsWith(trigLower)) {
      const triggerStartIdx = trimmedRight.length - sc.trigger.length;
      const charBefore = triggerStartIdx > 0 ? trimmedRight[triggerStartIdx - 1] : ' ';
      if (
        triggerStartIdx === 0 ||
        /\s|[.،؛:()[\]«»]/.test(charBefore) ||
        sc.trigger.startsWith('.') ||
        sc.trigger.startsWith('!')
      ) {
        const beforeTrigger = value.slice(0, triggerStartIdx);
        const afterCursor = value.slice(cursorPos);
        const expansionWithSpace = `${sc.expansion} `;
        const newValue = beforeTrigger + expansionWithSpace + afterCursor;
        const newCursorPos = beforeTrigger.length + expansionWithSpace.length;

        return {
          expanded: true,
          newValue,
          newCursorPos,
          trigger: sc.trigger,
          label: sc.label,
        };
      }
    }
  }

  return { expanded: false, newValue: value, newCursorPos: cursorPos };
}

/**
 * Dictionary of common Persian male and female first names for instant offline gender auto-detection
 */
const PERSIAN_MALE_NAMES = new Set([
  'محمد', 'علی', 'حسین', 'حسن', 'رضا', 'مهدی', 'سعید', 'حمید', 'امیر', 'احمد',
  'محمود', 'اکبر', 'اصغر', 'جعفر', 'صادق', 'باقر', 'کاظم', 'جواد', 'موسی', 'ابراهیم',
  'اسماعیل', 'یوسف', 'یعقوب', 'سلیمان', 'داوود', 'داود', 'مجید', 'وحید', 'فرید', 'رشید',
  'مسعود', 'منصور', 'ناصر', 'یاسر', 'صابر', 'طاهر', 'ظاهر', 'قادر', 'نادر', 'بهمن',
  'بهرام', 'بهروز', 'بهزاد', 'بهداد', 'بهنام', 'فرهاد', 'فرزاد', 'فرشاد', 'فرشید', 'فرزام',
  'شهرام', 'شهروز', 'شهریار', 'شهاب', 'شاهین', 'شاپور', 'شروین', 'شایان', 'پویا', 'پیمان',
  'پدرام', 'پارسا', 'پرهام', 'پژمان', 'پوریا', 'پیام', 'کیوان', 'کیان', 'کیارش', 'کامران',
  'کامیار', 'کامبیز', 'کاوه', 'کوروش', 'کورش', 'داریوش', 'خشایار', 'اردشیر', 'اشکان', 'افشین',
  'بابک', 'بیژن', 'برزو', 'جمشید', 'جهانگیر', 'خسرو', 'رامین', 'رحیم', 'رحمان', 'رسول',
  'سروش', 'سامان', 'ساسان', 'سیامک', 'سیاوش', 'سینا', 'سهراب', 'سهیل', 'سجاد', 'سپهر',
  'عرفان', 'احسان', 'ایمان', 'آرش', 'آرمین', 'آرین', 'آرمان', 'آبتین', 'آرتین', 'امید',
  'ایرج', 'نادر', 'نیما', 'نوید', 'نریمان', 'مازیار', 'مهرداد', 'مهران', 'مهرزاد', 'مهیار',
  'مرتضی', 'مصطفی', 'مجتبی', 'مختار', 'محسن', 'میثم', 'میلاد', 'میکائیل', 'دانیال', 'عباس',
  'ابوالفضل', 'قاسم', 'هادی', 'هدایت', 'هومن', 'هوتن', 'طاها', 'یاسین', 'ایلیا', 'سبحان',
  'بنیامین', 'ماهان', 'رادین', 'رایان', 'رهام', 'امیرحسین', 'امیرعلی', 'امیررضا', 'امیرمهدی', 'امیرعباس',
  'محمدرضا', 'محمدحسین', 'محمدعلی', 'محمدمهدی', 'محمدجواد', 'محمدامین', 'محمدطاها', 'محمدصادق', 'محمدهادی', 'علیرضا',
  'غلامرضا', 'حمیدرضا', 'احمدرضا', 'سعیدرضا', 'سیدعلی', 'سیدمحمد', 'سیدحسین', 'سیدرضا', 'سیدمهدی', 'حجت',
  'عنایت', 'قدرت', 'نعمت', 'حشمت', 'رحمت', 'نصرت', 'عزت', 'فرهاد', 'بهروز', 'منوچهر',
  'فریدون', 'هوشنگ', 'پرویز', 'ناصر', 'تورج', 'خلیل', 'جلیل', 'سلیم', 'کریم', 'حکیم',
]);

const PERSIAN_FEMALE_NAMES = new Set([
  'فاطمه', 'زهرا', 'مریم', 'سارا', 'زینب', 'معصومه', 'طاهره', 'مرضیه', 'راضیه', 'صدیقه',
  'خدیجه', 'سکینه', 'رقیه', 'سمیه', 'آمنه', 'حلیمه', 'فهیمه', 'نعیمه', 'رحیمه', 'کریمه',
  'لیلا', 'لیلی', 'مينا', 'مینا', 'میترا', 'مهتاب', 'مهسا', 'مهشید', 'مهناز', 'مهری',
  'مهرانه', 'مهرنوش', 'مهرو', 'نرگس', 'نسرین', 'نسترن', 'نگار', 'نگین', 'نیلوفر', 'ناهید',
  'نازنین', 'نازیلا', 'ندا', 'نجمه', 'نرجس', 'نوشین', 'نورا', 'رویا', 'رؤیا', 'ریحانه',
  'رزیتا', 'راحله', 'ربابه', 'رعنا', 'رکسانا', 'رمونا', 'روناک', 'زهره', 'زیبا', 'زرین',
  'سمانه', 'سمیرا', 'سحر', 'سحرناز', 'سعیده', 'سپیده', 'ستاره', 'سولماز', 'سوسن', 'سودابه',
  'سوگند', 'سیما', 'سیمین', 'ساناز', 'سایه', 'سارینا', 'ساغر', 'ساحل', 'شادی', 'شبنمی',
  'شبنم', 'شقایق', 'شهرزاد', 'شهلا', 'شهناز', 'شیرین', 'شیوا', 'شیما', 'شیدا', 'شراره',
  'فرزانه', 'فرشته', 'فریده', 'فریبا', 'فروغ', 'فرانک', 'فائزه', 'فاطمه‌زهرا', 'پروانه', 'پروین',
  'پریسا', 'پریناز', 'پری', 'پریا', 'پگاه', 'پانته‌آ', 'پوران', 'ترانه', 'تینا', 'تارا',
  'ثريا', 'ثریا', 'ثمین', 'حدیث', 'حدیثه', 'حنانه', 'حمیرا', 'خاطره', 'دریا', 'دینا',
  'دنیا', 'دلارام', 'الهام', 'الهه', 'فرناز', 'گلناز', 'گلنوش', 'گلرخ', 'گلاب', 'غزاله',
  'غزل', 'عاطفه', 'عارفه', 'اعظم', 'اکرم', 'افسانه', 'افسون', 'آزاده', 'آذر', 'آرزو',
  'آتوسا', 'آتنا', 'آیدا', 'آیلین', 'آیناز', 'آناهیتا', 'آرام', 'آوا', 'باران', 'بهار',
  'بهاره', 'بهناز', 'بنفشه', 'بیتا', 'کتایون', 'کیانا', 'کیمیا', 'لادن', 'لاله', 'مارال',
  'ماندانا', 'مائده', 'مبینا', 'محدثه', 'مژگان', 'مژده', 'منصوره', 'منیژه', 'ملیکا', 'مونا',
  'هانیه', 'هدیه', 'هستی', 'هلیا', 'هما', 'هنگامه', 'یاسمن', 'یاسمین', 'یلدا', 'یکتا',
]);

/**
 * Automatically detects patient gender ('male' | 'female' | null) from Persian full name
 */
export function detectGenderFromPersianName(fullName: string): 'male' | 'female' | null {
  if (!fullName || !fullName.trim()) return null;

  const clean = fullName
    .trim()
    .replace(/\u200C/g, ' ')
    .replace(/\s+/g, ' ');

  // 1. Check explicit honorifics/titles first
  if (/^(خانم|دوشیزه|بانو|سیده|حاجیه)\s/.test(clean)) {
    return 'female';
  }
  if (/^(آقای|آقا|سید|حاج\s*آقا|کربلایی|مهندس)\s/.test(clean)) {
    return 'male';
  }

  const tokens = clean.split(' ');
  const firstToken = tokens[0];
  const firstTwo = tokens.length >= 2 ? `${tokens[0]}${tokens[1]}` : '';

  if (PERSIAN_FEMALE_NAMES.has(firstTwo) || PERSIAN_FEMALE_NAMES.has(firstToken)) {
    return 'female';
  }
  if (PERSIAN_MALE_NAMES.has(firstTwo) || PERSIAN_MALE_NAMES.has(firstToken)) {
    return 'male';
  }

  // Check if first token starts with سید / سیده
  if (firstToken === 'سیده' && tokens[1]) return 'female';
  if (firstToken === 'سید' && tokens[1]) return 'male';

  // Common compound patterns
  if (/^(محمد|امیر|علی|حسین|حسن|غلام|عبد)/.test(firstToken)) {
    return 'male';
  }
  if (/^(فاطمه|زهرا|نازنین|گل)/.test(firstToken)) {
    return 'female';
  }

  return null;
}

export interface GenderAnatomyMismatch {
  hasMismatch: boolean;
  mismatchedTerms: string[];
  genderLabel: string;
  warningText: string;
}

const FEMALE_ANATOMY_TERMS = [
  'رحم',
  'تخمدان',
  'تخمدان‌ها',
  'آدنکس',
  'اندومتر',
  'آندومتر',
  'میومتر',
  'سرویکس',
  'حاملگی',
  'بارداری',
  'ساک حاملگی',
  'فولیکول',
  'واژن',
];

const MALE_ANATOMY_TERMS = [
  'پروستات',
  'بیضه',
  'بیضه‌ها',
  'اسکروتوم',
  'وزیکول سمینال',
  'اپیدیدیم',
  'واریکوسل',
  'هیدروسل',
  'طناب اسپرماتیک',
];

/**
 * Scans all studies for anatomy terms that contradict the patient's selected gender
 */
export function detectGenderAnatomyMismatch(
  gender: 'male' | 'female' | 'other',
  studiesHtmlList: string[]
): GenderAnatomyMismatch {
  if (gender === 'other') {
    return { hasMismatch: false, mismatchedTerms: [], genderLabel: '', warningText: '' };
  }

  const combinedPlain = studiesHtmlList
    .join(' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u200C/g, ' ');

  const targetTerms = gender === 'male' ? FEMALE_ANATOMY_TERMS : MALE_ANATOMY_TERMS;
  const found: string[] = [];

  for (const term of targetTerms) {
    const normalizedTerm = term.replace(/\u200C/g, ' ');
    const regex = new RegExp(`(^|[\\s.،؛:()«»\\[\\]])${normalizedTerm}($|[\\s.،؛:()«»\\[\\]])`, 'i');
    if (regex.test(combinedPlain)) {
      found.push(term);
    }
  }

  if (found.length === 0) {
    return { hasMismatch: false, mismatchedTerms: [], genderLabel: '', warningText: '' };
  }

  const genderLabel = gender === 'male' ? 'آقا (مرد)' : 'خانم (زن)';
  const oppositeLabel = gender === 'male' ? 'زنان (رحم/تخمدان)' : 'آقایان (پروستات/بیضه)';

  return {
    hasMismatch: true,
    mismatchedTerms: found,
    genderLabel,
    warningText: `هشدار عدم تطابق جنسیت: جنسیت بیمار «${genderLabel}» است اما در متن گزارش عبارات مربوط به ${oppositeLabel} دیده می‌شود: (${found.join('، ')})`,
  };
}

/**
 * Automatically removes or replaces sentences/paragraphs that belong to the opposite sex
 */
export function sanitizeHtmlForPatientGender(
  html: string,
  gender: 'male' | 'female' | 'other'
): string {
  if (!html || gender === 'other') return html;

  const forbiddenTerms = gender === 'male' ? FEMALE_ANATOMY_TERMS : MALE_ANATOMY_TERMS;

  // Split by <p>...</p> or <li>...</li> blocks and clean or replace opposite-sex sentences
  return html.replace(/<(p|li)\b[^>]*>[\s\S]*?<\/\1>/gi, (block) => {
    const plain = block.replace(/<[^>]+>/g, ' ').replace(/\u200C/g, ' ');
    const hasForbidden = forbiddenTerms.some((t) => {
      const norm = t.replace(/\u200C/g, ' ');
      const rgx = new RegExp(`(^|[\\s.،؛:()«»\\[\\]])${norm}($|[\\s.،؛:()«»\\[\\]])`, 'i');
      return rgx.test(plain);
    });

    if (!hasForbidden) return block;

    // If the paragraph also mentions مثانه (Bladder), keep the bladder part and replace the pelvic organ part!
    if (plain.includes('مثانه')) {
      if (gender === 'male') {
        return `<p><strong>مثانه و لگن:</strong> مثانه با حجم مناسب و جدار صاف رویت شد. پروستات دارای ابعاد و اکوی طبیعی است. مایع آزاد در پریتون مشهود نیست.</p>`;
      } else {
        return `<p><strong>مثانه و لگن:</strong> مثانه با حجم مناسب و جدار صاف رویت شد. رحم و تخمدان‌ها دارای ابعاد و اکوپترن طبیعی می‌باشند و مایع آزاد در کل‌دوساک خلفی مشهود نیست.</p>`;
      }
    }

    // Otherwise remove the opposite-sex paragraph completely
    return '';
  });
}

export interface LateralityMismatchItem {
  studyId: string;
  studyIndex: number;
  expectedSide: 'right' | 'left';
  expectedSideLabel: string;
  oppositeSideLabel: string;
  contradictingMatches: string[];
  warningText: string;
}

const PAIRED_ORGANS_LIST = [
  'زانو',
  'زانوی',
  'شانه',
  'مچ دست',
  'مچ پا',
  'پا',
  'دست',
  'لگن',
  'ران',
  'ساق',
  'بازو',
  'آرنج',
  'پستان',
  'برست',
  'کلیه',
  'تخمدان',
  'بیضه',
  'ریه',
  'همی‌توراکس',
  'چشم',
  'گوش',
  'کاروتید',
  'اندام فوقانی',
  'اندام تحتانی',
  'کف پا',
  'فمور',
  'تیبیا',
  'هیپ',
  'آگزیلاری',
  'اینگوئینال',
];

/**
 * Proposal #2: Clinical Safety Check for Right vs Left (Laterality) Mismatch
 * Detects when a study's Title specifies a unilateral side ("راست" or "چپ") without being bilateral ("دو طرفه" / "هر دو"),
 * while the Findings or Impression text mentions the opposite side ("چپ" or "راست").
 */
export function detectLateralityMismatches(
  studies: Array<{
    id: string;
    titleAndTechnique: string;
    findingsHtml: string;
    showImpression?: boolean;
    impressionHtml?: string;
  }>
): LateralityMismatchItem[] {
  const results: LateralityMismatchItem[] = [];

  studies.forEach((study, idx) => {
    const title = (study.titleAndTechnique || '').replace(/\u200C/g, ' ');
    // If title is bilateral or general abdomen/pelvis mentioning both, skip unilateral enforcement
    if (/(دو\s*طرفه|هر\s*دو|دوطرفه|bilateral|both)/i.test(title)) {
      return;
    }

    const hasRightInTitle = /(^|[\s(«،])(راست|right|rt)($|[\s)».:،])/i.test(title);
    const hasLeftInTitle = /(^|[\s(«،])(چپ|left|lt)($|[\s)».:،])/i.test(title);

    // Only enforce if the title explicitly specifies ONLY Right OR ONLY Left
    if ((hasRightInTitle && hasLeftInTitle) || (!hasRightInTitle && !hasLeftInTitle)) {
      return;
    }

    const expectedSide: 'right' | 'left' = hasRightInTitle ? 'right' : 'left';
    const expectedSideLabel = expectedSide === 'right' ? 'راست' : 'چپ';
    const oppositeSideLabel = expectedSide === 'right' ? 'چپ' : 'راست';

    const bodyPlain = `${study.findingsHtml || ''} ${study.showImpression ? study.impressionHtml || '' : ''}`
      .replace(/<[^>]+>/g, ' ')
      .replace(/\u200C/g, ' ')
      .replace(/\s+/g, ' ');

    // If the body explicitly says "هر دو ..." or "در طرف مقابل (چپ/راست) نرمال است", we check specific organ phrases or direct opposite mentions
    const matches: string[] = [];

    for (const organ of PAIRED_ORGANS_LIST) {
      const oppositeOrganRegex = new RegExp(`${organ}\\s+${oppositeSideLabel}`, 'g');
      if (oppositeOrganRegex.test(bodyPlain)) {
        matches.push(`${organ} ${oppositeSideLabel}`);
      }
    }

    // Also check general "سمت چپ / سمت راست" or "طرف چپ / طرف راست"
    const sidePhraseRegex = new RegExp(`(سمت|طرف|اندام|مفصل)\\s+${oppositeSideLabel}`, 'g');
    let m: RegExpExecArray | null;
    while ((m = sidePhraseRegex.exec(bodyPlain)) !== null) {
      if (!matches.includes(m[0])) {
        matches.push(m[0]);
      }
    }

    if (matches.length > 0) {
      results.push({
        studyId: study.id,
        studyIndex: idx,
        expectedSide,
        expectedSideLabel,
        oppositeSideLabel,
        contradictingMatches: matches,
        warningText: `هشدار ایمنی عدم تقارن جهت (Laterality): عنوان بررسی «سمت ${expectedSideLabel}» است، اما در متن یافته‌ها عبارت «${matches.join('، ')}» (سمت ${oppositeSideLabel}) درج شده است!`,
      });
    }
  });

  return results;
}

/**
 * 1-Click Auto-Fix for Laterality Mismatch in a study's HTML
 */
export function fixStudyLateralityMismatch(
  html: string,
  expectedSide: 'right' | 'left'
): string {
  if (!html) return html;
  const targetWord = expectedSide === 'right' ? 'راست' : 'چپ';
  const wrongWord = expectedSide === 'right' ? 'چپ' : 'راست';

  const parts = html.split(/(<[^>]+>)/g);
  return parts
    .map((part) => {
      if (part.startsWith('<') && part.endsWith('>')) return part;
      let fixed = part;
      for (const organ of PAIRED_ORGANS_LIST) {
        const rgx = new RegExp(`(${organ}\\s+)${wrongWord}`, 'g');
        fixed = fixed.replace(rgx, `$1${targetWord}`);
      }
      const sideRgx = new RegExp(`((?:سمت|طرف|اندام|مفصل)\\s+)${wrongWord}`, 'g');
      fixed = fixed.replace(sideRgx, `$1${targetWord}`);
      return fixed;
    })
    .join('');
}

/**
 * Default Official Clinic Vector Emblem Data URI (exact 5 paths from uploaded Layer-1_64c7d528.svg)
 * Dynamically colorable per modality in Print Preview, PDF/HTML printouts, PNG exports, and Settings presets.
 */
export function getOfficialClinicLogoDataUri(colorHex = '#0284c7'): string {
  const safeColor = colorHex || '#0284c7';
  const svgMarkup = `<svg version="1.0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1964.000000 2265.000000" width="800" height="922" preserveAspectRatio="xMidYMid meet">
    <g transform="translate(0.000000,2265.000000) scale(0.100000,-0.100000)" fill="${safeColor}" stroke="none">
      <path d="M9710 22603 c-89 -7 -227 -47 -325 -94 -325 -155 -526 -475 -528 -839 -1 -556 477 -988 1032 -931 231 24 417 116 581 288 363 379 341 979 -50 1335 -185 169 -458 262 -710 241z"/>
      <path d="M9262 20408 c-9 -9 -12 -665 -12 -2890 l0 -2878 -22 -14 c-22 -13 -109 -29 -233 -41 -142 -14 -556 -99 -725 -150 -411 -122 -677 -224 -1004 -387 -663 -329 -1271 -796 -1767 -1358 -223 -252 -539 -684 -539 -735 0 -19 34 -48 183 -155 657 -472 1446 -1003 1932 -1300 31 -19 71 -44 88 -55 18 -12 111 -67 207 -124 96 -57 195 -116 220 -131 55 -34 235 -137 310 -178 30 -16 82 -44 115 -62 33 -18 74 -41 90 -50 104 -62 730 -369 800 -393 17 -5 35 -13 40 -17 13 -10 268 -113 375 -151 49 -18 94 -32 295 -96 189 -59 419 -96 595 -96 516 0 1229 277 2100 816 583 361 1303 892 1970 1451 344 289 450 384 450 405 0 18 -180 297 -286 442 -520 714 -1197 1305 -1969 1715 -367 195 -682 322 -1145 459 -169 51 -583 136 -725 150 -124 12 -211 28 -232 41 l-23 14 0 2878 c0 2225 -3 2881 -12 2890 -17 17 -1059 17 -1076 0z m917 -7058 c526 -60 1008 -404 1255 -896 194 -386 220 -861 71 -1277 -201 -559 -734 -988 -1315 -1057 -109 -13 -333 -13 -437 0 -289 36 -592 172 -828 370 -219 184 -420 480 -499 735 -64 207 -71 252 -71 510 0 255 8 310 66 495 23 70 23 71 68 172 145 329 430 625 761 792 130 66 371 140 509 156 97 11 323 11 420 0z"/>
      <path d="M8519 19565 c-3 -2 -48 -9 -100 -15 -51 -5 -132 -17 -179 -25 -257 -46 -371 -68 -425 -80 -33 -8 -87 -19 -119 -26 -88 -17 -447 -108 -591 -150 -328 -96 -525 -164 -875 -299 -607 -236 -1247 -569 -1810 -944 -1565 -1040 -2792 -2489 -3549 -4189 -102 -231 -199 -467 -251 -617 -7 -19 -32 -91 -57 -160 -25 -69 -53 -153 -64 -187 -10 -35 -28 -93 -40 -130 -58 -186 -68 -224 -139 -498 -45 -177 -75 -312 -120 -545 -47 -242 -58 -309 -70 -400 -6 -47 -17 -130 -25 -185 -33 -224 -74 -728 -75 -902 0 -58 -3 -73 -15 -73 -13 0 -15 -40 -15 -299 0 -235 3 -300 13 -304 9 -3 16 -68 25 -248 23 -437 73 -845 158 -1304 14 -71 31 -155 39 -185 7 -30 16 -75 20 -100 4 -25 13 -67 21 -95 8 -27 30 -113 49 -190 20 -77 42 -167 51 -200 55 -217 228 -738 321 -964 19 -47 43 -106 53 -131 25 -65 49 -121 65 -155 8 -16 29 -64 46 -105 85 -202 251 -534 385 -774 24 -43 44 -80 44 -82 0 -6 179 -304 258 -428 896 -1419 2214 -2637 3692 -3415 206 -108 498 -250 640 -310 41 -18 82 -36 90 -40 9 -5 92 -39 185 -76 153 -60 199 -78 340 -132 68 -26 396 -134 482 -159 96 -28 228 -66 328 -93 161 -45 557 -134 669 -151 38 -6 72 -13 75 -15 7 -4 329 -55 501 -80 97 -14 288 -33 555 -56 324 -27 1119 -27 1445 1 252 21 441 40 550 56 168 23 494 75 501 79 3 2 37 9 75 15 174 26 643 140 945 228 142 42 483 155 579 192 30 12 78 30 105 40 73 27 325 128 360 145 17 8 64 29 105 46 150 63 498 233 695 339 732 393 1453 912 2045 1471 677 639 1191 1267 1668 2039 258 417 534 954 688 1340 19 47 39 94 44 105 19 41 97 242 110 283 5 15 21 59 35 97 32 87 114 335 145 435 12 41 31 102 41 135 69 229 201 793 229 980 6 39 17 106 25 150 52 287 115 865 115 1057 0 14 7 33 15 42 22 21 23 1000 1 1021 -9 9 -16 53 -20 132 -10 180 -25 360 -36 438 -5 39 -17 126 -25 195 -23 186 -72 492 -101 630 -48 232 -66 310 -79 360 -8 30 -28 111 -45 180 -93 376 -225 786 -382 1180 -17 41 -38 95 -48 120 -18 47 -76 181 -115 265 -13 28 -42 93 -66 145 -44 98 -228 465 -269 535 -13 22 -39 69 -58 105 -52 96 -233 397 -326 540 -635 981 -1426 1825 -2381 2542 -160 120 -491 348 -630 434 -27 17 -77 48 -110 68 -96 59 -270 162 -338 199 -34 19 -88 48 -119 65 -368 201 -932 454 -1325 593 -29 11 -77 28 -105 38 -87 32 -425 137 -548 171 -63 17 -126 35 -140 40 -69 25 -532 129 -730 165 -80 14 -179 32 -221 40 -128 24 -233 30 -245 14 -11 -14 -23 -672 -45 -2619 -5 -498 -12 -913 -15 -923 -12 -38 17 -49 226 -91 134 -27 308 -67 410 -96 99 -28 278 -80 345 -100 33 -10 119 -39 190 -65 72 -26 148 -53 170 -60 50 -16 310 -122 370 -150 17 -8 57 -26 90 -40 99 -44 385 -185 465 -230 41 -23 111 -62 155 -85 44 -24 91 -51 105 -60 14 -9 104 -66 200 -126 298 -185 614 -417 898 -662 145 -124 483 -441 529 -497 15 -18 77 -86 136 -150 393 -426 769 -952 1049 -1470 115 -212 285 -566 349 -727 11 -29 30 -75 41 -103 67 -169 136 -366 183 -520 15 -49 31 -103 37 -120 24 -72 129 -491 148 -590 6 -33 17 -89 25 -125 35 -162 90 -571 105 -780 26 -359 30 -437 29 -630 0 -196 -3 -264 -29 -620 -27 -363 -94 -774 -195 -1195 -51 -212 -185 -645 -250 -805 -7 -19 -34 -87 -59 -150 -84 -215 -164 -393 -285 -630 -79 -156 -216 -403 -265 -480 -13 -19 -54 -84 -92 -145 -72 -116 -95 -150 -208 -310 -715 -1017 -1715 -1870 -2836 -2422 -149 -73 -320 -153 -328 -153 -4 0 -20 -7 -36 -15 -41 -22 -226 -95 -386 -153 -338 -123 -708 -230 -1030 -297 -147 -30 -346 -66 -445 -80 -55 -7 -134 -18 -175 -24 -572 -79 -1362 -79 -1930 0 -41 6 -120 17 -175 24 -150 21 -419 72 -605 116 -355 83 -819 231 -1125 359 -55 23 -125 52 -155 65 -264 109 -707 342 -1005 529 -78 49 -387 256 -417 280 -14 11 -66 50 -115 86 -464 341 -988 849 -1364 1321 -63 79 -141 180 -173 224 -33 44 -71 96 -86 115 -44 59 -248 371 -337 515 -106 172 -290 523 -377 720 -15 33 -33 74 -41 90 -29 63 -88 202 -107 250 -152 391 -251 709 -342 1095 -42 177 -87 418 -111 595 -9 61 -20 137 -25 170 -5 33 -19 175 -31 315 -32 383 -30 880 5 1278 14 162 28 297 31 301 2 4 9 50 15 102 37 314 158 842 271 1189 9 30 22 71 27 90 18 62 98 281 155 425 445 1122 1175 2143 2102 2941 529 455 1183 872 1808 1153 26 11 66 30 90 40 53 25 109 48 167 71 25 10 74 30 110 45 36 14 83 33 105 40 22 7 99 34 170 60 72 26 157 55 190 65 33 10 101 30 150 45 100 30 135 39 315 84 289 72 537 121 763 150 31 4 61 12 66 17 6 5 4 104 -4 244 -8 129 -19 341 -25 470 -5 129 -17 354 -25 500 -9 146 -22 409 -30 585 -17 359 -28 590 -50 1000 -8 154 -20 383 -26 510 -6 128 -15 235 -21 242 -10 13 -50 18 -59 8z m-745 -1084 c123 -61 204 -170 227 -307 11 -60 10 -80 -5 -139 -31 -123 -107 -219 -220 -278 -58 -30 -67 -32 -171 -32 -104 0 -113 2 -170 32 -105 54 -180 143 -216 255 -24 76 -24 136 1 215 32 104 97 187 186 239 73 43 121 54 215 51 74 -3 96 -8 153 -36z m4394 19 c167 -59 276 -209 276 -380 0 -155 -83 -286 -229 -363 -56 -29 -67 -31 -165 -32 -98 0 -110 2 -172 32 -79 37 -141 96 -188 178 -35 60 -35 61 -35 185 0 120 1 127 30 175 66 112 133 170 239 207 70 24 172 23 244 -2z"/>
      <path d="M4376 10768 c-13 -21 -75 -214 -124 -383 -37 -128 -83 -332 -126 -560 -66 -347 -97 -865 -78 -1293 7 -152 17 -306 22 -342 5 -36 17 -121 25 -190 26 -211 93 -540 152 -750 27 -95 104 -343 118 -380 7 -19 25 -69 40 -110 113 -311 346 -792 500 -1030 185 -287 216 -331 365 -525 222 -290 486 -567 815 -857 153 -135 446 -351 665 -489 239 -151 596 -343 628 -337 18 3 27 46 57 258 8 63 22 153 30 200 8 47 26 164 40 260 14 96 32 218 40 270 8 52 17 122 20 155 4 33 13 98 20 145 8 47 26 171 40 275 14 105 32 235 40 290 8 55 19 143 25 195 5 52 16 142 25 200 21 154 60 484 89 775 9 83 23 215 31 295 53 500 51 660 -11 896 -153 575 -655 1191 -1524 1870 -212 166 -500 367 -840 586 -183 118 -593 359 -795 468 -44 24 -115 63 -159 87 -89 49 -110 52 -130 21z"/>
      <path d="M14933 10592 c-139 -103 -328 -243 -420 -312 -92 -68 -301 -223 -463 -344 -162 -121 -344 -256 -405 -301 -123 -91 -406 -301 -697 -518 -106 -79 -256 -190 -333 -248 -77 -57 -167 -122 -200 -144 -174 -118 -333 -322 -460 -589 -20 -44 -43 -98 -50 -120 -8 -23 -23 -68 -35 -101 -155 -443 -206 -1072 -140 -1750 20 -211 28 -273 75 -575 47 -302 138 -728 230 -1075 14 -55 30 -117 36 -138 5 -21 23 -84 40 -140 17 -56 37 -127 45 -157 8 -30 21 -73 29 -95 7 -22 39 -120 70 -217 31 -97 63 -182 70 -188 16 -13 42 0 265 124 660 367 1279 901 1740 1501 149 194 180 238 365 525 155 240 386 716 500 1030 15 41 33 91 40 110 106 284 229 799 270 1130 8 69 20 154 25 190 5 36 15 190 22 342 19 428 -12 946 -78 1293 -65 344 -122 568 -212 840 -30 88 -41 110 -57 112 -13 2 -113 -67 -272 -185z"/>
    </g>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgMarkup)}`;
}

export const DEFAULT_CLINIC_LOGO_DATA_URI = getOfficialClinicLogoDataUri('#0284c7');

export function isOfficialClinicLogoUri(url?: string): boolean {
  if (!url) return true;
  if (url === DEFAULT_CLINIC_LOGO_DATA_URI) return true;
  if (url.includes('9710%2022603') || url.includes('9710 22603')) return true;
  if (url.includes('9761%2022634') || url.includes('9761 22634')) return true;
  return false;
}

export interface A4StudySlice {
  sliceKey: string;
  study: ReportStudy;
  studyIndex: number;
  isContinuation: boolean;
  findingsHtmlSlice: string;
  showComparisonSlice: boolean;
  showImpressionSlice: boolean;
  showRecommendationsSlice: boolean;
}

export interface A4PaginatedSheet {
  pageNumber: number;
  usedMm: number;
  maxMm: number;
  fillPercent: number;
  remainingLines: number;
  slices: A4StudySlice[];
}

export interface A4PaginationResult {
  pages: A4PaginatedSheet[];
  totalPages: number;
  fillPercent: number;
  visualBarPercent: number;
  remainingLinesPage1: number;
  overflowLinesPage2: number;
  totalVisualLines: number;
  status: 'optimal' | 'near-full' | 'overflow';
  estimatedPages: number;
}

/**
 * Splits HTML content into logical top-level visual blocks (paragraphs, tables, list items)
 * so long reports can be cleanly split across discrete A4 pages without cutting tags in half.
 */
function splitHtmlIntoBlocks(html: string): string[] {
  if (!html || !html.trim()) return ['<p></p>'];
  const cleaned = html.trim();
  const blocks: string[] = [];
  const blockRegex =
    /(<table[\s\S]*?<\/table>|<ul[\s\S]*?<\/ul>|<ol[\s\S]*?<\/ol>|<p[\s\S]*?<\/p>|<div[\s\S]*?<\/div>|<h[1-6][\s\S]*?<\/h[1-6]>|<blockquote[\s\S]*?<\/blockquote>)/gi;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = blockRegex.exec(cleaned)) !== null) {
    if (match.index > lastIndex) {
      const between = cleaned.slice(lastIndex, match.index).trim();
      if (between) {
        between
          .split(/<br\s*\/?>/i)
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((seg) => blocks.push(`<p>${seg}</p>`));
      }
    }
    blocks.push(match[0]);
    lastIndex = blockRegex.lastIndex;
  }

  if (lastIndex < cleaned.length) {
    const tail = cleaned.slice(lastIndex).trim();
    if (tail) {
      tail
        .split(/<br\s*\/?>/i)
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((seg) => blocks.push(`<p>${seg}</p>`));
    }
  }

  return blocks.length > 0 ? blocks : [cleaned];
}

/**
 * Shared, deterministic A4 Pagination & Line-Count Engine used by BOTH the Editor A4 Meter
 * AND the PrintPreviewModal multi-page A4 sheet renderer & PNG exporter.
 */
export function paginateStudiesIntoA4Pages(
  studies: ReportStudy[],
  options?: {
    defaultFontSize?: number;
    printLineHeight?: number;
    forcePageBreakPerStudy?: boolean;
    preprintedLetterheadMode?: boolean;
    preprintedTopMarginMm?: number;
  }
): A4PaginationResult {
  const fontSize = options?.defaultFontSize || 14;
  const printLh = options?.printLineHeight || 1.75;
  const fontScale = fontSize / 14;
  const lineHeightScale = printLh / 1.75;
  const charsPerLine = Math.max(62, Math.round(92 / fontScale));
  const lineHeightMm = 5.3 * fontScale * lineHeightScale;


  // Printable body height on an A4 sheet (297mm total - Letterhead & Patient Box - Pinned Footer Stamp - Padding)
  const maxPageBodyMm = options?.preprintedLetterheadMode
    ? Math.max(140, 297 - (options.preprintedTopMarginMm ?? 45) - 32)
    : 186;

  const estimateBlockMm = (blockHtml: string): { mm: number; lines: number } => {
    if (!blockHtml) return { mm: 0, lines: 0 };
    const trMatches = blockHtml.match(/<tr[\s>]/gi);
    if (trMatches && trMatches.length > 0) {
      return {
        mm: trMatches.length * 7.5 + 4,
        lines: trMatches.length,
      };
    }
    const plain = blockHtml
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .trim();
    if (!plain) return { mm: 0, lines: 0 };
    const subLines = plain.split('\n').filter((l) => l.trim().length > 0);
    let lines = 0;
    subLines.forEach((sl) => {
      lines += Math.max(1, Math.ceil(sl.trim().length / charsPerLine));
    });
    return {
      mm: lines * lineHeightMm + 1.8,
      lines,
    };
  };

  const pages: A4PaginatedSheet[] = [];
  let currentSlices: A4StudySlice[] = [];
  let currentUsedMm = 0;
  let totalVisualLines = 0;

  const flushCurrentPage = () => {
    if (currentSlices.length === 0 && pages.length > 0) return;
    const fill = Math.min(100, Math.max(5, Math.round((currentUsedMm / maxPageBodyMm) * 100)));
    const remLines = Math.max(0, Math.floor((maxPageBodyMm - currentUsedMm) / lineHeightMm));
    pages.push({
      pageNumber: pages.length + 1,
      usedMm: currentUsedMm,
      maxMm: maxPageBodyMm,
      fillPercent: fill,
      remainingLines: remLines,
      slices: currentSlices,
    });
    currentSlices = [];
    currentUsedMm = 0;
  };

  studies.forEach((study, sIdx) => {
    if (options?.forcePageBreakPerStudy && sIdx > 0 && currentSlices.length > 0) {
      flushCurrentPage();
    }

    const titleLines = Math.max(1, Math.ceil((study.titleAndTechnique || '').trim().length / 78));
    const titleMm = 7 + titleLines * 5;
    totalVisualLines += titleLines;

    const compLines =
      study.showComparison && study.comparison?.trim()
        ? Math.max(1, Math.ceil(study.comparison.trim().length / charsPerLine))
        : 0;
    const compMm = compLines > 0 ? 5 + compLines * lineHeightMm : 0;
    totalVisualLines += compLines;

    const impEst =
      study.showImpression && study.impressionHtml
        ? estimateBlockMm(study.impressionHtml)
        : { mm: 0, lines: 0 };
    const impMm = impEst.mm > 0 ? impEst.mm + 8 : 0;
    totalVisualLines += impEst.lines;

    const recEst =
      study.showRecommendations && study.recommendationsHtml
        ? estimateBlockMm(study.recommendationsHtml)
        : { mm: 0, lines: 0 };
    const recMm = recEst.mm > 0 ? recEst.mm + 6 : 0;
    totalVisualLines += recEst.lines;

    const blocks = splitHtmlIntoBlocks(study.findingsHtml);
    const blockMetrics = blocks.map((b) => ({
      html: b,
      ...estimateBlockMm(b),
    }));
    const findingsTotalMm = blockMetrics.reduce((acc, b) => acc + b.mm, 0);
    blockMetrics.forEach((b) => {
      totalVisualLines += b.lines;
    });

    const interStudyGapMm = currentSlices.length > 0 ? 6 : 0;
    const fullStudyMm = interStudyGapMm + titleMm + compMm + findingsTotalMm + impMm + recMm;

    // 1. Does the entire study fit on the current page?
    if (currentUsedMm + fullStudyMm <= maxPageBodyMm) {
      currentSlices.push({
        sliceKey: `${study.id}-p${pages.length + 1}-full`,
        study,
        studyIndex: sIdx,
        isContinuation: false,
        findingsHtmlSlice: study.findingsHtml,
        showComparisonSlice: Boolean(study.showComparison && study.comparison),
        showImpressionSlice: Boolean(study.showImpression && study.impressionHtml),
        showRecommendationsSlice: Boolean(
          study.showRecommendations && study.recommendationsHtml
        ),
      });
      currentUsedMm += fullStudyMm;
      return;
    }

    // 2. If there is already content on the current page and either the new study fits whole on a fresh page
    //    or remaining space on the current page is small (< 38mm), start a fresh page for this study.
    if (
      currentSlices.length > 0 &&
      (fullStudyMm - interStudyGapMm <= maxPageBodyMm || maxPageBodyMm - currentUsedMm < 38)
    ) {
      flushCurrentPage();
      if (fullStudyMm - interStudyGapMm <= maxPageBodyMm) {
        currentSlices.push({
          sliceKey: `${study.id}-p${pages.length + 1}-full`,
          study,
          studyIndex: sIdx,
          isContinuation: false,
          findingsHtmlSlice: study.findingsHtml,
          showComparisonSlice: Boolean(study.showComparison && study.comparison),
          showImpressionSlice: Boolean(study.showImpression && study.impressionHtml),
          showRecommendationsSlice: Boolean(
            study.showRecommendations && study.recommendationsHtml
          ),
        });
        currentUsedMm += fullStudyMm - interStudyGapMm;
        return;
      }
    }

    // 3. The study itself overflows the remaining space on the page — split its HTML blocks across pages!
    let sliceBlocks: string[] = [];
    let isCont = false;
    let sliceUsedMm = (currentSlices.length > 0 ? 6 : 0) + titleMm + compMm;

    blockMetrics.forEach((bm) => {
      if (sliceBlocks.length > 0 && currentUsedMm + sliceUsedMm + bm.mm > maxPageBodyMm) {
        currentSlices.push({
          sliceKey: `${study.id}-p${pages.length + 1}-${isCont ? 'cont' : 'start'}`,
          study,
          studyIndex: sIdx,
          isContinuation: isCont,
          findingsHtmlSlice: sliceBlocks.join(''),
          showComparisonSlice: !isCont && Boolean(study.showComparison && study.comparison),
          showImpressionSlice: false,
          showRecommendationsSlice: false,
        });
        currentUsedMm += sliceUsedMm;
        flushCurrentPage();

        isCont = true;
        sliceBlocks = [bm.html];
        sliceUsedMm = titleMm + bm.mm;
      } else {
        sliceBlocks.push(bm.html);
        sliceUsedMm += bm.mm;
      }
    });

    // Check if Impression + Recommendations fit with the final slice of findings, otherwise push them to next page
    if (
      (impMm > 0 || recMm > 0) &&
      sliceBlocks.length > 0 &&
      currentUsedMm + sliceUsedMm + impMm + recMm > maxPageBodyMm
    ) {
      currentSlices.push({
        sliceKey: `${study.id}-p${pages.length + 1}-${isCont ? 'cont' : 'start'}`,
        study,
        studyIndex: sIdx,
        isContinuation: isCont,
        findingsHtmlSlice: sliceBlocks.join(''),
        showComparisonSlice: !isCont && Boolean(study.showComparison && study.comparison),
        showImpressionSlice: false,
        showRecommendationsSlice: false,
      });
      currentUsedMm += sliceUsedMm;
      flushCurrentPage();

      currentSlices.push({
        sliceKey: `${study.id}-p${pages.length + 1}-tail`,
        study,
        studyIndex: sIdx,
        isContinuation: true,
        findingsHtmlSlice: '',
        showComparisonSlice: false,
        showImpressionSlice: Boolean(study.showImpression && study.impressionHtml),
        showRecommendationsSlice: Boolean(
          study.showRecommendations && study.recommendationsHtml
        ),
      });
      currentUsedMm += titleMm + impMm + recMm;
    } else {
      currentSlices.push({
        sliceKey: `${study.id}-p${pages.length + 1}-end`,
        study,
        studyIndex: sIdx,
        isContinuation: isCont,
        findingsHtmlSlice: sliceBlocks.join(''),
        showComparisonSlice: !isCont && Boolean(study.showComparison && study.comparison),
        showImpressionSlice: Boolean(study.showImpression && study.impressionHtml),
        showRecommendationsSlice: Boolean(
          study.showRecommendations && study.recommendationsHtml
        ),
      });
      currentUsedMm += sliceUsedMm + impMm + recMm;
    }
  });

  if (currentSlices.length > 0 || pages.length === 0) {
    flushCurrentPage();
  }

  const totalPages = pages.length;
  const firstPage = pages[0];
  const lastPage = pages[pages.length - 1];

  const overallFillPercent =
    totalPages === 1
      ? firstPage.fillPercent
      : 100 + Math.max(2, Math.round(((totalPages - 1) * maxPageBodyMm + lastPage.usedMm - maxPageBodyMm) / maxPageBodyMm * 100));

  const overflowMmBeyondPage1 =
    totalPages > 1
      ? pages.slice(1).reduce((acc, p) => acc + p.usedMm, 0)
      : 0;
  const overflowLinesPage2 =
    totalPages > 1 ? Math.max(1, Math.ceil(overflowMmBeyondPage1 / lineHeightMm)) : 0;

  const status: 'optimal' | 'near-full' | 'overflow' =
    totalPages > 1 ? 'overflow' : firstPage.fillPercent >= 80 ? 'near-full' : 'optimal';

  return {
    pages,
    totalPages,
    fillPercent: overallFillPercent,
    visualBarPercent: totalPages > 1 ? 100 : firstPage.fillPercent,
    remainingLinesPage1: totalPages === 1 ? firstPage.remainingLines : 0,
    overflowLinesPage2,
    totalVisualLines,
    status,
    estimatedPages: totalPages,
  };
}



