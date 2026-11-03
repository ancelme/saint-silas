import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useLanguage } from '../../context/LanguageContext';
import {
  ArrowRight,
  Award,
  Users,
  GraduationCap,
  BookOpen,
  CheckCircle2,
  MapPin,
  Clock,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import heroImage from '../../assets/images/hero_rwandan_students_1790692869644.jpg';
import { useSchoolSettings } from '../../context/SchoolSettingsContext';

interface HeroProps {
  onOpenAuth: (tab?: 'login') => void;
  onOpenMap: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenAuth, onOpenMap }) => {
  const { t } = useLanguage();
  const { settings } = useSchoolSettings();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [sessionStatus, setSessionStatus] = useState<string>('morning');

  // Live Rwanda Local Time (CAT = UTC+2)
  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        const options: Intl.DateTimeFormatOptions = {
          timeZone: 'Africa/Kigali',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        };
        const timeStr = new Intl.DateTimeFormat('en-GB', options).format(now);
        setCurrentTime(timeStr);

        const kigaliHour = parseInt(timeStr.split(':')[0], 10);
        if (kigaliHour >= 7 && kigaliHour < 12) {
          setSessionStatus('morning');
        } else if (kigaliHour >= 12 && kigaliHour < 17) {
          setSessionStatus('afternoon');
        } else {
          setSessionStatus('closed');
        }
      } catch {
        setCurrentTime('08:00:00');
        setSessionStatus('morning');
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="home" className="public-hero relative overflow-hidden pt-6 pb-16 lg:pt-10 lg:pb-24 bg-gradient-to-b from-sky-500/5 via-amber-500/5 to-emerald-500/5">
      {/* Rwandan National Palette Accent Ribbon */}
      <div className="h-1.5 w-full bg-gradient-to-r from-sky-500 via-amber-400 to-emerald-600 mb-6 shadow-xs" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Live Campus Ticker & NESA Official Badge */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-3 border-b border-slate-200/80 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {t('liveSchoolStatusTitle')}:
            </span>
            <span className="text-emerald-700 dark:text-emerald-400 font-medium">
              {sessionStatus === 'morning' && t('schoolSessionMorning')}
              {sessionStatus === 'afternoon' && t('schoolSessionAfternoon')}
              {sessionStatus === 'closed' && t('schoolSessionClosed')}
            </span>
          </div>

          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>{currentTime || '08:00:00'} CAT</span>
            </div>
            <span>·</span>
            <span className="font-sans font-bold text-emerald-700 dark:text-emerald-400">
              REB Code: 530413
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: High-Design Copy, Value Proposition, & CTAs */}
          <motion.div
            initial={{ opacity: 0, x: -28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-7 space-y-6"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span className="text-amber-700 dark:text-amber-400 font-bold">
                {t('schoolType')}
              </span>
              <span aria-hidden="true" className="text-slate-400">·</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                EAR Diocese of Gahini
              </span>
              <span aria-hidden="true" className="text-slate-400">·</span>
              <span className="font-mono text-slate-500 dark:text-slate-400">
                100% PLE Pass Rate
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.12] text-balance">
              {t('heroTitle')}
            </h1>

            {/* Clickable Location Affordance that opens Interactive Google Map */}
            <button
              type="button"
              onClick={onOpenMap}
              className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-all text-left"
              title={t('clickToOpenMap')}
            >
              <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="underline decoration-emerald-500/50 underline-offset-2">
                {t('schoolLocation')}
              </span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-700 ml-1">
                {t('showMapBtn')} →
              </span>
            </button>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl font-normal leading-relaxed text-pretty">
              {t('heroSubtitle')}
            </p>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-3.5">
              <motion.button
                whileHover={{ y: -2, scale: 1.015 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                id="hero-portal-btn"
                onClick={() => onOpenAuth('login')}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-lg shadow-emerald-700/25 transition-all hover:scale-[1.01] active:scale-[0.99] whitespace-nowrap"
              >
                <span>{t('btnExplorePortal')}</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>

              <a
                href="#national-success"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-xs sm:text-sm font-bold border border-amber-300 dark:border-amber-700/80 bg-amber-50/70 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 transition-all shadow-xs whitespace-nowrap"
              >
                <Award className="w-4 h-4 text-amber-600" />
                <span>{t('nationalSuccessBadge')}</span>
              </a>

              <a
                href="#admissions"
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl text-xs sm:text-sm font-semibold border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-all hover:border-emerald-600 whitespace-nowrap"
              >
                <span>{t('btnApplyNow')}</span>
              </a>
            </div>

            {/* Three Division Cards */}
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-amber-500/50 transition-colors">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                  {t('heroNurseryBadge')}
                </span>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white block mt-0.5">
                  {t('heroNurseryRange')}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  {t('heroNurseryCount')}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-sky-500/50 transition-colors">
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 block">
                  {t('heroLowerBadge')}
                </span>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white block mt-0.5">
                  {t('heroLowerRange')}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  {t('heroLowerCount')}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-500/50 transition-colors">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                  {t('heroUpperBadge')}
                </span>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white block mt-0.5">
                  {t('heroUpperRange')}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  {t('heroUpperCount')}
                </span>
              </div>
            </div>

            {/* Trust Proof Points */}
            <div className="pt-1 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600 dark:text-slate-400 font-medium">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{t('trustCBC')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{t('trustMeals')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{t('trustCulture')}</span>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Hero Visual Asset with Floating National Distinction Overlays */}
          <motion.div
            initial={{ opacity: 0, x: 28, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.75, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-5 relative"
          >
            <div className="hero-image-shell relative rounded-[2rem] overflow-hidden border border-white/70 bg-white dark:bg-slate-900 shadow-[0_32px_80px_-28px_rgba(5,150,105,0.55)] group">
              <img
                src={settings.home_hero_image || heroImage}
                alt="Joyful Rwandan primary school pupils at St. Silas EAR Kibondo in Gatsibo"
                className="w-full h-[360px] sm:h-[430px] object-cover group-hover:scale-[1.035] transition-transform duration-700 ease-out"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/25 to-transparent" />

              {/* Bottom Floating Info Pill */}
              <div className="absolute bottom-4 left-4 right-4 p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-white/20 dark:border-slate-700/60 shadow-xl flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 truncate">
                      {t('schoolLocationShort')}
                    </p>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                    {t('heroPupilsEnrolledBadge')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => document.getElementById('admissions')?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm shrink-0 whitespace-nowrap"
                >
                  {t('btnApplyNow')}
                </button>
              </div>
            </div>

            {/* National PLE 100% Top Floating Card */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-4 -left-4 hidden sm:flex items-center gap-3 p-3.5 rounded-2xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border border-amber-300 dark:border-amber-700/70 shadow-xl"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
                  NESA 2024/2025 PLE
                </span>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                  100% Pass Rate
                </span>
              </div>
            </motion.div>

            {/* Gatsibo District Academic Ranking Bottom Right Card */}
            <div className="absolute -bottom-3 -right-3 hidden sm:flex items-center gap-3 p-3.5 rounded-2xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border border-emerald-300 dark:border-emerald-700/70 shadow-xl">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                  Mean Score: 76.04%
                </span>
                <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                  Top Tier in Gatsibo
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Animated Statistics Counter Grid */}
        <div className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-600/50 transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-400 font-mono tabular-nums">
                100%
              </span>
              <Award className="w-5 h-5 text-emerald-600/70" />
            </div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {t('statPassRate')}
            </p>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Official NESA Code 530413
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-sky-500/50 transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-3xl font-extrabold text-sky-700 dark:text-sky-400 font-mono tabular-nums">
                684
              </span>
              <Users className="w-5 h-5 text-sky-600/70" />
            </div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {t('statStudents')}
            </p>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Nursery (148) + Primary (536)
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-amber-500/50 transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                24
              </span>
              <GraduationCap className="w-5 h-5 text-amber-500/70" />
            </div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {t('statTeachers')}
            </p>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Government Certified & Mentored
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-500/50 transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-400 font-mono tabular-nums">
                100%
              </span>
              <BookOpen className="w-5 h-5 text-emerald-600/70" />
            </div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {t('statFeeding')}
            </p>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Warm Milk Porridge & Hot Lunch
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
