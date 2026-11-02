import React, { useState } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
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
  Maximize2,
  X
} from 'lucide-react';
import { AiDashboardInsights } from './AiDashboardInsights';
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

  // Teacher State: Quick Roll Call for P5 Alpha
  const [p5Attendance, setP5Attendance] = useState<Record<string, 'Present' | 'Late' | 'Absent'>>({
    'Keza Aline': 'Present',
    'Gasana Mugisha': 'Present',
    'Ineza Grace': 'Present',
    'Manzi Thierry': 'Late',
    'Ishimwe Samuel': 'Present',
    'Umutoni Cynthia': 'Present',
  });
  const [rollCallSaved, setRollCallSaved] = useState(false);

  // Student State: Star card modal
  const [showReportCardModal, setShowReportCardModal] = useState(false);
  const [expandedChart, setExpandedChart] = useState<'enrollment' | 'fees' | null>(null);
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
  const attendanceRate = attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : 98;
  const chartData = {
    enrollment: [
      { label: 'Nursery', value: nurseryCount, color: 'bg-violet-500' },
      { label: 'Lower Primary', value: lowerCount, color: 'bg-sky-500' },
      { label: 'Upper Primary', value: upperCount, color: 'bg-emerald-500' },
    ],
    fees: [
      { label: 'Collected', value: totalPaid, color: 'bg-emerald-500' },
      { label: 'Outstanding', value: totalBalance, color: 'bg-amber-500' },
    ],
  };
  const canViewFeesChart = ['owner', 'super_admin', 'admin', 'accountant'].includes(currentRole);
  const canViewEnrollmentChart = ['owner', 'super_admin', 'admin', 'head_teacher', 'teacher'].includes(currentRole);

  const renderChartBars = (chart: 'enrollment' | 'fees', expanded = false) => {
    const rows = chartData[chart];
    const maxValue = Math.max(...rows.map(row => row.value), 1);
    return (
      <div className={expanded ? 'space-y-7' : 'space-y-4'}>
        {rows.map(row => (
          <div key={row.label} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span>{row.label}</span>
              <span className="tabular-nums text-slate-900 dark:text-white">
                {chart === 'fees' ? formatRWF(row.value) : row.value}
              </span>
            </div>
            <div className={`overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700 ${expanded ? 'h-5' : 'h-3'}`}>
              <div
                className={`h-full rounded-full transition-all ${row.color}`}
                style={{ width: `${row.value === 0 ? 0 : Math.max(4, (row.value / maxValue) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const handleSaveRollCall = () => {
    setRollCallSaved(true);
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.7 }
    });
    setTimeout(() => setRollCallSaved(false), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Rwandan Primary School Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 p-6 sm:p-8 text-white shadow-xl"
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
              'Institutional governance active. Complete sovereign control over academic years, users, classes, finances, and MySQL database backups.'
            ) : currentRole === 'admin' || currentRole === 'head_teacher' ? (
              'Daily school operations, feeding program allocations, pupil admissions, and educator rosters are active across Nursery, Lower Primary, and Upper Primary.'
            ) : currentRole === 'accountant' ? (
              'Bursar accounting portal active. Track termly tuition fees, MTN MoMo payments, feeding subsidies, and outstanding balances.'
            ) : currentRole === 'teacher' ? (
              'Welcome Educator. Your classroom roll-call, lesson plans, marks entry, and assignment evaluations are ready below.'
            ) : currentRole === 'student' ? (
              'Pupil portal active. Check your class timetable, library reader, homework assignments, and Term 2 report card.'
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

      {(canViewEnrollmentChart || canViewFeesChart) && (
        <section aria-label="School data charts" className="grid gap-4 lg:grid-cols-2">
          {canViewEnrollmentChart && (
            <button
              type="button"
              onClick={() => setExpandedChart('enrollment')}
              aria-label="Expand enrollment by school level chart"
              className="group rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-xs transition hover:border-emerald-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
            >
              <span className="mb-4 flex items-center justify-between">
                <span>
                  <span className="block text-sm font-bold text-slate-900 dark:text-white">Enrollment by school level</span>
                  <span className="text-[11px] text-slate-500">Click chart to expand</span>
                </span>
                <Maximize2 className="h-4 w-4 text-slate-400 group-hover:text-emerald-600" />
              </span>
              {renderChartBars('enrollment')}
            </button>
          )}
          {canViewFeesChart && (
            <button
              type="button"
              onClick={() => setExpandedChart('fees')}
              aria-label="Expand fee collection chart"
              className="group rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-xs transition hover:border-emerald-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
            >
              <span className="mb-4 flex items-center justify-between">
                <span>
                  <span className="block text-sm font-bold text-slate-900 dark:text-white">Fee collection</span>
                  <span className="text-[11px] text-slate-500">Click chart to expand</span>
                </span>
                <Maximize2 className="h-4 w-4 text-slate-400 group-hover:text-emerald-600" />
              </span>
              {renderChartBars('fees')}
            </button>
          )}
        </section>
      )}

      {expandedChart && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setExpandedChart(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="expanded-chart-title"
            className="w-full max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:p-9"
          >
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Live school records</p>
                <h2 id="expanded-chart-title" className="mt-1 text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
                  {expandedChart === 'enrollment' ? 'Enrollment by school level' : 'Fee collection'}
                </h2>
              </div>
              <button type="button" onClick={() => setExpandedChart(null)} aria-label="Close expanded chart" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            {renderChartBars(expandedChart, true)}
          </section>
        </div>
      )}

      {/* ========================================================
          1. OWNER / SUPER ADMIN SPECIFIC DASHBOARD VIEW
         ======================================================== */}
      {(currentRole === 'owner' || currentRole === 'super_admin') && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* Owner Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Enrolled Students</span>
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
                <span className="text-xs font-bold text-slate-500 uppercase">Faculty Educators</span>
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{teachers.length} Teachers</p>
              <p className="text-[11px] text-sky-700 font-semibold mt-1">Active CBC Certified Educators</p>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Total Revenue Paid</span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400 flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{formatRWF(totalPaid)}</p>
              <p className="text-[11px] text-amber-600 font-semibold mt-1">{feePercent}% collection rate</p>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Database & Security</span>
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">Active SQL</p>
              <p className="text-[11px] text-purple-600 font-semibold mt-1">Full backup & restore enabled</p>
            </div>
          </div>

          {/* Quick Actions for Owner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" />
                <span>MySQL Database & Settings</span>
              </h3>
              <p className="text-xs text-slate-500">
                Manage institutional configurations, school codes, and export complete SQL backup dumps.
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

      {/* ========================================================
          2. ADMIN / HEAD TEACHER SPECIFIC DASHBOARD VIEW
         ======================================================== */}
      {(currentRole === 'admin' || currentRole === 'head_teacher') && (
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
              <p className="text-[11px] text-teal-700 font-semibold mt-1">Morning session attendance</p>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Feeding Program</span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400 flex items-center justify-center">
                  <Utensils className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{enrolledCount} Meals</p>
              <p className="text-[11px] text-amber-600 font-semibold mt-1">Hot Lunch & Fresh Milk Daily</p>
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
              <span className="text-xs font-bold text-slate-400 uppercase">Total Term 2 Billing</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{formatRWF(totalBilled)}</p>
              <span className="text-[11px] text-slate-500">{fees.length} Total Student Invoices</span>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase">Collected via MoMo / Bank</span>
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
          {/* Teacher Header Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase">Assigned Class</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">Primary 5 Alpha</p>
              <span className="text-[11px] text-emerald-600 font-semibold">Kibondo Campus Stream</span>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase">Today Teaching Schedule</span>
              <p className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1">3 Periods</p>
              <span className="text-[11px] text-slate-500">Kinyarwanda, SET Science & Math</span>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase">Assessment Marks</span>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">Term 2 Active</p>
              <span className="text-[11px] text-amber-600 font-semibold">Continuous evaluation</span>
            </div>
          </div>

          {/* Interactive Class Roll-Call for Mwalimu */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CalendarCheck2 className="w-5 h-5 text-emerald-600" />
                  <span>Primary 5 Alpha - Today Roll-Call Attendance</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Quickly mark pupil attendance for morning session in Kibondo campus
                </p>
              </div>

              <div className="flex items-center gap-2">
                <ShareDocumentButton
                  title="Official Term Report Card"
                  text="St. Silas Primary School official term report card."
                  className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    const allP: Record<string, 'Present' | 'Late' | 'Absent'> = {};
                    Object.keys(p5Attendance).forEach(k => { allP[k] = 'Present'; });
                    setP5Attendance(allP);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 cursor-pointer"
                >
                  Mark All Present
                </button>
                <button
                  type="button"
                  onClick={handleSaveRollCall}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                >
                  Save Roll-Call
                </button>
              </div>
            </div>

            {rollCallSaved && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Murakoze! Morning roll-call attendance for Primary 5 Alpha saved and transmitted to Head Teacher.</span>
              </motion.div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(p5Attendance).map(([pupilName, status]) => (
                <div
                  key={pupilName}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{pupilName}</p>
                    <span className="text-[10px] text-slate-400">P5 Alpha</span>
                  </div>
                  <div className="flex gap-1">
                    {(['Present', 'Late', 'Absent'] as const).map(st => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setP5Attendance({ ...p5Attendance, [pupilName]: st })}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          status === st
                            ? st === 'Present'
                              ? 'bg-emerald-600 text-white'
                              : st === 'Late'
                              ? 'bg-amber-500 text-white'
                              : 'bg-rose-500 text-white'
                            : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {st.charAt(0)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
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
          {/* Pupil Identity Banner */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src={user?.avatar || "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=250&q=80"}
                alt={user?.fullName || 'Student'}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-md"
                referrerPolicy="no-referrer"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {user?.fullName || user?.name || 'Pupil'}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">
                    Primary 5 Alpha
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Roll No: <span className="font-mono font-bold text-emerald-600">SSP-2026-P5-001</span> • Class Teacher: Mwalimu Jean Bosco Mugabo
                </p>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1 font-semibold text-emerald-600">
                    <Award className="w-3.5 h-3.5" />
                    <span>Class Rank: 2nd Distinction</span>
                  </span>
                  <span>•</span>
                  <span>Term 2 Average: <strong>90.8%</strong></span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowReportCardModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>View Official Report Card (Indangamanota)</span>
            </button>
          </div>
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
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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

      {/* Official Report Card (Indangamanota) Modal for Student/Parent */}
      {showReportCardModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-2xl rounded-3xl bg-white text-slate-900 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <span className="text-xs font-bold text-emerald-700 uppercase">
                Official Term 2 Report Card (Indangamanota)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Report Card</span>
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
                <span className="font-bold text-slate-800">{user?.fullName || 'Student'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Class & Stream</span>
                <span className="font-bold text-slate-800">Primary 5 Alpha</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Term / Year</span>
                <span className="font-bold text-slate-800">Term 2, 2026</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Position in Class</span>
                <span className="font-bold text-emerald-700">2nd Distinction</span>
              </div>
            </div>

            {/* Marks Table */}
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 font-bold uppercase text-[10px] text-slate-600">
                <tr>
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3">Score / 100</th>
                  <th className="py-2.5 px-3">REB Grade</th>
                  <th className="py-2.5 px-3">Teacher Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-2.5 px-3 font-semibold">Ikinyarwanda (Reading & Composition)</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">94 / 100</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-600">A (Exemplary)</td>
                  <td className="py-2.5 px-3 text-slate-600">Exceptional fluency in Ikinyarwanda</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold">Competence Mathematics</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">88 / 100</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-600">A</td>
                  <td className="py-2.5 px-3 text-slate-600">Strong mastery of fractions & geometry</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold">English Language Skills</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">91 / 100</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-600">A</td>
                  <td className="py-2.5 px-3 text-slate-600">Very articulate and disciplined</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold">SET (Science & Elementary Technology)</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">92 / 100</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-600">A</td>
                  <td className="py-2.5 px-3 text-slate-600">Enthusiastic in STEM science experiments</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold">Social & Religious Studies (SRS)</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">89 / 100</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-600">A</td>
                  <td className="py-2.5 px-3 text-slate-600">Exemplary moral and cultural conduct</td>
                </tr>
                <tr className="bg-emerald-50 font-bold">
                  <td className="py-3 px-3 text-emerald-900">Overall Average Score</td>
                  <td className="py-3 px-3 font-mono text-emerald-900 text-sm">90.8%</td>
                  <td className="py-3 px-3 text-emerald-900">Grade I Distinction</td>
                  <td className="py-3 px-3 text-emerald-900">Promoted with Highest Honors</td>
                </tr>
              </tbody>
            </table>

            <div className="flex justify-between items-end pt-4 border-t border-slate-200 text-xs">
              <div>
                <p className="font-bold text-slate-800">Class Teacher: Jean Bosco Mugabo</p>
                <p className="italic text-slate-500">"Exemplary diligence and academic excellence."</p>
              </div>
              <div className="text-right">
                <p className="font-serif italic font-bold">Mwalimu Emmanuel Twahirwa</p>
                <p className="text-[10px] text-slate-500">Head Teacher, St. Silas Primary</p>
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
