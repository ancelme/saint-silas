import React from 'react';
import { useSchoolSettings } from '../../context/SchoolSettingsContext';
import { useLanguage } from '../../context/LanguageContext';
import confetti from 'canvas-confetti';
import {
  Award,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  GraduationCap,
  Sparkles,
  BookOpen,
  School,
  ExternalLink
} from 'lucide-react';

interface NationalSuccessProps {
  onOpenAuth: (tab?: 'login') => void;
}

export const NationalSuccess: React.FC<NationalSuccessProps> = ({ onOpenAuth }) => {
  const { t } = useLanguage();
  const { getSuccessRecords } = useSchoolSettings();
  const latestSuccess = getSuccessRecords[getSuccessRecords.length - 1];

  const handleCelebrate = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#0284c7', '#f59e0b', '#059669', '#10b981'],
    });
  };

  const pillars = [
    {
      titleKey: 'pillar1Title',
      descKey: 'pillar1Desc',
      metric: 'N1 - P3',
      icon: BookOpen,
      color: 'emerald',
    },
    {
      titleKey: 'pillar2Title',
      descKey: 'pillar2Desc',
      metric: 'Weekly P6',
      icon: TrendingUp,
      color: 'sky',
    },
    {
      titleKey: 'pillar3Title',
      descKey: 'pillar3Desc',
      metric: '24 Staff',
      icon: GraduationCap,
      color: 'amber',
    },
    {
      titleKey: 'pillar4Title',
      descKey: 'pillar4Desc',
      metric: '100% Meals',
      icon: ShieldCheck,
      color: 'emerald',
    },
  ];

  return (
    <section id="national-success" className="py-20 bg-slate-900 text-white relative overflow-hidden">
      {/* Subtle Imigongo-inspired Background Ambient Lighting */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Award className="w-4 h-4 text-amber-400" />
            <span>{t('nationalSuccessBadge')}</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight text-balance">
            {t('nationalSuccessTitle')}
          </h2>

          <p className="text-slate-300 text-base sm:text-lg leading-relaxed text-pretty">
            {t('nationalSuccessSubtitle')}
          </p>
        </div>

        {/* Big Official Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
          {/* Card 1: 100% Pass Rate */}
          <div className="p-6 rounded-3xl bg-slate-800/80 border border-slate-700/80 hover:border-amber-400/60 transition-all shadow-xl group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                NESA {latestSuccess?.year || '2024/2025'} PLE
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
            </div>
            <div className="text-4xl font-extrabold text-white font-mono tabular-nums mb-2">
              {latestSuccess?.passRate || '100%'}
            </div>
            <h3 className="text-sm font-bold text-slate-100 mb-1">
              {t('metricPlePass')}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t('metricPlePassDesc')}
            </p>
          </div>

          {/* Card 2: 76.04% Mean Score */}
          <div className="p-6 rounded-3xl bg-slate-800/80 border border-slate-700/80 hover:border-sky-400/60 transition-all shadow-xl group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                Gatsibo District
              </span>
              <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-300 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="text-4xl font-extrabold text-white font-mono tabular-nums mb-2">
              {latestSuccess?.meanScore || '76.04%'}
            </div>
            <h3 className="text-sm font-bold text-slate-100 mb-1">
              {t('metricMeanScore')}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t('metricMeanScoreDesc')}
            </p>
          </div>

          {/* Card 3: 100% Secondary Transition */}
          <div className="p-6 rounded-3xl bg-slate-800/80 border border-slate-700/80 hover:border-emerald-400/60 transition-all shadow-xl group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Secondary Pathway
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                <School className="w-5 h-5" />
              </div>
            </div>
            <div className="text-4xl font-extrabold text-white font-mono tabular-nums mb-2">
              {latestSuccess?.transition || '100%'}
            </div>
            <h3 className="text-sm font-bold text-slate-100 mb-1">
              {t('metricTransition')}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t('metricTransitionDesc')}
            </p>
          </div>

          {/* Card 4: Division 1 & 2 */}
          <div className="p-6 rounded-3xl bg-slate-800/80 border border-slate-700/80 hover:border-amber-400/60 transition-all shadow-xl group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Top Aggregate
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
            <div className="text-4xl font-extrabold text-white font-mono tabular-nums mb-2">
              88%+
            </div>
            <h3 className="text-sm font-bold text-slate-100 mb-1">
              {t('metricDistinctions')}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t('metricDistinctionsDesc')}
            </p>
          </div>
        </div>

        {/* NESA Official Accreditation Notice Bar */}
        <div className="mb-16 p-6 rounded-3xl bg-gradient-to-r from-emerald-950/80 via-slate-800/90 to-sky-950/80 border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {t('nesaVerification')}
                </h3>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  REB: 530413
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                {t('nesaVerificationDesc')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleCelebrate}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md active:scale-95 whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>{t('celebrateSuccessBtn')}</span>
            </button>

            <button
              type="button"
              onClick={() => document.getElementById('admissions')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md whitespace-nowrap"
            >
              <span>{t('btnApplyNow')}</span>
            </button>
          </div>
        </div>

        {/* 4 Pillars of National Success */}
        <div className="space-y-6">
          <h3 className="text-xl sm:text-2xl font-bold text-white text-center">
            {t('successPillarsTitle')}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {pillars.map((pillar, idx) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-500 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-700/70 text-amber-400 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1.5">
                    {t(pillar.titleKey)}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {t(pillar.descKey)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
