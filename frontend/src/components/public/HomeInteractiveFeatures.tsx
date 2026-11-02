import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import confetti from 'canvas-confetti';
import {
  Baby,
  BookOpen,
  Sparkles,
  HeartHandshake,
  Utensils,
  Cpu,
  Clock,
  Sun,
  Coffee,
  GraduationCap,
  Users,
  CheckCircle2,
  ArrowRight,
  Calculator,
  Quote
} from 'lucide-react';

import itoreroImage from '../../assets/images/home_itorero_dance_1790692883162.jpg';
import nurseryImage from '../../assets/images/home_nursery_ecd_1790692903161.jpg';
import stemImage from '../../assets/images/home_stem_discovery_1790692916312.jpg';
import lunchImage from '../../assets/images/home_school_lunch_1790692929899.jpg';
import { useSchoolSettings } from '../../context/SchoolSettingsContext';

interface HomeInteractiveFeaturesProps {
  onOpenAuth: (tab?: 'login') => void;
}

export const HomeInteractiveFeatures: React.FC<HomeInteractiveFeaturesProps> = ({ onOpenAuth }) => {
  const { t } = useLanguage();
  const { settings } = useSchoolSettings();

  // Active step for Daily Schedule timeline
  const [activeScheduleIdx, setActiveScheduleIdx] = useState(2); // default to 08:00 Core CBC

  // Interactive Birth Year Calculator State
  const [birthYear, setBirthYear] = useState<number>(2019);

  // Calculate age and recommended level for 2026
  const age = 2026 - birthYear;
  const getRecommendedLevel = (pupilAge: number) => {
    if (pupilAge <= 3) return { grade: 'Nursery 1 (Baby Class)', tier: 'Nursery / ECD', code: 'N1' };
    if (pupilAge === 4) return { grade: 'Nursery 2 (Middle Class)', tier: 'Nursery / ECD', code: 'N2' };
    if (pupilAge === 5) return { grade: 'Nursery 3 (Top Class)', tier: 'Nursery / ECD', code: 'N3' };
    if (pupilAge === 6) return { grade: 'Primary 1 (P1)', tier: 'Lower Primary', code: 'P1' };
    if (pupilAge === 7) return { grade: 'Primary 2 (P2)', tier: 'Lower Primary', code: 'P2' };
    if (pupilAge === 8) return { grade: 'Primary 3 (P3)', tier: 'Lower Primary', code: 'P3' };
    if (pupilAge === 9) return { grade: 'Primary 4 (P4)', tier: 'Upper Primary', code: 'P4' };
    if (pupilAge === 10) return { grade: 'Primary 5 (P5)', tier: 'Upper Primary', code: 'P5' };
    return { grade: 'Primary 6 (P6 - PLE Candidate)', tier: 'Upper Primary', code: 'P6' };
  };

  const recommendation = getRecommendedLevel(age);

  const handleApplyWithGrade = () => {
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#0284c7', '#059669', '#f59e0b'],
    });
    document.getElementById('admissions')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scheduleSlots = [
    {
      time: '07:15',
      titleKey: 'schedule0715Title',
      descKey: 'schedule0715Desc',
      icon: Sun,
      color: 'amber',
    },
    {
      time: '07:30',
      titleKey: 'schedule0730Title',
      descKey: 'schedule0730Desc',
      icon: Users,
      color: 'emerald',
    },
    {
      time: '08:00',
      titleKey: 'schedule0800Title',
      descKey: 'schedule0800Desc',
      icon: BookOpen,
      color: 'sky',
    },
    {
      time: '10:15',
      titleKey: 'schedule1015Title',
      descKey: 'schedule1015Desc',
      icon: Coffee,
      color: 'amber',
    },
    {
      time: '12:30',
      titleKey: 'schedule1230Title',
      descKey: 'schedule1230Desc',
      icon: Utensils,
      color: 'emerald',
    },
    {
      time: '14:00',
      titleKey: 'schedule1400Title',
      descKey: 'schedule1400Desc',
      icon: Cpu,
      color: 'sky',
    },
    {
      time: '15:30',
      titleKey: 'schedule1530Title',
      descKey: 'schedule1530Desc',
      icon: Sparkles,
      color: 'amber',
    },
    {
      time: '16:30',
      titleKey: 'schedule1630Title',
      descKey: 'schedule1630Desc',
      icon: Clock,
      color: 'emerald',
    },
  ];

  return (
    <div className="space-y-24 py-16 bg-white dark:bg-slate-950">
      {/* 1. Bento Grid: 5 Pillars of School Flourishing */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            {t('bentoHeaderBadge')}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('bentoHeaderTitle')}
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-base">
            {t('bentoHeaderSub')}
          </p>
        </div>

        {/* Asymmetric Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Card 1: Itorero & Cultural Heritage (Wide 7 cols) */}
          <div className="md:col-span-7 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between">
            <div className="relative h-64 sm:h-72 overflow-hidden bg-slate-100 dark:bg-slate-850">
              <img
                src={settings.home_itorero_image || itoreroImage}
                alt="Rwandan primary school pupils performing traditional Itorero cultural dance"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
              <div className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-slate-950 shadow-xs">
                Itorero ry\'Ishuri
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2">
                {t('bentoItoreroTitle')}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {t('bentoItoreroDesc')}
              </p>
            </div>
          </div>

          {/* Card 2: Nursery & Early Childhood (5 cols) */}
          <div className="md:col-span-5 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between">
            <div className="relative h-64 sm:h-72 overflow-hidden bg-slate-100 dark:bg-slate-850">
              <img
                src={settings.home_nursery_image || nurseryImage}
                alt="Young Rwandan nursery school children learning with educational blocks"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
              <div className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold bg-sky-500 text-white shadow-xs">
                Nursery ECD
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2">
                {t('bentoEcdTitle')}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {t('bentoEcdDesc')}
              </p>
            </div>
          </div>

          {/* Card 3: STEM Discovery (5 cols) */}
          <div className="md:col-span-5 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between">
            <div className="relative h-60 sm:h-64 overflow-hidden bg-slate-100 dark:bg-slate-850">
              <img
                src={settings.home_stem_image || stemImage}
                alt="Rwandan primary students doing practical science experiments with their teacher"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
              <div className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-xs">
                STEM & CBC
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2">
                {t('bentoStemTitle')}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {t('bentoStemDesc')}
              </p>
            </div>
          </div>

          {/* Card 4: Daily Nutrition Program (7 cols) */}
          <div className="md:col-span-7 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between">
            <div className="relative h-60 sm:h-64 overflow-hidden bg-slate-100 dark:bg-slate-850">
              <img
                src={settings.home_lunch_image || lunchImage}
                alt="Smiling Rwandan children enjoying warm school lunch and milk porridge"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
              <div className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-slate-950 shadow-xs">
                Ifunguro ry\'Ishuri
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2">
                {t('bentoNutritionTitle')}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {t('bentoNutritionDesc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Interactive "A Day in the Life" Animated Stepper */}
      <section className="bg-slate-50 dark:bg-slate-900/60 py-16 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              07:15 — 16:30 Daily Rhythm
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {t('scheduleTitle')}
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-base">
              {t('scheduleSub')}
            </p>
          </div>

          {/* Stepper Navigation Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar max-w-5xl mx-auto">
            {scheduleSlots.map((slot, idx) => {
              const Icon = slot.icon;
              const isActive = activeScheduleIdx === idx;
              return (
                <button
                  key={slot.time}
                  type="button"
                  onClick={() => setActiveScheduleIdx(idx)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 scale-105'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-500'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{slot.time}</span>
                </button>
              );
            })}
          </div>

          {/* Active Schedule Showcase Card */}
          <div className="max-w-4xl mx-auto mt-6 p-8 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md">
            <div className="flex items-start gap-5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center shrink-0 font-bold">
                {React.createElement(scheduleSlots[activeScheduleIdx].icon, { className: 'w-7 h-7' })}
              </div>
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    {scheduleSlots[activeScheduleIdx].time} CAT
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                    {t(scheduleSlots[activeScheduleIdx].titleKey)}
                  </h3>
                </div>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                  {t(scheduleSlots[activeScheduleIdx].descKey)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Interactive Grade Placement Calculator & Testimonials Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left: Grade Calculator by Birth Year (5 cols) */}
          <div className="lg:col-span-5 p-7 sm:p-8 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-amber-500/5 to-sky-500/10 border-2 border-emerald-600/30 dark:border-emerald-500/30 dark:bg-slate-900 shadow-xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <Calculator className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                  {t('calculatorBadge')}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {t('calculatorTitle')}
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {t('calculatorSub')}
            </p>

            {/* Birth Year Selector */}
            <div className="space-y-2">
              <label htmlFor="birth-year-select" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                {t('selectBirthYear')}
              </label>
              <select
                id="birth-year-select"
                value={birthYear}
                onChange={e => setBirthYear(parseInt(e.target.value, 10))}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-sm focus:ring-2 focus:ring-emerald-500"
              >
                {[2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014].map(yr => (
                  <option key={yr} value={yr}>
                    {yr} (Turning {2026 - yr} in 2026)
                  </option>
                ))}
              </select>
            </div>

            {/* Calculated Output Box */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>{t('ageLabel')}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {age} {t('yearsOld')}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Tier:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {recommendation.tier}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                <span className="text-[11px] text-slate-500 block">
                  {t('recommendedLevel')}
                </span>
                <span className="text-base font-extrabold text-slate-900 dark:text-white block mt-0.5">
                  {recommendation.grade}
                </span>
              </div>
            </div>

            {/* Action CTA with Confetti */}
            <button
              type="button"
              onClick={handleApplyWithGrade}
              className="w-full py-3.5 px-4 rounded-xl text-xs sm:text-sm font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-md shadow-emerald-700/25 transition-all flex items-center justify-center gap-2"
            >
              <span>{t('startApplicationBtn')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Right: Testimonials (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                {t('testimonialsBadge')}
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                {t('testimonialsTitle')}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {t('testimonialsSub')}
              </p>
            </div>

            {/* 3 Authentic Community Testimonial Cards */}
            <div className="space-y-4">
              {/* Quote 1: Head Teacher */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative">
                <Quote className="w-8 h-8 text-emerald-500/20 absolute top-4 right-4" />
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 italic leading-relaxed mb-4">
                  "{t('quoteHeadTeacherText')}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                    ET
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Emmanuel Twahirwa
                    </h4>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {t('quoteHeadTeacherRole')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quote 2: Parent */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative">
                <Quote className="w-8 h-8 text-amber-500/20 absolute top-4 right-4" />
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 italic leading-relaxed mb-4">
                  "{t('quoteParentText')}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs">
                    CM
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {t('quoteParentName')}
                    </h4>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {t('quoteParentRole')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quote 3: Pupil */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative">
                <Quote className="w-8 h-8 text-sky-500/20 absolute top-4 right-4" />
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 italic leading-relaxed mb-4">
                  "{t('quotePupilText')}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-xs">
                    KM
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {t('quotePupilName')}
                    </h4>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {t('quotePupilRole')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
