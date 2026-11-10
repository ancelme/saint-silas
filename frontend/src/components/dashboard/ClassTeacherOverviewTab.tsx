import React, { useEffect, useMemo, useState } from 'react';
import { Award, CalendarCheck2, ClipboardList, FileText, MessageSquareText, Users } from 'lucide-react';
import { AttendanceRecord, GradeEntry, Student } from '../../types';
import { fetchMyTeacherAssignments, MyTeacherAssignments } from '../../services/api';

interface ClassTeacherOverviewTabProps {
  students: Student[];
  attendance: AttendanceRecord[];
  grades: GradeEntry[];
  onNavigateTab: (tab: string) => void;
}

export const ClassTeacherOverviewTab: React.FC<ClassTeacherOverviewTabProps> = ({
  students,
  attendance,
  grades,
  onNavigateTab,
}) => {
  const [assignments, setAssignments] = useState<MyTeacherAssignments | null>(null);
  const [error, setError] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');

  useEffect(() => {
    fetchMyTeacherAssignments()
      .then(result => {
        setAssignments(result);
        setSelectedClassId(result.classAssignments[0]?.classId || '');
      })
      .catch(requestError => setError(requestError instanceof Error ? requestError.message : 'Could not load your class assignment.'));
  }, []);

  const classroom = assignments?.classAssignments.find(item => item.classId === selectedClassId);
  const classStudents = useMemo(
    () => students.filter(student => student.classId === selectedClassId),
    [selectedClassId, students],
  );
  const studentIds = useMemo(() => new Set(classStudents.map(student => student.id)), [classStudents]);
  const classAttendance = attendance.filter(record => studentIds.has(record.studentId));
  const classGrades = grades.filter(grade => studentIds.has(grade.studentId));
  const today = new Date().toISOString().slice(0, 10);
  const todaysAttendance = classAttendance.filter(record => record.date === today);
  const presentToday = todaysAttendance.filter(record => record.status === 'Present').length;
  const averageMark = classGrades.length
    ? Math.round(classGrades.reduce((sum, grade) => sum + (grade.marks ?? grade.total ?? grade.totalScore ?? 0), 0) / classGrades.length)
    : null;

  const shortcuts = [
    { id: 'students', label: 'Class roster', description: 'Find pupils and view their profiles.', icon: Users },
    { id: 'attendance', label: 'Take attendance', description: 'Record today’s class roll call.', icon: CalendarCheck2 },
    { id: 'grades', label: 'Manage marks', description: 'Record marks and review progress.', icon: Award },
    { id: 'reports', label: 'Pupil reports', description: 'Prepare and publish term reports.', icon: FileText },
    { id: 'class-updates', label: 'Class updates', description: 'Send a message to linked parents.', icon: MessageSquareText },
  ];

  return (
    <section className="space-y-6">
      <header className="flex flex-col justify-between gap-4 rounded-3xl bg-gradient-to-br from-emerald-800 via-teal-800 to-slate-900 p-6 text-white shadow-xl sm:flex-row sm:items-end sm:p-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">Class teacher workspace</p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">{classroom?.className || 'Your classroom'}</h2>
          <p className="mt-2 max-w-xl text-sm text-emerald-50/80">
            Your roster, attendance, marks, reports, and family updates — organized around your assigned class.
          </p>
        </div>
        {!!assignments?.classAssignments.length && (
          <label className="min-w-52 text-xs font-semibold text-emerald-50">
            Assigned class
            <select
              value={selectedClassId}
              onChange={event => setSelectedClassId(event.target.value)}
              className="mt-1 block w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white"
            >
              {assignments.classAssignments.map(item => <option className="text-slate-900" key={item.classId} value={item.classId}>{item.className}</option>)}
            </select>
          </label>
        )}
      </header>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{error}</p>}
      {assignments && !assignments.classAssignments.length && (
        <p role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          No class is currently assigned to your account. Contact the school administrator to request or restore your class assignment.
        </p>
      )}

      {classroom && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Active pupils" value={classStudents.length} icon={Users} />
            <StatCard label="Attendance today" value={`${presentToday}/${classStudents.length}`} icon={CalendarCheck2} />
            <StatCard label="Today’s roll calls" value={todaysAttendance.length} icon={ClipboardList} />
            <StatCard label="Average recorded mark" value={averageMark === null ? '—' : `${averageMark}%`} icon={Award} />
          </div>

          <div>
            <div className="mb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Class tools</h3>
              <p className="text-xs text-slate-500">Each workspace is restricted to your assigned class.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {shortcuts.map(({ id, label, description, icon: Icon }) => (
                <button
                  type="button"
                  key={id}
                  onClick={() => onNavigateTab(id)}
                  className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-800"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 group-hover:bg-emerald-700 group-hover:text-white dark:bg-emerald-950 dark:text-emerald-300">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-slate-900 dark:text-white">{label}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-slate-500">{description}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
};

const StatCard: React.FC<{ label: string; value: string | number; icon: React.ElementType }> = ({ label, value, icon: Icon }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <Icon className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
    </div>
    <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{value}</p>
  </div>
);
