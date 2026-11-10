import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { ShareDocumentButton } from '../common/ShareDocumentButton';
import {
  Student,
  Teacher,
  FeeInvoice,
  AttendanceRecord,
  GradeEntry,
  SchoolEvent
} from '../../types';
import {
  Users,
  GraduationCap,
  CalendarCheck2,
  Wallet,
  Sparkles,
  BookOpen,
  Clock,
  Award,
  Bell,
  MapPin,
  CheckCircle2,
  FileText,
  CreditCard,
  Send,
  Phone,
  Printer,
  ChevronRight,
  HeartHandshake,
  Utensils,
  Milk,
  Smartphone,
  Check,
  ShieldCheck,
  Database,
  Bot,
} from 'lucide-react';
import { AiDashboardInsights } from './AiDashboardInsights';
import { DashboardAnalytics } from './DashboardAnalytics';
import { RoleAiAssistantModal } from './RoleAiAssistantModal';

interface OverviewTabProps {
  students: Student[];
  teachers: Teacher[];
  fees: FeeInvoice[];
  attendance: AttendanceRecord[];
  grades: GradeEntry[];
  events: SchoolEvent[];
  onNavigateTab: (tab: string) => void;
}

function getAverageMark(entries: GradeEntry[]): number | null {
  const scores = entries
    .map(grade => grade.marks ?? grade.total ?? grade.totalScore)
    .filter((score): score is number => typeof score === 'number' && Number.isFinite(score) && score >= 0);
  return scores.length
    ? Math.round(scores.reduce((total, score) => total + score, 0) / scores.length)
    : null;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  students,
  teachers,
  fees,
  attendance,
  grades,
  events,
  onNavigateTab,
}) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const currentRole = user?.role || 'admin';

  // AI Assistant Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const [selectedChildId, setSelectedChildId] = useState('');

  // Student State: Star card modal
  const [showReportCardModal, setShowReportCardModal] = useState(false);
  const selectedChild = students.find(student => student.id === selectedChildId) || students[0];
  const selectedChildAttendance = selectedChild
    ? attendance.filter(record => record.studentId === selectedChild.id)
    : [];
  const selectedChildFees = selectedChild
    ? fees.filter(invoice => invoice.studentId === selectedChild.id)
    : [];
  const selectedChildGrades = selectedChild
    ? grades.filter(grade => grade.studentId === selectedChild.id)
    : [];
  const selectedChildAverage = getAverageMark(selectedChildGrades);

  // Formatter for Rwandan Francs
  const formatRWF = (num: number) => {
    return new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 })
      .format(num)
      .replace('RWF', '')
      .trim() + ' RWF';
  };

  // Real Database Metrics Calculations
  const enrolledCount = students.length;
  const nurseryCount = students.filter(s => s.level === 'Nursery').length;
  const lowerCount = students.filter(s => s.level === 'Lower Primary').length;
  const upperCount = students.filter(s => s.level === 'Upper Primary').length;

  const totalBilled = fees.reduce((acc, f) => acc + (f.amountTotal || 0), 0);
  const totalPaid = fees.reduce((acc, f) => acc + (f.amountPaid || 0), 0);
  const totalBalance = fees.reduce((acc, f) => acc + (f.balance ?? Math.max(0, f.amountTotal - f.amountPaid)), 0);
  const feePercent = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;

  const presentCount = attendance.filter(a => a.status === 'Present').length;
  const attendanceRate = attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : 0;
  const currentStudent = currentRole === 'student' ? students[0] : undefined;
  const currentStudentGrades = currentStudent
    ? grades.filter(grade => grade.studentId === currentStudent.id)
    : [];
  const currentStudentAttendance = currentStudent
    ? attendance.filter(record => record.studentId === currentStudent.id)
    : [];
  const currentStudentAverage = getAverageMark(currentStudentGrades);
  const academicAverage = getAverageMark(grades);
  const currentStudentAttendanceRate = currentStudentAttendance.length
    ? Math.round((currentStudentAttendance.filter(record => record.status === 'Present').length / currentStudentAttendance.length) * 100)
    : null;
  const today = new Date().toISOString().slice(0, 10);
  const teacherAttendanceToday = attendance.filter(record => record.date.slice(0, 10) === today);
  const teacherPresentToday = teacherAttendanceToday.filter(record => record.status === 'Present').length;

  return (
    <div className="space-y-6">
      {/* Rwandan Primary School Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="dashboard-hero relative overflow-hidden rounded-[30px] bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 p-6 sm:p-8 text-white shadow-[0_24px_60px_-30px_rgba(5,150,105,0.85)]"
      >
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-md text-emerald-100">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{t('currentTerm')} • St. Silas Private Primary School (EAR Kibondo)</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950 uppercase">
              REB Code: 530413
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black font-heading tracking-tight">
            {t('welcomeBack')} {user?.fullName || user?.name || 'Administrator'}!
          </h2>

          <div className="flex items-center gap-2 text-xs text-emerald-200">
            <MapPin className="w-3.5 h-3.5" />
            <span>Gatsibo District, Kabarore Sector, Simbwa Cell, Kibondo Village</span>
          </div>

          <p className="text-xs sm:text-sm text-emerald-50/90 font-normal leading-relaxed pt-1">
            {currentRole === 'owner' || currentRole === 'super_admin' ? (
              'Institutional governance active. Manage academic years, users, classes, finances, and authorized system settings.'
            ) : currentRole === 'admin' || currentRole === 'head_teacher' ? (
              'Daily school operations, feeding program allocations, pupil admissions, and educator rosters are active across Nursery, Lower Primary, and Upper Primary.'
            ) : currentRole === 'accountant' ? (
              'Bursar accounting portal active. Track termly tuition fees, MTN MoMo payments, feeding subsidies, and outstanding balances.'
            ) : currentRole === 'teacher' ? (
              'Welcome Educator. Your classroom roll-call, lesson plans, marks entry, and assignment evaluations are ready below.'
            ) : currentRole === 'student' ? (
              'Pupil portal active. Review your personal timetable, academic records, attendance, and school notices.'
            ) : (
              'Parent & Guardian portal active. Monitor your child’s attendance, daily hot feeding program, and school notices in Kibondo.'
            )}
          </p>

          {/* Quick AI Assistant Launcher in Banner */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setIsAiModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-lg shadow-amber-900/20 transition-all cursor-pointer"
            >
              <Bot className="w-4 h-4" />
              <span>
                {currentRole === 'owner' || currentRole === 'super_admin'
                  ? 'Open Executive AI Assistant'
                  : currentRole === 'accountant'
                  ? 'Open Financial AI Assistant'
                  : currentRole === 'teacher'
                  ? 'Open Lesson AI Assistant'
                  : currentRole === 'student'
                  ? 'Open AI Study Companion'
                  : currentRole === 'parent'
                  ? 'Open AI Parent Assistant'
                  : 'Open AI School Assistant'}
              </span>
            </button>
          </div>
        </div>

        {/* Decorative Sun & Hills Silhouette */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
      </motion.div>

      {/* ========================================================
          AI-POWERED DASHBOARD INSIGHTS SECTION (ALL ROLES)
         ======================================================== */}
      {['owner', 'super_admin', 'admin', 'head_teacher', 'accountant', 'teacher'].includes(currentRole) && (
        <AiDashboardInsights />
      )}

      <DashboardAnalytics
        students={students}
        fees={fees}
        attendance={attendance}
        grades={grades}
      />

      {/* ========================================================
          1. OWNER / SUPER ADMIN SPECIFIC DASHBOARD VIEW
         ======================================================== */}
      {(currentRole === 'owner' || currentRole === 'super_admin') && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          <div className="relative overflow-hidden rounded-[28px] border border-emerald-100 bg-gradient-to-r from-white via-white to-emerald-50/70 dark:border-emerald-900/40 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/30 px-5 py-4 shadow-sm">
            <div className="absolute inset-y-0 right-0 w-44 opacity-40 bg-[radial-gradient(circle_at_center,rgba(16,185,129,.18),transparent_65%)]" />
            <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,.12)] animate-pulse" />
                  Executive pulse
                </div>
                <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-white">School operations at a glance</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:min-w-[520px]">
                <div className="rounded-2xl bg-white/80 dark:bg-slate-950/50 px-4 py-3 border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Attendance</p>
                  <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">{attendanceRate}%</p>
                </div>
                <div className="rounded-2xl bg-white/80 dark:bg-slate-950/50 px-4 py-3 border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Outstanding</p>
                  <p className="mt-1 truncate text-sm font-black text-slate-900 dark:text-white">{formatRWF(totalBalance)}</p>
                </div>
                <div className="col-span-2 rounded-2xl bg-emerald-600 px-4 py-3 text-white shadow-lg shadow-emerald-600/20 sm:col-span-1">
                  <p className="text-[10px] font-bold uppercase text-emerald-100">Collection</p>
                  <p className="mt-1 text-xl font-black">{feePercent}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Owner Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="group relative overflow-hidden p-5 rounded-[28px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all">
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-100/60 dark:bg-emerald-900/20" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Enrolled Students</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{enrolledCount} Pupils</p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold mt-1">
                {nurseryCount} Nursery • {lowerCount} Lower • {upperCount} Upper
              </p>
            </div>

            <div className="group relative overflow-hidden p-5 rounded-[28px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all">
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-sky-100/60 dark:bg-sky-900/20" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Faculty Educators</span>
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{teachers.length} Teachers</p>
              <p className="text-[11px] text-sky-700 dark:text-sky-400 font-semibold mt-1">School faculty directory</p>
            </div>

            <div className="group relative overflow-hidden p-5 rounded-[28px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all">
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber-100/60 dark:bg-amber-900/20" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Total Fees Collected</span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400 flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{formatRWF(totalPaid)}</p>
              <p className="text-[11px] text-amber-600 font-semibold mt-1">{feePercent}% collection rate</p>
            </div>

            <div className="group relative overflow-hidden p-5 rounded-[28px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all">
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-violet-100/60 dark:bg-violet-900/20" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Outstanding Fees</span>
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400 flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{formatRWF(totalBalance)}</p>
              <p className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold mt-1">Remaining student balances</p>
            </div>
          </div>

          {/* Quick Actions for Owner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" />
                <span>System Settings & Backups</span>
              </h3>
              <p className="text-xs text-slate-500">
                Manage institutional configurations and review available data-protection options.
              </p>
              <button
                type="button"
                onClick={() => onNavigateTab('settings')}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
              >
                Open System Configuration
              </button>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span>Security Audit Logs</span>
              </h3>
              <p className="text-xs text-slate-500">
                Inspect tamper-proof user login, grade modification, and financial transaction records.
              </p>
              <button
                type="button"
                onClick={() => onNavigateTab('userlogs')}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition-colors cursor-pointer"
              >
                Inspect Audit Logs
              </button>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-amber-600" />
                <span>Financial Ledger</span>
              </h3>
              <p className="text-xs text-slate-500">
                Inspect balance sheets, tuition invoices, and mobile money receipt collections.
              </p>
              <button
                type="button"
                onClick={() => onNavigateTab('fees')}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors cursor-pointer"
              >
                View Financial Statements
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {currentRole === 'admin' && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
          aria-label="Administrator overview"
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {[
              { label: 'Student records', value: students.length, icon: Users, tone: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300' },
              { label: 'Teachers', value: teachers.length, icon: GraduationCap, tone: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-300' },
              { label: 'Recorded attendance', value: `${attendanceRate}%`, icon: CalendarCheck2, tone: 'text-teal-600 bg-teal-50 dark:bg-teal-950/40 dark:text-teal-300' },
              { label: 'Academic average', value: academicAverage === null ? '—' : `${academicAverage}%`, icon: Award, tone: 'text-violet-600 bg-violet-50 dark:bg-violet-950/40 dark:text-violet-300' },
              { label: 'Fee collection', value: `${feePercent}%`, icon: Wallet, tone: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300' },
            ].map(({ label, value, icon: Icon, tone }) => (
              <div key={label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                </div>
                <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{value}</p>
              </div>
            ))}
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">School operations</h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { id: 'students', label: 'Students', description: 'Review pupil records and admissions.' },
                { id: 'teachers', label: 'Teachers', description: 'Manage staff details and assignments.' },
                { id: 'attendance', label: 'Attendance', description: 'Review school attendance records.' },
                { id: 'messages', label: 'Announcements', description: 'View and manage school notices.' },
              ].map(action => (
                <button
                  type="button"
                  key={action.id}
                  onClick={() => onNavigateTab(action.id)}
                  className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-800"
                >
                  <span className="block text-sm font-bold text-slate-900 dark:text-white">{action.label}</span>
                  <span className="mt-1 block text-xs text-slate-500">{action.description}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* ========================================================
          2. HEAD TEACHER SPECIFIC DASHBOARD VIEW
         ======================================================== */}
      {currentRole === 'head_teacher' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* Admin KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">{t('kpiTotalStudents')}</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{enrolledCount} Pupils</p>
              <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                {nurseryCount} Nursery • {lowerCount} Lower • {upperCount} Upper
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">{t('kpiAttendanceRate')}</span>
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400 flex items-center justify-center">
                  <CalendarCheck2 className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{attendanceRate}%</p>
              <p className="text-[11px] text-teal-700 font-semibold mt-1">Across recorded attendance entries</p>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Academic Average</span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{academicAverage === null ? '—' : `${academicAverage}%`}</p>
              <p className="text-[11px] text-amber-600 font-semibold mt-1">{grades.length} assessment entries</p>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Primary Educators</span>
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{teachers.length} Teachers</p>
              <p className="text-[11px] text-sky-700 font-semibold mt-1">ECD, Lower & Upper Primary Faculty</p>
            </div>
          </div>

          {/* Quick Actions for Head Teacher */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Pupil Admissions</span>
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Review incoming online admission applications from Kibondo, Simbwa, and Kabarore sector.
              </p>
              <button
                type="button"
                onClick={() => onNavigateTab('admissions')}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
              >
                Review Admissions Applications
              </button>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal-600" />
                  <span>Class Timetables</span>
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Manage weekly subject schedules, teacher allocations, and classroom streams.
              </p>
              <button
                type="button"
                onClick={() => onNavigateTab('timetable')}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-colors cursor-pointer"
              >
                Open Timetable Manager
              </button>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Send className="w-4 h-4 text-sky-600" />
                  <span>Parent Announcements</span>
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Publish school circulars and announcements for families in Kibondo village.
              </p>
              <button
                type="button"
                onClick={() => onNavigateTab('messages')}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white transition-colors cursor-pointer"
              >
                Publish School Circular
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ========================================================
          3. ACCOUNTANT / BURSAR SPECIFIC DASHBOARD VIEW
         ======================================================== */}
      {currentRole === 'accountant' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase">Fees Invoiced</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{formatRWF(totalBilled)}</p>
              <span className="text-[11px] text-slate-500">{fees.length} Total Student Invoices</span>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase">Payments Received</span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{formatRWF(totalPaid)}</p>
              <span className="text-[11px] text-emerald-600 font-semibold">{feePercent}% Collection Progress</span>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase">Outstanding Balance</span>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{formatRWF(totalBalance)}</p>
              <span className="text-[11px] text-rose-600 font-semibold">Follow-up reminders needed</span>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-600" />
              <span>Bursar Fee Administration</span>
            </h3>
            <p className="text-xs text-slate-500">
              Record incoming tuition payments, print official receipts, and verify MTN Mobile Money transaction references.
            </p>
            <button
              type="button"
              onClick={() => onNavigateTab('fees')}
              className="py-2.5 px-5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
            >
              Open Fee Management & Record Payments
            </button>
          </div>
        </motion.div>
      )}

      {/* ========================================================
          4. TEACHER (MWALIMU) SPECIFIC DASHBOARD VIEW
         ======================================================== */}
      {currentRole === 'teacher' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* Teacher statistics from the teacher-scoped API records */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase">Assigned Students</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{students.length}</p>
              <span className="text-[11px] text-emerald-600 font-semibold">Across your assigned classes</span>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase">Today’s Attendance</span>
              <p className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1">
                {teacherAttendanceToday.length ? `${teacherPresentToday}/${teacherAttendanceToday.length}` : '—'}
              </p>
              <span className="text-[11px] text-slate-500">Recorded for your assigned classes</span>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase">Recorded Marks</span>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{grades.length}</p>
              <span className="text-[11px] text-amber-600 font-semibold">For assigned students and subjects</span>
            </div>
          </div>

          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                    <Award className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">Academic Records</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      Review and update marks for your assigned students and subjects.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('grades')}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 transition-colors cursor-pointer"
              >
                Open Marks & Results
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ========================================================
          5. STUDENT (PUPIL) SPECIFIC DASHBOARD VIEW
         ======================================================== */}
      {currentRole === 'student' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {currentStudent ? (
            <>
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {currentStudent.photoUrl || user?.avatar ? (
                  <img
                    src={currentStudent.photoUrl || user?.avatar}
                    alt={`${currentStudent.firstName} ${currentStudent.lastName}`}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-md"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <GraduationCap className="h-7 w-7" />
                  </div>
                )}
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      {currentStudent.firstName} {currentStudent.lastName}
                    </h3>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {currentStudent.grade} {currentStudent.section}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Admission number: <span className="font-mono font-bold text-emerald-600">{currentStudent.rollNo}</span>
                  </p>
                  <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
                    Academic average: <strong>{currentStudentAverage === null ? 'No marks recorded' : `${currentStudentAverage}%`}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowReportCardModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700"
              >
                <FileText className="h-4 w-4" />
                <span>View Results Summary</span>
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-xs font-semibold text-slate-500">Subjects with marks</p>
                <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                  {new Set(currentStudentGrades.map(grade => grade.subject)).size}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-xs font-semibold text-slate-500">Attendance rate</p>
                <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                  {currentStudentAttendanceRate === null ? '—' : `${currentStudentAttendanceRate}%`}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-xs font-semibold text-slate-500">Recorded results</p>
                <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">{currentStudentGrades.length}</p>
              </div>
            </div>
            </>
          ) : (
            <div role="status" className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              No student record is linked to this account. Contact the school administrator to link your pupil profile.
            </div>
          )}
        </motion.div>
      )}

      {/* ========================================================
          6. PARENT (UMUBYEYI) SPECIFIC DASHBOARD VIEW
         ======================================================== */}
      {currentRole === 'parent' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {students.length > 0 ? (
            <>
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-700 dark:bg-slate-800 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs font-bold text-slate-500">My Linked Students</span>
                <div className="flex flex-wrap gap-2">
                  {students.map(student => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => setSelectedChildId(student.id)}
                      aria-pressed={selectedChild?.id === student.id}
                      className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                        selectedChild?.id === student.id
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {student.firstName} {student.lastName} ({student.grade} {student.section})
                    </button>
                  ))}
                </div>
              </div>

              {selectedChild && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">Student Profile</span>
                      <GraduationCap className="h-5 w-5 text-emerald-600" />
                    </div>
                    <p className="text-base font-black text-slate-900 dark:text-white">
                      {selectedChild.firstName} {selectedChild.lastName}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {selectedChild.grade} {selectedChild.section} · {selectedChild.rollNo}
                    </p>
                    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      {selectedChild.status}
                    </span>
                  </div>
                  <div className="space-y-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">Latest Attendance</span>
                      <CalendarCheck2 className="h-5 w-5 text-teal-600" />
                    </div>
                    <p className="text-base font-black text-slate-900 dark:text-white">
                      {selectedChildAttendance[0]?.status || 'No attendance recorded'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {selectedChildAttendance[0]?.date || 'Attendance records will appear here'}
                    </p>
                  </div>
                  <div className="space-y-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">Academic Average</span>
                      <Award className="h-5 w-5 text-violet-600" />
                    </div>
                    <p className="text-base font-black text-slate-900 dark:text-white">
                      {selectedChildAverage === null ? 'No marks recorded' : `${selectedChildAverage}%`}
                    </p>
                    <p className="text-[11px] text-slate-500">{selectedChildGrades.length} recorded results</p>
                  </div>
                  <div className="space-y-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">Student Fees</span>
                      <Wallet className="h-5 w-5 text-amber-600" />
                    </div>
                    <p className="text-base font-black text-slate-900 dark:text-white">
                      {formatRWF(selectedChildFees.reduce((total, invoice) => total + (invoice.balance ?? invoice.amountTotal - invoice.amountPaid), 0))}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {selectedChildGrades.length} grade records · {selectedChildFees.length} fee invoices
                    </p>
                    {selectedChildFees.some(invoice => (invoice.balance ?? invoice.amountTotal - invoice.amountPaid) > 0) && (
                      <button type="button" onClick={() => onNavigateTab('fees')} className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300">
                        Pay school fees <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
              {selectedChild && (
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent academic results</h3><Award className="h-5 w-5 text-violet-600" /></div>
                    {selectedChildGrades.length === 0 ? <p className="mt-4 text-xs text-slate-500">No results have been recorded for this pupil.</p> : (
                      <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-700">
                        {selectedChildGrades.slice(0, 5).map(grade => (
                          <div key={grade.id} className="flex items-center justify-between gap-3 py-3">
                            <div><p className="text-xs font-bold text-slate-800 dark:text-slate-200">{grade.subject}</p><p className="text-[10px] text-slate-500">{grade.term}</p></div>
                            <span className="rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-black text-violet-700 dark:bg-violet-950 dark:text-violet-300">{grade.marks}% · {grade.grade}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-slate-900 dark:text-white">Attendance summary</h3><CalendarCheck2 className="h-5 w-5 text-teal-600" /></div>
                    {selectedChildAttendance.length === 0 ? <p className="mt-4 text-xs text-slate-500">No attendance has been recorded for this pupil.</p> : (
                      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                        {(['Present', 'Absent', 'Late', 'Excused'] as const).map(status => {
                          const count = selectedChildAttendance.filter(record => record.status === status).length;
                          return <div key={status} className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900"><p className="text-lg font-black text-slate-900 dark:text-white">{count}</p><p className="text-[10px] text-slate-500">{status}</p></div>;
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              No student is linked to this parent account yet. Please contact the school administrator to link your student.
            </div>
          )}
        </motion.div>
      )}

      {/* Results summary uses only marks returned for the signed-in student. */}
      {showReportCardModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-2xl rounded-3xl bg-white text-slate-900 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <span className="text-xs font-bold text-emerald-700 uppercase">
                Student Results Summary
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Results</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowReportCardModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Republic & School Header */}
            <div className="text-center space-y-1">
              <p className="text-[10px] font-black uppercase text-slate-500">
                REPUBLIC OF RWANDA • MINISTRY OF EDUCATION (REB)
              </p>
              <h3 className="text-xl font-black text-emerald-800 font-heading">
                ST. SILAS PRIVATE PRIMARY SCHOOL - KIBONDO
              </h3>
              <p className="text-xs text-slate-600">
                Gatsibo District • Kabarore Sector • Simbwa Cell • Kibondo Village (Code: 530413)
              </p>
              <div className="w-20 h-0.5 bg-emerald-600 mx-auto mt-1" />
            </div>

            {/* Pupil Information */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-400 block">Pupil Name</span>
                <span className="font-bold text-slate-800">
                  {currentStudent ? `${currentStudent.firstName} ${currentStudent.lastName}` : user?.fullName || 'Student'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Class & Stream</span>
                <span className="font-bold text-slate-800">
                  {currentStudent ? `${currentStudent.grade} ${currentStudent.section}` : '—'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Term / Year</span>
                <span className="font-bold text-slate-800">{currentStudentGrades[0]?.term || 'Not recorded'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Position in Class</span>
                <span className="font-bold text-emerald-700">
                  {currentStudentAverage === null ? 'No marks recorded' : `${currentStudentAverage}% average`}
                </span>
              </div>
            </div>

            {/* Marks Table */}
            <div className="overflow-x-auto">
            <table className="min-w-[36rem] w-full text-xs text-left">
              <thead className="bg-slate-100 font-bold uppercase text-[10px] text-slate-600">
                <tr>
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3">Score / 100</th>
                  <th className="py-2.5 px-3">REB Grade</th>
                  <th className="py-2.5 px-3">Teacher Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentStudentGrades.length ? currentStudentGrades.map(grade => {
                  const score = grade.marks ?? grade.total ?? grade.totalScore;
                  return (
                    <tr key={grade.id}>
                      <td className="py-2.5 px-3 font-semibold">{grade.subject}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                        {typeof score === 'number' ? `${score} / 100` : '—'}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-emerald-600">
                        {grade.grade || grade.gradeLetter || grade.letterGrade || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{grade.remarks || '—'}</td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={4} className="py-5 px-3 text-center text-slate-500">
                      No assessment results have been recorded for this account.
                    </td>
                  </tr>
                )}
                {currentStudentAverage !== null && (
                  <tr className="bg-emerald-50 font-bold">
                    <td className="py-3 px-3 text-emerald-900">Recorded average</td>
                    <td className="py-3 px-3 font-mono text-emerald-900 text-sm">{currentStudentAverage}%</td>
                    <td className="py-3 px-3 text-emerald-900">—</td>
                    <td className="py-3 px-3 text-emerald-900">Based on recorded marks</td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>

            <div className="flex justify-between items-end pt-4 border-t border-slate-200 text-xs">
              <div>
                <p className="font-bold text-slate-800">Attendance rate</p>
                <p className="italic text-slate-500">
                  {currentStudentAttendanceRate === null ? 'No attendance records are available.' : `${currentStudentAttendanceRate}% of recorded attendance was present.`}
                </p>
              </div>
              <div className="text-right">
                <p className="font-serif italic font-bold">St. Silas Private Primary School</p>
                <p className="text-[10px] text-slate-500">Contact the school for a signed official report.</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Role-Specific AI Assistant Modal */}
      <RoleAiAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        userRole={currentRole}
        userName={user?.fullName || user?.name || 'User'}
      />
    </div>
  );
};
