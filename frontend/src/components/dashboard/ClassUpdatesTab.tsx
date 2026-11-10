import React, { useEffect, useState } from 'react';
import { BellRing, LoaderCircle, Send } from 'lucide-react';
import {
  ClassAnnouncement,
  createClassAnnouncement,
  fetchClassAnnouncements,
  fetchMyTeacherAssignments,
  MyTeacherAssignments,
} from '../../services/api';
import { notifySuccess } from '../common/AppSuccessToast';

export const ClassUpdatesTab: React.FC = () => {
  const [assignments, setAssignments] = useState<MyTeacherAssignments | null>(null);
  const [announcements, setAnnouncements] = useState<ClassAnnouncement[]>([]);
  const [classId, setClassId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([fetchMyTeacherAssignments(), fetchClassAnnouncements()])
      .then(([teacherAssignments, classUpdates]) => {
        if (!active) return;
        setAssignments(teacherAssignments);
        setAnnouncements(classUpdates);
        setClassId(teacherAssignments.classAssignments[0]?.classId || '');
      })
      .catch(requestError => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Could not load class updates.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSending(true);
    try {
      const result = await createClassAnnouncement({ classId, title, content });
      setAnnouncements(current => [result.announcement, ...current]);
      setTitle('');
      setContent('');
      notifySuccess(result.message);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not send this class update.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <header>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Class updates for families</h2>
        <p className="mt-1 text-xs text-slate-500">Post an update to an assigned class. Linked parent accounts receive an in-app notification.</p>
      </header>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{error}</p>}
      <form onSubmit={event => void submit(event)} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          Assigned class
          <select value={classId} onChange={event => setClassId(event.target.value)} required disabled={isLoading || !assignments?.classAssignments.length} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800">
            {assignments?.classAssignments.map(item => <option key={item.classId} value={item.classId}>{item.className}</option>)}
          </select>
        </label>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          Update title
          <input value={title} onChange={event => setTitle(event.target.value)} required maxLength={200} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800" placeholder="e.g. Bring exercise books on Monday" />
        </label>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          Message
          <textarea value={content} onChange={event => setContent(event.target.value)} required maxLength={2000} rows={5} className="mt-1 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800" placeholder="Write an announcement for families in your class." />
          <span className="mt-1 block text-right font-normal text-slate-500">{content.length}/2000</span>
        </label>
        <div className="flex justify-end">
          <button type="submit" disabled={isLoading || isSending || !classId} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
            {isSending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send class update
          </button>
        </div>
      </form>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent updates</h3>
        {!isLoading && !announcements.length && <p className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-xs text-slate-500 dark:border-slate-700">No class updates have been posted yet.</p>}
        {announcements.map(announcement => (
          <article key={announcement.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><BellRing className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{announcement.title}</h4>
                  <span className="text-[11px] text-slate-500">{announcement.className} · {new Date(announcement.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-300">{announcement.content}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
