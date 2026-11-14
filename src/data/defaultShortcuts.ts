import { MedicalShortcut, Modality } from '../types';

export interface OrganDefinition {
  organ: string;
  matchKeywords: string[];
  modalities: Modality[];
  titleKeywords?: string[];
}

export const STANDARD_ORGAN_DEFINITIONS: OrganDefinition[] = [
  {
    organ: 'کبد',
    matchKeywords: ['کبد', 'Liver', 'پارانشیم کبد'],
    modalities: ['sonography', 'ct', 'mri'],
  },
  {
    organ: 'کیسه صفرا',
    matchKeywords: ['کیسه صفرا', 'مجاری صفراوی', 'Gallbladder', 'CBD'],
    modalities: ['sonography', 'ct', 'mri'],
  },
  {
    organ: 'کلیه‌ها',
    matchKeywords: ['کلیه', 'کلیه‌ها', 'Kidneys', 'سیستم پیلوکالیسیل'],
    modalities: ['sonography', 'ct', 'mri'],
  },
  {
    organ: 'طحال',
    matchKeywords: ['طحال', 'Spleen'],
    modalities: ['sonography', 'ct', 'mri'],
  },
  {
    organ: 'مثانه',
    matchKeywords: ['مثانه', 'Bladder'],
    modalities: ['sonography', 'ct', 'mri'],
  },
  {
    organ: 'رحم و تخمدان',
    matchKeywords: ['رحم', 'تخمدان', 'آندومتر', 'آدنکس', 'Uterus', 'Ovary'],
    modalities: ['sonography', 'mri', 'ct'],
  },
  {
    organ: 'پروستات',
    matchKeywords: ['پروستات', 'Prostate'],
    modalities: ['sonography', 'mri', 'ct'],
  },
  {
    organ: 'تیروئید',
    matchKeywords: ['تیروئید', 'Thyroid', 'ایسموس'],
    modalities: ['sonography'],
    titleKeywords: ['تیروئید', 'گردن', 'Thyroid'],
  },
  {
    organ: 'پستان',
    matchKeywords: ['پستان', 'آگزیلا', 'Breast', 'BI-RADS'],
    modalities: ['sonography', 'mri'],
    titleKeywords: ['پستان', 'سینه', 'آگزیلا', 'Breast'],
  },
  {
    organ: 'ستون فقرات',
    matchKeywords: ['ستون فقرات', 'دیسک', 'مهره', 'L4-L5', 'L5-S1', 'کانال نخاعی'],
    modalities: ['mri', 'ct'],
  },
  {
    organ: 'مغز و اعصاب',
    matchKeywords: ['مغز', 'پارانشیم مغز', 'سیستم بطنی', 'جمجمه', 'Brain'],
    modalities: ['mri', 'ct'],
    titleKeywords: ['مغز', 'جمجمه', 'Brain'],
  },
  {
    organ: 'ریه و قفسه سینه',
    matchKeywords: ['ریه', 'پلور', 'قفسه سینه', 'مدیاستن', 'Chest'],
    modalities: ['ct'],
    titleKeywords: ['ریه', 'قفسه سینه', 'توراکس', 'HRCT', 'Chest'],
  },
];

export const DEFAULT_SHORTCUTS: MedicalShortcut[] = [
  // ==========================================
  // ۱. کبد (Liver)
  // ==========================================
  {
    id: 'sc-liv',
    trigger: '.liv',
    organ: 'کبد',
    label: 'کبد نرمال (اکوی طبیعی)',
    expansion:
      'دارای ابعاد، حدود و اکوژنیسیته پارانشیمال طبیعی و یکنواخت است. ضایعه فضاگیر کیستیک یا سالید و اتساع مجاری صفراوی داخل کبدی رویت نشد.',
    category: 'normal',
    modality: 'sonography',
  },
  {
    id: 'sc-1',
    trigger: '.fatty1',
    organ: 'کبد',
    label: 'کبد چرب گرید ۱ (Mild)',
    expansion:
      'دارای ابعاد طبیعی بوده ولی افزایش منتشر و خفیف اکوژنیسیته پارانشیم به نفع استئاتوز کبدی (Fatty Liver Grade I) مشهود است. ضایعه فضاگیر کانونی رویت نشد.',
    category: 'pathology',
    modality: 'sonography',
  },
  {
    id: 'sc-2',
    trigger: '.fatty2',
    organ: 'کبد',
    label: 'کبد چرب گرید ۲ (Moderate)',
    expansion:
      'افزایش نسبتا بارز و منتشر اکوژنیسیته پارانشیم کبد همراه با تضعیف نسبی امواج صوتی در عمق به نفع کبد چرب گرید ۲ (Fatty Liver Grade II) مشهود است. ضایعه فضاگیر رویت نشد.',
    category: 'pathology',
    modality: 'sonography',
  },
  {
    id: 'sc-fatty3',
    trigger: '.fatty3',
    organ: 'کبد',
    label: 'کبد چرب گرید ۳ (Severe)',
    expansion:
      'افزایش شدید و منتشر اکوژنیسیته پارانشیم کبد با محو شدن حدود عروق پورت و دیافراگم به نفع کبد چرب گرید ۳ (Fatty Liver Grade III) مشهود است.',
    category: 'pathology',
    modality: 'sonography',
  },
  {
    id: 'sc-4',
    trigger: '.hepcyst',
    organ: 'کبد',
    label: 'کیست ساده کبدی',
    expansion:
      'ابعاد و اکوی پارانشیم طبیعی است. یک کانون آن‌اکوئیک با جدار صاف و تقویت صوتی خلفی به قطر 12 میلی‌متر در لوب راست کبد به نفع کیست ساده کبدی (Simple Hepatic Cyst) مشهود است.',
    category: 'pathology',
    modality: 'sonography',
  },
  {
    id: 'sc-hemang',
    trigger: '.hemang',
    organ: 'کبد',
    label: 'همانژیوم کبدی',
    expansion:
      'ابعاد و اکوی پارانشیم طبیعی است. یک کانون هایپراکو با حدود کاملاً مشخص و هموژن به قطر 14 میلی‌متر در لوب راست کبد مطرح‌کننده همانژیوم کبدی رویت شد.',
    category: 'pathology',
    modality: 'sonography',
  },

  // ==========================================
  // ۲. کیسه صفرا (Gallbladder)
  // ==========================================
  {
    id: 'sc-gb',
    trigger: '.gb',
    hotkey: 'Alt+G',
    organ: 'کیسه صفرا',
    label: 'کیسه صفرا نرمال (بدون سنگ)',
    expansion:
      'دارای ابعاد و ضخامت جدار طبیعی (کمتر از ۳ میلی‌متر) بوده و فاقد سنگ، لجن صفراوی (Sludge) یا ضایعه فضاگیر می‌باشد. قطر مجرای مشترک صفراوی (CBD) طبیعی است.',
    category: 'normal',
    modality: 'sonography',
  },
  {
    id: 'sc-3',
    trigger: '.gallstone',
    organ: 'کیسه صفرا',
    label: 'سنگ کیسه صفرا (Cholelithiasis)',
    expansion:
      'حاوی تصویر اکوژن با سایه صوتی خلفی واضح به قطر 10 میلی‌متر به نفع سنگ کیسه صفرا (Cholelithiasis) می‌باشد. ضخامت جدار کیسه صفرا طبیعی بوده و شواهدی از کله‌سیستیت حاد رویت نشد.',
    category: 'pathology',
    modality: 'sonography',
  },
  {
    id: 'sc-gb-sludge',
    trigger: '.sludge',
    organ: 'کیسه صفرا',
    label: 'لجن صفراوی (Sludge)',
    expansion:
      'حاوی اکوهای سطحی متحرک و بدون سایه صوتی در ناحیه دپندنت به نفع لجن صفراوی (Biliary Sludge) می‌باشد. ضخامت جدار طبیعی است.',
    category: 'pathology',
    modality: 'sonography',
  },
  {
    id: 'sc-gb-polyp',
    trigger: '.gbpolyp',
    organ: 'کیسه صفرا',
    label: 'پولیپ کیسه صفرا',
    expansion:
      'یک کانون اکوژن ثابت و بدون سایه صوتی متصل به جدار به قطر 5 میلی‌متر مطرح‌کننده پولیپ کلسترولی کیسه صفرا مشهود است.',
    category: 'pathology',
    modality: 'sonography',
  },
  {
    id: 'sc-gb-chole',
    trigger: '.chole',
    organ: 'کیسه صفرا',
    label: 'جراحی‌شده (Cholecystectomy)',
    expansion:
      'کیسه صفرا در محل آناتومیک رویت نشد (سابقه کله‌سیستکتومی). اتساعی در مجرای مشترک صفراوی (CBD) مشاهده نگردید.',
    category: 'pathology',
    modality: 'sonography',
  },

  // ==========================================
  // ۳. کلیه‌ها (Kidneys)
  // ==========================================
  {
    id: 'sc-5',
    trigger: '.krec',
    organ: 'کلیه‌ها',
    label: 'کلیه‌ها نرمال (دو طرف طبیعی)',
    expansion:
      'هر دو کلیه راست و چپ دارای ابعاد، ضخامت پارانشیم و اکوی کورتیکومدولاری طبیعی هستند. شواهدی از سنگ، هیدرونفروز یا ضایعه فضاگیر در کلیه‌ها رویت نشد.',
    category: 'normal',
    modality: 'sonography',
  },
  {
    id: 'sc-6',
    trigger: '.kstone',
    organ: 'کلیه‌ها',
    label: 'سنگ کلیه راست',
    expansion:
      'کلیه چپ طبیعی است. در کالیس تحتانی کلیه راست یک کانون اکوژن به قطر 5 میلی‌متر به نفع سنگ غیرانسدادی کلیه راست مشهود است. هیدرونفروز رویت نشد.',
    category: 'pathology',
    modality: 'sonography',
  },
  {
    id: 'sc-kstone-l',
    trigger: '.kstone_l',
    organ: 'کلیه‌ها',
    label: 'سنگ کلیه چپ',
    expansion:
      'کلیه راست طبیعی است. در کالیس میانی کلیه چپ یک کانون اکوژن به قطر 5 میلی‌متر به نفع سنگ غیرانسدادی کلیه چپ مشهود است. هیدرونفروز رویت نشد.',
    category: 'pathology',
    modality: 'sonography',
  },
  {
    id: 'sc-7',
    trigger: '.hydro1',
    organ: 'کلیه‌ها',
    label: 'هیدرونفروز خفیف (Mild)',
    expansion:
      'ابعاد و ضخامت کورتکس کلیه‌ها طبیعی است. اتساع خفیف سیستم پیلوکالیسیل (Mild Hydronephrosis) مشهود است.',
    category: 'pathology',
    modality: 'sonography',
  },
  {
    id: 'sc-kcyst',
    trigger: '.kcyst',
    organ: 'کلیه‌ها',
    label: 'کیست کورتیکال ساده کلیه',
    expansion:
      'ابعاد و اکوی پارانشیم کلیه‌ها طبیعی است. یک کیست کورتیکال ساده با جدار نازک و محتوای شفاف به قطر 18 میلی‌متر رویت شد.',
    category: 'pathology',
    modality: 'sonography',
  },

  // ==========================================
  // ۴. طحال (Spleen)
  // ==========================================
  {
    id: 'sc-sp',
    trigger: '.sp',
    organ: 'طحال',
    label: 'طحال نرمال (ابعاد طبیعی)',
    expansion:
      'دارای ابعاد و اکوپترن پارانشیمال یکنواخت و طبیعی است (Span طبیعی). ضایعه فضاگیر رویت نشد.',
    category: 'normal',
    modality: 'sonography',
  },
  {
    id: 'sc-spleno',
    trigger: '.spleno',
    organ: 'طحال',
    label: 'اسپلنومگالی خفیف',
    expansion:
      'اکوی پارانشیم یکنواخت بوده ولی طول قطبی طحال افزایش یافته (138 میلی‌متر) که به نفع اسپلنومگالی خفیف (Mild Splenomegaly) است.',
    category: 'pathology',
    modality: 'sonography',
  },
  {
    id: 'sc-acc-sp',
    trigger: '.acc_sp',
    organ: 'طحال',
    label: 'طحال فرعی (Accessory)',
    expansion:
      'ابعاد و اکوی طبیعی دارد. در ناف طحال یک کانون ایزواکو با حدود مشخص به قطر 12 میلی‌متر به نفع طحال فرعی (Accessory Spleen) مشهود است.',
    category: 'pathology',
    modality: 'sonography',
  },

  // ==========================================
  // ۵. مثانه (Bladder)
  // ==========================================
  {
    id: 'sc-bl',
    trigger: '.bl',
    organ: 'مثانه',
    label: 'مثانه نرمال (جدار طبیعی)',
    expansion:
      'با حجم مناسب بررسی شد؛ دارای ضخامت جدار طبیعی و مخاط صاف بوده و فاقد سنگ، لخته یا ضایعه فضاگیر در لومن می‌باشد.',
    category: 'normal',
    modality: 'sonography',
  },
  {
    id: 'sc-bl-thick',
    trigger: '.bl_thick',
    organ: 'مثانه',
    label: 'افزایش ضخامت جدار مثانه / ترابکولاسیون',
    expansion:
      'افزایش منتشر ضخامت جدار مثانه همراه با نامنظمی مخاطی به نفع تغییرات مزمن انسدادی (ترابکولاسیون) یا سیستیت مشهود است.',
    category: 'pathology',
    modality: 'sonography',
  },

  // ==========================================
  // ۶. رحم و تخمدان (Uterus & Ovaries)
  // ==========================================
  {
    id: 'sc-ut',
    trigger: '.ut',
    organ: 'رحم و تخمدان',
    label: 'نرمال (رحم و تخمدان طبیعی)',
    expansion:
      'رحم دارای ابعاد طبیعی و اکوی میومتر هموژن است. ضخامت و اکوژنیسیته خط آندومتر طبیعی می‌باشد. هر دو تخمدان راست و چپ ابعاد و نمای طبیعی داشته و ضایعه فضاگیر در آدنکس‌ها رویت نشد.',
    category: 'normal',
    modality: 'sonography',
  },
  {
    id: 'sc-myoma',
    trigger: '.myoma',
    organ: 'رحم و تخمدان',
    label: 'میوم (فیبروم) رحمی',
    expansion:
      'در میومتر رحم یک کانون هیپواکو با حدود مشخص به ابعاد 24×20 میلی‌متر به نفع لیومیوم اینترامورال رحمی مشهود است. تخمدان‌ها نمای طبیعی دارند.',
    category: 'pathology',
    modality: 'sonography',
  },
  {
    id: 'sc-pco',
    trigger: '.pco',
    organ: 'رحم و تخمدان',
    label: 'تخمدان پلی‌کیستیک (PCOD)',
    expansion:
      'رحم و آندومتر طبیعی هستند. حجم هر دو تخمدان افزایش یافته و فولیکول‌های ریز متعدد محیطی با استرومای برجسته به نفع نمای پلی‌کیستیک (PCO Morphology) مشهود است.',
    category: 'pathology',
    modality: 'sonography',
  },
  {
    id: 'sc-ovcyst',
    trigger: '.ovcyst',
    organ: 'رحم و تخمدان',
    label: 'کیست ساده تخمدان',
    expansion:
      'رحم طبیعی است. در تخمدان راست یک کانون کیستیک ساده با جدار نازک و فاقد سپتا یا ندول جداری به قطر 32 میلی‌متر به نفع کیست فانکشنال رویت شد.',
    category: 'pathology',
    modality: 'sonography',
  },

  // ==========================================
  // ۷. پروستات (Prostate)
  // ==========================================
  {
    id: 'sc-pr',
    trigger: '.pr',
    organ: 'پروستات',
    label: 'پروستات نرمال (حجم طبیعی)',
    expansion:
      'دارای حجم طبیعی (حدود 22 سی‌سی) با اکوی پارانشیمال یکنواخت و کپسول سالم است. باقی‌مانده ادرار پس از تخلیه (PVR) ناچیز است.',
    category: 'normal',
    modality: 'sonography',
  },
  {
    id: 'sc-bph',
    trigger: '.bph',
    organ: 'پروستات',
    label: 'بزرگی خوش‌خیم پروستات (BPH)',
    expansion:
      'بزرگ‌تر از حد طبیعی بوده و حجم آن حدود 48 سی‌سی برآورد می‌گردد که همراه با برجستگی لوب میانی به نفع هایپرپلازی خوش‌خیم پروستات (BPH) است.',
    category: 'pathology',
    modality: 'sonography',
  },

  // ==========================================
  // ۸. تیروئید (Thyroid)
  // ==========================================
  {
    id: 'sc-thy-nl',
    trigger: '.thy_nl',
    organ: 'تیروئید',
    label: 'تیروئید نرمال (هر دو لوب طبیعی)',
    expansion:
      'هر دو لوب راست و چپ تیروئید و ایسموس دارای ابعاد و اکوپترن پارانشیمال کاملاً یکنواخت و طبیعی هستند. ضایعه ندولار کیستیک یا سالید رویت نشد. لنفادنوپاتی پاتولوژیک گردنی مشاهده نگردید.',
    category: 'normal',
    modality: 'sonography',
  },
  {
    id: 'sc-thyroiditis',
    trigger: '.thyroiditis',
    organ: 'تیروئید',
    label: 'تیروئیدیت منتشر (هتروژن)',
    expansion:
      'اکوپترن پارانشیم هر دو لوب تیروئید به صورت منتشر هتروژن و هیپواکو همراه با سپتاهای فیبروز ظریف می‌باشد که مطرح‌کننده تیروئیدیت مزمن (هاشیموتو) است.',
    category: 'pathology',
    modality: 'sonography',
  },
  {
    id: 'sc-16',
    trigger: '.tirads2',
    organ: 'تیروئید',
    label: 'ندول کلوئیدی خوش‌خیم (TI-RADS 2)',
    expansion:
      'در لوب راست تیروئید یک کانون کیستیک-اسفنجی با حدود مشخص به قطر 8 میلی‌متر به نفع ندول کلوئیدی خوش‌خیم (TI-RADS 2) مشهود است.',
    category: 'pathology',
    modality: 'sonography',
  },

  // ==========================================
  // ۹. پستان (Breast)
  // ==========================================
  {
    id: 'sc-14',
    trigger: '.birads1',
    organ: 'پستان',
    label: 'پستان نرمال (BI-RADS 1)',
    expansion:
      'بافت فیبروگلندولار هر دو پستان راست و چپ نمای طبیعی داشته و توده سالید یا کیستیک مشکوک و اتساع مجاری رویت نشد. در نواحی آگزیلاری دو طرف لنف‌نود پاتولوژیک مشاهده نگردید (BI-RADS 1).',
    category: 'normal',
    modality: 'sonography',
  },
  {
    id: 'sc-15',
    trigger: '.birads2',
    organ: 'پستان',
    label: 'کیست‌های ساده پستان (BI-RADS 2)',
    expansion:
      'چند کانون آن‌اکوئیک کوچک با جدار صاف و تقویت صوتی خلفی (حداکثر قطر 9 میلی‌متر) به نفع کیست‌های ساده خوش‌خیم پستان (BI-RADS 2) مشهود است.',
    category: 'pathology',
    modality: 'sonography',
  },
  {
    id: 'sc-fibro',
    trigger: '.fibro',
    organ: 'پستان',
    label: 'فیبروآدنوم پستان (BI-RADS 3)',
    expansion:
      'در ساعت 2 پستان راست یک کانون هیپواکو بیضی‌شکل با محور موازی پوست و حدود کاملاً مشخص به ابعاد 14×8 میلی‌متر مطرح‌کننده فیبروآدنوم (BI-RADS 3) رویت شد.',
    category: 'pathology',
    modality: 'sonography',
  },

  // ==========================================
  // ۱۰. ستون فقرات (Spine)
  // ==========================================
  {
    id: 'sc-spine-nl',
    trigger: '.spine_nl',
    organ: 'ستون فقرات',
    label: 'ستون فقرات نرمال (بدون فتق دیسک)',
    expansion:
      'ارتفاع، سیگنال و هم‌راستایی مهره‌ها طبیعی است. شواهدی از بالجینگ یا هرنیاسیون دیسک و تنگی کانال نخاعی یا فورامن‌های عصبی رویت نشد.',
    category: 'normal',
    modality: 'mri',
  },
  {
    id: 'sc-10',
    trigger: '.l45_bulge',
    organ: 'ستون فقرات',
    label: 'بالجینگ دیسک L4-L5 و L5-S1',
    expansion:
      'کاهش سیگنال (دهیدراتاسیون) دیسک‌های L4-L5 و L5-S1 همراه با بالجینگ محیطی دیسک و اثر فشاری خفیف بر ساک تئکال مشهود است.',
    category: 'pathology',
    modality: 'mri',
  },
  {
    id: 'sc-11',
    trigger: '.l5s1_hernia',
    organ: 'ستون فقرات',
    label: 'هرنیاسیون دیسک L5-S1',
    expansion:
      'در سطح L5-S1 پروتروژن پارامدیان دیسک با اثر فشاری بر ریشه عصبی مربوطه و باریک‌شدگی فورامن عصبی مشهود است.',
    category: 'pathology',
    modality: 'mri',
  },

  // ==========================================
  // ۱۱. مغز و اعصاب و قفسه سینه (MRI / CT)
  // ==========================================
  {
    id: 'sc-8',
    trigger: '.brain_nl',
    organ: 'مغز و اعصاب',
    label: 'مغز نرمال (MRI/CT)',
    expansion:
      'تمایز ماده خاکستری و سفید طبیعی است. سیستم بطنی، شیارهای مغزی و سیسترن‌های قاعده‌ای متقارن و متناسب با سن می‌باشند. شواهدی از ضایعه فضاگیر، خونریزی حاد، ایسکمی حاد، یا شیفت خط وسط مشاهده نمی‌شود.',
    category: 'normal',
    modality: 'all',
  },
  {
    id: 'sc-9',
    trigger: '.no_ich',
    organ: 'مغز و اعصاب',
    label: 'رد خونریزی حاد جمجمه',
    expansion:
      'هیچ‌گونه ضایعه هایپردنس دال بر خونریزی حاد داخل یا خارج پارانشیمال (ICH, SAH, SDH, EDH) رویت نشد.',
    category: 'normal',
    modality: 'ct',
  },
  {
    id: 'sc-12',
    trigger: '.chest_nl',
    organ: 'ریه و قفسه سینه',
    label: 'ریه نرمال (HRCT)',
    expansion:
      'پارانشیم هر دو ریه شفاف بوده و عاری از ندول، ضایعه توده‌ای، کدورت شیشه مات (GGO) یا کانسالیدیشن فعال است. پلور تمیز و افیوژن مشاهده نشد.',
    category: 'normal',
    modality: 'ct',
  },
  {
    id: 'sc-13',
    trigger: '.pneu_free',
    organ: 'ریه و قفسه سینه',
    label: 'رد پنوموتوراکس و مایع پلور',
    expansion:
      'فضای پلور در هر دو سمت پاک بوده و علامتی از پنوموتوراکس، پنومومدیاستن یا افیوژن پلورال مشهود نیست.',
    category: 'normal',
    modality: 'ct',
  },

  // ==========================================
  // ۱۲. شورتکات‌های عمومی، جمع‌بندی و تصحیح خودکار
  // ==========================================
  {
    id: 'sc-abd',
    trigger: '.abd',
    hotkey: 'Alt+T',
    organ: 'عمومی',
    label: 'سونوگرافی کامل شکم و لگن نرمال',
    expansion:
      'سونوگرافی کامل شکم و لگن با پروب کانوکس ۳.۵ مگاهرتز با رعایت شرایط ناشتایی بیمار انجام شد. کبد، کیسه صفرا، طحال، پانکراس، هر دو کلیه و مثانه دارای ابعاد و اکوپترن طبیعی بوده و ضایعه فضاگیر یا مایع آزاد رویت نشد.',
    category: 'normal',
    modality: 'sonography',
  },
  {
    id: 'sc-nl',
    trigger: '.nl',
    hotkey: 'Alt+M',
    organ: 'عمومی',
    label: 'بررسی نرمال فیزیولوژیک',
    expansion: 'بررسی در حد نرمال فیزیولوژیک سن بیمار می‌باشد.',
    category: 'normal',
    modality: 'all',
  },
  {
    id: 'sc-17',
    trigger: '.no_fluid',
    organ: 'عمومی',
    label: 'عدم وجود مایع آزاد صفاقی',
    expansion:
      'تجمع مایع آزاد در فضای هپاتورنال (Morison Pouch)، اسپلنورنال و کل‌دوساک خلفی لگن مشاهده نشد.',
    category: 'normal',
    modality: 'all',
  },
  {
    id: 'sc-18',
    trigger: '.app_nl',
    organ: 'عمومی',
    label: 'آپاندیس نرمال',
    expansion:
      'آپاندیس با دیامتر کمتر از ۶ میلی‌متر، فشردنی (Compressible) و بدون ادم یا التهاب در پری‌آپاندیکولار رویت شد.',
    category: 'normal',
    modality: 'all',
  },
  {
    id: 'sc-19',
    trigger: '.norm',
    organ: 'عمومی',
    label: 'بررسی روتین در حد نرمال',
    expansion:
      'بررسی در حد نرمال سن و جنس بیمار می‌باشد و شواهدی از ضایعه پاتولوژیک بارز، ضایعه فضاگیر یا تغییرات حاد مشاهده نشد (Unremarkable examination).',
    category: 'impression',
    modality: 'all',
  },
  {
    id: 'sc-20',
    trigger: '.correl',
    organ: 'عمومی',
    label: 'توصیه تطابق بالینی',
    expansion:
      'توصیه می‌گردد یافته‌های حاضر با معاینه فیزیکی و علائم بالینی بیمار توسط پزشک محترم معالج مورد ارزیابی و تطابق (Clinical Correlation) قرار گیرد.',
    category: 'recommendation',
    modality: 'all',
  },
  {
    id: 'sc-autocorrect-abd',
    trigger: 'abd',
    isAutocorrect: true,
    organ: 'عمومی',
    label: 'تصحیح خودکار: abd ⬅ abdomen',
    expansion: 'abdomen',
    category: 'general',
    modality: 'all',
  },
  {
    id: 'sc-autocorrect-unrem',
    trigger: 'unrem',
    isAutocorrect: true,
    organ: 'عمومی',
    label: 'تصحیح خودکار: unrem ⬅ Unremarkable exam',
    expansion: 'Unremarkable examination',
    category: 'general',
    modality: 'all',
  },
];
