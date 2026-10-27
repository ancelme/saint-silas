import React, { useState } from 'react';
import { FileCheck2, LoaderCircle, Send } from 'lucide-react';
import { Student } from '../../types';
import { publishMidtermReports } from '../../services/api';

interface TeacherReportsTabProps {
  students: Student[];
}

export const TeacherReportsTab: React.FC<TeacherReportsTabProps> = ({ students }) => {
  const [period, setPeriod] = useState(`Mid-Term ${new Date().getFullYear()}`);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const publish = async () => {
    setError('');
    setSuccess('');
    setIsPublishing(true);
    try {
      const result = await publishMidtermReports({ period, comments });
      setSuccess(result.message);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Reports could not be published.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <section className="space-y-5">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Midterm pupil reports</h2>
          <p className="mt-1 text-xs text-slate-500">Review each pupil’s midterm marks and attendance, add a class-teacher comment, and publish to linked parents.</p>
        </div>
        <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
          Report period
          <input value={period} maxLength={50} onChange={event => setPeriod(event.target.value)} className="mt-1 block rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
        </label>
      </header>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
      {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{success}</p>}

      {!students.length ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">No active pupils are currently assigned to your class. Ask an administrator to assign your class first.</p>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {students.map(student => (
              <article key={student.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">{student.firstName} {student.lastName}</h3>
                    <p className="text-xs text-slate-500">{student.grade} · {student.rollNo}</p>
                  </div>
                  <span className="rounded-lg bg-sky-50 px-2 py-1 text-xs font-bold text-sky-800 dark:bg-sky-950 dark:text-sky-200">
                    Attendance: {student.attendanceRate}%
                  </span>
                </div>
                <p className="mt-3 text-xs text-slate-500">Subject marks already saved by subject teachers will be included in the published report.</p>
                <label className="mt-3 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Class-teacher comment
                  <textarea
                    required
                    maxLength={1000}
                    value={comments[student.id] || ''}
                    onChange={event => setComments(current => ({ ...current, [student.id]: event.target.value }))}
                    rows={3}
                    placeholder="Comment on the pupil’s progress and next steps."
                    className="mt-1 w-full resize-y rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </label>
              </article>
            ))}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              disabled={isPublishing || !period.trim() || students.some(student => !comments[student.id]?.trim())}
              onClick={() => void publish()}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPublishing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Publish reports and notify parents
            </button>
          </div>
        </>
      )}
      <div className="flex items-start gap-2 rounded-xl bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0" />
        Published reports appear in the parent dashboard and a report summary is sent to each linked parent’s in-app messages.
      </div>
    </section>
  );
};
