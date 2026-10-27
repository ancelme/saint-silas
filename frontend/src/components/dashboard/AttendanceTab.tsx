import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Student, AttendanceRecord } from '../../types';
import { CalendarCheck2, Save, LoaderCircle, Trash2 } from 'lucide-react';
import { fetchMyTeacherAssignments, MyTeacherAssignments } from '../../services/api';

interface AttendanceTabProps {
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  onSaveAttendance: (records: AttendanceRecord[]) => Promise<void> | void;
  onDeleteAttendance: (attendanceId: string) => Promise<void>;
  canEditAttendance: boolean;
  teacherType?: 'class_teacher' | 'subject_teacher';
}

export const AttendanceTab: React.FC<AttendanceTabProps> = ({
  students,
  attendanceRecords,
  onSaveAttendance,
  onDeleteAttendance,
  canEditAttendance,
  teacherType,
}) => {
  const { t } = useLanguage();
  const [selectedGrade, setSelectedGrade] = useState(students[0]?.grade || '');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [teacherAssignments, setTeacherAssignments] = useState<MyTeacherAssignments | null>(null);
  const [assignmentError, setAssignmentError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [deletingAttendanceId, setDeletingAttendanceId] = useState('');

  const availableGrades = [...new Set(students.map(student => student.grade))];
  const teacherClasses = teacherType === 'class_teacher'
    ? teacherAssignments?.classAssignments || []
    : teacherType === 'subject_teacher'
      ? [...new Map((teacherAssignments?.subjectAssignments || []).map(item => [
        item.classId, { classId: item.classId, className: item.className },
      ])).values()]
      : [];
  const gradeStudents = teacherType
    ? students.filter(student => student.classId === selectedClassId)
    : students.filter(student => student.grade === selectedGrade);
  const availableSubjects = teacherAssignments?.subjectAssignments.filter(item => item.classId === selectedClassId) || [];

  useEffect(() => {
    if (!teacherType) return;
    let active = true;
    fetchMyTeacherAssignments()
      .then(assignments => {
        if (active) setTeacherAssignments(assignments);
      })
      .catch(error => {
        if (active) setAssignmentError(error instanceof Error ? error.message : 'Unable to load teacher assignments.');
      });
    return () => {
      active = false;
    };
  }, [teacherType]);

  useEffect(() => {
    if (!teacherClasses.some(item => item.classId === selectedClassId) && teacherClasses.length) {
      setSelectedClassId(teacherClasses[0].classId);
    }
  }, [selectedClassId, teacherClasses.map(item => item.classId).join('|')]);

  useEffect(() => {
    if (!availableSubjects.some(item => item.subjectId === selectedSubjectId) && availableSubjects.length) {
      setSelectedSubjectId(availableSubjects[0].subjectId);
    }
  }, [selectedSubjectId, availableSubjects.map(item => item.subjectId).join('|')]);

  useEffect(() => {
    if (!availableGrades.includes(selectedGrade) && availableGrades.length) {
      setSelectedGrade(availableGrades[0]);
    }
  }, [selectedGrade, availableGrades.join('|')]);

  // Local attendance state mapped by student id
  const [statusMap, setStatusMap] = useState<Record<string, 'Present' | 'Late' | 'Absent' | 'Excused'>>(() => {
    const initial: Record<string, 'Present' | 'Late' | 'Absent' | 'Excused'> = {};
    students.forEach(s => {
      initial[s.id] = 'Present';
    });
    return initial;
  });

  useEffect(() => {
    const next: Record<string, 'Present' | 'Late' | 'Absent' | 'Excused'> = {};
    students.forEach(student => {
      const savedRecord = attendanceRecords.find(record =>
        record.studentId === student.id &&
        record.date?.slice(0, 10) === selectedDate &&
        (teacherType === 'subject_teacher'
          ? record.subjectId === selectedSubjectId
          : !record.subjectId)
      );
      next[student.id] = savedRecord?.status || 'Present';
    });
    setStatusMap(next);
  }, [students, attendanceRecords, selectedDate, selectedSubjectId, teacherType]);

  const handleStatusChange = (studentId: string, status: 'Present' | 'Late' | 'Absent' | 'Excused') => {
    setStatusMap(prev => ({ ...prev, [studentId]: status }));
  };

  const handleMarkAllPresent = () => {
    const updated: Record<string, 'Present' | 'Late' | 'Absent' | 'Excused'> = {};
    gradeStudents.forEach(s => {
      updated[s.id] = 'Present';
    });
    setStatusMap(prev => ({ ...prev, ...updated }));
  };

  const handleSave = async () => {
    const newRecords: AttendanceRecord[] = gradeStudents.map(s => ({
      id: `att-${s.id}-${selectedDate}${teacherType === 'subject_teacher' ? `-${selectedSubjectId}` : ''}`,
      studentId: s.id,
      studentName: `${s.firstName} ${s.lastName}`,
      rollNo: s.rollNo,
      grade: s.grade,
      date: selectedDate,
      subjectId: teacherType === 'subject_teacher' ? selectedSubjectId : undefined,
      status: statusMap[s.id] || 'Present',
    }));

    setSaveError('');
    setIsSaving(true);
    try {
      await onSaveAttendance(newRecords);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unable to save the attendance register.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (record: AttendanceRecord) => {
    if (!window.confirm(`Delete the attendance record for ${record.studentName}?`)) return;
    setSaveError('');
    setDeletingAttendanceId(record.id);
    try {
      await onDeleteAttendance(record.id);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unable to delete the attendance record.');
    } finally {
      setDeletingAttendanceId('');
    }
  };

  const activeStudentsList = gradeStudents;

  const presentCount = activeStudentsList.filter(s => (statusMap[s.id] || 'Present') === 'Present').length;
  const lateCount = activeStudentsList.filter(s => statusMap[s.id] === 'Late').length;
  const absentCount = activeStudentsList.filter(s => statusMap[s.id] === 'Absent').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {t('dashAttendance')}
          </h2>
          <p className="text-xs text-slate-500">
            Daily roll-call & school feeding presence register for St. Silas Primary School
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canEditAttendance && <button
            type="button"
            onClick={handleMarkAllPresent}
            className="px-3.5 py-2 text-xs font-bold rounded-xl border border-emerald-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
          >
            {teacherType === 'subject_teacher' ? 'Mark All Present' : 'Mark Class Present'}
          </button>}
          {canEditAttendance && <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || (teacherType !== undefined && !selectedClassId) ||
              (teacherType === 'subject_teacher' && !selectedSubjectId)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition-all hover:scale-[1.01] disabled:cursor-wait disabled:opacity-70"
          >
            {isSaving ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? 'Saving…' : 'Save Register'}</span>
          </button>}
        </div>
      </div>

      {saveError && (
        <div role="alert" className="animate-in fade-in slide-in-from-top-2 duration-200 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
          {saveError}
        </div>
      )}

      {/* Filter & Metric Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Class / Stream</label>
            <select
              value={teacherType ? selectedClassId : selectedGrade}
            onChange={e => {
              if (teacherType) setSelectedClassId(e.target.value);
              else setSelectedGrade(e.target.value);
            }}
              className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            >
              {teacherType
                ? teacherClasses.map(item => (
                  <option key={item.classId} value={item.classId}>{item.className}</option>
                ))
                : availableGrades.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
            </select>
          </div>
          {teacherType === 'subject_teacher' && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Subject</label>
              <select
                value={selectedSubjectId}
                onChange={e => setSelectedSubjectId(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              >
                {availableSubjects.map(item => (
                  <option key={item.subjectId} value={item.subjectId}>{item.subjectName}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Register Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            />
          </div>
        </div>

        {assignmentError && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
            {assignmentError}
          </div>
        )}

        {/* Counter Badges */}
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 font-bold">
            Present: {presentCount}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 font-bold">
            Late: {lateCount}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 font-bold">
            Absent: {absentCount}
          </span>
        </div>
      </div>

      {/* Attendance Sheet Table */}
      <div className="rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-500 font-semibold text-[11px]">
                <th className="py-3 px-4">Pupil Info</th>
                <th className="py-3 px-4">Class</th>
                <th className="py-3 px-4">Parent Mobile</th>
                <th className="py-3 px-4">Roll-Call Status</th>
                {canEditAttendance && <th className="py-3 px-4">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {activeStudentsList.length ? activeStudentsList.map(s => {
                const curStatus = statusMap[s.id] || 'Present';
                const savedRecord = attendanceRecords.find(record =>
                  record.studentId === s.id &&
                  record.date?.slice(0, 10) === selectedDate &&
                  (teacherType === 'subject_teacher'
                    ? record.subjectId === selectedSubjectId
                    : !record.subjectId)
                );

                return (
                  <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={s.photoUrl}
                          alt={s.firstName}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">
                            {s.firstName} {s.lastName}
                          </p>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {s.rollNo}
                          </span>
                        </div>
                      </div>
                    </td>
                    {canEditAttendance && (
                      <td className="py-3 px-4">
                        {savedRecord && (
                          <button
                            type="button"
                            onClick={() => void handleDelete(savedRecord)}
                            disabled={deletingAttendanceId === savedRecord.id}
                            className="rounded-lg border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900 dark:hover:bg-rose-950/40"
                            aria-label={`Delete attendance for ${s.firstName} ${s.lastName}`}
                          >
                            {deletingAttendanceId === savedRecord.id
                              ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                              : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        )}
                      </td>
                    )}

                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {s.grade}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-500">
                      {s.parentPhone}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex gap-1.5">
                        {(['Present', 'Late', 'Absent', 'Excused'] as const).map(st => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => handleStatusChange(s.id, st)}
                            disabled={!canEditAttendance}
                            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                              curStatus === st
                                ? st === 'Present'
                                  ? 'bg-emerald-700 text-white shadow-xs'
                                  : st === 'Late'
                                  ? 'bg-amber-500 text-white shadow-xs'
                                  : st === 'Absent'
                                  ? 'bg-rose-600 text-white shadow-xs'
                                  : 'bg-sky-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>                <td colSpan={canEditAttendance ? 5 : 4} className="p-8 text-center text-xs text-slate-500">No pupils are assigned to this class.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
