import { Doctor } from '../types';

export const DEFAULT_DOCTORS: Doctor[] = [
  {
    id: 'doc-1',
    name: 'دکتر فرزاد کیانی',
    medicalCouncilId: '۱۱۲۴۸۵',
    specialty: 'متخصص رادیولوژی و سونوگرافی، فلوشیپ ام‌آر‌آی',
    title: 'دکتر فرزاد کیانی',
    clinicName: 'مرکز جامع تصویربرداری بیمارستان شفا',
    stampText: 'دکتر فرزاد کیانی - متخصص رادیولوژی و سونوگرافی - ن.پ ۱۱۲۴۸۵',
    signatureUrl: `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 90" width="260" height="90">
        <path d="M35 66 C55 22, 85 18, 92 54 C96 72, 72 76, 82 46 C94 18, 134 26, 128 58 C124 72, 148 35, 168 42 C186 48, 198 30, 224 24" fill="none" stroke="#1d4ed8" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M26 74 Q130 56 236 64" fill="none" stroke="#1e40af" stroke-width="2" stroke-linecap="round"/>
        <circle cx="195" cy="50" r="2.2" fill="#1d4ed8"/>
        <circle cx="204" cy="47" r="2.2" fill="#1d4ed8"/>
      </svg>`
    )}`,
    isDefault: true,
  },
  {
    id: 'doc-2',
    name: 'دکتر نسرین شریفی',
    medicalCouncilId: '۹۸۴۵۲',
    specialty: 'متخصص رادیولوژی، فلوشیپ تصویربرداری پستان و سونوگرافی زنان',
    title: 'دکتر نسرین شریفی',
    clinicName: 'مرکز جامع تصویربرداری بیمارستان شفا',
    stampText: 'دکتر نسرین شریفی - بورد تخصصی رادیولوژی - ن.پ ۹۸۴۵۲',
    signatureUrl: `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 90" width="260" height="90">
        <circle cx="62" cy="45" r="34" fill="none" stroke="#0f766e" stroke-width="2.2" stroke-dasharray="5 3" opacity="0.75"/>
        <circle cx="62" cy="45" r="28" fill="none" stroke="#0f766e" stroke-width="1.2" opacity="0.6"/>
        <text x="62" y="48" font-family="Tahoma, sans-serif" font-size="10" font-weight="bold" fill="#0f766e" text-anchor="middle" opacity="0.85">RADIOLOGY</text>
        <path d="M44 62 C78 16, 114 24, 108 58 C104 76, 138 24, 158 52 C172 70, 195 28, 232 34" fill="none" stroke="#0f172a" stroke-width="3" stroke-linecap="round"/>
        <path d="M40 70 Q145 58 238 62" fill="none" stroke="#0f766e" stroke-width="2.2" stroke-linecap="round"/>
      </svg>`
    )}`,
    isDefault: false,
  },
  {
    id: 'doc-3',
    name: 'دکتر مسعود رادمهر',
    medicalCouncilId: '۷۶۳۱۲',
    specialty: 'متخصص رادیولوژی، فلوشیپ سی‌تی‌اسکن و اینترونشن انکولوژی',
    title: 'دکتر مسعود رادمهر',
    clinicName: 'مرکز جامع تصویربرداری بیمارستان شفا',
    stampText: 'دکتر مسعود رادمهر - متخصص رادیولوژی و سی‌تی‌اسکن - ن.پ ۷۶۳۱۲',
    signatureUrl: `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 90" width="260" height="90">
        <path d="M48 68 C42 30, 88 12, 105 46 C118 72, 134 22, 154 44 C168 60, 185 35, 218 28 C200 52, 150 74, 34 74" fill="none" stroke="#1e293b" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`
    )}`,
    isDefault: false,
  },
];

