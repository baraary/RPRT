import { MedicalShortcut } from '../types';

export const DEFAULT_SHORTCUTS: MedicalShortcut[] = [
  // شورتکات‌های کلیدی تایپیست‌ها (با زدن کلید Space جایگزین می‌شوند)
  {
    id: 'sc-abd',
    trigger: '.abd',
    label: 'سونوگرافی کامل شکم و لگن',
    expansion:
      'سونوگرافی کامل شکم و لگن با پروب کانوکس ۳.۵ مگاهرتز با رعایت شرایط ناشتایی بیمار انجام شد. کبد، کیسه صفرا، طحال، پانکراس، هر دو کلیه و مثانه دارای ابعاد و اکوپترن طبیعی بوده و ضایعه فضاگیر یا مایع آزاد رویت نشد.',
    category: 'normal',
    modality: 'sonography',
  },
  {
    id: 'sc-nl',
    trigger: '.nl',
    label: 'بررسی نرمال فیزیولوژیک',
    expansion: 'بررسی در حد نرمال فیزیولوژیک سن بیمار می‌باشد.',
    category: 'normal',
    modality: 'all',
  },
  {
    id: 'sc-gb',
    trigger: '.gb',
    label: 'کیسه صفرا نرمال',
    expansion: 'کیسه صفرا دارای جدار نازک و فاقد سنگ یا لجن صفراوی است.',
    category: 'normal',
    modality: 'sonography',
  },
  {
    id: 'sc-liv',
    trigger: '.liv',
    label: 'کبد نرمال',
    expansion:
      'کبد دارای ابعاد و لبه‌های طبیعی است. اکوپترن پارانشیم هموژن و یکنواخت بوده و شواهدی از ضایعه فضاگیر یا کبد چرب مشاهده نمی‌شود.',
    category: 'normal',
    modality: 'sonography',
  },
  {
    id: 'sc-sp',
    trigger: '.sp',
    label: 'طحال و پانکراس نرمال',
    expansion: 'طحال و پانکراس دارای ابعاد و اکوپترن پارانشیمال طبیعی بوده و ضایعه فضاگیر در آن‌ها دیده نمی‌شود.',
    category: 'normal',
    modality: 'sonography',
  },
  {
    id: 'sc-bl',
    trigger: '.bl',
    label: 'مثانه و لگن نرمال',
    expansion:
      'مثانه با حجم مناسب و جدار صاف و منظم رویت شد. شواهدی از سنگ، دیورتیکول یا ضایعه فضاگیر در لومن مثانه دیده نمی‌شود. مایع آزاد در کل‌دوساک خلفی مشهود نیست.',
    category: 'normal',
    modality: 'sonography',
  },
  {
    id: 'sc-ut',
    trigger: '.ut',
    label: 'رحم و تخمدان‌ها نرمال',
    expansion:
      'رحم دارای ابعاد، موقعیت و اکوپترن میومتریال طبیعی است. ضخامت آندومتر متناسب با فاز سیکل قاعدگی می‌باشد. هر دو تخمدان ابعاد و فولیکول‌های طبیعی داشته و ضایعه کیستیک یا سالید پاتولوژیک در آدنکس‌ها دیده نمی‌شود.',
    category: 'normal',
    modality: 'sonography',
  },
  {
    id: 'sc-pr',
    trigger: '.pr',
    label: 'پروستات نرمال',
    expansion:
      'پروستات دارای ابعاد و حجم طبیعی با اکوپترن هموژن است. کپسول پروستات منظم و سالم بوده و باقی‌مانده ادراری (PVR) در حد طبیعی است.',
    category: 'normal',
    modality: 'sonography',
  },

  // کبد و گوارش (پاتولوژی)
  {
    id: 'sc-1',
    trigger: '.fatty1',
    label: 'کبد چرب گرید ۱',
    expansion:
      'اکوژنیسیته پارانشیم کبد به صورت منتشر و خفیف افزایش یافته که با کبد چرب درجه ۱ (Mild Fatty Liver Grade I) مطابقت دارد. لبه‌های کبد شارپ و عروق کبدی واضح هستند.',
    category: 'pathology',
    modality: 'sonography',
  },
  {
    id: 'sc-2',
    trigger: '.fatty2',
    label: 'کبد چرب گرید ۲',
    expansion:
      'اکوپترن پارانشیم کبد افزایش یافته و تضعیف اکو در عمق لوب راست مشاهده می‌شود که منطبق بر تغییرات کبد چرب درجه ۲ (Moderate Fatty Liver Grade II) است.',
    category: 'pathology',
    modality: 'sonography',
  },
  {
    id: 'sc-3',
    trigger: '.gallstone',
    label: 'سنگ کیسه صفرا',
    expansion:
      'در لومن کیسه صفرا یک کانون هایپراکو دارای سایه صوتی خلفی واضح (Acoustic Shadow) مشهود است که نشان‌دهنده سنگ کیسه صفرا (Cholelithiasis) می‌باشد. ضخامت جدار کیسه صفرا طبیعی است و مایع اطراف آن دیده نمی‌شود.',
    category: 'pathology',
    modality: 'sonography',
  },
  {
    id: 'sc-4',
    trigger: '.hepcyst',
    label: 'کیست ساده کبدی',
    expansion:
      'در لوب راست کبد یک ضایعه کیستیک با جدار نازک و منظم، بدون پژواک داخلی و تقویت صوتی خلفی رویت می‌شود که به نفع کیست ساده کبدی (Simple Hepatic Cyst) است.',
    category: 'pathology',
    modality: 'sonography',
  },

  // کلیه و مجاری ادراری
  {
    id: 'sc-5',
    trigger: '.krec',
    label: 'کلیه‌ها نرمال',
    expansion:
      'کلیه‌ها دارای موقعیت، اندازه و ضخامت کورتیکال طبیعی می‌باشند. اکوژنیسیته پارانشیم متناسب با سن بوده و شواهدی از سنگ، ضایعه فضاگیر کیستیک یا سالید، یا هیدرونفروز مشاهده نشد.',
    category: 'normal',
    modality: 'sonography',
  },
  {
    id: 'sc-6',
    trigger: '.kstone',
    label: 'سنگ کالیس کلیه',
    expansion:
      'در کالیس تحتانی کلیه یک کانون اکوژنیک با سایه صوتی خلفی به قطر تقریبی میلی‌متر رویت می‌شود که مؤید سنگ کلیه (Nephrolithiasis) است. هیدرونفروز همراه دیده نمی‌شود.',
    category: 'pathology',
    modality: 'sonography',
  },
  {
    id: 'sc-7',
    trigger: '.hydro1',
    label: 'هیدرونفروز خفیف کلیه',
    expansion:
      'اتساع خفیف سیستم پیلوکالیسی کلیه (Grade I Hydronephrosis) مشهود است. پارانشیم کلیه ضخامت مناسب خود را حفظ کرده است.',
    category: 'pathology',
    modality: 'sonography',
  },

  // مغز و ستون فقرات (MRI / CT)
  {
    id: 'sc-8',
    trigger: '.brain_nl',
    label: 'مغز نرمال (MRI/CT)',
    expansion:
      'تمایز ماده خاکستری و سفید طبیعی است. سیستم بطنی، شیارهای مغزی و سیسترن‌های قاعده‌ای متقارن و متناسب با سن می‌باشند. شواهدی از ضایعه فضاگیر، خونریزی حاد، ایسکمی حاد، یا شیفت خط وسط مشاهده نمی‌شود.',
    category: 'normal',
    modality: 'all',
  },
  {
    id: 'sc-9',
    trigger: '.no_ich',
    label: 'رد خونریزی حاد جمجمه',
    expansion:
      'هیچ‌گونه ضایعه هایپردنس دال بر خونریزی حاد داخل یا خارج پارانشیمال (ICH, SAH, SDH, EDH) رویت نشد.',
    category: 'normal',
    modality: 'ct',
  },
  {
    id: 'sc-10',
    trigger: '.l45_bulge',
    label: 'دیسک بالژ L4-L5',
    expansion:
      'برآمدگی منتشر دیسک (Diffuse Disc Bulge) در سطح L4-L5 همراه با فتق خفیف دیده می‌شود که موجب تماس با سطح قدامی ساک تکال و باریک‌شدگی جزئی فورامن‌های عصبی طرفین شده است.',
    category: 'pathology',
    modality: 'mri',
  },
  {
    id: 'sc-11',
    trigger: '.l5s1_hernia',
    label: 'فتق دیسک L5-S1',
    expansion:
      'فتق فوکال دیسک بین‌مهره‌ای (Disc Protrusion) به صورت پارامدیان در سطح L5-S1 مشاهده می‌شود که با فشار بر ریشه عصبی عبوری همان سمت همراه است.',
    category: 'pathology',
    modality: 'mri',
  },

  // ریه و قفسه سینه (CT)
  {
    id: 'sc-12',
    trigger: '.chest_nl',
    label: 'ریه نرمال (HRCT)',
    expansion:
      'پارانشیم هر دو ریه شفاف بوده و عاری از ندول، ضایعه توده‌ای، کدورت شیشه مات (GGO) یا کانسالیدیشن فعال است. پلور تمیز و افیوژن مشاهده نشد.',
    category: 'normal',
    modality: 'ct',
  },
  {
    id: 'sc-13',
    trigger: '.pneu_free',
    label: 'رد پنوموتوراکس و مایع',
    expansion:
      'فضای پلور در هر دو سمت پاک بوده و علامتی از پنوموتوراکس، پنومومدیاستن یا افیوژن پلورال مشهود نیست.',
    category: 'normal',
    modality: 'ct',
  },

  // پستان و تیروئید (Sonography)
  {
    id: 'sc-14',
    trigger: '.birads1',
    label: 'BI-RADS 1 منفی/نرمال',
    expansion:
      'بافت فیبروگلاندولار با ساختار نرمال دیده می‌شود. ضایعه کیستیک یا سالید مشکوک به بدخیمی رویت نشد. رده‌بندی استاندارد: BI-RADS 1 (بررسی منفی و کاملاً نرمال).',
    category: 'impression',
    modality: 'sonography',
  },
  {
    id: 'sc-15',
    trigger: '.birads2',
    label: 'BI-RADS 2 خوش‌خیم',
    expansion:
      'یافته‌های خوش‌خیم شامل کیست ساده با جدار نازک فاقد سپتاسیون مشاهده شد. رده‌بندی استاندارد: BI-RADS 2 (یافته قطعی خوش‌خیم، عدم نیاز به اقدام مداخله‌ای).',
    category: 'impression',
    modality: 'sonography',
  },
  {
    id: 'sc-16',
    trigger: '.tirads2',
    label: 'TI-RADS 2 تیروئید خوش‌خیم',
    expansion:
      'کیست کلوئیدی ساده در پارانشیم تیروئید بدون ویژگی‌های سونوگرافیک مشکوک مشاهده شد. طبقه‌بندی: ACR TI-RADS 2 (کاملاً خوش‌خیم، بدون نیاز به FNA).',
    category: 'impression',
    modality: 'sonography',
  },

  // مایع آزاد و آپاندیس
  {
    id: 'sc-17',
    trigger: '.no_fluid',
    label: 'عدم وجود مایع آزاد صفاقی',
    expansion:
      'تجمع مایع آزاد در فضای هپاتورنال (Morison Pouch)، اسپلنورنال و کل‌دوساک خلفی لگن مشاهده نشد.',
    category: 'normal',
    modality: 'all',
  },
  {
    id: 'sc-18',
    trigger: '.app_nl',
    label: 'آپاندیس نرمال',
    expansion:
      'آپاندیس با دیامتر کمتر از ۶ میلی‌متر، فشردنی (Compressible) و بدون ادم یا التهاب در پری‌آپاندیکولار رویت شد.',
    category: 'normal',
    modality: 'all',
  },

  // جمع‌بندی و نتیجه‌گیری
  {
    id: 'sc-19',
    trigger: '.norm',
    label: 'بررسی روتین در حد نرمال',
    expansion:
      'بررسی در حد نرمال سن و جنس بیمار می‌باشد و شواهدی از ضایعه پاتولوژیک بارز، ضایعه فضاگیر یا تغییرات حاد مشاهده نشد (Unremarkable examination).',
    category: 'impression',
    modality: 'all',
  },
  {
    id: 'sc-20',
    trigger: '.correl',
    label: 'توصیه تطابق بالینی',
    expansion:
      'توصیه می‌گردد یافته‌های حاضر با معاینه فیزیکی و علائم بالینی بیمار توسط پزشک محترم معالج مورد ارزیابی و تطابق (Clinical Correlation) قرار گیرد.',
    category: 'recommendation',
    modality: 'all',
  },
];
