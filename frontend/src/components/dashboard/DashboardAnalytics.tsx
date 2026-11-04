import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Activity,
  BarChart3,
  CalendarDays,
  GraduationCap,
  Maximize2,
  Wallet,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AttendanceRecord, FeeInvoice, GradeEntry, Student } from '../../types';

type ChartKind = 'enrollment' | 'attendance' | 'performance' | 'fees';
type AttendanceWindow = '7' | '30' | 'all';

interface DashboardAnalyticsProps {
  students: Student[];
  fees: FeeInvoice[];
  attendance: AttendanceRecord[];
  grades: GradeEntry[];
}

const chartTitles: Record<ChartKind, string> = {
  enrollment: 'Students by school level',
  attendance: 'Attendance trend',
  performance: 'Marks histogram',
  fees: 'Fee collection',
};

const levels = [
  { name: 'Nursery', color: '#8b5cf6' },
  { name: 'Lower Primary', color: '#0ea5e9' },
  { name: 'Upper Primary', color: '#10b981' },
];

const roleCanViewEnrollment = (role: string) =>
  ['owner', 'super_admin', 'admin', 'head_teacher', 'teacher'].includes(role);

const roleCanViewAcademicData = (role: string) =>
  ['owner', 'super_admin', 'admin', 'head_teacher', 'teacher', 'parent', 'student'].includes(role);

const roleCanViewFinance = (role: string) =>
  ['owner', 'super_admin', 'admin', 'accountant'].includes(role);

function getNumericScore(grade: GradeEntry) {
  const score = grade.total ?? grade.totalScore ?? grade.marks;
  return typeof score === 'number' && Number.isFinite(score) && score >= 0
    ? score
    : null;
}

function chartDateLabel(date: string) {
  const value = new Date(`${date}T00:00:00`);
  return Number.isNaN(value.getTime())
    ? date
    : value.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-5 text-center dark:border-slate-700 dark:bg-slate-950/40">
      <BarChart3 className="mb-2 h-7 w-7 text-slate-300 dark:text-slate-600" aria-hidden="true" />
      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No records to chart</p>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-400">{message}</p>
    </div>
  );
}

export const DashboardAnalytics: React.FC<DashboardAnalyticsProps> = ({
  students,
  fees,
  attendance,
  grades,
}) => {
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();
  const role = user?.role || '';
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedTerm, setSelectedTerm] = useState('all');
  const [attendanceWindow, setAttendanceWindow] = useState<AttendanceWindow>('7');
  const [expandedChart, setExpandedChart] = useState<ChartKind | null>(null);

  const classOptions = useMemo(
    () => [...new Set(students.map(student => student.grade).filter(Boolean))].sort(),
    [students],
  );
  const termOptions = useMemo(
    () => [...new Set([
      ...fees.map(invoice => invoice.term),
      ...grades.map(grade => grade.term),
    ].filter((term): term is string => Boolean(term?.trim())))].sort(),
    [fees, grades],
  );

  useEffect(() => {
    if (selectedClass !== 'all' && !classOptions.includes(selectedClass)) {
      setSelectedClass('all');
    }
  }, [classOptions, selectedClass]);

  useEffect(() => {
    if (selectedTerm !== 'all' && !termOptions.includes(selectedTerm)) {
      setSelectedTerm('all');
    }
  }, [selectedTerm, termOptions]);

  const visibleStudents = useMemo(
    () => selectedClass === 'all'
      ? students
      : students.filter(student => student.grade === selectedClass),
    [selectedClass, students],
  );
  const visibleAttendance = useMemo(
    () => selectedClass === 'all'
      ? attendance
      : attendance.filter(record => record.grade === selectedClass),
    [attendance, selectedClass],
  );
  const visibleGrades = useMemo(
    () => {
      const studentGradeById = new Map(students.map(student => [student.id, student.grade]));
      return grades.filter(grade =>
        (selectedClass === 'all' || studentGradeById.get(grade.studentId) === selectedClass) &&
        (selectedTerm === 'all' || grade.term === selectedTerm),
      );
    },
    [grades, selectedClass, selectedTerm, students],
  );
  const visibleFees = useMemo(
    () => fees.filter(invoice =>
      (selectedClass === 'all' || invoice.grade === selectedClass) &&
      (selectedTerm === 'all' || invoice.term === selectedTerm),
    ),
    [fees, selectedClass, selectedTerm],
  );

  const levelsData = levels.map(level => ({
    ...level,
    count: visibleStudents.filter(student => student.level === level.name).length,
  }));
  const attendanceByDate = useMemo(() => {
    const recordsByDate = new Map<string, { present: number; total: number }>();
    visibleAttendance.forEach(record => {
      if (!/^\d{4}-\d{2}-\d{2}/.test(record.date)) return;
      const date = record.date.slice(0, 10);
      const day = recordsByDate.get(date) || { present: 0, total: 0 };
      day.total += 1;
      if (record.status === 'Present') day.present += 1;
      recordsByDate.set(date, day);
    });
    const sorted = [...recordsByDate.entries()]
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, counts]) => ({
        date,
        total: counts.total,
        rate: counts.total ? Math.round((counts.present / counts.total) * 100) : 0,
      }));
    return attendanceWindow === 'all'
      ? sorted
      : sorted.slice(-Number(attendanceWindow));
  }, [attendanceWindow, visibleAttendance]);

  const performanceData = useMemo(() => {
    const buckets = [
      { label: '0–19', count: 0, color: '#f43f5e' },
      { label: '20–39', count: 0, color: '#f97316' },
      { label: '40–59', count: 0, color: '#eab308' },
      { label: '60–79', count: 0, color: '#0ea5e9' },
      { label: '80+', count: 0, color: '#10b981' },
    ];
    const scores = visibleGrades.map(getNumericScore).filter((score): score is number => score !== null);
    scores.forEach(score => {
      const index = score < 20 ? 0 : score < 40 ? 1 : score < 60 ? 2 : score < 80 ? 3 : 4;
      buckets[index].count += 1;
    });
    return { buckets, count: scores.length };
  }, [visibleGrades]);

  const financeData = useMemo(() => {
    const paid = visibleFees.reduce((sum, invoice) => sum + (Number(invoice.amountPaid) || 0), 0);
    const due = visibleFees.reduce((sum, invoice) =>
      sum + (Number(invoice.balance ?? Math.max(0, invoice.amountTotal - invoice.amountPaid)) || 0), 0);
    return { paid, due, total: paid + due };
  }, [visibleFees]);

  const canShowAcademic = roleCanViewAcademicData(role);
  const charts: ChartKind[] = [
    ...(roleCanViewEnrollment(role) ? ['enrollment' as const] : []),
    ...(canShowAcademic ? ['attendance' as const, 'performance' as const] : []),
    ...(roleCanViewFinance(role) ? ['fees' as const] : []),
  ];

  const money = (amount: number) => new Intl.NumberFormat('en-RW', {
    style: 'currency',
    currency: 'RWF',
    maximumFractionDigits: 0,
  }).format(amount).replace('RWF', '').trim() + ' RWF';

  const renderChart = (kind: ChartKind, expanded = false) => {
    if (kind === 'enrollment') {
      const total = levelsData.reduce((sum, level) => sum + level.count, 0);
      const max = Math.max(...levelsData.map(level => level.count), 1);
      if (!total) return <EmptyChart message="Student enrollment records will appear here when available." />;
      return (
        <div className={`grid grid-cols-3 items-end gap-3 ${expanded ? 'h-72 gap-8 px-6 sm:px-12' : 'h-48'}`}>
          {levelsData.map((level, index) => (
            <div key={level.name} className="flex h-full flex-col items-center justify-end gap-2">
              <motion.span
                key={`${level.name}-${level.count}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.4, delay: reduceMotion ? 0 : index * 0.08 }}
                className="text-xs font-bold tabular-nums text-slate-700 dark:text-slate-200"
              >
                {level.count}
              </motion.span>
              <div className="flex h-[72%] w-full items-end overflow-hidden rounded-t-xl bg-slate-100 dark:bg-slate-800">
                <motion.div
                  initial={{ scaleY: reduceMotion ? 1 : 0 }}
                  animate={{ scaleY: level.count ? level.count / max : 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.9, delay: reduceMotion ? 0 : index * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  style={{ backgroundColor: level.color, transformOrigin: 'bottom' }}
                  title={`${level.name}: ${level.count} student records`}
                  className="w-full rounded-t-xl shadow-[0_8px_24px_-12px_currentColor]"
                >
                  <span className="sr-only">{level.count}</span>
                </motion.div>
              </div>
              <span className="max-w-full text-center text-[10px] font-semibold leading-tight text-slate-500 dark:text-slate-400">{level.name}</span>
            </div>
          ))}
        </div>
      );
    }

    if (kind === 'attendance') {
      if (!attendanceByDate.length) return <EmptyChart message="Attendance records with dates will appear here when available." />;
      const width = 360;
      const height = 172;
      const left = 30;
      const right = 12;
      const top = 14;
      const bottom = 34;
      const chartHeight = height - top - bottom;
      const chartWidth = width - left - right;
      const points = attendanceByDate.map((record, index) => ({
        ...record,
        x: attendanceByDate.length === 1
          ? left + chartWidth / 2
          : left + (index / (attendanceByDate.length - 1)) * chartWidth,
        y: top + (1 - record.rate / 100) * chartHeight,
      }));
      const path = points.map((point, index) =>
        `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`,
      ).join(' ');
      const labelStride = Math.max(1, Math.ceil(points.length / 6));
      return (
        <div className="overflow-hidden">
          <div className="mb-2 flex items-center justify-between text-[10px] font-semibold text-slate-500">
            <span>{attendanceByDate.length} recorded day{attendanceByDate.length === 1 ? '' : 's'}</span>
            <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Present rate
            </span>
          </div>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label="Attendance present rate across recorded dates"
            className={`w-full ${expanded ? 'h-72' : 'h-44'}`}
          >
            {[0, 50, 100].map(value => {
              const y = top + (1 - value / 100) * chartHeight;
              return (
                <g key={value}>
                  <line x1={left} x2={width - right} y1={y} y2={y} stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeDasharray="3 5" />
                  <text x="0" y={y + 3} className="fill-slate-400 text-[9px]">{value}%</text>
                </g>
              );
            })}
            {points.length > 1 && (
              <motion.path
                d={path}
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: reduceMotion ? 1 : 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: reduceMotion ? 0 : 1.1, ease: 'easeOut' }}
              />
            )}
            {points.map((point, index) => (
              <g key={point.date}>
                <motion.circle
                  cx={point.x}
                  cy={point.y}
                  r="5"
                  fill="#10b981"
                  stroke="white"
                  strokeWidth="2"
                  initial={{ scale: reduceMotion ? 1 : 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: reduceMotion ? 0 : index * 0.035, duration: reduceMotion ? 0 : 0.25 }}
                  style={{ transformOrigin: `${point.x}px ${point.y}px` }}
                >
                  <title>{`${chartDateLabel(point.date)}: ${point.rate}% present from ${point.total} records`}</title>
                </motion.circle>
                {(index % labelStride === 0 || index === points.length - 1) && (
                  <text x={point.x} y={height - 10} textAnchor="middle" className="fill-slate-400 text-[9px]">
                    {chartDateLabel(point.date)}
                  </text>
                )}
              </g>
            ))}
          </svg>
        </div>
      );
    }

    if (kind === 'performance') {
      if (!performanceData.count) return <EmptyChart message="Numeric marks will appear here once they have been recorded." />;
      const max = Math.max(...performanceData.buckets.map(bucket => bucket.count), 1);
      return (
        <div className={`grid grid-cols-5 items-end gap-2 ${expanded ? 'h-72 gap-5 px-4 sm:px-10' : 'h-48'}`}>
          {performanceData.buckets.map((bucket, index) => (
            <div key={bucket.label} className="flex h-full flex-col items-center justify-end gap-2">
              <span className="text-[10px] font-bold tabular-nums text-slate-600 dark:text-slate-300">{bucket.count}</span>
              <div className="flex h-[72%] w-full items-end overflow-hidden rounded-t-lg bg-slate-100 dark:bg-slate-800">
                <motion.div
                  initial={{ scaleY: reduceMotion ? 1 : 0 }}
                  animate={{ scaleY: bucket.count ? bucket.count / max : 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.8, delay: reduceMotion ? 0 : index * 0.07, ease: [0.22, 1, 0.36, 1] }}
                  style={{ backgroundColor: bucket.color, transformOrigin: 'bottom' }}
                  title={`${bucket.label}: ${bucket.count} marks`}
                  className="w-full rounded-t-lg"
                />
              </div>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{bucket.label}</span>
            </div>
          ))}
        </div>
      );
    }

    if (!visibleFees.length || financeData.total <= 0) {
      return <EmptyChart message="Fee invoice totals will appear here when available." />;
    }

    const circumference = 2 * Math.PI * 66;
    const paidShare = financeData.paid / financeData.total;
    const dueShare = financeData.due / financeData.total;
    const collectionRate = Math.round(paidShare * 100);
    return (
      <div className={`flex flex-col items-center justify-center gap-5 sm:flex-row ${expanded ? 'min-h-72 gap-10' : 'min-h-48'}`}>
        <div className="relative h-40 w-40 shrink-0">
          <svg viewBox="0 0 160 160" role="img" aria-label={`Fee collection: ${collectionRate}% paid`}>
            <circle cx="80" cy="80" r="66" fill="none" stroke="currentColor" strokeWidth="15" className="text-slate-100 dark:text-slate-800" />
            <g transform="rotate(-90 80 80)">
              <motion.circle
                cx="80"
                cy="80"
                r="66"
                fill="none"
                stroke="#10b981"
                strokeWidth="15"
                strokeLinecap="round"
                strokeDasharray={`${circumference * paidShare} ${circumference}`}
                initial={{ strokeDashoffset: reduceMotion ? 0 : circumference * paidShare }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: reduceMotion ? 0 : 1.2, ease: 'easeOut' }}
              >
                <title>{`Collected: ${money(financeData.paid)}`}</title>
              </motion.circle>
              {financeData.due > 0 && (
                <motion.circle
                  cx="80"
                  cy="80"
                  r="66"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="15"
                  strokeLinecap="round"
                  strokeDasharray={`${circumference * dueShare} ${circumference}`}
                  strokeDashoffset={-circumference * paidShare}
                  initial={{ opacity: 0, pathLength: reduceMotion ? 1 : 0 }}
                  animate={{ opacity: 1, pathLength: 1 }}
                  transition={{ duration: reduceMotion ? 0 : 0.9, delay: reduceMotion ? 0 : 0.2 }}
                >
                  <title>{`Outstanding: ${money(financeData.due)}`}</title>
                </motion.circle>
              )}
            </g>
            <text x="80" y="77" textAnchor="middle" className="fill-slate-900 text-2xl font-black dark:fill-white">{collectionRate}%</text>
            <text x="80" y="96" textAnchor="middle" className="fill-slate-500 text-[9px] font-semibold">COLLECTED</text>
          </svg>
        </div>
        <div className="w-full space-y-3 sm:max-w-52">
          <div className="flex items-start gap-2.5">
            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Collected</p>
              <p className="break-words text-sm font-black text-slate-900 dark:text-white">{money(financeData.paid)}</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Outstanding</p>
              <p className="break-words text-sm font-black text-slate-900 dark:text-white">{money(financeData.due)}</p>
            </div>
          </div>
          <p className="border-t border-slate-100 pt-2 text-[10px] text-slate-500 dark:border-slate-700">
            {visibleFees.length} invoice{visibleFees.length === 1 ? '' : 's'} in this view
          </p>
        </div>
      </div>
    );
  };

  if (!charts.length) return null;

  const chartSubtitle = (kind: ChartKind) => {
    if (kind === 'enrollment') return `${visibleStudents.length} student records`;
    if (kind === 'attendance') return `${visibleAttendance.length} attendance records`;
    if (kind === 'performance') return `${performanceData.count} numeric marks`;
    return `${visibleFees.length} fee invoices`;
  };

  return (
    <section aria-labelledby="dashboard-analytics-title" className="relative isolate overflow-hidden rounded-[30px] border border-slate-200 bg-gradient-to-br from-white via-white to-emerald-50/70 p-4 shadow-[0_22px_60px_-40px_rgba(15,23,42,.35)] dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/20 sm:p-6">
      <div className="pointer-events-none absolute -right-20 -top-20 -z-10 h-64 w-64 rounded-full bg-emerald-300/15 blur-3xl" />
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700 dark:border-emerald-900/60 dark:bg-slate-900/80 dark:text-emerald-300">
            <Activity className="h-3.5 w-3.5" aria-hidden="true" />
            Live records analytics
          </div>
          <h2 id="dashboard-analytics-title" className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            School performance at a glance
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Explore current school records as animated charts. Empty charts mean no matching records are available.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {classOptions.length > 1 && (
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
              <GraduationCap className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
              <span className="sr-only">Filter analytics by class</span>
              <select
                value={selectedClass}
                onChange={event => setSelectedClass(event.target.value)}
                className="min-w-0 bg-transparent outline-none"
                aria-label="Filter analytics by class"
              >
                <option value="all">All classes</option>
                {classOptions.map(grade => <option key={grade} value={grade}>{grade}</option>)}
              </select>
            </label>
          )}
          {termOptions.length > 1 && (
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
              <CalendarDays className="h-4 w-4 shrink-0 text-sky-600" aria-hidden="true" />
              <span className="sr-only">Filter analytics by term</span>
              <select
                value={selectedTerm}
                onChange={event => setSelectedTerm(event.target.value)}
                className="min-w-0 bg-transparent outline-none"
                aria-label="Filter analytics by term"
              >
                <option value="all">All terms</option>
                {termOptions.map(term => <option key={term} value={term}>{term}</option>)}
              </select>
            </label>
          )}
          {canShowAcademic && (
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 sm:col-span-2 xl:col-span-1">
              <Activity className="h-4 w-4 shrink-0 text-violet-600" aria-hidden="true" />
              <span className="sr-only">Attendance trend time window</span>
              <select
                value={attendanceWindow}
                onChange={event => setAttendanceWindow(event.target.value as AttendanceWindow)}
                className="min-w-0 bg-transparent outline-none"
                aria-label="Attendance trend time window"
              >
                <option value="7">Last 7 recorded days</option>
                <option value="30">Last 30 recorded days</option>
                <option value="all">All recorded days</option>
              </select>
            </label>
          )}
        </div>
      </div>

      <motion.div layout className={`grid gap-4 ${charts.length === 1 ? 'lg:grid-cols-1' : 'md:grid-cols-2'}`}>
        {charts.map((kind, index) => (
          <motion.button
            key={kind}
            type="button"
            layout
            onClick={() => setExpandedChart(kind)}
            aria-label={`Expand ${chartTitles[kind]} chart`}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 16, scale: reduceMotion ? 1 : 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: reduceMotion ? 0 : 0.55, delay: reduceMotion ? 0 : index * 0.07, ease: [0.22, 1, 0.36, 1] }}
            whileHover={reduceMotion ? undefined : { y: -4, scale: 1.005 }}
            whileTap={reduceMotion ? undefined : { scale: 0.995 }}
            className="group min-w-0 rounded-[24px] border border-slate-200/90 bg-white/90 p-4 text-left shadow-[0_12px_36px_-30px_rgba(15,23,42,.5)] transition-colors hover:border-emerald-300 hover:bg-white hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900/80 dark:hover:border-emerald-800 dark:hover:bg-slate-900 sm:p-5"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-900/50">
                  {kind === 'enrollment' && <GraduationCap className="h-5 w-5" aria-hidden="true" />}
                  {kind === 'attendance' && <Activity className="h-5 w-5" aria-hidden="true" />}
                  {kind === 'performance' && <BarChart3 className="h-5 w-5" aria-hidden="true" />}
                  {kind === 'fees' && <Wallet className="h-5 w-5" aria-hidden="true" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-slate-900 dark:text-white">{chartTitles[kind]}</span>
                  <span className="mt-0.5 block truncate text-[10px] font-medium text-slate-500 dark:text-slate-400">{chartSubtitle(kind)}</span>
                </span>
              </div>
              <Maximize2 className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-emerald-600" aria-hidden="true" />
            </div>
            <div className="pointer-events-none">{renderChart(kind)}</div>
            <p className="mt-3 text-[10px] font-semibold text-slate-400">Select chart to expand</p>
          </motion.button>
        ))}
      </motion.div>

      <AnimatePresence>
        {expandedChart && (
          <motion.div
            key={expandedChart}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            onMouseDown={event => {
              if (event.target === event.currentTarget) setExpandedChart(null);
            }}
          >
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-labelledby="expanded-dashboard-chart-title"
              initial={{ opacity: 0, y: reduceMotion ? 0 : 18, scale: reduceMotion ? 1 : 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : 10, scale: reduceMotion ? 1 : 0.98 }}
              transition={{ duration: reduceMotion ? 0 : 0.24 }}
              className="max-h-[90dvh] w-full max-w-4xl overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:p-8"
            >
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600">Live database records</p>
                  <h3 id="expanded-dashboard-chart-title" className="mt-1 text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
                    {chartTitles[expandedChart]}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{chartSubtitle(expandedChart)} • filters apply to this view</p>
                </div>
                <button
                  type="button"
                  onClick={() => setExpandedChart(null)}
                  aria-label="Close expanded chart"
                  className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {renderChart(expandedChart, true)}
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
