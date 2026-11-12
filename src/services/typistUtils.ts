import { MedicalShortcut } from '../types';

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
 * Pre-built Radiology Tables with embedded Smart Number Slots
 */
export function getRadiologyTablePresetHtml(
  presetId: 'kidneys' | 'thyroid' | 'fetal' | 'pelvis' | 'lesions'
): string {
  const ts = Date.now();
  const baseTableStyle =
    'width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; text-align: right; direction: rtl;';
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

    // Standardize Arabic Yeh/Kaf silently first
    let text = part.replace(/ي/g, 'ی').replace(/ى/g, 'ی').replace(/ك/g, 'ک');

    // Collect matches across rules without double-wrapping
    // We use placeholders `\uE000INDEX\uE001` during rule pass and expand them after
    const placeholders: Array<{ id: string; original: string; suggestion: string; label: string }> = [];

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

/**
 * Applies all radiology spell-check and Persian half-space (ZWNJ) rules at once
 */
export function autoCorrectRadiologyText(input: string, isHtml = false): AutoCorrectResult {
  if (!input) return { corrected: input, fixCount: 0 };

  const cleanInput = isHtml ? stripSpellHighlights(input) : input;
  let fixCount = 0;

  const applyToPlainSegment = (segment: string): string => {
    let result = segment.replace(/ي/g, 'ی').replace(/ى/g, 'ی').replace(/ك/g, 'ک');
    for (const rule of RADIOLOGY_AUTOCORRECT_RULES) {
      result = result.replace(rule.pattern, (match, ...args) => {
        let rep = rule.replacement;
        if (rep.includes('$1') && args.length >= 2) {
          rep = rep.replace('$1', args[0]).replace('$2', args[1]);
        }
        if (match !== rep) {
          fixCount++;
        }
        return rep;
      });
    }
    return result;
  };

  if (!isHtml) {
    return {
      corrected: applyToPlainSegment(cleanInput),
      fixCount,
    };
  }

  const parts = cleanInput.split(/(<[^>]+>)/g);
  const processedParts = parts.map((part) => {
    if (part.startsWith('<') && part.endsWith('>')) {
      return part;
    }
    return applyToPlainSegment(part);
  });

  return {
    corrected: processedParts.join(''),
    fixCount,
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
 * Caret-preserving Auto-Text Expander for contentEditable elements when pressing Space or Tab.
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

  const sortedShortcuts = [...shortcuts].sort((a, b) => b.trigger.length - a.trigger.length);

  if (node.nodeType === Node.TEXT_NODE && node.textContent !== null) {
    const textBeforeCaret = node.textContent.slice(0, offset);
    const trimmedRight = textBeforeCaret.replace(/[\s\u00A0]+$/, '');

    for (const sc of sortedShortcuts) {
      if (trimmedRight.endsWith(sc.trigger)) {
        const triggerStartIdx = trimmedRight.length - sc.trigger.length;
        const charBefore = triggerStartIdx > 0 ? trimmedRight[triggerStartIdx - 1] : ' ';
        if (/\s|[.،؛:()[\]«»\u00A0]/.test(charBefore) || sc.trigger.startsWith('.')) {
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
 * Auto-Text Expander for <textarea> and <input> elements
 */
export function expandShortcutInInput(
  el: HTMLTextAreaElement | HTMLInputElement,
  shortcuts: MedicalShortcut[]
): { expanded: boolean; newValue: string; newCursorPos: number; trigger?: string; label?: string } {
  const value = el.value;
  const cursorPos = el.selectionStart ?? value.length;
  const textBeforeCursor = value.slice(0, cursorPos);
  const trimmedRight = textBeforeCursor.replace(/\s+$/, '');

  const sortedShortcuts = [...shortcuts].sort((a, b) => b.trigger.length - a.trigger.length);

  for (const sc of sortedShortcuts) {
    if (trimmedRight.endsWith(sc.trigger)) {
      const triggerStartIdx = trimmedRight.length - sc.trigger.length;
      const charBefore = triggerStartIdx > 0 ? trimmedRight[triggerStartIdx - 1] : ' ';
      if (/\s|[.،؛:()[\]«»]/.test(charBefore) || sc.trigger.startsWith('.')) {
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

