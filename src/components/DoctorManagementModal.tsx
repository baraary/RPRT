import React, { useState } from 'react';
import { Doctor, CustomFont } from '../types';
import { User, X, Plus, Trash2, PenTool, Upload, Check, Pencil, Type } from 'lucide-react';

// Built-in vector sample Doctor Digital Signatures (100% offline SVG Data URIs - pure vector paths so canvas/PNG export never scrambles text)
const SAMPLE_DOCTOR_SIGNATURES: { id: string; label: string; url: string }[] = [
  {
    id: 'sig-blue-classic',
    label: 'امضای رسمی پزشکی (جوهر آبی)',
    url: `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 90" width="260" height="90">
        <path d="M35 66 C55 22, 85 18, 92 54 C96 72, 72 76, 82 46 C94 18, 134 26, 128 58 C124 72, 148 35, 168 42 C186 48, 198 30, 224 24" fill="none" stroke="#1d4ed8" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M26 74 Q130 56 236 64" fill="none" stroke="#1e40af" stroke-width="2" stroke-linecap="round"/>
        <circle cx="195" cy="50" r="2.2" fill="#1d4ed8"/>
        <circle cx="204" cy="47" r="2.2" fill="#1d4ed8"/>
      </svg>`
    )}`,
  },
  {
    id: 'sig-teal-seal',
    label: 'امضا و مهر تایید رادیولوژی',
    url: `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 90" width="260" height="90">
        <circle cx="62" cy="45" r="34" fill="none" stroke="#0f766e" stroke-width="2.2" stroke-dasharray="5 3" opacity="0.75"/>
        <circle cx="62" cy="45" r="27" fill="none" stroke="#0f766e" stroke-width="1.3" opacity="0.55"/>
        <path d="M62 24 L65 37 L78 37 L67 45 L71 58 L62 50 L53 58 L57 45 L46 37 L59 37 Z" fill="none" stroke="#0f766e" stroke-width="1.4" opacity="0.55"/>
        <path d="M44 62 C78 16, 114 24, 108 58 C104 76, 138 24, 158 52 C172 70, 195 28, 232 34" fill="none" stroke="#0f172a" stroke-width="3" stroke-linecap="round"/>
        <path d="M40 70 Q145 58 238 62" fill="none" stroke="#0f766e" stroke-width="2.2" stroke-linecap="round"/>
      </svg>`
    )}`,
  },
  {
    id: 'sig-navy-exec',
    label: 'امضای خط شکسته (سرمه‌ای)',
    url: `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 90" width="260" height="90">
        <path d="M48 68 C42 30, 88 12, 105 46 C118 72, 134 22, 154 44 C168 60, 185 35, 218 28 C200 52, 150 74, 34 74" fill="none" stroke="#1e293b" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`
    )}`,
  },
];

const STAMP_FONT_OPTIONS: { label: string; value: string }[] = [
  { label: 'وزیرمتن استاندارد (Vazirmatn)', value: "'Vazirmatn', sans-serif" },
  { label: 'لاله‌زار بولد و رسمی (Lalezar)', value: "'Lalezar', 'Vazirmatn', sans-serif" },
  { label: 'پرستو / نازنین کلاسیک (Parastoo)', value: "'Parastoo', 'Amiri', 'Vazirmatn', serif" },
  { label: 'تنها — سنتی ویژه مهر (Tanha)', value: "'Tanha', 'Vazirmatn', serif" },
  { label: 'امیری کلاسیک پزشکی (Amiri)', value: "'Amiri', 'Vazirmatn', serif" },
  { label: 'نسخ رسمی (Noto Naskh Arabic)', value: "'Noto Naskh Arabic', 'Vazirmatn', serif" },
  { label: 'ساحل رسمی (Sahel)', value: "'Sahel', 'Vazirmatn', sans-serif" },
  { label: 'شبنم مدرن (Shabnam)', value: "'Shabnam', 'Vazirmatn', sans-serif" },
  { label: 'صمیم کلاسیک (Samim)', value: "'Samim', 'Vazirmatn', sans-serif" },
  { label: 'مرکزی رسمی (Markazi Text)', value: "'Markazi Text', 'Vazirmatn', serif" },
  { label: 'ریدکس مدرن (Readex Pro)', value: "'Readex Pro', 'Vazirmatn', sans-serif" },
  { label: 'بی تیتر (B Titr + لاله‌زار)', value: "'B Titr', 'Lalezar', 'Vazirmatn', sans-serif" },
  { label: 'بی نازنین (B Nazanin + پرستو)', value: "'B Nazanin', 'Parastoo', 'Amiri', 'Noto Naskh Arabic', 'Vazirmatn', serif" },
  { label: 'ایران نستعلیق (IranNastaliq + امیری)', value: "'IranNastaliq', 'Amiri', 'Vazirmatn', serif" },
];

interface DoctorManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctors: Doctor[];
  activeDoctorId: string;
  onSelectDoctor: (id: string) => void;
  onAddDoctor: (doctor: Omit<Doctor, 'id'>) => void;
  onUpdateDoctor?: (id: string, updates: Partial<Doctor>) => void;
  onDeleteDoctor: (id: string) => void;
  defaultSignatureUrl?: string;
  onUpdateDefaultSignatureUrl?: (url: string) => void;
  customFonts?: CustomFont[];
}

export const DoctorManagementModal: React.FC<DoctorManagementModalProps> = ({
  isOpen,
  onClose,
  doctors,
  activeDoctorId,
  onSelectDoctor,
  onAddDoctor,
  onUpdateDoctor,
  onDeleteDoctor,
  customFonts = [],
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [medicalCouncilId, setMedicalCouncilId] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [stampText, setStampText] = useState('');
  const [stampFont, setStampFont] = useState("'Vazirmatn', sans-serif");
  const [stampFontSize, setStampFontSize] = useState<number>(13);
  const [newSignatureUrl, setNewSignatureUrl] = useState('');
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentExpandedId = expandedDocId ?? activeDoctorId;

  const allFontOptions = [
    ...STAMP_FONT_OPTIONS,
    ...customFonts
      .filter((cf) => !STAMP_FONT_OPTIONS.some((o) => o.value.includes(cf.family)))
      .map((cf) => ({
        label: `${cf.name} (سفارشی)`,
        value: `'${cf.family}', 'Vazirmatn', sans-serif`,
      })),
  ];

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    onResult: (dataUrl: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === 'string') {
        onResult(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !medicalCouncilId.trim()) return;

    onAddDoctor({
      name: name.trim(),
      title: name.trim(),
      medicalCouncilId: medicalCouncilId.trim(),
      specialty: specialty.trim() || 'متخصص رادیولوژی و سونوگرافی',
      stampText:
        stampText.trim() || `${name.trim()} - متخصص رادیولوژی - ن.پ ${medicalCouncilId.trim()}`,
      stampFont: stampFont || "'Vazirmatn', sans-serif",
      stampFontSize: stampFontSize || 13,
      signatureUrl: newSignatureUrl || undefined,
    });

    setName('');
    setMedicalCouncilId('');
    setSpecialty('');
    setStampText('');
    setStampFont("'Vazirmatn', sans-serif");
    setStampFontSize(13);
    setNewSignatureUrl('');
    setShowAddForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-linear-to-r from-teal-800 to-teal-600 text-white flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-teal-200 shrink-0" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base">
                مدیریت و ویرایش پزشکان متخصص، فونت نام، مهر و امضای دیجیتال
              </h3>
              <p className="text-[11px] text-teal-100 mt-0.5">
                افزودن یا ویرایش نام پزشک، فونت اختصاصی نام و مهر، شماره نظام پزشکی، تخصص و امضای دیجیتال پای برگه A4
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-2.5 rounded-xl bg-black/20 hover:bg-rose-600 text-white border border-white/20 hover:border-rose-500 flex items-center gap-1 text-xs font-bold shrink-0 transition-colors cursor-pointer"
          >
            <span>بستن</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-slate-600">
              برای ویرایش نام، فونت مهر و امضا، تخصص یا نظام پزشکی هر پزشک روی دکمه «ویرایش اطلاعات و مهر» کلیک کنید:
            </span>
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>افزودن پزشک جدید</span>
            </button>
          </div>

          {/* Add form */}
          {showAddForm && (
            <form
              onSubmit={handleAdd}
              className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-fadeIn"
            >
              <div className="text-xs font-bold text-slate-800">مشخصات، فونت مهر و امضای پزشک جدید</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    نام و نام خانوادگی پزشک:
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="دکتر ..."
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    شماره نظام پزشکی:
                  </label>
                  <input
                    type="text"
                    required
                    value={medicalCouncilId}
                    onChange={(e) => setMedicalCouncilId(e.target.value)}
                    placeholder="۱۲۳۴۵"
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white font-mono"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    تخصص یا فلوشیپ در مهر (با Enter چندخطی کنید):
                  </label>
                  <textarea
                    rows={2}
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder={"متخصص رادیولوژی و سونوگرافی\nفلوشیپ ام‌آر‌آی و اینترونشن"}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white resize-y leading-relaxed"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    متن مهر دیجیتال انتهای گزارش:
                  </label>
                  <input
                    type="text"
                    value={stampText}
                    onChange={(e) => setStampText(e.target.value)}
                    placeholder="دکتر ... - متخصص رادیولوژی و سونوگرافی - ن.پ ..."
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
              </div>

              {/* Font Family & Size for New Doctor Stamp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-white rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Type className="w-3.5 h-3.5 text-teal-600" />
                    <span>فونت نام پزشک و مهر در برگه چاپ:</span>
                  </label>
                  <select
                    value={stampFont}
                    onChange={(e) => setStampFont(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-slate-50 font-bold"
                  >
                    {allFontOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    سایز عنوان نام پزشک در مهر (پیکسل):
                  </label>
                  <select
                    value={stampFontSize}
                    onChange={(e) => setStampFontSize(Number(e.target.value))}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-slate-50 font-mono font-bold"
                  >
                    <option value={11}>۱۱ پیکسل (ظریف)</option>
                    <option value={12}>۱۲ پیکسل (متوسط)</option>
                    <option value={13}>۱۳ پیکسل (استاندارد)</option>
                    <option value={14}>۱۴ پیکسل (درشت)</option>
                    <option value={15}>۱۵ پیکسل (بسیار درشت)</option>
                    <option value={16}>۱۶ پیکسل (بولد ویژه)</option>
                    <option value={18}>۱۸ پیکسل (فوق درشت)</option>
                  </select>
                </div>
              </div>

              {/* Signature Upload / Sample Selection for New Doctor */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <PenTool className="w-3.5 h-3.5 text-indigo-600" />
                    <span>تصویر امضا و مهر دیجیتال پزشک:</span>
                  </span>
                  {newSignatureUrl && (
                    <button
                      type="button"
                      onClick={() => setNewSignatureUrl('')}
                      className="text-[10px] text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                    >
                      حذف تصویر امضا
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-24 h-12 rounded-lg bg-slate-50 border border-dashed border-slate-300 flex items-center justify-center shrink-0 overflow-hidden p-1">
                    {newSignatureUrl ? (
                      <img
                        src={newSignatureUrl}
                        alt="امضای پزشک"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-[10px] text-slate-400">بدون تصویر</span>
                    )}
                  </div>
                  <label className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg inline-flex items-center gap-1.5 cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>آپلود تصویر امضا / مهر</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, setNewSignatureUrl)}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {SAMPLE_DOCTOR_SIGNATURES.map((sample) => (
                    <button
                      key={sample.id}
                      type="button"
                      onClick={() => setNewSignatureUrl(sample.url)}
                      className={`p-1.5 rounded-lg border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        newSignatureUrl === sample.url
                          ? 'bg-indigo-50 border-indigo-600 ring-1 ring-indigo-500/30'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                      }`}
                    >
                      <img src={sample.url} alt={sample.label} className="w-14 h-8 object-contain" />
                      <span className="text-[9px] font-bold text-slate-700 line-clamp-1">
                        {sample.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-xs cursor-pointer"
                >
                  ذخیره پزشک جدید
                </button>
              </div>
            </form>
          )}

          {/* Doctors list */}
          <div className="space-y-3">
            {doctors.map((doc) => {
              const isCurrent = doc.id === activeDoctorId;
              const isExpanded = currentExpandedId === doc.id;
              const effectiveSignatureUrl = doc.signatureUrl || '';
              const docStampFont = doc.stampFont || "'Vazirmatn', sans-serif";
              const docStampFontSize = doc.stampFontSize || 13;

              const updateDocSignature = (url: string) => {
                onUpdateDoctor?.(doc.id, { signatureUrl: url });
              };

              return (
                <div
                  key={doc.id}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isCurrent
                      ? 'border-teal-500 bg-teal-50/30 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  {/* Doctor Header Row */}
                  <div className="p-4 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                        {doc.name.replace(/^دکتر\s*/, '').slice(0, 1) || 'پ'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4
                            className="text-xs sm:text-sm font-bold text-slate-900"
                            style={{ fontFamily: docStampFont }}
                          >
                            {doc.name}
                          </h4>
                          {isCurrent && (
                            <span className="text-[10px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">
                              پزشک فعال گزارش
                            </span>
                          )}
                          {effectiveSignatureUrl && (
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <PenTool className="w-2.5 h-2.5" />
                              <span>دارای امضای دیجیتال</span>
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 whitespace-pre-line leading-snug">
                          {doc.specialty}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          شماره نظام پزشکی: {doc.medicalCouncilId}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedDocId(isExpanded ? '' : doc.id)
                        }
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors flex items-center gap-1.5 cursor-pointer ${
                          isExpanded
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                            : 'border-indigo-200 text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100'
                        }`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>{isExpanded ? 'بستن پنل ویرایش' : 'ویرایش اطلاعات و مهر'}</span>
                      </button>

                      {!isCurrent ? (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectDoctor(doc.id);
                            setExpandedDocId(doc.id);
                          }}
                          className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-teal-300 text-teal-700 hover:bg-teal-50 transition-colors cursor-pointer"
                        >
                          انتخاب به عنوان پزشک جاری
                        </button>
                      ) : (
                        <span className="text-[11px] font-bold text-teal-700 px-2.5 py-1 rounded-xl bg-teal-100/70 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>انتخاب‌شده</span>
                        </span>
                      )}

                      {doctors.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onDeleteDoctor(doc.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer"
                          title="حذف پزشک"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expandable Full Doctor Info, Stamp Font & Digital Signature Editor */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-3.5 border-t border-slate-200/80 bg-white/95 space-y-3.5 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                          <Pencil className="w-3.5 h-3.5 text-indigo-600" />
                          <span>ویرایش مشخصات کامل پزشک، فونت نام و مهر چاپی:</span>
                        </span>
                        <span className="text-[10.5px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                          ✓ تغییرات به صورت آنی ذخیره می‌شوند
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            نام و نام خانوادگی پزشک:
                          </label>
                          <input
                            type="text"
                            value={doc.name}
                            onChange={(e) =>
                              onUpdateDoctor?.(doc.id, {
                                name: e.target.value,
                                title: e.target.value,
                              })
                            }
                            placeholder="دکتر ..."
                            className="w-full text-xs p-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-500 focus:outline-none font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            شماره نظام پزشکی در مهر چاپی:
                          </label>
                          <input
                            type="text"
                            dir="ltr"
                            value={doc.medicalCouncilId}
                            onChange={(e) =>
                              onUpdateDoctor?.(doc.id, { medicalCouncilId: e.target.value })
                            }
                            placeholder="۴۵۸۹۲"
                            className="w-full text-xs p-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-500 focus:outline-none font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            عنوان تخصص یا فلوشیپ در مهر چاپی (با Enter چندخطی کنید):
                          </label>
                          <textarea
                            rows={2}
                            value={doc.specialty}
                            onChange={(e) =>
                              onUpdateDoctor?.(doc.id, { specialty: e.target.value })
                            }
                            placeholder={"متخصص رادیولوژی و سونوگرافی\nفلوشیپ تصویربرداری پیشرفته"}
                            className="w-full text-xs p-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-500 focus:outline-none resize-y leading-relaxed"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            متن مهر دیجیتال انتهای گزارش:
                          </label>
                          <input
                            type="text"
                            value={doc.stampText || ''}
                            onChange={(e) =>
                              onUpdateDoctor?.(doc.id, { stampText: e.target.value })
                            }
                            placeholder={`${doc.name} - ${doc.specialty} - ن.پ ${doc.medicalCouncilId}`}
                            className="w-full text-xs p-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Doctor Name & Stamp Font Family + Font Size Selector */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-teal-50/40 border border-teal-200/80">
                        <div>
                          <label className="block text-[11px] font-bold text-teal-950 mb-1 flex items-center gap-1.5">
                            <Type className="w-3.5 h-3.5 text-teal-700" />
                            <span>فونت نام پزشک و مهر چاپی:</span>
                          </label>
                          <select
                            value={docStampFont}
                            onChange={(e) =>
                              onUpdateDoctor?.(doc.id, { stampFont: e.target.value })
                            }
                            className="w-full text-xs p-2 rounded-xl border border-teal-300 bg-white focus:border-teal-600 focus:outline-none font-bold text-slate-800 cursor-pointer"
                          >
                            {allFontOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-teal-950 mb-1">
                            سایز فونت نام پزشک در مهر چاپی:
                          </label>
                          <select
                            value={docStampFontSize}
                            onChange={(e) =>
                              onUpdateDoctor?.(doc.id, {
                                stampFontSize: Number(e.target.value),
                              })
                            }
                            className="w-full text-xs p-2 rounded-xl border border-teal-300 bg-white focus:border-teal-600 focus:outline-none font-mono font-bold text-slate-800 cursor-pointer"
                          >
                            <option value={11}>۱۱ پیکسل (ظریف)</option>
                            <option value={12}>۱۲ پیکسل (متوسط)</option>
                            <option value={13}>۱۳ پیکسل (استاندارد)</option>
                            <option value={14}>۱۴ پیکسل (درشت)</option>
                            <option value={15}>۱۵ پیکسل (بسیار درشت)</option>
                            <option value={16}>۱۶ پیکسل (بولد ویژه)</option>
                            <option value={18}>۱۸ پیکسل (فوق درشت)</option>
                          </select>
                        </div>
                      </div>

                      {/* Digital Signature Upload + Samples + Live Stamp Box Preview */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-stretch">
                        {/* Signature Upload & Sample Picker */}
                        <div className="sm:col-span-7 p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <PenTool className="w-3.5 h-3.5 text-indigo-600" />
                              <span>تصویر امضا / مهر پزشک (پای گزارش A4)</span>
                            </span>
                            {effectiveSignatureUrl && (
                              <button
                                type="button"
                                onClick={() => updateDocSignature('')}
                                className="text-[10px] text-rose-600 hover:text-rose-800 font-bold flex items-center gap-0.5 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>حذف امضا</span>
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-2.5">
                            <label className="flex-1 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs">
                              <Upload className="w-3.5 h-3.5" />
                              <span>آپلود تصویر امضا یا مهر از کامپیوتر</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(e, updateDocSignature)}
                                className="hidden"
                              />
                            </label>
                          </div>

                          <div className="space-y-1">
                            <div className="text-[10px] font-bold text-slate-500">
                              یا انتخاب سریع از میان امضاهای دیجیتال نمونه:
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                              {SAMPLE_DOCTOR_SIGNATURES.map((sample) => {
                                const isSelected = effectiveSignatureUrl === sample.url;
                                return (
                                  <button
                                    key={sample.id}
                                    type="button"
                                    onClick={() => updateDocSignature(sample.url)}
                                    className={`p-1.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                                      isSelected
                                        ? 'bg-indigo-50 border-indigo-600 ring-1 ring-indigo-500/30'
                                        : 'bg-white hover:bg-slate-100 border-slate-200'
                                    }`}
                                    title={sample.label}
                                  >
                                    <img
                                      src={sample.url}
                                      alt={sample.label}
                                      className="w-14 h-8 object-contain"
                                    />
                                    <span className="text-[9px] font-bold text-slate-700 text-center line-clamp-1">
                                      {sample.label}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Live Preview of Printed A4 Stamp & Signature Box */}
                        <div className="sm:col-span-5 flex flex-col justify-center">
                          <div className="text-[10px] font-bold text-slate-500 mb-1 text-center">
                            پیش‌نمایش زنده کادر مهر و امضا در برگه چاپ:
                          </div>
                          <div
                            className="doctor-stamp-box text-center p-3 rounded-xl border-2 border-dashed border-teal-700/60 bg-teal-50/20 flex-1 flex flex-col justify-center max-w-[235px] w-full mx-auto"
                            style={
                              {
                                '--stamp-font-family': docStampFont,
                                fontFamily: docStampFont,
                              } as React.CSSProperties
                            }
                          >
                            <div
                              className="font-bold text-teal-900 leading-snug break-words"
                              style={{
                                fontFamily: docStampFont,
                                fontSize: `${docStampFontSize}px`,
                              }}
                            >
                              {doc.name}
                            </div>
                            <div
                              className="font-semibold text-slate-700 mt-0.5 whitespace-pre-line leading-snug break-words"
                              style={{
                                fontFamily: docStampFont,
                                fontSize: `${Math.max(10, docStampFontSize - 2)}px`,
                              }}
                            >
                              {doc.specialty}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                              شماره نظام پزشکی: {doc.medicalCouncilId}
                            </div>
                            {effectiveSignatureUrl ? (
                              <div className="mt-1.5 flex items-center justify-center">
                                <img
                                  src={effectiveSignatureUrl}
                                  alt="امضای دیجیتال پزشک"
                                  className="h-11 max-w-[155px] object-contain mx-auto"
                                />
                              </div>
                            ) : (
                              <div className="mt-2 text-[10px] text-slate-400 italic">
                                (بدون تصویر امضا)
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl shadow-xs cursor-pointer"
          >
            تایید و بستن
          </button>
        </div>
      </div>
    </div>
  );
};
