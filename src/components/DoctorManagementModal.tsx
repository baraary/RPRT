import React, { useState } from 'react';
import { Doctor } from '../types';
import { User, X, Plus, Trash2, Check, ShieldCheck } from 'lucide-react';

interface DoctorManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctors: Doctor[];
  activeDoctorId: string;
  onSelectDoctor: (id: string) => void;
  onAddDoctor: (doctor: Omit<Doctor, 'id'>) => void;
  onDeleteDoctor: (id: string) => void;
}

export const DoctorManagementModal: React.FC<DoctorManagementModalProps> = ({
  isOpen,
  onClose,
  doctors,
  activeDoctorId,
  onSelectDoctor,
  onAddDoctor,
  onDeleteDoctor,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [medicalCouncilId, setMedicalCouncilId] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [stampText, setStampText] = useState('');

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !medicalCouncilId.trim()) return;

    onAddDoctor({
      name: name.trim(),
      title: name.trim(),
      medicalCouncilId: medicalCouncilId.trim(),
      specialty: specialty.trim() || 'متخصص رادیولوژی و سونوگرافی',
      stampText: stampText.trim() || `${name.trim()} - متخصص رادیولوژی - ن.پ ${medicalCouncilId.trim()}`,
    });

    setName('');
    setMedicalCouncilId('');
    setSpecialty('');
    setStampText('');
    setShowAddForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-linear-to-r from-teal-800 to-teal-600 text-white flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <User className="w-5 h-5 text-teal-300 shrink-0" />
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base">
                مدیریت پزشکان متخصص و مهر امضا
              </h3>
              <p className="text-[11px] text-teal-100 mt-0.5">
                تعریف پزشکان، شماره نظام پزشکی، و انتساب قالب‌های اختصاصی
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
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">
              لیست متخصصین رادیولوژی مرکز تصویربرداری
            </span>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-xl transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>افزودن پزشک جدید</span>
            </button>
          </div>

          {/* Add form */}
          {showAddForm && (
            <form onSubmit={handleAdd} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-fadeIn">
              <div className="text-xs font-bold text-slate-800">مشخصات پزشک جدید</div>
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
                  تخصص یا فلوشیپ:
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

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-xs text-slate-600"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-xs"
                >
                  ذخیره مشخصات
                </button>
              </div>
            </form>
          )}

          {/* Doctors list */}
          <div className="space-y-3">
            {doctors.map((doc) => {
              const isCurrent = doc.id === activeDoctorId;
              return (
                <div
                  key={doc.id}
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    isCurrent
                      ? 'border-teal-500 bg-teal-50/40 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                      {doc.name.slice(5, 6) || 'پ'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                          {doc.name}
                        </h4>
                        {isCurrent && (
                          <span className="text-[10px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">
                            پزشک فعال گزارش
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {doc.specialty}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        شماره نظام پزشکی: {doc.medicalCouncilId}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isCurrent && (
                      <button
                        onClick={() => onSelectDoctor(doc.id)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-teal-300 text-teal-700 hover:bg-teal-50 transition-colors"
                      >
                        انتخاب به عنوان پزشک جاری
                      </button>
                    )}
                    {doctors.length > 1 && (
                      <button
                        onClick={() => onDeleteDoctor(doc.id)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50"
                        title="حذف پزشک"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl shadow-xs"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
