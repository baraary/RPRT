import React, { useState, useEffect } from 'react';
import { MedicalTemplate, Doctor } from '../types';
import { Copy, X, ArrowLeft, Check, User } from 'lucide-react';

interface CloneTemplateModalProps {
  template: MedicalTemplate | null;
  doctors: Doctor[];
  onClose: () => void;
  onClone: (templateId: string, targetDoctorId: string, newTitle: string) => void;
}

export const CloneTemplateModal: React.FC<CloneTemplateModalProps> = ({
  template,
  doctors,
  onClose,
  onClone,
}) => {
  const [targetDoctorId, setTargetDoctorId] = useState<string>(
    doctors.find((d) => d.id !== template?.doctorId)?.id || doctors[0]?.id || ''
  );
  const [newTitle, setNewTitle] = useState<string>(
    template ? `${template.title} (کپی اختصاصی)` : ''
  );

  useEffect(() => {
    if (template) {
      setTargetDoctorId(doctors.find((d) => d.id !== template.doctorId)?.id || doctors[0]?.id || '');
      setNewTitle(`${template.title} (کپی اختصاصی)`);
    }
  }, [template, doctors]);

  if (!template) return null;

  const currentDoctor = doctors.find((d) => d.id === template.doctorId);

  const handleConfirm = () => {
    if (!targetDoctorId || !newTitle.trim()) return;
    onClone(template.id, targetDoctorId, newTitle.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="p-4 bg-linear-to-r from-teal-700 to-emerald-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Copy className="w-5 h-5" />
            <h3 className="font-bold text-sm sm:text-base">
              کپی و انتقال قالب به پزشک دیگر
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Source Info */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-xs text-slate-500 mb-1">قالب مبدأ:</div>
            <div className="text-sm font-bold text-slate-800">{template.title}</div>
            <div className="text-xs text-slate-600 mt-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-teal-600" />
              <span>پزشک مبدأ: {currentDoctor?.name || 'قالب عمومی'}</span>
            </div>
          </div>

          {/* Target Doctor Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              انتخاب پزشک مقصد:
            </label>
            <select
              value={targetDoctorId}
              onChange={(e) => setTargetDoctorId(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-medium"
            >
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name} ({doc.specialty})
                </option>
              ))}
            </select>
          </div>

          {/* New Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              عنوان قالب برای پزشک مقصد:
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Notice */}
          <div className="text-[11px] text-slate-500 bg-amber-50 border border-amber-200 p-2.5 rounded-xl leading-relaxed">
            تمامی بخش‌های تکنیک، متن یافته‌ها و نتیجه‌گیری قالب به صورت کامل کپی شده و پزشک مقصد می‌تواند آن را به طور مستقل ویرایش و سفارشی‌سازی نماید.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200/60"
          >
            انصراف
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Copy className="w-4 h-4" />
            <span>تایید و ایجاد کپی قالب</span>
          </button>
        </div>
      </div>
    </div>
  );
};
