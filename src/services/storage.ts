import { Doctor, MedicalTemplate, MedicalShortcut, MedicalReport, AppSettings, Modality, PatientWorkspaceTab, Typist, ReferringPhysicianItem } from '../types';
import { DEFAULT_DOCTORS } from '../data/defaultDoctors';
import { DEFAULT_TEMPLATES } from '../data/defaultTemplates';
import { DEFAULT_SHORTCUTS } from '../data/defaultShortcuts';

const STORAGE_KEYS = {
  DOCTORS: 'radioreport_doctors_v1',
  TYPISTS: 'radioreport_typists_v1',
  REFERRING_PHYSICIANS: 'radioreport_referring_physicians_v1',
  TEMPLATES: 'radioreport_templates_v1',
  SHORTCUTS: 'radioreport_shortcuts_v1',
  REPORTS: 'radioreport_saved_reports_v1',
  SETTINGS: 'radioreport_settings_v1',
  ACTIVE_DRAFT: 'radioreport_active_draft_v1',
  OPEN_TABS: 'radioreport_open_tabs_v1',
};

export const DEFAULT_REFERRING_PHYSICIANS: ReferringPhysicianItem[] = [
  { id: 'ref-1', name: 'دکتر علوی (متخصص داخلی)', usageCount: 18 },
  { id: 'ref-2', name: 'دکتر صابری (مغز و اعصاب)', usageCount: 14 },
  { id: 'ref-3', name: 'دکتر کاظمی (زنان و زایمان)', usageCount: 12 },
  { id: 'ref-4', name: 'دکتر شمس (جراح ارتوپدی)', usageCount: 10 },
  { id: 'ref-5', name: 'دکتر معتمدی (فوق تخصص ریه)', usageCount: 8 },
  { id: 'ref-6', name: 'دکتر فرهادی (اورولوژی)', usageCount: 7 },
  { id: 'ref-7', name: 'دکتر رضوانی (جراح عمومی)', usageCount: 5 },
  { id: 'ref-8', name: 'دکتر نادری (غدد و متابولیسم)', usageCount: 4 },
];

export const DEFAULT_TYPISTS: Typist[] = [
  {
    id: 'typ-1',
    name: 'خانم رضایی',
    color: 'sky',
    isDefault: true,
  },
  {
    id: 'typ-2',
    name: 'خانم حسینی',
    color: 'indigo',
  },
  {
    id: 'typ-3',
    name: 'آقای مرادی',
    color: 'emerald',
  },
];

const DEFAULT_SETTINGS: AppSettings = {
  smartSuggestionsEnabled: true,
  numberSlotsEnabled: false,
  darkMode: false,
  activeDoctorId: 'doc-1',
  activeTypistId: 'typ-1',
  clinicName: 'مرکز جامع تصویربرداری بیمارستان شفا',
  clinicSubtitle: 'رادیولوژی، سونوگرافی، ام‌آر‌آی، ام‌آر‌آی قلب، سی‌تی‌اسکن',
  clinicAddress: 'مازندران، ساری، کمربندی غربی، بلوار ولیعصر',
  clinicPhone: '۰۱۱-۳۳۲۰۵۰۰۶-۹',
  clinicLogoText: '',
  defaultFont: 'Vazirmatn',
  defaultFontSize: 14,
  autoSaveInterval: 5,
  headingFont: 'Vazirmatn',
  headingFontSize: '16px',
  headingBold: true,
  headingColor: '#0f172a',
  pageBreakPerStudy: false,
  customFonts: [
    { id: 'f-vazir', name: 'وزیرمتن (استاندارد)', family: "'Vazirmatn', sans-serif" },
    { id: 'f-sahel', name: 'ساحل (Sahel)', family: "'Sahel', sans-serif" },
    { id: 'f-samim', name: 'صمیم (Samim)', family: "'Samim', sans-serif" },
    { id: 'f-shabnam', name: 'شبنم (Shabnam)', family: "'Shabnam', Tahoma, sans-serif" },
    { id: 'f-bnazanin', name: 'بی‌نازنین (B Nazanin)', family: "'B Nazanin', Tahoma, Arial" },
    { id: 'f-byekan', name: 'بی‌یکان (B Yekan)', family: "'B Yekan', Tahoma, Arial" },
    { id: 'f-iransans', name: 'ایران‌سنس (IRANSans)', family: "'IRANSans', Tahoma, sans-serif" },
    { id: 'f-noto', name: 'نوتو عربیک (Noto Sans Arabic)', family: "'Noto Sans Arabic', sans-serif" },
    { id: 'f-tahoma', name: 'تاهوما (Tahoma)', family: "Tahoma, sans-serif" },
    { id: 'f-arial', name: 'آریال (Arial)', family: "Arial, sans-serif" },
    { id: 'f-times', name: 'تایمز (Times New Roman)', family: "'Times New Roman', serif" },
  ],
};

export const StorageService = {
  // DOCTORS
  getDoctors(): Doctor[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DOCTORS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.DOCTORS, JSON.stringify(DEFAULT_DOCTORS));
        return DEFAULT_DOCTORS;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_DOCTORS;
    }
  },

  saveDoctors(doctors: Doctor[]): void {
    localStorage.setItem(STORAGE_KEYS.DOCTORS, JSON.stringify(doctors));
  },

  addDoctor(doctor: Omit<Doctor, 'id'>): Doctor {
    const doctors = this.getDoctors();
    const newDoc: Doctor = {
      ...doctor,
      id: `doc-${Date.now()}`,
    };
    doctors.push(newDoc);
    this.saveDoctors(doctors);
    return newDoc;
  },

  updateDoctor(id: string, updates: Partial<Doctor>): Doctor[] {
    const doctors = this.getDoctors().map((d) => (d.id === id ? { ...d, ...updates } : d));
    this.saveDoctors(doctors);
    return doctors;
  },

  deleteDoctor(id: string): Doctor[] {
    const doctors = this.getDoctors().filter((d) => d.id !== id);
    this.saveDoctors(doctors);
    return doctors;
  },

  // REFERRING PHYSICIANS (پزشکان ارجاع‌دهنده با مرتب‌سازی بر اساس تکرار)
  getReferringPhysicians(): ReferringPhysicianItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.REFERRING_PHYSICIANS);
      let list: ReferringPhysicianItem[];
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.REFERRING_PHYSICIANS, JSON.stringify(DEFAULT_REFERRING_PHYSICIANS));
        list = [...DEFAULT_REFERRING_PHYSICIANS];
      } else {
        const parsed = JSON.parse(data);
        list = Array.isArray(parsed) && parsed.length > 0 ? parsed : [...DEFAULT_REFERRING_PHYSICIANS];
      }
      return list.sort((a, b) => {
        if ((b.usageCount || 0) !== (a.usageCount || 0)) {
          return (b.usageCount || 0) - (a.usageCount || 0);
        }
        return a.name.localeCompare(b.name, 'fa');
      });
    } catch {
      return [...DEFAULT_REFERRING_PHYSICIANS];
    }
  },

  saveReferringPhysicians(list: ReferringPhysicianItem[]): void {
    localStorage.setItem(STORAGE_KEYS.REFERRING_PHYSICIANS, JSON.stringify(list));
  },

  addOrIncrementReferringPhysician(rawName: string): ReferringPhysicianItem[] {
    const cleanName = rawName.trim();
    if (!cleanName) return this.getReferringPhysicians();
    const list = this.getReferringPhysicians();
    const existingIdx = list.findIndex(
      (item) => item.name.trim().toLowerCase() === cleanName.toLowerCase()
    );
    const nowIso = new Date().toISOString();

    if (existingIdx >= 0) {
      list[existingIdx] = {
        ...list[existingIdx],
        usageCount: (list[existingIdx].usageCount || 0) + 1,
        lastUsedAt: nowIso,
      };
    } else {
      list.push({
        id: `ref-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: cleanName,
        usageCount: 1,
        lastUsedAt: nowIso,
      });
    }

    this.saveReferringPhysicians(list);
    return this.getReferringPhysicians();
  },

  deleteReferringPhysician(id: string): ReferringPhysicianItem[] {
    const list = this.getReferringPhysicians().filter((item) => item.id !== id);
    this.saveReferringPhysicians(list);
    return list;
  },

  // TYPISTS (اپراتورها و تایپیست‌های مرکز)
  getTypists(): Typist[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TYPISTS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.TYPISTS, JSON.stringify(DEFAULT_TYPISTS));
        return DEFAULT_TYPISTS;
      }
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_TYPISTS;
    } catch {
      return DEFAULT_TYPISTS;
    }
  },

  saveTypists(typists: Typist[]): void {
    localStorage.setItem(STORAGE_KEYS.TYPISTS, JSON.stringify(typists));
  },

  addTypist(typist: Omit<Typist, 'id'>): Typist {
    const list = this.getTypists();
    const newTypist: Typist = {
      ...typist,
      id: `typ-${Date.now()}`,
    };
    list.push(newTypist);
    this.saveTypists(list);
    return newTypist;
  },

  updateTypist(id: string, updates: Partial<Typist>): Typist[] {
    const list = this.getTypists().map((t) => (t.id === id ? { ...t, ...updates } : t));
    this.saveTypists(list);
    return list;
  },

  deleteTypist(id: string): Typist[] {
    const list = this.getTypists().filter((t) => t.id !== id);
    this.saveTypists(list);
    return list;
  },

  // TEMPLATES
  getTemplates(): MedicalTemplate[] {
    try {
      const seedUsageCounts = (items: MedicalTemplate[]): { list: MedicalTemplate[]; changed: boolean } => {
        let changed = false;
        const list = items.map((t, idx) => {
          if (typeof t.usageCount !== 'number') {
            changed = true;
            // Give pinned / core templates a baseline frequency so default sort is immediately meaningful
            const baseCount = t.isPinned ? Math.max(5, 16 - (idx % 10)) : Math.max(1, 6 - (idx % 6));
            return { ...t, usageCount: baseCount };
          }
          return t;
        });
        return { list, changed };
      };

      const data = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
      if (!data) {
        const seeded = seedUsageCounts(DEFAULT_TEMPLATES).list;
        localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(seeded));
        return seeded;
      }
      let parsed: MedicalTemplate[] = JSON.parse(data);

      // Add any newly introduced default templates that aren't in localStorage yet
      const existingIds = new Set(parsed.map((t) => t.id));
      let modified = false;
      DEFAULT_TEMPLATES.forEach((defTpl) => {
        if (!existingIds.has(defTpl.id)) {
          parsed.push(defTpl);
          modified = true;
        }
      });

      // Ensure each modality (mri, ct, sonography) has its default pinned templates if none are pinned for that modality yet
      (['sonography', 'mri', 'ct'] as Modality[]).forEach((mod) => {
        const hasPinnedForMod = parsed.some((t) => t.modality === mod && t.isPinned);
        if (!hasPinnedForMod) {
          const defaultPinnedIds = new Set(
            DEFAULT_TEMPLATES.filter((d) => d.modality === mod && d.isPinned).map((d) => d.id)
          );
          parsed = parsed.map((t) => {
            if (t.modality === mod && defaultPinnedIds.has(t.id)) {
              modified = true;
              return { ...t, isPinned: true };
            }
            return t;
          });
        }
      });

      const seededRes = seedUsageCounts(parsed);
      if (seededRes.changed) {
        parsed = seededRes.list;
        modified = true;
      }

      if (modified) {
        localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(parsed));
      }
      return parsed;
    } catch {
      return DEFAULT_TEMPLATES;
    }
  },

  saveTemplates(templates: MedicalTemplate[]): void {
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
  },

  incrementTemplateUsage(id: string): MedicalTemplate[] {
    const templates = this.getTemplates().map((t) =>
      t.id === id ? { ...t, usageCount: (t.usageCount || 0) + 1 } : t
    );
    this.saveTemplates(templates);
    return templates;
  },

  addTemplate(template: Omit<MedicalTemplate, 'id' | 'createdAt' | 'updatedAt'>): MedicalTemplate {
    const templates = this.getTemplates();
    const newTpl: MedicalTemplate = {
      ...template,
      usageCount: template.usageCount ?? 1,
      id: `tpl-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    templates.unshift(newTpl);
    this.saveTemplates(templates);
    return newTpl;
  },

  updateTemplate(id: string, updates: Partial<MedicalTemplate>): MedicalTemplate[] {
    const templates = this.getTemplates().map((t) =>
      t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
    );
    this.saveTemplates(templates);
    return templates;
  },

  togglePinTemplate(id: string): MedicalTemplate[] {
    const templates = this.getTemplates().map((t) =>
      t.id === id ? { ...t, isPinned: !t.isPinned, updatedAt: new Date().toISOString() } : t
    );
    this.saveTemplates(templates);
    return templates;
  },

  deleteTemplate(id: string): MedicalTemplate[] {
    const templates = this.getTemplates().filter((t) => t.id !== id);
    this.saveTemplates(templates);
    return templates;
  },

  /**
   * Clone/Copy template from one doctor to another doctor
   */
  cloneTemplateToDoctor(
    templateId: string,
    targetDoctorId: string,
    newTitle?: string
  ): MedicalTemplate | null {
    const templates = this.getTemplates();
    const source = templates.find((t) => t.id === templateId);
    if (!source) return null;

    const cloned: MedicalTemplate = {
      ...source,
      id: `tpl-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: newTitle || `${source.title} (کپی اختصاصی)`,
      doctorId: targetDoctorId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    templates.unshift(cloned);
    this.saveTemplates(templates);
    return cloned;
  },

  // SHORTCUTS / MACROS
  getShortcuts(): MedicalShortcut[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SHORTCUTS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.SHORTCUTS, JSON.stringify(DEFAULT_SHORTCUTS));
        return DEFAULT_SHORTCUTS;
      }
      const parsed: MedicalShortcut[] = JSON.parse(data);
      const existingTriggers = new Set(parsed.map((s) => s.trigger));
      const missingDefaults = DEFAULT_SHORTCUTS.filter((d) => !existingTriggers.has(d.trigger));
      if (missingDefaults.length > 0) {
        const merged = [...missingDefaults, ...parsed];
        localStorage.setItem(STORAGE_KEYS.SHORTCUTS, JSON.stringify(merged));
        return merged;
      }
      return parsed;
    } catch {
      return DEFAULT_SHORTCUTS;
    }
  },

  saveShortcuts(shortcuts: MedicalShortcut[]): void {
    localStorage.setItem(STORAGE_KEYS.SHORTCUTS, JSON.stringify(shortcuts));
  },

  addShortcut(shortcut: Omit<MedicalShortcut, 'id'>): MedicalShortcut {
    const list = this.getShortcuts();
    const newSc: MedicalShortcut = {
      ...shortcut,
      id: `sc-${Date.now()}`,
    };
    list.push(newSc);
    this.saveShortcuts(list);
    return newSc;
  },

  updateShortcut(id: string, updates: Partial<MedicalShortcut>): MedicalShortcut[] {
    const list = this.getShortcuts().map((sc) => (sc.id === id ? { ...sc, ...updates } : sc));
    this.saveShortcuts(list);
    return list;
  },

  deleteShortcut(id: string): MedicalShortcut[] {
    const list = this.getShortcuts().filter((sc) => sc.id !== id);
    this.saveShortcuts(list);
    return list;
  },

  // SAVED REPORTS (PATIENT ARCHIVE)
  generateSampleReports(): MedicalReport[] {
    const now = new Date();
    const todayIso = now.toISOString();
    const threeDaysAgoIso = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const tenDaysAgoIso = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const fortyFiveDaysAgoIso = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();

    let todayFa = '۱۴۰۴/۰۸/۲۱';
    let threeDaysFa = '۱۴۰۴/۰۸/۱۸';
    let tenDaysFa = '۱۴۰۴/۰۸/۱۱';
    let fortyFiveDaysFa = '۱۴۰۴/۰۷/۰۶';
    try {
      todayFa = new Intl.DateTimeFormat('fa-IR-u-nu-latn').format(now);
      threeDaysFa = new Intl.DateTimeFormat('fa-IR-u-nu-latn').format(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000));
      tenDaysFa = new Intl.DateTimeFormat('fa-IR-u-nu-latn').format(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000));
      fortyFiveDaysFa = new Intl.DateTimeFormat('fa-IR-u-nu-latn').format(new Date(Date.now() - 45 * 24 * 60 * 60 * 1000));
    } catch {}

    return [
      {
        id: 'rep-sample-today-1',
        doctorId: 'doc-1',
        typistId: 'typ-1',
        typistName: 'خانم رضایی',
        status: 'finalized',
        createdAt: todayIso,
        updatedAt: todayIso,
        patientInfo: {
          fullName: 'سارا محمدی',
          nationalId: '۰۰۲۱۴۵۸۹۶۳',
          age: '۳۴',
          gender: 'female',
          admissionNumber: 'ADM-8921',
          reportDate: todayFa,
          referringPhysician: 'دکتر علوی (متخصص داخلی)',
        },
        studies: [
          {
            id: 'study-sample-1',
            modality: 'sonography',
            titleAndTechnique: 'سونوگرافی کامل شکم و لگن با پروب کانوکس ۳.۵ مگاهرتز',
            findingsHtml: '<p><strong>کبد:</strong> دارای ابعاد و لبه‌های طبیعی است. اکوپترن پارانشیم هموژن و فاقد ضایعه فضاگیر است.</p><p><strong>کیسه صفرا:</strong> جدار نازک و فاقد سنگ یا لجن صفراوی.</p><p><strong>کلیه‌ها و مثانه:</strong> وضعیت و اندازه نرمال، بدون سنگ یا هیدرونفروز.</p>',
            showComparison: false,
            comparison: '',
            showImpression: true,
            impressionHtml: '<p>بررسی سونوگرافی شکم و لگن نرمال فیزیولوژیک می‌باشد.</p>',
            showRecommendations: false,
            recommendationsHtml: '',
          },
        ],
      },
      {
        id: 'rep-sample-month-1',
        doctorId: 'doc-3',
        typistId: 'typ-2',
        typistName: 'خانم حسینی',
        status: 'finalized',
        createdAt: threeDaysAgoIso,
        updatedAt: threeDaysAgoIso,
        patientInfo: {
          fullName: 'محمدرضا علیزاده',
          nationalId: '۰۳۸۴۷۱۲۹۰۱',
          age: '۴۷',
          gender: 'male',
          admissionNumber: 'ADM-8740',
          reportDate: threeDaysFa,
          referringPhysician: 'دکتر صابری (متخصص مغز و اعصاب)',
        },
        studies: [
          {
            id: 'study-sample-2',
            modality: 'mri',
            titleAndTechnique: 'MRI مغز بدون تزریق با سکانس‌های Sagittal T1, Axial T2, FLAIR, DWI',
            findingsHtml: '<p>ساختار مغز و تمایز ماده سفید و خاکستری طبیعی است. افت دیفیوژن حاد (DWI Restriction) رویت نشد. شیفت خط وسط مشاهده نمی‌شود.</p>',
            showComparison: false,
            comparison: '',
            showImpression: true,
            impressionHtml: '<p>ام‌آر‌آی مغز در حد نرمال فیزیولوژیک سن بیمار می‌باشد.</p>',
            showRecommendations: false,
            recommendationsHtml: '',
          },
        ],
      },
      {
        id: 'rep-sample-month-2',
        doctorId: 'doc-1',
        typistId: 'typ-1',
        typistName: 'خانم رضایی',
        status: 'finalized',
        createdAt: tenDaysAgoIso,
        updatedAt: tenDaysAgoIso,
        patientInfo: {
          fullName: 'فاطمه کاظمی',
          nationalId: '۰۰۷۹۳۸۲۱۴۵',
          age: '۵۸',
          gender: 'female',
          admissionNumber: 'ADM-8512',
          reportDate: tenDaysFa,
          referringPhysician: 'دکتر معتمدی (فوق تخصص ریه)',
        },
        studies: [
          {
            id: 'study-sample-3',
            modality: 'ct',
            titleAndTechnique: 'سی‌تی‌اسکن قفسه سینه با مقاطع نازک (HRCT) با پروتکل استاندارد',
            findingsHtml: '<p>در پارانشیم هر دو ریه تصویر ندول یا توده فضاگیر رویت نشد. شواهدی از گراند گلاس، برونشکتازی یا کدورت آلوئولار مشاهده نمی‌شود. لنفادنوپاتی مدیاستینال دیده نشد.</p>',
            showComparison: false,
            comparison: '',
            showImpression: true,
            impressionHtml: '<p>بررسی HRCT قفسه سینه شواهدی از بیماری فعال پارانشیمال نشان نمی‌دهد.</p>',
            showRecommendations: false,
            recommendationsHtml: '',
          },
        ],
      },
      {
        id: 'rep-sample-year-1',
        doctorId: 'doc-2',
        typistId: 'typ-3',
        typistName: 'آقای مرادی',
        status: 'finalized',
        createdAt: fortyFiveDaysAgoIso,
        updatedAt: fortyFiveDaysAgoIso,
        patientInfo: {
          fullName: 'امیرحسین کریمی',
          nationalId: '۰۰۱۸۲۴۷۳۹۲',
          age: '۲۹',
          gender: 'male',
          admissionNumber: 'ADM-7820',
          reportDate: fortyFiveDaysFa,
          referringPhysician: 'دکتر شمس (جراح ارتوپدی)',
        },
        studies: [
          {
            id: 'study-sample-4',
            modality: 'mri',
            titleAndTechnique: 'MRI زانوی راست با پروتکل استاندارد در مقاطع Sagittal, Coronal و Axial',
            findingsHtml: '<p>مینیسک داخلی سالم است. در شاخ خلفی مینیسک خارجی تغییر سیگنال خطی هماهنگ با پارگی گرید ۳ رویت شد. کشیدگی ACL مشهود است.</p>',
            showComparison: false,
            comparison: '',
            showImpression: true,
            impressionHtml: '<p>پارگی شاخ خلفی مینیسک خارجی (Lateral Meniscal Tear).</p>',
            showRecommendations: false,
            recommendationsHtml: '',
          },
        ],
      },
    ];
  },

  getSavedReports(): MedicalReport[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.REPORTS);
      if (!data) {
        const samples = this.generateSampleReports();
        localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(samples));
        return samples;
      }
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      const samples = this.generateSampleReports();
      localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(samples));
      return samples;
    } catch {
      return this.generateSampleReports();
    }
  },

  saveReport(report: Omit<MedicalReport, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): MedicalReport {
    const reports = this.getSavedReports();
    const now = new Date().toISOString();
    let updatedReport: MedicalReport;

    if (report.id) {
      const existingIndex = reports.findIndex((r) => r.id === report.id);
      if (existingIndex >= 0) {
        updatedReport = {
          ...reports[existingIndex],
          ...report,
          id: report.id,
          updatedAt: now,
        };
        reports[existingIndex] = updatedReport;
      } else {
        updatedReport = {
          ...report,
          id: report.id,
          createdAt: now,
          updatedAt: now,
        } as MedicalReport;
        reports.unshift(updatedReport);
      }
    } else {
      updatedReport = {
        ...report,
        id: `rep-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      } as MedicalReport;
      reports.unshift(updatedReport);
    }

    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
    return updatedReport;
  },

  deleteReport(id: string): MedicalReport[] {
    const reports = this.getSavedReports().filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
    return reports;
  },

  // SETTINGS
  getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
        return DEFAULT_SETTINGS;
      }
      const parsed = JSON.parse(data);
      // Migrate old default clinic data to Shafa Hospital
      if (!parsed.clinicName || parsed.clinicName.includes('پارسیان') || !parsed.clinicSubtitle) {
        parsed.clinicName = DEFAULT_SETTINGS.clinicName;
        parsed.clinicSubtitle = DEFAULT_SETTINGS.clinicSubtitle;
        parsed.clinicAddress = DEFAULT_SETTINGS.clinicAddress;
        parsed.clinicPhone = DEFAULT_SETTINGS.clinicPhone;
        parsed.clinicLogoText = '';
        const merged = { ...DEFAULT_SETTINGS, ...parsed };
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(merged));
        return merged;
      }
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: Partial<AppSettings>): AppSettings {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    return updated;
  },

  // DRAFT AUTO-SAVE
  getDraft(): any | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_DRAFT);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  saveDraft(draft: any): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_DRAFT, JSON.stringify(draft));
  },

  clearDraft(): void {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_DRAFT);
  },

  // MULTI-PATIENT OPEN WORKSPACE TABS
  getOpenTabs(): PatientWorkspaceTab[] | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.OPEN_TABS);
      if (!data) return null;
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
    } catch {
      return null;
    }
  },

  saveOpenTabs(tabs: PatientWorkspaceTab[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.OPEN_TABS, JSON.stringify(tabs));
    } catch {}
  },

  // FULL EXPORT / IMPORT FOR BACKUP
  exportAllData(): string {
    const backup = {
      version: '1.1',
      exportedAt: new Date().toISOString(),
      doctors: this.getDoctors(),
      typists: this.getTypists(),
      templates: this.getTemplates(),
      shortcuts: this.getShortcuts(),
      reports: this.getSavedReports(),
      settings: this.getSettings(),
    };
    return JSON.stringify(backup, null, 2);
  },

  importAllData(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      if (data.doctors) this.saveDoctors(data.doctors);
      if (data.typists) this.saveTypists(data.typists);
      if (data.templates) this.saveTemplates(data.templates);
      if (data.shortcuts) this.saveShortcuts(data.shortcuts);
      if (data.reports) localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(data.reports));
      if (data.settings) this.saveSettings(data.settings);
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  },

  resetToDefaults(): void {
    localStorage.setItem(STORAGE_KEYS.DOCTORS, JSON.stringify(DEFAULT_DOCTORS));
    localStorage.setItem(STORAGE_KEYS.TYPISTS, JSON.stringify(DEFAULT_TYPISTS));
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(DEFAULT_TEMPLATES));
    localStorage.setItem(STORAGE_KEYS.SHORTCUTS, JSON.stringify(DEFAULT_SHORTCUTS));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
  },
};
