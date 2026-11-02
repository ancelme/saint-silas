import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useSchoolSettings } from '../../context/SchoolSettingsContext';
import { GraduationCap, ShieldCheck, MapPin, Phone, Mail } from 'lucide-react';

interface FooterProps {
  onOpenAuth: (tab?: 'login') => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAuth }) => {
  const { t } = useLanguage();
  const { settings } = useSchoolSettings();

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md">
                <GraduationCap className="w-6 h-6" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white font-heading">
                {settings.school_name || t('schoolName')}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t('schoolTagline')}
            </p>
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 text-[11px] text-slate-300 leading-normal flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>REB Code: <strong>530413</strong> • Église Anglicane au Rwanda (EAR Kibondo)</span>
            </div>
          </div>

          {/* Education Stages */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              {t('footerLevelsTitle')}
            </h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#academics" className="hover:text-white transition-colors">{t('levelNursery')}</a></li>
              <li><a href="#academics" className="hover:text-white transition-colors">{t('levelLowerPrimary')}</a></li>
              <li><a href="#academics" className="hover:text-white transition-colors">{t('levelUpperPrimary')}</a></li>
              <li><a href="#academics" className="hover:text-white transition-colors">{t('pleExamCardTitle')}</a></li>
              <li><a href="#admissions" className="hover:text-white transition-colors">{t('navAdmissions')}</a></li>
            </ul>
          </div>

          {/* School Life & Programs */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              {t('footerSchoolLifeTitle')}
            </h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#news" className="hover:text-white transition-colors">{t('statFeeding')}</a></li>
              <li><a href="#news" className="hover:text-white transition-colors">Amaraba (Traditional Dance)</a></li>
              <li><a href="#news" className="hover:text-white transition-colors">{t('trustCulture')}</a></li>
              <li><a href="#news" className="hover:text-white transition-colors">{t('statClubs')}</a></li>
              <li><a href="#about" className="hover:text-white transition-colors">{t('navAbout')}</a></li>
            </ul>
          </div>

          {/* Portal & Contact Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              {t('footerLocationTitle')}
            </h4>
            <div className="text-xs text-slate-400 space-y-1.5">
              <p className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>{t('contactAddress')}</span>
              </p>
              <p className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>+250781811662</span>
              </p>
              <p className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>info@stsilaskibondo.rw</span>
              </p>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
              >
                {t('tabSignIn')}
              </button>
              <a
                href="#admissions"
                className="py-1.5 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-xs font-semibold text-white transition-colors"
              >
                {t('navAdmissions')}
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            &copy; {new Date().getFullYear()} {settings.school_name || t('schoolName')}. {t('allRightsReserved')}
          </p>
          <p className="text-center sm:text-right leading-relaxed">
            Developed by <strong className="text-slate-400">NDAYISHIMIYE INNOCENT</strong> from Gatsibo
            <br />
            Contact: 07283717185 / 0781811662
          </p>
        </div>
      </div>
    </footer>
  );
};
