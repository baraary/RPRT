import { Doctor } from '../types';

export const DEFAULT_DOCTORS: Doctor[] = [
  {
    id: 'doc-1',
    name: 'دکتر فرزاد کیانی',
    medicalCouncilId: '۱۱۲۴۸۵',
    specialty: 'متخصص رادیولوژی و سونوگرافی، فلوشیپ ام‌آر‌آی',
    title: 'دکتر فرزاد کیانی',
    clinicName: 'مرکز جامع تصویربرداری پزشکی نور',
    stampText: 'دکتر فرزاد کیانی - متخصص رادیولوژی و سونوگرافی - ن.پ ۱۱۲۴۸۵',
    isDefault: true,
  },
  {
    id: 'doc-2',
    name: 'دکتر نسرین شریفی',
    medicalCouncilId: '۹۸۴۵۲',
    specialty: 'متخصص رادیولوژی، فلوشیپ تصویربرداری پستان و سونوگرافی زنان',
    title: 'دکتر نسرین شریفی',
    clinicName: 'مرکز جامع تصویربرداری پزشکی نور',
    stampText: 'دکتر نسرین شریفی - بورد تخصصی رادیولوژی - ن.پ ۹۸۴۵۲',
    isDefault: false,
  },
  {
    id: 'doc-3',
    name: 'دکتر مسعود رادمهر',
    medicalCouncilId: '۷۶۳۱۲',
    specialty: 'متخصص رادیولوژی، فلوشیپ سی‌تی‌اسکن و اینترونشن انکولوژی',
    title: 'دکتر مسعود رادمهر',
    clinicName: 'مرکز جامع تصویربرداری پزشکی نور',
    stampText: 'دکتر مسعود رادمهر - متخصص رادیولوژی و سی‌تی‌اسکن - ن.پ ۷۶۳۱۲',
    isDefault: false,
  },
];
