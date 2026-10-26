import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import {
  Student,
  Teacher,
  FeeInvoice,
  AttendanceRecord,
  GradeEntry,
  SchoolEvent,
  Announcement,
  TimetableSlot,
  AdmissionApplication,
  Language,
  Role,
  UserAuditLog
} from '../../types';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarCheck2,
  Award,
  Wallet,
  BookOpen,
  MessageSquare,
  MessageCircleQuestion,
  FileText,
  Calendar,
  LogOut,
  Moon,
  Sun,
  Globe,
  Bell,
  Menu,
  X,
  ExternalLink,
  Sparkles,
  Camera,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  Settings
} from 'lucide-react';

import { OverviewTab } from './OverviewTab';
import { StudentsTab } from './StudentsTab';
import { TeachersTab } from './TeachersTab';
import { TimetableTab } from './TimetableTab';
import { AttendanceTab } from './AttendanceTab';
import { GradesTab } from './GradesTab';
import { FeesTab } from './FeesTab';
import { LibraryTab } from './LibraryTab';
import { MessagesTab } from './MessagesTab';
import { ChatTab } from './ChatTab';
import { AskFeedbackTab } from './AskFeedbackTab';
import { CalendarTab } from './CalendarTab';
import { AdmissionsTab } from './AdmissionsTab';
import { UserManagementTab } from './UserManagementTab';
import { UserLogsTab } from './UserLogsTab';
import { SettingsTab } from './SettingsTab';
import {
  AccountNotification,
  fetchAuditLogs,
  fetchChatContacts,
  fetchFeedbackInbox,
  fetchNotifications,
  markNotificationRead,
} from '../../services/api';
import { connectChatSocket } from '../../services/chatSocket';

interface DashboardLayoutProps {
  students: Student[];
  teachers: Teacher[];
  fees: FeeInvoice[];
  attendance: AttendanceRecord[];
  grades: GradeEntry[];
  events: SchoolEvent[];
  announcements: Announcement[];
  timetable: TimetableSlot[];
  admissions: AdmissionApplication[];
  onAddStudent: (student: Student) => void;
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent?: (id: string) => void;
  onAddTeacher: (teacher: Teacher) => void;
  onUpdateTeacher?: (teacher: Teacher) => void;
  onDeleteTeacher?: (id: string) => void;
  onSaveAttendance: (records: AttendanceRecord[]) => void;
  onSaveTimetable: (timetable: TimetableSlot[]) => Promise<void>;
  onSaveSchoolEvents: (events: SchoolEvent[]) => Promise<void>;
  onUpdateGrade: (grade: GradeEntry) => void;
  onRecordPayment: (
    invoiceId: string,
    amount: number,
    method: 'MTN Mobile Money' | 'Airtel Money' | 'Bank Transfer' | 'Cash',
    referenceNo?: string,
    phoneNumber?: string,
  ) => Promise<string>;
  onAddFeeInvoice?: (invoice: FeeInvoice) => void;
  onUpdateFeeInvoice?: (invoice: FeeInvoice) => void;
  onDeleteFeeInvoice?: (id: string) => void;
  onAddAnnouncement: (announcement: Announcement) => void;
  onUpdateAnnouncement?: (announcement: Announcement) => void;
  onDeleteAnnouncement?: (id: string) => void;
  onApproveAdmission: (admissionId: string, assignedStream: string) => void;
  onRejectAdmission: (admissionId: string) => void;
  onNewAdmission: (application: AdmissionApplication) => void;
  onDeleteAdmission?: (id: string) => void;
  onAnswerAdmission?: (admissionId: string, decision: 'Approved' | 'Rejected' | 'Under Review', answerText: string, assignedStream?: string) => void;
  onSwitchToPublic: () => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  students,
  teachers,
  fees,
  attendance,
  grades,
  events,
  announcements,
  timetable,
  admissions,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onAddTeacher,
  onUpdateTeacher,
  onDeleteTeacher,
  onSaveAttendance,
  onSaveTimetable,
  onSaveSchoolEvents,
  onUpdateGrade,
  onRecordPayment,
  onAddFeeInvoice,
  onUpdateFeeInvoice,
  onDeleteFeeInvoice,
  onAddAnnouncement,
  onUpdateAnnouncement,
  onDeleteAnnouncement,
  onApproveAdmission,
  onRejectAdmission,
  onNewAdmission,
  onDeleteAdmission,
  onAnswerAdmission,
  onSwitchToPublic,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { user, logout, updateUserAvatar } = useAuth();

  const [activeTab, setActiveTab] = useState<string>('overview');
  const [lastDashboardTab, setLastDashboardTab] = useState('overview');
  const [chatContactToOpen, setChatContactToOpen] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AccountNotification[]>([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [unreadFeedbackCount, setUnreadFeedbackCount] = useState(0);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [avatarSuccessToast, setAvatarSuccessToast] = useState(false);

  // Security Audit Logs loaded from API
  const [auditLogs, setAuditLogs] = useState<UserAuditLog[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentRole = (user?.role || 'student') as Role;
  const canViewFeedbackInbox = ['owner', 'super_admin', 'admin'].includes(currentRole);

  const refreshDashboardNotifications = useCallback(async () => {
    const [accountResult, contactsResult, feedbackResult] = await Promise.allSettled([
      fetchNotifications(),
      fetchChatContacts(),
      canViewFeedbackInbox ? fetchFeedbackInbox() : Promise.resolve([]),
    ]);
    const errors: string[] = [];

    if (accountResult.status === 'fulfilled') {
      setNotifications(accountResult.value);
    } else {
      errors.push('account notifications');
      console.error('Failed to refresh account notifications:', accountResult.reason);
    }
    if (contactsResult.status === 'fulfilled') {
      setUnreadChatCount(contactsResult.value.reduce((total, contact) => total + contact.unreadCount, 0));
    } else {
      errors.push('chat notifications');
      console.error('Failed to refresh unread chat count:', contactsResult.reason);
    }
    if (feedbackResult.status === 'fulfilled') {
      setUnreadFeedbackCount(feedbackResult.value.filter(request => !request.isRead).length);
    } else {
      errors.push('feedback notifications');
      console.error('Failed to refresh unread feedback count:', feedbackResult.reason);
    }

    setNotificationError(errors.length > 0 ? `Could not refresh ${errors.join(', ')}.` : null);
  }, [canViewFeedbackInbox]);

  useEffect(() => {
    if (['owner', 'super_admin'].includes(currentRole)) {
      fetchAuditLogs().then(logs => setAuditLogs(logs)).catch(() => {});
    }
  }, [currentRole, activeTab]);

  useEffect(() => {
    if (!user) return;
    const refresh = () => {
      if (document.visibilityState === 'visible') void refreshDashboardNotifications();
    };
    refresh();

    const socket = connectChatSocket();
    socket?.on('message:new', refresh);
    socket?.on('message:status', refresh);
    const interval = window.setInterval(refresh, 30000);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      socket?.off('message:new', refresh);
      socket?.off('message:status', refresh);
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [user?.id, activeTab, refreshDashboardNotifications]);

  const toggleNotifications = async () => {
    const shouldOpen = !isNotificationsOpen;
    setIsNotificationsOpen(shouldOpen);
    if (!shouldOpen) return;

    setIsLoadingNotifications(true);
    setNotificationError(null);
    try {
      setNotifications(await fetchNotifications());
    } catch (error) {
      console.error('Failed to load account notifications:', error);
      setNotificationError(error instanceof Error ? error.message : 'Failed to load notifications.');
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  const handleMarkNotificationRead = async (notification: AccountNotification) => {
    if (notification.isRead) return;

    try {
      await markNotificationRead(notification.id);
      setNotifications(current => current.map(item =>
        item.id === notification.id ? { ...item, isRead: true } : item
      ));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      setNotificationError(error instanceof Error ? error.message : 'Failed to update notification.');
    }
  };

  const unreadAccountNotificationCount = notifications.filter(notification => !notification.isRead).length;
  const pendingAdmissionCount = admissions.filter(admission => admission.status === 'Pending').length;
  const navigationBadgeCounts: Record<string, number> = {
    chat: unreadChatCount,
    'ask-feedback': unreadFeedbackCount,
    admissions: pendingAdmissionCount,
  };

  // Define Navigation Items with Role-based filtering
  const allNavItems = [
    { id: 'overview', label: t('dashOverview'), icon: LayoutDashboard, roles: ['owner', 'super_admin', 'admin', 'head_teacher', 'accountant', 'teacher', 'librarian', 'student', 'parent'] },
    { id: 'users', label: 'User & Role Mgmt', icon: Users, roles: ['owner', 'super_admin', 'admin'] },
    { id: 'admissions', label: t('dashAdmissions'), icon: FileText, roles: ['owner', 'super_admin', 'admin', 'head_teacher'] },
    { id: 'students', label: t('dashStudents'), icon: GraduationCap, roles: ['owner', 'super_admin', 'admin', 'head_teacher', 'teacher', 'parent'] },
    { id: 'teachers', label: t('dashTeachers'), icon: BookOpen, roles: ['owner', 'super_admin', 'admin', 'head_teacher'] },
    { id: 'timetable', label: t('dashTimetable'), icon: Calendar, roles: ['owner', 'super_admin', 'admin', 'head_teacher', 'teacher', 'student', 'parent'] },
    { id: 'attendance', label: t('dashAttendance'), icon: CalendarCheck2, roles: ['owner', 'super_admin', 'admin', 'head_teacher', 'teacher', 'student', 'parent'] },
    { id: 'grades', label: t('dashGrades'), icon: Award, roles: ['owner', 'super_admin', 'admin', 'head_teacher', 'teacher', 'student', 'parent'] },
    { id: 'fees', label: t('dashFees'), icon: Wallet, roles: ['owner', 'super_admin', 'admin', 'head_teacher', 'accountant', 'parent', 'student'] },
    { id: 'library', label: t('dashLibrary'), icon: BookOpen, roles: ['owner', 'super_admin', 'admin', 'head_teacher', 'teacher', 'librarian', 'student'] },
    { id: 'chat', label: 'Chat', icon: MessageSquare, roles: ['owner', 'super_admin', 'admin', 'head_teacher', 'teacher', 'accountant', 'librarian', 'parent', 'student'] },
    { id: 'ask-feedback', label: 'Ask & Feedback', icon: MessageCircleQuestion, roles: ['owner', 'super_admin', 'admin', 'head_teacher', 'teacher', 'accountant', 'librarian', 'parent', 'student'] },
    { id: 'messages', label: 'Announcements & SMS', icon: Bell, roles: ['owner', 'super_admin', 'admin', 'head_teacher', 'teacher', 'accountant', 'librarian', 'parent', 'student'] },
    { id: 'calendar', label: t('dashCalendar'), icon: Calendar, roles: ['owner', 'super_admin', 'admin', 'head_teacher', 'teacher', 'accountant', 'librarian', 'student', 'parent'] },
    { id: 'userlogs', label: 'Security Audit Logs', icon: ShieldCheck, roles: ['owner', 'super_admin'] },
    { id: 'settings', label: 'System & Database', icon: Settings, roles: ['owner', 'super_admin'] },
  ];

  const visibleNavItems = allNavItems.filter(item => item.roles.includes(currentRole));

  useEffect(() => {
    if (!visibleNavItems.some(item => item.id === activeTab)) {
      setActiveTab('overview');
    }
  }, [activeTab, currentRole]);

  const roleBadges: Record<Role, { label: string; color: string }> = {
    owner: { label: 'School Owner / Super Admin', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
    super_admin: { label: 'Super Administrator', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
    admin: { label: t('roleAdmin') || 'Administrator', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
    head_teacher: { label: 'Head Teacher (Umuyobozi)', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
    teacher: { label: t('roleTeacher') || 'Primary Educator', color: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300' },
    accountant: { label: 'Bursar / Accountant', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
    student: { label: t('roleStudent') || 'Pupil', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300' },
    parent: { label: t('roleParent') || 'Parent / Guardian', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' },
    librarian: { label: 'School Librarian', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
  };

  const handleTabSelect = (tabId: string) => {
    if (!allNavItems.some(item => item.id === tabId && item.roles.includes(currentRole))) return;
    if (tabId !== 'chat') {
      setLastDashboardTab(tabId);
    } else if (activeTab !== 'chat') {
      setLastDashboardTab(activeTab);
    }
    setActiveTab(tabId);
    setIsSidebarOpen(false);
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      updateUserAvatar(dataUrl);
      setAvatarSuccessToast(true);
      setTimeout(() => setAvatarSuccessToast(false), 3500);
    };
    reader.readAsDataURL(file);
  };

  const triggerAvatarUpload = () => {
    fileInputRef.current?.click();
  };

  const languages: { code: Language; name: string; flag: string }[] = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'rw', name: 'Kinyarwanda', flag: '🇷🇼' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Hidden file input for uploading profile avatar */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Profile Image Success Toast */}
      {avatarSuccessToast && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl text-xs font-bold animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4" />
          <span>Profile photo updated and saved to database!</span>
        </div>
      )}

      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 h-16 flex items-center px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden cursor-pointer"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* School Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              SS
            </div>
            <div>
              <span className="font-heading font-black text-sm text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                St. Silas Primary
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block leading-none">
                Gatsibo • REB: 530413
              </span>
            </div>
          </div>
        </div>

        {/* Right Header Controls */}
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {/* User Role Badge */}
          <span className={`hidden sm:inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${roleBadges[currentRole]?.color || 'bg-slate-100 text-slate-800'}`}>
            {roleBadges[currentRole]?.label || currentRole}
          </span>

          {/* Language Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer"
            >
              <Globe className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline uppercase">{language}</span>
            </button>

            {isLangDropdownOpen && (
              <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-40">
                {languages.map(lang => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      setLanguage(lang.code);
                      setIsLangDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer ${
                      language === lang.code ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Account Notifications */}
          <div className="relative">
            <button
              type="button"
              onClick={toggleNotifications}
              className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Account notifications"
              aria-label={`Account notifications${unreadAccountNotificationCount > 0 ? `, ${unreadAccountNotificationCount} unread` : ''}`}
              aria-expanded={isNotificationsOpen}
            >
              <Bell className="w-4 h-4" />
              {unreadAccountNotificationCount > 0 && (
                <span
                  key={unreadAccountNotificationCount}
                  className="absolute -top-1 -right-1 flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[9px] font-bold leading-none text-white shadow-sm animate-[notification-pop_450ms_ease-out] motion-reduce:animate-none"
                >
                  {unreadAccountNotificationCount > 99 ? '99+' : unreadAccountNotificationCount}
                </span>
              )}
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-[min(24rem,calc(100vw-2rem))] max-h-[70vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-40">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">Account feedback</h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Admission confirmations and decisions for this account.</p>
                </div>
                {notificationError && (
                  <p role="alert" className="px-4 py-3 text-xs text-rose-600 dark:text-rose-300">{notificationError}</p>
                )}
                {isLoadingNotifications ? (
                  <p className="px-4 py-5 text-xs text-slate-500">Loading notifications…</p>
                ) : notifications.length === 0 ? (
                  <p className="px-4 py-5 text-xs text-slate-500">No account feedback yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {notifications.map(notification => (
                      <li key={notification.id}>
                        <button
                          type="button"
                          onClick={() => handleMarkNotificationRead(notification)}
                          className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/70 ${notification.isRead ? '' : 'bg-emerald-50/70 dark:bg-emerald-950/20'}`}
                        >
                          <span className="flex items-start gap-2">
                            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.isRead ? 'bg-slate-300 dark:bg-slate-600' : notification.type === 'error' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                            <span className="min-w-0">
                              <span className="block text-xs font-bold text-slate-900 dark:text-white">{notification.title}</span>
                              <span className="mt-1 block whitespace-pre-line text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">{notification.message}</span>
                              <time className="mt-1.5 block text-[10px] text-slate-400">
                                {new Date(notification.createdAt.replace(' ', 'T')).toLocaleString()}
                              </time>
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={theme === 'dark' ? 'Switch to White Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* User Profile Info & Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div
              onClick={triggerAvatarUpload}
              className="relative cursor-pointer group"
              title="Click to change profile picture"
            >
              <img
                src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                alt={user?.fullName || user?.name || ''}
                className="w-8 h-8 rounded-full object-cover border border-emerald-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-3 h-3 text-white" />
              </div>
            </div>

            <div className="hidden md:block text-left">
              <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight truncate max-w-[120px]">
                {user?.fullName || user?.name || 'User'}
              </span>
              <span className="text-[10px] text-slate-400 block leading-tight capitalize">
                {user?.role}
              </span>
            </div>

            <button
              type="button"
              onClick={logout}
              className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors ml-1 cursor-pointer"
              title={t('authSignOut')}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-25 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Navigation Links */}
          <div className="p-4 space-y-1 overflow-y-auto flex-1">
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t('portalTitle')}
            </div>
            {visibleNavItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabSelect(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/30'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {(navigationBadgeCounts[item.id] || 0) > 0 && (
                    <span
                      key={`${item.id}-${navigationBadgeCounts[item.id]}`}
                      className={`ml-auto inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none shadow-sm animate-[notification-pop_450ms_ease-out] motion-reduce:animate-none ${
                        isActive ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-200'
                      }`}
                      aria-label={`${navigationBadgeCounts[item.id]} ${
                        item.id === 'admissions' ? 'pending admissions' : item.id === 'chat' ? 'unread messages' : 'unread feedback requests'
                      }`}
                    >
                      {navigationBadgeCounts[item.id] > 99 ? '99+' : navigationBadgeCounts[item.id]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom Sidebar User Info & Avatar Upload trigger */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <div
              onClick={triggerAvatarUpload}
              className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-750 flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
              title="Click to change profile picture"
            >
              <div className="relative">
                <img
                  src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover border border-emerald-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
              <div className="overflow-hidden">
                <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                  {user?.fullName || user?.name}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">
                  Click to change photo
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onSwitchToPublic}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Back to Public Site</span>
            </button>
          </div>
        </aside>

        {/* Backdrop for mobile */}
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-20 bg-slate-950/50 backdrop-blur-xs lg:hidden"
          />
        )}

        {/* Content View Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {activeTab === 'overview' && (
            <OverviewTab
              students={students}
              teachers={teachers}
              fees={fees}
              attendance={attendance}
              grades={grades}
              events={events}
              onNavigateTab={handleTabSelect}
            />
          )}

          {activeTab === 'users' && (
            <UserManagementTab />
          )}

          {activeTab === 'admissions' && (
            <AdmissionsTab
              admissions={admissions}
              onApproveAdmission={onApproveAdmission}
              onRejectAdmission={onRejectAdmission}
              onNewAdmission={onNewAdmission}
              onAnswerAdmission={onAnswerAdmission}
              currentUserRole={currentRole}
            />
          )}

          {activeTab === 'students' && (
            <StudentsTab
              students={students}
              onAddStudent={onAddStudent}
              onUpdateStudent={onUpdateStudent}
              onDeleteStudent={onDeleteStudent}
              isParentView={currentRole === 'parent'}
            />
          )}

          {activeTab === 'teachers' && (
            <TeachersTab
              teachers={teachers}
              onAddTeacher={onAddTeacher}
              onUpdateTeacher={onUpdateTeacher}
              onDeleteTeacher={onDeleteTeacher}
            />
          )}

          {activeTab === 'timetable' && (
            <TimetableTab
              timetable={timetable}
              currentUserRole={currentRole}
              onSaveTimetable={onSaveTimetable}
            />
          )}

          {activeTab === 'attendance' && (
            <AttendanceTab
              students={students}
              attendanceRecords={attendance}
              onSaveAttendance={onSaveAttendance}
            />
          )}

          {activeTab === 'grades' && (
            <GradesTab
              students={students}
              grades={grades}
              onUpdateGrade={onUpdateGrade}
            />
          )}

          {activeTab === 'fees' && (
            <FeesTab
              fees={fees}
              students={students}
              onRecordPayment={onRecordPayment}
              onAddFeeInvoice={onAddFeeInvoice}
              onUpdateFeeInvoice={onUpdateFeeInvoice}
              onDeleteFeeInvoice={onDeleteFeeInvoice}
            />
          )}

          {activeTab === 'library' && (
            <LibraryTab />
          )}

          {activeTab === 'messages' && (
            <MessagesTab
              announcements={announcements}
              onAddAnnouncement={onAddAnnouncement}
              onUpdateAnnouncement={onUpdateAnnouncement}
              onDeleteAnnouncement={onDeleteAnnouncement}
            />
          )}

          {activeTab === 'ask-feedback' && (
            <AskFeedbackTab onOpenConversation={contactId => {
              setChatContactToOpen(contactId);
              handleTabSelect('chat');
            }} />
          )}

          {activeTab === 'calendar' && (
            <CalendarTab
              events={events}
              currentUserRole={currentRole}
              onSaveEvents={onSaveSchoolEvents}
            />
          )}

          {activeTab === 'userlogs' && (
            <UserLogsTab logs={auditLogs} />
          )}

          {activeTab === 'settings' && (
            <SettingsTab />
          )}
        </main>
      </div>
      {activeTab === 'chat' && (
        <div className="fixed inset-0 z-50">
          <ChatTab
            initialContactId={chatContactToOpen}
            onInitialContactOpened={() => setChatContactToOpen('')}
            onExitFullScreen={() => handleTabSelect(lastDashboardTab)}
          />
        </div>
      )}
    </div>
  );
};
