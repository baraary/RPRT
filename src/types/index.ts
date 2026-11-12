export type Modality = 'mri' | 'ct' | 'sonography';

export interface Doctor {
  id: string;
  name: string;
  medicalCouncilId: string; // شماره نظام پزشکی
  specialty: string; // فلوشیپ یا تخصص
  title: string; // دکتر ...
  clinicName?: string;
  stampText?: string; // متن مهر
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
  trigger: string; // e.g., ".norm", ".krec", "!brain_nl"
  label: string; // عنوان کوتاه
  expansion: string; // متنی که جایگزین می‌شود
  category: 'general' | 'normal' | 'pathology' | 'impression' | 'recommendation';
  modality?: Modality | 'all';
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

export interface MedicalReport {
  id: string;
  patientInfo: PatientInfo;
  studies: ReportStudy[];
  doctorId: string;
  typistId?: string;
  typistName?: string;
  status: 'draft' | 'finalized' | 'printed';
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

export interface AppSettings {
  smartSuggestionsEnabled: boolean;
  numberSlotsEnabled?: boolean;
  darkMode?: boolean;
  activeDoctorId: string;
  activeTypistId?: string;
  clinicName: string;
  clinicSubtitle?: string;
  clinicAddress: string;
  clinicPhone: string;
  clinicLogoText: string;
  clinicLogoUrl?: string; // تصویر لوگوی مرکز (آپلود شده یا نمونه)
  doctorSignatureUrl?: string; // تصویر امضای دیجیتال پزشک (آپلود شده یا نمونه)
  defaultFont: string;
  defaultFontSize: number;
  autoSaveInterval: number; // in seconds
  // Headings customization
  headingFont: string;
  headingFontSize: string; // e.g., '16px', '18px', '20px'
  headingBold: boolean;
  headingColor: string;
  // Page break settings
  pageBreakPerStudy: boolean;
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



