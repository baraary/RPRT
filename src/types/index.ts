export type Modality = 'mri' | 'ct' | 'sonography';

export interface Doctor {
  id: string;
  name: string;
  medicalCouncilId: string; // شماره نظام پزشکی
  specialty: string; // فلوشیپ یا تخصص
  title: string; // دکتر ...
  clinicName?: string;
  stampText?: string; // متن مهر
  signatureUrl?: string; // تصویر امضا و مهر دیجیتال اختصاصی پزشک
  isDefault?: boolean;
}

export interface MedicalTemplate {
  id: string;
  title: string;
  modality: Modality;
  doctorId: string; // 'all' or doctorId
  tags: string[];
  technique: string;
  clinicalIndication?: string;
  comparison: string;
  findingsHtml: string;
  impressionHtml: string;
  recommendationsHtml?: string;
  isDefault?: boolean;
  isPinned?: boolean;
  usageCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReferringPhysicianItem {
  id: string;
  name: string;
  usageCount: number;
  lastUsedAt?: string;
}

export interface MedicalShortcut {
  id: string;
  trigger: string; // e.g., ".norm", ".krec", "abd", "!brain_nl"
  label: string; // عنوان کوتاه
  expansion: string; // متنی که جایگزین می‌شود
  category: 'general' | 'normal' | 'pathology' | 'impression' | 'recommendation';
  modality?: Modality | 'all';
  organ?: string; // نام عضو مربوطه (مثلاً: 'کبد'، 'کیسه صفرا'، 'کلیه‌ها' و ...) برای ادغام با انتخابگر وضعیت اعضا
  hotkey?: string; // e.g., "Alt+T", "Alt+M", "Ctrl+Shift+1"
  targetTemplateId?: string; // در صورت اتصال کلید میانبر به یک قالب خاص آماده
  isAutocorrect?: boolean; // true if plain word autocorrect without dot
}

export interface PatientInfo {
  fullName: string;
  nationalId: string;
  age: string;
  gender: 'female' | 'male' | 'other';
  admissionNumber: string;
  reportDate: string;
  referringPhysician: string;
}

export interface ReportStudy {
  id: string;
  modality: Modality;
  titleAndTechnique: string; // عنوان (شامل نوع تصویربرداری، پروتکل و اطلاعات تصویربرداری)
  findingsHtml: string;
  showComparison: boolean;
  comparison: string;
  showImpression: boolean;
  impressionHtml: string;
  showRecommendations: boolean;
  recommendationsHtml: string;
}

export interface Typist {
  id: string;
  name: string;
  color: string; // badge color identifier ('sky' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'purple')
  isDefault?: boolean;
}

export interface ReportRevision {
  id: string;
  version: number;
  savedAt: string;
  savedAtFa: string;
  typistName: string;
  status: 'draft' | 'finalized' | 'printed';
  note?: string;
  studies: ReportStudy[];
}

export interface MedicalReport {
  id: string;
  patientInfo: PatientInfo;
  studies: ReportStudy[];
  doctorId: string;
  typistId?: string;
  typistName?: string;
  status: 'draft' | 'finalized' | 'printed';
  isLocked?: boolean; // قفل خودکار پس از چاپ نهایی جهت جلوگیری از تغییر ناخواسته
  revisions?: ReportRevision[]; // تاریخچه نسخه‌ها و اصلاحیه‌های گزارش (Version History)
  criticalAlert?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomFont {
  id: string;
  name: string;
  family: string;
  url?: string;
}

export interface ModalityColors {
  sonography: string;
  mri: string;
  ct: string;
}

export interface CustomDictionaryTerm {
  id: string;
  phrase: string; // جمله یا اصطلاح کامل پزشکی
  keyword?: string; // کلمه کلیدی محرک (اختیاری)
  doctorId: string; // 'all' or specific doctorId
  modality: Modality | 'all';
  createdAt: string;
}

export interface AppSettings {
  smartSuggestionsEnabled: boolean;
  numberSlotsEnabled?: boolean;
  darkMode?: boolean;
  uiFont?: string; // فونت کل رابط کاربری برنامه (منوها، دکمه‌ها و پنل‌ها)
  activeDoctorId: string;
  activeTypistId?: string;
  clinicName: string;
  clinicSubtitle?: string;
  clinicAddress: string;
  clinicPhone: string;
  clinicLogoText: string;
  clinicLogoUrl?: string; // تصویر لوگوی مرکز (آپلود شده یا نمونه)
  doctorSignatureUrl?: string; // تصویر امضای دیجیتال پیش‌فرض قدیمی (غیرفعال به نفع امضای مستقل هر پزشک)
  defaultFont: string;
  defaultFontSize: number;
  editorLineHeight?: number; // فاصله خطوط اختصاصی محیط ویرایشگر متنی (پیش‌فرض 1.9)
  printLineHeight?: number; // فاصله خطوط اختصاصی پیش‌نمایش و چاپ A4 (پیش‌فرض 1.75)
  modalityColors?: ModalityColors; // رنگ اختصاصی هر مدالیته در برنامه و چاپ سربرگ
  customDictionary?: CustomDictionaryTerm[]; // دیکشنری اختصاصی جملات و اصطلاحات پزشکی با اولویت پزشک فعال
  autoSaveInterval: number; // in seconds
  // Letterhead / Header typography customization
  headerFont?: string; // فونت سربرگ گزارش و کادر مشخصات بیمار
  headerFontSize?: number; // سایز فونت عنوان سربرگ مرکز (مثلاً 16 تا 24 پیکسل)
  // Headings customization
  headingFont: string;
  headingFontSize: string; // e.g., '16px', '18px', '20px'
  headingBold: boolean;
  headingColor: string;
  // Page break & Print settings
  pageBreakPerStudy: boolean;
  preprintedLetterheadMode?: boolean; // چاپ روی کاغذ سربرگ‌دار فیزیکی آماده (حذف هدر و فوتر)
  preprintedTopMarginMm?: number; // فاصله از بالای کاغذ سربرگ آماده (میلی‌متر)
  preprintedBottomMarginMm?: number; // فاصله از پایین کاغذ سربرگ آماده (میلی‌متر)
  monochromePrintMode?: boolean; // حالت چاپ سیاه‌وسفید لیزری (Monochrome)
  // Storage, LAN Sync & Local Folder Auto-Backup
  lanSyncEnabled?: boolean;
  autoFolderBackupEnabled?: boolean;
  customFonts: CustomFont[];
}

export interface PatientWorkspaceTab {
  id: string;
  patientInfo: PatientInfo;
  studies: ReportStudy[];
  modality: Modality;
  doctorId: string;
  typistId?: string;
  status: 'draft' | 'saved' | 'printed';
  updatedAt: string;
}




