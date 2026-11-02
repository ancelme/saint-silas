import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useSchoolSettings } from '../../context/SchoolSettingsContext';
import { Language } from '../../types';
import {
  GraduationCap,
  Sun,
  Moon,
  Globe,
  LogIn,
  UserPlus,
  LayoutDashboard,
  Menu,
  X,
  ChevronDown,
  Award,
  BookOpen,
  Calendar,
  MapPin
} from 'lucide-react';

interface NavbarProps {
  onOpenAuth: (initialTab?: 'login') => void;
  onNavigateToDashboard: () => void;
  onOpenMap?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth, onNavigateToDashboard, onOpenMap }) => {
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme, setTheme } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const { settings } = useSchoolSettings();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [pagesDropdownOpen, setPagesDropdownOpen] = useState(false);

  const pagesDropdownRef = useRef<HTMLDivElement>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pagesDropdownRef.current && !pagesDropdownRef.current.contains(event.target as Node)) {
        setPagesDropdownOpen(false);
      }
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dropped down sub-pages (all other sections consolidated into dropdown)
  const dropdownNavItems = [
    {
      id: 'success',
      label: t('navSuccess'),
      sub: t('navSuccessSub'),
      href: '#national-success',
      icon: Award,
      badge: '100% PLE',
    },
    {
      id: 'about',
      label: t('navAbout'),
      sub: t('navAboutSub'),
      href: '#about',
      icon: BookOpen,
      badge: 'EAR 2004',
    },
    {
      id: 'academics',
      label: t('navAcademics'),
      sub: t('navAcademicsSub'),
      href: '#academics',
      icon: GraduationCap,
      badge: 'N1 - P6',
    },
    {
      id: 'admissions',
      label: t('navAdmissions'),
      sub: t('navAdmissionsSub'),
      href: '#admissions',
      icon: UserPlus,
      badge: '2026/27',
    },
    {
      id: 'news',
      label: t('navNews'),
      sub: t('navNewsSub'),
      href: '#news',
      icon: Calendar,
      badge: null,
    },
    {
      id: 'contact',
      label: t('navContact'),
      sub: t('navContactSub'),
      href: '#contact',
      icon: MapPin,
      badge: 'Kibondo',
    },
  ];

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'rw', label: 'Ikinyarwanda', flag: '🇷🇼' },
  ];

  const currentLangObj = languages.find(l => l.code === language) || languages[0];

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo with St. Silas EAR Kibondo identity */}
          <a href="#home" className="flex items-center gap-3 group focus:outline-none shrink-0">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-700 via-teal-700 to-sky-600 flex items-center justify-center text-white shadow-md shadow-emerald-700/20 group-hover:scale-105 transition-transform duration-200">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white block font-heading leading-tight">
                {settings.school_name || t('schoolName')}
              </span>
              <button
                type="button"
                onClick={e => {
                  if (onOpenMap) {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpenMap();
                  }
                }}
                className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 tracking-wide block hover:underline text-left cursor-pointer"
                title={t('clickToOpenMap')}
              >
                📍📕 {t('schoolLocationShort')}
              </button>
            </div>
          </a>

          {/* Reduced Desktop Navigation: Main Page Established + Dropdown Pages */}
          <nav className="hidden lg:flex items-center gap-2">
            {/* 1. Main Page Established */}
            <a
              href="#home"
              className="px-4 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-200 dark:border-emerald-800/80 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors"
            >
              {t('mainPage')}
            </a>

            {/* 2. Dropped-Down Pages Menu */}
            <div className="relative" ref={pagesDropdownRef}>
              <button
                type="button"
                id="school-pages-dropdown-btn"
                onClick={() => setPagesDropdownOpen(!pagesDropdownOpen)}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  pagesDropdownOpen
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
                }`}
                aria-expanded={pagesDropdownOpen}
              >
                <span>{t('dropdownPages')}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    pagesDropdownOpen ? 'rotate-180 text-emerald-600' : 'text-slate-400'
                  }`}
                />
              </button>

              {pagesDropdownOpen && (
                <div
                  className="absolute left-0 mt-2 w-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                  role="menu"
                >
                  <div className="px-3 py-1.5 mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                    {t('dropdownPages')}
                  </div>
                  <div className="space-y-1">
                    {dropdownNavItems.map(item => {
                      const Icon = item.icon;
                      return (
                        <a
                          key={item.id}
                          href={item.href}
                          onClick={() => setPagesDropdownOpen(false)}
                          className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 truncate">
                                {item.label}
                              </span>
                              {item.badge && (
                                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {item.sub}
                            </p>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Right Controls: Language, Dark/White Toggle, Auth */}
          <div className="hidden sm:flex items-center gap-2">
            {/* Language Switcher */}
            <div className="relative" ref={langDropdownRef}>
              <button
                type="button"
                id="language-switcher-btn"
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                aria-label="Select Language"
              >
                <Globe className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                <span>{currentLangObj.flag}</span>
                <span className="hidden md:inline">{currentLangObj.label}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {langDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-44 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-150"
                  role="menu"
                >
                  {languages.map(l => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => {
                        setLanguage(l.code);
                        setLangDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${
                        language === l.code
                          ? 'text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50/50 dark:bg-emerald-950/30'
                          : 'text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{l.flag}</span>
                        <span>{l.label}</span>
                      </span>
                      {language === l.code && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dark and White Only Mode Toggle Button */}
            <button
              type="button"
              id="theme-toggle-btn"
              onClick={toggleTheme}
              className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title={theme === 'dark' ? t('themeWhite') : t('themeDark')}
              aria-label={theme === 'dark' ? t('themeWhite') : t('themeDark')}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 transition-transform hover:rotate-45" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700 transition-transform hover:-rotate-12" />
              )}
              <span className="text-xs font-semibold hidden xl:inline">
                {theme === 'dark' ? t('themeWhite') : t('themeDark')}
              </span>
            </button>

            {/* Auth Actions */}
            {isAuthenticated ? (
              <button
                type="button"
                onClick={onNavigateToDashboard}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>{t('navDashboard')}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="nav-login-btn"
                  onClick={() => onOpenAuth('login')}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-emerald-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  {t('navLogin')}
                </button>
                <a
                  href="#admissions"
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-sm transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{t('navAdmissions')}</span>
                </a>
              </div>
            )}
          </div>

          {/* Mobile Menu Button with quick dark/white toggle */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
              title={theme === 'dark' ? t('themeWhite') : t('themeDark')}
              aria-label={theme === 'dark' ? t('themeWhite') : t('themeDark')}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Toggle Mobile Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-3 pb-6 space-y-4 animate-in slide-in-from-top-4 duration-200">
          <nav className="flex flex-col space-y-1">
            {/* Main Page Button */}
            <a
              href="#home"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3.5 py-2.5 text-sm font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-800/80 mb-2"
            >
              {t('mainPage')}
            </a>

            {/* Dropped Down Pages Group */}
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pt-1 pb-1">
              {t('dropdownPages')}
            </div>
            {dropdownNavItems.map(item => {
              const Icon = item.icon;
              return (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-emerald-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <Icon className="w-4 h-4 text-emerald-600" />
                  <span>{item.label}</span>
                </a>
              );
            })}
          </nav>

          {/* Mobile Dark and White Only Mode Switch */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-2">
              {t('selectTheme')}:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-semibold border transition-all ${
                  theme === 'light'
                    ? 'border-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-bold shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>{t('themeWhite')}</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-semibold border transition-all ${
                  theme === 'dark'
                    ? 'border-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-bold shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Moon className="w-4 h-4 text-indigo-400" />
                <span>{t('themeDark')}</span>
              </button>
            </div>
          </div>

          {/* Mobile Language Switcher */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-2">
              {language === 'rw' ? 'Hitamo Ururimi:' : language === 'fr' ? 'Choisir la langue :' : 'Select Language:'}
            </span>
            <div className="flex gap-2">
              {languages.map(l => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setLanguage(l.code)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                    language === l.code
                      ? 'border-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-bold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {l.flag} {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Auth Actions */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigateToDashboard();
                }}
                className="w-full py-2.5 rounded-xl text-center text-xs font-bold bg-emerald-700 text-white"
              >
                {t('navDashboard')}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('login');
                  }}
                  className="w-full py-2.5 rounded-xl text-center text-xs font-bold border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                >
                  {t('navLogin')}
                </button>
                <a
                  href="#admissions"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 rounded-xl text-center text-xs font-bold bg-emerald-700 text-white"
                >
                  {t('navAdmissions')}
                </a>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
