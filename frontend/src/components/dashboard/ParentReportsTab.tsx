import React, { useEffect, useState } from 'react';
import { StudentMidtermReport } from '../../types';
import { fetchStudentReports } from '../../services/api';

export const ParentReportsTab: React.FC = () => {
  const [reports, setReports] = useState<StudentMidtermReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetchStudentReports()
      .then(data => {
        if (active) setReports(data);
      })
      .catch(requestError => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Reports could not be loaded.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="space-y-5">
      <header>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Pupil reports</h2>
        <p className="mt-1 text-xs text-slate-500">Midterm progress reports shared by your child’s class teacher.</p>
      </header>
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
      {isLoading ? <p className="text-sm text-slate-500">Loading reports…</p> : reports.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">No reports have been shared with your account yet.</p>
      ) : reports.map(report => (
        <article key={report.id} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{report.studentName}</h3>
              <p className="text-xs text-slate-500">{report.grade} · {report.period}</p>
            </div>
            <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
              Attendance: {report.attendance.total ? Math.round((report.attendance.present / report.attendance.total) * 100) : 0}%
            </span>
          </header>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {report.attendance.total} attendance records · {report.attendance.present} present · {report.attendance.absent} absent · {report.attendance.late} late · {report.attendance.excused} excused
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead><tr className="border-b text-slate-500"><th className="py-2">Subject</th><th className="py-2">Score</th><th className="py-2">Grade</th><th className="py-2">Remarks</th></tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {report.subjects.map((subject, index) => (
                  <tr key={`${subject.subject}-${index}`}>
                    <td className="py-2 font-semibold">{subject.subject}</td>
                    <td className="py-2">{subject.marks} / {subject.maxMarks}</td>
                    <td className="py-2">{subject.grade}</td>
                    <td className="py-2">{subject.remarks || '—'}</td>
                  </tr>
                ))}
                {!report.subjects.length && <tr><td colSpan={4} className="py-3 text-slate-500">No midterm marks have been entered yet.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Class-teacher comment</h4>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{report.teacherComment}</p>
            <p className="mt-2 text-[11px] text-slate-500">{report.teacherName} · Shared {new Date(report.publishedAt).toLocaleDateString()}</p>
          </div>
        </article>
      ))}
    </section>
  );
};
