import React, { useState } from 'react';
import { Doctor } from '../types';
import { User, X, Plus, Trash2, PenTool, Upload, Stamp, Check } from 'lucide-react';

// Built-in vector sample Doctor Digital Signatures (100% offline SVG Data URIs)
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
        <circle cx="62" cy="45" r="28" fill="none" stroke="#0f766e" stroke-width="1.2" opacity="0.6"/>
        <text x="62" y="48" font-family="Tahoma, sans-serif" font-size="10" font-weight="bold" fill="#0f766e" text-anchor="middle" opacity="0.85">RADIOLOGY</text>
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
  defaultSignatureUrl = '',
  onUpdateDefaultSignatureUrl,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [medicalCouncilId, setMedicalCouncilId] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [stampText, setStampText] = useState('');
  const [newSignatureUrl, setNewSignatureUrl] = useState('');
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentExpandedId = expandedDocId ?? activeDoctorId;

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
      signatureUrl: newSignatureUrl || undefined,
    });

    setName('');
    setMedicalCouncilId('');
    setSpecialty('');
    setStampText('');
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
                مدیریت پزشکان متخصص، مهر و امضای دیجیتال
              </h3>
              <p className="text-[11px] text-teal-100 mt-0.5">
                تعریف پزشکان، شماره نظام پزشکی، متن مهر و تصویر امضای دیجیتال پای برگه گزارش A4
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
              لیست متخصصین رادیولوژی و تنظیمات مهر و امضای هر پزشک
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
              <div className="text-xs font-bold text-slate-800">مشخصات، مهر و امضای پزشک جدید</div>
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

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  تخصص یا فلوشیپ (چاپ زیر نام پزشک در مهر):
                </label>
                <input
                  type="text"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="متخصص رادیولوژی و سونوگرافی، فلوشیپ ام‌آر‌آی"
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
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
              // هر پزشک امضای دیجیتال کاملاً مستقل خودش را دارد (بدون اشتراک با پزشکان دیگر)
              const effectiveSignatureUrl = doc.signatureUrl || '';

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
                        {doc.name.slice(5, 6) || 'پ'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900">
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
                        <div className="text-xs text-slate-500 mt-0.5">{doc.specialty}</div>
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
                        <Stamp className="w-3.5 h-3.5" />
                        <span>تنظیمات مهر و امضا</span>
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

                  {/* Expandable Stamp & Digital Signature Editor for this Doctor */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-3 border-t border-slate-200/80 bg-white/90 space-y-3.5 animate-fadeIn">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            عنوان تخصص در مهر چاپی:
                          </label>
                          <input
                            type="text"
                            value={doc.specialty}
                            onChange={(e) =>
                              onUpdateDoctor?.(doc.id, { specialty: e.target.value })
                            }
                            placeholder="متخصص رادیولوژی و سونوگرافی"
                            className="w-full text-xs p-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-500 focus:outline-none"
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
                          <div className="text-center p-3 rounded-xl border-2 border-dashed border-teal-700/60 bg-teal-50/20 flex-1 flex flex-col justify-center">
                            <div className="text-xs font-black text-teal-900">{doc.name}</div>
                            <div className="text-[10.5px] font-medium text-slate-700 mt-0.5">
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
