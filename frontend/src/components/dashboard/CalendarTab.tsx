import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Role, SchoolEvent } from '../../types';
import { Calendar, Clock, MapPin, Tag, Plus, Pencil, Trash2, X, Save } from 'lucide-react';
import { fetchSystemSettings } from '../../services/api';
import { ShareToAdminButton } from '../common/ShareToAdminButton';

interface CalendarTabProps {
  events: SchoolEvent[];
  currentUserRole: Role;
  onSaveEvents: (events: SchoolEvent[]) => Promise<void>;
}

const emptyEvent: Omit<SchoolEvent, 'id'> = {
  title: '',
  date: '',
  time: '',
  location: '',
  type: 'Academic',
  description: '',
};

export const CalendarTab: React.FC<CalendarTabProps> = ({ events, currentUserRole, onSaveEvents }) => {
  const { t } = useLanguage();
  const canManageEvents = ['owner', 'super_admin', 'admin', 'head_teacher'].includes(currentUserRole);
  const [editingEvent, setEditingEvent] = useState<SchoolEvent | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [form, setForm] = useState<Omit<SchoolEvent, 'id'>>(emptyEvent);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [academicSettings, setAcademicSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchSystemSettings().then(setAcademicSettings).catch(() => undefined);
  }, []);

  const openEditor = (event?: SchoolEvent) => {
    setEditingEvent(event || null);
    setForm(event ? {
      title: event.title,
      date: event.date,
      time: event.time,
      location: event.location,
      type: event.type,
      description: event.description,
    } : emptyEvent);
    setSaveError('');
    setIsEditorOpen(true);
  };

  const handleSaveEvent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setSaveError('');
    const updatedEvent: SchoolEvent = {
      ...form,
      id: editingEvent?.id || `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };
    const updatedEvents = editingEvent
      ? events.map(item => item.id === editingEvent.id ? updatedEvent : item)
      : [...events, updatedEvent];

    try {
      await onSaveEvents(updatedEvents);
      setIsEditorOpen(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save this event.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = async (event: SchoolEvent) => {
    if (!window.confirm(`Delete the event "${event.title}"?`)) return;
    setIsSaving(true);
    setSaveError('');
    try {
      await onSaveEvents(events.filter(item => item.id !== event.id));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not delete this event.');
    } finally {
      setIsSaving(false);
    }
  };

  const terms = [
    { name: 'Term 1', dates: academicSettings.term_1_dates || 'Sept 08 – Dec 19', status: 'Completed' },
    { name: 'Term 2 (Current)', dates: academicSettings.term_2_dates || 'Jan 05 – Apr 03', status: 'In Progress' },
    { name: 'Term 3', dates: academicSettings.term_3_dates || 'Apr 20 – Jul 10', status: 'Upcoming' },
  ];

  const nationalHolidays = [
    { name: 'National Heroes Day', date: 'Feb 01, 2026' },
    { name: 'Kwibuka 32 (Commemoration)', date: 'Apr 07, 2026' },
    { name: 'Independence Day', date: 'Jul 01, 2026' },
    { name: 'National Liberation Day', date: 'Jul 04, 2026' },
    { name: 'Umuganura (National Thanksgiving)', date: 'Aug 07, 2026' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {t('dashCalendar')} & Academic Terms
        </h2>
        <p className="text-xs text-slate-500">
          Official term dates, national holidays, and school milestones
        </p>
      </div>

      {/* Academic Term Progress */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {terms.map(tm => (
          <div
            key={tm.name}
            className={`p-5 rounded-2xl border shadow-xs space-y-2 ${
              tm.status === 'In Progress'
                ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-500 ring-1 ring-emerald-500'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{tm.name}</h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                tm.status === 'In Progress'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
              }`}>
                {tm.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono">{tm.dates}</p>
          </div>
        ))}
      </div>

      {/* Events Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Scheduled Term Events</span>
            </h3>
            {canManageEvents && (
              <button
                type="button"
                onClick={() => openEditor()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800"
              >
                <Plus className="h-4 w-4" /> Add event
              </button>
            )}
          </div>

          <div className="space-y-3">
            {events.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500 dark:border-slate-700">No school events have been added.</p>}
            {events.map(evt => (
              <div
                key={evt.id}
                className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row items-start gap-4 hover:border-emerald-500 transition-colors"
              >
                <div className="sm:w-28 shrink-0 px-3 py-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-center">
                  <span className="text-[10px] font-extrabold uppercase text-emerald-600 dark:text-emerald-400 block">
                    {new Date(evt.date).toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white block">
                    {new Date(evt.date).getDate()}
                  </span>
                  <span className="text-[10px] text-slate-500 block font-semibold">{evt.type}</span>
                </div>

                <div className="space-y-1.5 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{evt.title}</h4>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                      <ShareToAdminButton
                        label="Share"
                        subject={`School event: ${evt.title}`}
                        body={`Event: ${evt.title}\nType: ${evt.type}\nDate: ${evt.date}\nTime: ${evt.time}\nLocation: ${evt.location}\nDetails: ${evt.description}`}
                      />
                      {canManageEvents && (
                        <button type="button" onClick={() => openEditor(evt)} disabled={isSaving} aria-label={`Edit ${evt.title}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {canManageEvents && (
                        <button type="button" onClick={() => handleDeleteEvent(evt)} disabled={isSaving} aria-label={`Delete ${evt.title}`} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {evt.description}
                  </p>
                  <div className="flex flex-wrap gap-4 text-xs text-slate-500 pt-1">
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> {evt.time}
                    </span>
                    <span className="flex items-center gap-1 text-[11px]">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> {evt.location}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* National Holidays List */}
        <div className="lg:col-span-4 space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Tag className="w-4 h-4 text-emerald-600" />
            <span>National Holidays (Rwanda)</span>
          </h3>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
            {nationalHolidays.map(h => (
              <div key={h.name} className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100 dark:border-slate-700/60 last:border-none">
                <span className="font-semibold text-slate-800 dark:text-slate-200">{h.name}</span>
                <span className="font-mono text-slate-500 text-[11px]">{h.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {saveError && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{saveError}</p>}

      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={event => {
          if (event.target === event.currentTarget) setIsEditorOpen(false);
        }}>
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="school-event-editor-title"
            onSubmit={handleSaveEvent}
            className="w-full max-w-xl space-y-4 rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 id="school-event-editor-title" className="text-lg font-black text-slate-900 dark:text-white">
                  {editingEvent ? 'Edit school event' : 'Add school event'}
                </h2>
                <p className="text-xs text-slate-500">Changes are shared with the school and saved to the database.</p>
              </div>
              <button type="button" onClick={() => setIsEditorOpen(false)} aria-label="Close editor" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300 sm:col-span-2">
                Event title
                <input required maxLength={200} value={form.title} onChange={event => setForm(current => ({ ...current, title: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                Date
                <input required type="date" value={form.date} onChange={event => setForm(current => ({ ...current, date: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                Time
                <input required maxLength={100} value={form.time} onChange={event => setForm(current => ({ ...current, time: event.target.value }))} placeholder="09:00 AM - 12:00 PM" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                Event type
                <select value={form.type} onChange={event => setForm(current => ({ ...current, type: event.target.value as SchoolEvent['type'] }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                  {(['Academic', 'Sports', 'Cultural', 'Meeting'] as SchoolEvent['type'][]).map(type => <option key={type}>{type}</option>)}
                </select>
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                Location
                <input required maxLength={200} value={form.location} onChange={event => setForm(current => ({ ...current, location: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300 sm:col-span-2">
                Description
                <textarea required maxLength={2000} rows={3} value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </label>
            </div>
            {saveError && <p role="alert" className="text-xs font-semibold text-rose-600">{saveError}</p>}
            <button type="submit" disabled={isSaving} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60">
              <Save className="h-4 w-4" /> {isSaving ? 'Saving…' : 'Save event'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
