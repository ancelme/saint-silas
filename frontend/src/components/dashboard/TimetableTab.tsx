import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Calculator,
  CheckCircle2,
  Coffee,
  FlaskConical,
  Globe2,
  Languages,
  Palette,
  Star,
  Users,
  Utensils,
  Dumbbell,
  LucideIcon,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { Role, TimetableSlot } from '../../types';
import { ShareToAdminButton } from '../common/ShareToAdminButton';

interface TimetableTabProps {
  timetable: TimetableSlot[];
  currentUserRole: Role;
  onSaveTimetable: (timetable: TimetableSlot[]) => Promise<void>;
}

const days: TimetableSlot['day'][] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const DEFAULT_TIMETABLE_PERIODS = [
  '08:30-08:45',
  '08:45-09:25',
  '09:25-10:05',
  '10:05-10:45',
  '10:45-11:00',
  '11:00-11:40',
  '11:40-12:20',
  '12:20-13:25',
  '13:25-14:05',
  '14:05-14:45',
  '14:45-15:25',
  '15:25-15:40',
  '15:40-16:20',
  '16:20-17:00',
];

const clockMinutes = (value: string) => {
  const match = value.match(/(\d{1,2})[:.](\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : Number.MAX_SAFE_INTEGER;
};

const canonicalPeriod = (value: string) => {
  const start = clockMinutes(value);
  if (!Number.isFinite(start)) return DEFAULT_TIMETABLE_PERIODS[0];
  return DEFAULT_TIMETABLE_PERIODS.reduce((nearest, period) =>
    Math.abs(clockMinutes(period) - start) < Math.abs(clockMinutes(nearest) - start) ? period : nearest,
  DEFAULT_TIMETABLE_PERIODS[0]);
};

const gradeOptions = [
  { label: 'Primary 1 (P1)', value: 'Primary 1' },
  { label: 'Primary 2 (P2)', value: 'Primary 2' },
  { label: 'Primary 3 (P3)', value: 'Primary 3' },
  { label: 'Primary 4 (P4)', value: 'Primary 4' },
  { label: 'Primary 5 (P5)', value: 'Primary 5' },
  { label: 'Primary 6 (P6)', value: 'Primary 6' },
  { label: 'Nursery 1', value: 'Nursery 1' },
  { label: 'Nursery 2', value: 'Nursery 2' },
  { label: 'Nursery 3', value: 'Nursery 3' },
];

const subjectStyle = (subject: string): { Icon: LucideIcon; color: string } => {
  const name = subject.toLowerCase();
  if (name.includes('math') || name.includes('imibare')) return { Icon: Calculator, color: 'amber' };
  if (name.includes('english') || name.includes('ikinya') || name.includes('language')) return { Icon: Languages, color: 'green' };
  if (name.includes('science') || name.includes('technology') || name.includes('tech')) return { Icon: FlaskConical, color: 'sky' };
  if (name.includes('social') || name.includes('religious') || name.includes('srs')) return { Icon: Users, color: 'teal' };
  if (name.includes('french')) return { Icon: Globe2, color: 'violet' };
  if (name.includes('physical') || name.includes('sports') || name.includes('football')) return { Icon: Dumbbell, color: 'green' };
  if (name.includes('art') || name.includes('itorero') || name.includes('dance')) return { Icon: Palette, color: 'orange' };
  if (name.includes('lunch') || name.includes('feeding') || name.includes('ifunguro')) return { Icon: Utensils, color: 'orange' };
  if (name.includes('break') || name.includes('akaruhuko') || name.includes('porridge')) return { Icon: Coffee, color: 'violet' };
  if (name.includes('assembly') || name.includes('closing') || name.includes('reflection')) return { Icon: Users, color: 'sky' };
  return { Icon: BookOpen, color: 'emerald' };
};

const colorStyles: Record<string, string> = {
  amber: 'bg-amber-100 border-amber-200 text-amber-950 dark:bg-amber-950/50 dark:border-amber-900 dark:text-amber-100',
  green: 'bg-green-100 border-green-200 text-green-950 dark:bg-green-950/50 dark:border-green-900 dark:text-green-100',
  sky: 'bg-sky-100 border-sky-200 text-sky-950 dark:bg-sky-950/50 dark:border-sky-900 dark:text-sky-100',
  teal: 'bg-teal-100 border-teal-200 text-teal-950 dark:bg-teal-950/50 dark:border-teal-900 dark:text-teal-100',
  violet: 'bg-violet-100 border-violet-200 text-violet-950 dark:bg-violet-950/50 dark:border-violet-900 dark:text-violet-100',
  orange: 'bg-orange-100 border-orange-200 text-orange-950 dark:bg-orange-950/50 dark:border-orange-900 dark:text-orange-100',
  emerald: 'bg-emerald-100 border-emerald-200 text-emerald-950 dark:bg-emerald-950/50 dark:border-emerald-900 dark:text-emerald-100',
};

function startTimeMinutes(period: string) {
  const match = period.match(/(\d{1,2}):(\d{2})/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours >= 1 && hours <= 6) hours += 12;
  return hours * 60 + minutes;
}

export const TimetableTab: React.FC<TimetableTabProps> = ({ timetable, currentUserRole, onSaveTimetable }) => {
  const { t } = useLanguage();
  const [selectedGrade, setSelectedGrade] = useState('Primary 5');
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const canManageTimetable = ['owner', 'super_admin', 'admin', 'head_teacher'].includes(currentUserRole);
  const [form, setForm] = useState<Omit<TimetableSlot, 'id'>>({
    day: 'Monday',
    period: DEFAULT_TIMETABLE_PERIODS[0],
    subject: '',
    teacherName: '',
    classroom: '',
    grade: 'Primary 5',
    level: 'Upper Primary',
  });

  const openEditor = (slot?: TimetableSlot) => {
    setEditingSlot(slot || null);
    setForm(slot
      ? {
          day: slot.day,
          period: slot.period,
          subject: slot.subject,
          teacherName: slot.teacherName,
          classroom: slot.classroom,
          grade: slot.grade,
          level: slot.level,
        }
      : {
          day: 'Monday',
          period: '',
          subject: '',
          teacherName: '',
          classroom: '',
          grade: selectedGrade,
          level: selectedGrade.startsWith('Nursery')
            ? 'Nursery'
            : Number(selectedGrade.match(/\d+/)?.[0] || 0) <= 3 ? 'Lower Primary' : 'Upper Primary',
        });
    setSaveError('');
    setIsEditorOpen(true);
  };

  const handleSaveSlot = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setSaveError('');
    const updatedSlot: TimetableSlot = {
      ...form,
      period: canonicalPeriod(form.period),
      id: editingSlot?.id || `slot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };
    const updatedTimetable = editingSlot
      ? timetable.map(slot => slot.id === editingSlot.id ? updatedSlot : slot)
      : [...timetable, updatedSlot];

    try {
      await onSaveTimetable(updatedTimetable.map(slot => ({ ...slot, period: canonicalPeriod(slot.period) })));
      setIsEditorOpen(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save this timetable entry.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSlot = async (slot: TimetableSlot) => {
    if (!window.confirm(`Remove ${slot.subject} from ${slot.day} at ${slot.period}?`)) return;
    setIsSaving(true);
    setSaveError('');
    try {
      await onSaveTimetable(timetable.filter(item => item.id !== slot.id));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not remove this timetable entry.');
    } finally {
      setIsSaving(false);
    }
  };

  const gradeSlots = useMemo(
    () => timetable
      .filter(slot =>
        slot.grade === selectedGrade ||
        (selectedGrade.startsWith('Nursery') && slot.level === 'Nursery')
      )
      .map(slot => ({ ...slot, period: canonicalPeriod(slot.period) })),
    [selectedGrade, timetable],
  );

  const periods = DEFAULT_TIMETABLE_PERIODS;

  const getSlot = (day: TimetableSlot['day'], period: string) =>
    gradeSlots.find(slot => slot.day === day && slot.period === period);

  const subjects = Array.from(new Set(gradeSlots.map(slot => slot.subject)));

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl border border-sky-200 bg-gradient-to-r from-sky-50 via-white to-emerald-50 shadow-sm dark:border-sky-900/60 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/30">
        <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-sky-200/40 blur-3xl dark:bg-sky-700/20" />
        <div className="relative flex flex-col items-center justify-between gap-5 px-5 py-6 sm:flex-row sm:px-8">
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <div className="w-12 shrink-0 overflow-hidden rounded-lg border border-white shadow-sm">
              <div className="h-4 bg-sky-500" />
              <div className="h-4 bg-yellow-400" />
              <div className="h-4 bg-green-600" />
            </div>
            <div className="hidden sm:block">
              <p className="text-[10px] font-black uppercase tracking-widest text-sky-800 dark:text-sky-300">St. Silas • Kibondo</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">REB Center Code: 530413</p>
            </div>
          </div>

          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300">{t('dashTimetable')}</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-sky-950 dark:text-white sm:text-3xl">
              Rwanda Primary School Timetable
            </h1>
            <p className="text-sm font-bold text-sky-800 dark:text-sky-200">
              {selectedGrade} • Academic Year 2026–2027
            </p>
            <p className="mt-1 text-[11px] font-medium text-slate-600 dark:text-slate-400">
              Quality Education • Bright Future • A Developed Rwanda
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2 self-end sm:self-auto">
            <label className="flex items-center gap-2 rounded-xl border border-sky-200 bg-white/80 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/80">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Class</span>
              <select
                value={selectedGrade}
                onChange={event => setSelectedGrade(event.target.value)}
                className="max-w-[9rem] bg-transparent text-xs font-bold text-slate-800 outline-none dark:text-white"
              >
                {gradeOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            {canManageTimetable && (
              <button
                type="button"
                onClick={() => openEditor()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-sky-700 px-3 py-2 text-xs font-bold text-white hover:bg-sky-800"
              >
                <Plus className="h-4 w-4" /> Add timetable entry
              </button>
            )}
            {gradeSlots.length > 0 && (
              <ShareToAdminButton
                label="Share timetable"
                subject={`${selectedGrade} timetable`}
                body={`${selectedGrade} timetable\n${gradeSlots
                  .map(slot => `${slot.day}, ${slot.period}: ${slot.subject} — ${slot.teacherName}${slot.classroom ? ` (${slot.classroom})` : ''}`)
                  .join('\n')}`}
              />
            )}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-sky-300 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] border-separate border-spacing-[2px] bg-sky-100 text-left dark:bg-slate-800">
            <thead>
              <tr className="bg-sky-900 text-white">
                <th scope="col" className="w-28 rounded-tl-lg px-3 py-3 text-center text-xs font-black uppercase">Time</th>
                {days.map((day, index) => (
                  <th key={day} scope="col" className={`px-3 py-3 text-center text-xs font-black uppercase ${index === days.length - 1 ? 'rounded-tr-lg' : ''}`}>
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.length > 0 ? periods.map(period => (
                <tr key={period}>
                  <th scope="row" className="bg-sky-100 px-2 py-3 text-center align-middle text-[11px] font-extrabold text-sky-950 dark:bg-slate-800 dark:text-sky-100">
                    {period.replace(/\s*-\s*/, '–')}
                  </th>
                  {days.map(day => {
                    const slot = getSlot(day, period);
                    if (!slot) {
                      return <td key={day} className="min-w-32 bg-white/80 px-2 py-3 dark:bg-slate-900" />;
                    }
                    const { Icon, color } = subjectStyle(slot.subject);
                    return (
                      <td key={day} className={`min-w-32 border px-2 py-2 ${colorStyles[color]}`}>
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                            <div className="min-w-0">
                              <p className="text-[11px] font-extrabold leading-tight">{slot.subject}</p>
                              <p className="mt-1 truncate text-[9px] opacity-75">{slot.teacherName}</p>
                            </div>
                          </div>
                          {canManageTimetable && (
                            <div className="flex shrink-0 gap-1">
                              <button
                                type="button"
                                onClick={() => openEditor(slot)}
                                disabled={isSaving}
                                aria-label={`Edit ${slot.subject} on ${day}`}
                                className="rounded-md p-1 hover:bg-black/10 disabled:opacity-50"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSlot(slot)}
                                disabled={isSaving}
                                aria-label={`Remove ${slot.subject} on ${day}`}
                                className="rounded-md p-1 text-rose-700 hover:bg-black/10 disabled:opacity-50"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="bg-white px-4 py-12 text-center text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                    No timetable entries are available for {selectedGrade}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 dark:border-sky-900/50 dark:bg-slate-900">
          <h2 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-sky-900 dark:text-sky-200">
            <BookOpen className="h-4 w-4" /> Subjects on this timetable
          </h2>
          <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
            {subjects.length > 0 ? subjects.map(subject => (
              <div key={subject} className="flex items-start gap-2 text-[10px] text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                <span>{subject}</span>
              </div>
            )) : (
              <p className="text-[10px] text-slate-500">Subject list will appear when this class has timetable entries.</p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <h2 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-emerald-900 dark:text-emerald-200">
            <Star className="h-4 w-4" /> Important notes
          </h2>
          <ul className="space-y-2 text-[10px] leading-relaxed text-slate-700 dark:text-slate-300">
            <li>• This timetable is for the selected class for the 2026–2027 academic year.</li>
            <li>• Lesson times may vary slightly by school shift and local arrangements.</li>
            <li>• Confirm any changes with the school administration or the Rwanda Basic Education Board (REB).</li>
          </ul>
        </section>
      </div>

      {saveError && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{saveError}</p>}

      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={event => {
          if (event.target === event.currentTarget) setIsEditorOpen(false);
        }}>
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="timetable-editor-title"
            onSubmit={handleSaveSlot}
            className="w-full max-w-xl space-y-4 rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 id="timetable-editor-title" className="text-lg font-black text-slate-900 dark:text-white">
                  {editingSlot ? 'Edit timetable entry' : 'Add timetable entry'}
                </h2>
                <p className="text-xs text-slate-500">Changes are shared with the school and saved to the database.</p>
              </div>
              <button type="button" onClick={() => setIsEditorOpen(false)} aria-label="Close editor" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                Class
                <select
                  required
                  value={form.grade}
                  onChange={event => {
                    const grade = event.target.value;
                    setForm(current => ({
                      ...current,
                      grade,
                      level: grade.startsWith('Nursery')
                        ? 'Nursery'
                        : Number(grade.match(/\d+/)?.[0] || 0) <= 3 ? 'Lower Primary' : 'Upper Primary',
                    }));
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {gradeOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                Day
                <select
                  value={form.day}
                  onChange={event => setForm(current => ({ ...current, day: event.target.value as TimetableSlot['day'] }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {days.map(day => <option key={day}>{day}</option>)}
                </select>
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                Time / period
                <select required value={canonicalPeriod(form.period)} onChange={event => setForm(current => ({ ...current, period: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                  {DEFAULT_TIMETABLE_PERIODS.map(period => <option key={period} value={period}>{period}</option>)}
                </select>
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                Subject or activity
                <input required maxLength={100} value={form.subject} onChange={event => setForm(current => ({ ...current, subject: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                Teacher
                <input required maxLength={150} value={form.teacherName} onChange={event => setForm(current => ({ ...current, teacherName: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                Classroom
                <input required maxLength={100} value={form.classroom} onChange={event => setForm(current => ({ ...current, classroom: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </label>
            </div>
            {saveError && <p role="alert" className="text-xs font-semibold text-rose-600">{saveError}</p>}
            <button type="submit" disabled={isSaving} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-800 disabled:opacity-60">
              <Save className="h-4 w-4" /> {isSaving ? 'Saving…' : 'Save timetable'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
