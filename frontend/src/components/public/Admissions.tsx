import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { AdmissionApplication } from '../../types';
import confetti from 'canvas-confetti';
import {
  FileText,
  UserCheck,
  Award,
  CreditCard,
  CheckCircle2,
  Check,
  Baby,
  BookOpen,
  GraduationCap,
  Lock,
  LogIn,
  UserPlus,
  ShieldCheck,
  Sparkles,
  Phone,
  RotateCcw,
  Mail,
  Camera,
  Upload
} from 'lucide-react';

interface AdmissionsProps {
  onOpenAuth: (tab?: 'login') => void;
  onNewAdmission: (application: AdmissionApplication) => Promise<void> | void;
}

export const Admissions: React.FC<AdmissionsProps> = ({ onOpenAuth, onNewAdmission }) => {
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const [inquirySubmitted, setInquirySubmitted] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState('');
  const [pupilPhoto, setPupilPhoto] = useState('');
  const [pupilPhotoName, setPupilPhotoName] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    studentName: '',
    gender: 'F' as 'M' | 'F',
    parentName: '',
    email: '',
    phone: '',
    grade: 'Primary 1',
    village: 'Kibondo Village, Simbwa Cell',
    previousSchool: 'Kibondo Early Childhood Development (ECD)',
  });

  // Pre-fill parent details if user is logged in
  useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        parentName: prev.parentName || user.name || '',
        email: prev.email || user.email || '',
      }));
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!isAuthenticated) {
      onOpenAuth('login');
      return;
    }

    if (!form.studentName || !form.phone || !pupilPhoto) {
      setFormError('Complete the required details and choose a pupil photo.');
      return;
    }

    const gradeLevel = form.grade.includes('Nursery')
      ? 'Nursery'
      : ['Primary 1', 'Primary 2', 'Primary 3'].includes(form.grade)
      ? 'Lower Primary'
      : 'Upper Primary';

    const ticketId = `ADM-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const newApp: AdmissionApplication = {
      id: `adm-${Date.now()}`,
      applicantName: form.studentName,
      photoUrl: pupilPhoto,
      gender: form.gender,
      dob: '2020-05-14',
      applyingGrade: form.grade,
      level: gradeLevel,
      parentName: form.parentName || user?.name || 'Parent',
      parentPhone: form.phone,
      parentEmail: form.email || user?.email || '',
      district: 'Gatsibo',
      sector: 'Kabarore',
      cell: 'Simbwa',
      village: form.village || 'Kibondo',
      previousSchool: form.previousSchool,
      birthCertificateSubmitted: true,
      immunizationCardSubmitted: true,
      status: 'Pending',
      applicationDate: new Date().toISOString().split('T')[0],
      notes: `Applied online through parent portal by ${user?.name || 'Parent'}. Village: ${form.village}`,
    };

    setIsSubmitting(true);
    try {
      await onNewAdmission(newApp);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'The application could not be submitted. Please try again.');
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(false);

    // Celebration Confetti
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.65 },
      colors: ['#059669', '#10b981', '#f59e0b', '#0284c7']
    });

    setSubmittedTicket(ticketId);
    setInquirySubmitted(true);
  };

  const handlePupilPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setFormError('Choose a JPEG, PNG, or WebP pupil photo.');
      e.target.value = '';
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setFormError('Pupil photos must be 4 MB or smaller.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPupilPhoto(reader.result);
        setPupilPhotoName(file.name);
        setFormError('');
      }
    };
    reader.onerror = () => setFormError('The selected pupil photo could not be read.');
    reader.readAsDataURL(file);
  };

  const handleResetForm = () => {
    setInquirySubmitted(false);
    setPupilPhoto('');
    setPupilPhotoName('');
    setFormError('');
    setForm({
      studentName: '',
      gender: 'F',
      parentName: user?.name || '',
      email: user?.email || '',
      phone: '',
      grade: 'Primary 1',
      village: 'Kibondo Village, Simbwa Cell',
      previousSchool: 'Kibondo Early Childhood Development (ECD)',
    });
  };

  const steps = [
    { num: '01', title: t('step1Title'), desc: t('step1Desc'), icon: FileText },
    { num: '02', title: t('step2Title'), desc: t('step2Desc'), icon: UserCheck },
    { num: '03', title: t('step3Title'), desc: t('step3Desc'), icon: CheckCircle2 },
    { num: '04', title: t('step4Title'), desc: t('step4Desc'), icon: Award },
  ];

  return (
    <section id="admissions" className="py-16 sm:py-20 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            {t('admissionsBadge')}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
            {t('admissionsTitle')}
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-base">
            {t('admissionsDesc')}
          </p>
        </div>

        {/* 4 Steps Timeline */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {steps.map(step => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="relative p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs hover:border-emerald-500 transition-colors"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-2xl font-black text-slate-300 dark:text-slate-600 font-mono">
                    {step.num}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  {step.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* School Fees & Contributions Schedule */}
        <div className="mb-16">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              {t('tuitionScheduleTitle')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t('tuitionScheduleSub')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Nursery ECD */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border-2 border-emerald-500/30 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  {t('heroNurseryBadge')}
                </span>
                <Baby className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  45,000 RWF
                </span>
                <span className="text-xs text-slate-400 block">{t('tuitionScheduleSub')}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {t('nurseryFeeDesc')}
              </p>
              <ul className="text-xs text-slate-500 space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-700">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Nursery 1, Nursery 2, Nursery 3
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Daily milk porridge (Igikoma cy'Amata)
                </li>
              </ul>
            </div>

            {/* Lower Primary P1-P3 */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border-2 border-emerald-600 shadow-xl space-y-4 relative">
              <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider">
                Popular
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  {t('lowerHeading')}
                </span>
                <BookOpen className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  55,000 RWF
                </span>
                <span className="text-xs text-slate-400 block">{t('tuitionScheduleSub')}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {t('lowerFeeDesc')}
              </p>
              <ul className="text-xs text-slate-500 space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-700">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Primary 1 to Primary 3
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Warm school feeding (Ifunguro ry'amanywa)
                </li>
              </ul>
            </div>

            {/* Upper Primary P4-P6 */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border-2 border-emerald-500/30 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  {t('upperHeading')}
                </span>
                <GraduationCap className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  65,000 RWF
                </span>
                <span className="text-xs text-slate-400 block">{t('tuitionScheduleSub')}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {t('upperFeeDesc')}
              </p>
              <ul className="text-xs text-slate-500 space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-700">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Primary 4, Primary 5, Primary 6
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Intensive PLE mock clinics & STEM kits
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-600" />
              {t('paymentInstructions')}
            </span>
            <span className="font-mono font-bold text-[11px] bg-white dark:bg-slate-800 px-2 py-1 rounded border border-amber-300 dark:border-amber-700 shrink-0">
              MoMo: *182#
            </span>
          </div>
        </div>

        {/* Online Admission Application Form with Strict Login Gate */}
        <div className="max-w-2xl mx-auto p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-800 border-2 border-emerald-600/30 shadow-xl relative overflow-hidden">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {t('inquireNow')}
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                Academic Year 2026/27
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Submit pupil credentials for Nursery (ECD 1-3) through Upper Primary (P1-P6).
            </p>
          </div>

          {/* If Application is Submitted Successfully */}
          {inquirySubmitted ? (
            <div className="p-8 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-300 dark:border-emerald-800 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-bold text-emerald-900 dark:text-emerald-200">
                  Admission Application Successfully Registered!
                </h4>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 max-w-md mx-auto">
                  Your child's application has been registered with St. Silas Admissions Secretariat. A confirmation feedback email has been dispatched to <span className="font-bold underline">{form.email || user?.email}</span>. You will also receive official decision feedback in your email.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 text-xs font-mono">
                  <span className="text-slate-400 block text-[10px] uppercase">Official Tracking Ticket</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-300 text-sm">#{submittedTicket}</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-100/70 dark:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-700 text-xs text-left">
                  <span className="text-emerald-800 dark:text-emerald-200 font-semibold block text-[11px] flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-emerald-600" />
                    Feedback Sent to Your Email
                  </span>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-mono">
                    {form.email || user?.email}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Register Another Pupil</span>
                </button>
                <a
                  href="tel:+250788765432"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4 text-emerald-600" />
                  <span>Call Head Teacher</span>
                </a>
              </div>
            </div>
          ) : !isAuthenticated ? (
            /* Authentication Required Gate - User MUST Login First Before Submitting */
            <div className="p-8 rounded-2xl bg-gradient-to-b from-amber-50/70 to-slate-50 dark:from-slate-900 dark:to-slate-950 border-2 border-amber-300/80 dark:border-amber-800/80 text-center space-y-5 animate-in fade-in duration-200">
              <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                <span className="absolute inset-0 rounded-full bg-amber-400/20 animate-ping" />
                <div className="relative w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Lock className="w-7 h-7" />
                </div>
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[11px] font-bold uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Identity Verification Required</span>
                </div>
                <h4 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  {t('loginToApplyTitle')}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {t('loginToApplyDesc')}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left text-xs space-y-1.5 max-w-sm mx-auto">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Why authenticate first?</span>
                <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                  ✓ Establishes verified parent/guardian profile in St. Silas portal.<br />
                  ✓ Allows direct administrative feedback and status tracking.<br />
                  ✓ Prevents unauthorized applications for primary scholars.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  id="admission-login-gate-btn"
                  onClick={() => onOpenAuth('login')}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-md shadow-emerald-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{t('signInToApplyBtn')}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Authenticated Online Admission Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {formError}
                </p>
              )}
              {/* Verified Parent Indicator */}
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="text-xs truncate">
                    <span className="font-semibold text-emerald-900 dark:text-emerald-200">
                      {t('applyingAsParent')}:
                    </span>{' '}
                    <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                      {user?.name}
                    </span>
                    <span className="text-slate-400 text-[11px] ml-1">({user?.email || user?.role})</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold shrink-0">
                  Verified
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Pupil Profile Photo *
                </label>
                <div className="flex items-center gap-3">
                  {pupilPhoto ? (
                    <img src={pupilPhoto} alt="Pupil profile preview" className="w-12 h-12 rounded-xl object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <Camera className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <label htmlFor="public-admission-photo" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      {pupilPhoto ? 'Change Photo' : 'Choose Photo'}
                    </label>
                    <input
                      id="public-admission-photo"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePupilPhotoChange}
                      className="sr-only"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">{pupilPhotoName || 'JPEG, PNG, or WebP; maximum 4 MB'}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('childFullName')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t('childNamePlaceholder')}
                    value={form.studentName}
                    onChange={e => setForm({ ...form, studentName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Pupil Gender (Igitsina) *
                  </label>
                  <select
                    value={form.gender}
                    onChange={e => setForm({ ...form, gender: e.target.value as 'M' | 'F' })}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="F">Female (Umukobwa)</option>
                    <option value="M">Male (Umuhungu)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('parentGuardianName')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t('parentNamePlaceholder')}
                    value={form.parentName}
                    onChange={e => setForm({ ...form, parentName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('phoneWhatsApp')}
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+250 788 564 890"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('applyingGrade')}
                  </label>
                  <select
                    value={form.grade}
                    onChange={e => setForm({ ...form, grade: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <optgroup label="Nursery (ECD / Inshuke)">
                      <option value="Nursery 1">Nursery 1 (Baby Class)</option>
                      <option value="Nursery 2">Nursery 2 (Middle Class)</option>
                      <option value="Nursery 3">Nursery 3 (Top Class)</option>
                    </optgroup>
                    <optgroup label="Lower Primary (Abanza yo Hasi)">
                      <option value="Primary 1">Primary 1 (P1)</option>
                      <option value="Primary 2">Primary 2 (P2)</option>
                      <option value="Primary 3">Primary 3 (P3)</option>
                    </optgroup>
                    <optgroup label="Upper Primary (Abanza yo Hejuru)">
                      <option value="Primary 4">Primary 4 (P4)</option>
                      <option value="Primary 5">Primary 5 (P5)</option>
                      <option value="Primary 6">Primary 6 (P6 - PLE Candidate)</option>
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Previous School / Nursery Center
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kibondo ECD Center / EAR Simbwa"
                    value={form.previousSchool}
                    onChange={e => setForm({ ...form, previousSchool: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('villageCellLabel')}
                </label>
                <input
                  type="text"
                  placeholder={t('villagePlaceholder')}
                  value={form.village}
                  onChange={e => setForm({ ...form, village: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/80 text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  By submitting, you confirm that childhood vaccination card and health insurance (Mutuelle) are in order for physical verification upon campus admission.
                </span>
              </div>

              <button
                type="submit"
                id="submit-admission-app-btn"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl text-xs sm:text-sm font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-md shadow-emerald-700/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? <span>Submitting...</span> : <><CheckCircle2 className="w-4 h-4" /><span>{t('submitApplicationBtn')}</span></>}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};
