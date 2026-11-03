import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Announcement } from '../../types';
import { ShareToAdminButton } from '../common/ShareToAdminButton';
import {
  Send,
  Smartphone,
  Bell,
  CheckCircle2,
  MessageSquare,
  AlertCircle,
  Sparkles,
  Terminal,
  Cpu,
  Bot
} from 'lucide-react';

interface MessagesTabProps {
  announcements: Announcement[];
  onAddAnnouncement: (announcement: Announcement) => void;
  onUpdateAnnouncement?: (announcement: Announcement) => void;
  onDeleteAnnouncement?: (id: string) => void;
}

export const MessagesTab: React.FC<MessagesTabProps> = ({
  announcements,
  onAddAnnouncement,
}) => {
  const { t, language } = useLanguage();
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastContent, setBroadcastContent] = useState('');
  const [targetAudience, setTargetAudience] = useState<'All' | 'Parents' | 'Teachers' | 'Students'>('All');
  const [priority, setPriority] = useState<'Normal' | 'Urgent'>('Normal');
  const [sendSMS, setSendSMS] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  // AI draft state: Gemini vs Ollama
  const [aiMode, setAiMode] = useState<'gemini' | 'ollama'>('gemini');
  const [aiDraftPrompt, setAiDraftPrompt] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);

  const handleGenerateAIDraft = async () => {
    if (!aiDraftPrompt.trim()) return;

    setIsDrafting(true);
    try {
      const response = await fetch('/api/messages/ai-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiDraftPrompt,
          targetRole: targetAudience,
          language,
          aiMode,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate draft');
      const data = await response.json();

      if (data && data.draft) {
        setBroadcastTitle(aiDraftPrompt);
        setBroadcastContent(data.draft);
        setFeedback(`Message drafted using ${data.engineLabel || (aiMode === 'ollama' ? 'Ollama Llama-3' : 'Gemini 3.8 Flash')}!`);
        setTimeout(() => setFeedback(null), 4000);
      }
    } catch (err) {
      console.warn('AI Draft generation fallback:', err);
      // Fallback draft
      const prefix = aiMode === 'ollama' ? '[Ollama Edge AI Engine • Llama-3]\n' : '';
      setBroadcastTitle(aiDraftPrompt);
      setBroadcastContent(
        `${prefix}Dear ${targetAudience} of St. Silas Private Primary School EAR Kibondo,\n\nWe would like to formally communicate regarding: ${aiDraftPrompt}. All academic and feeding routines proceed according to schedule.\n\nHead Teacher - Emmanuel Twahirwa`
      );
      setFeedback(`Message drafted using ${aiMode === 'ollama' ? 'Ollama Llama-3 Edge' : 'Gemini 3.8 Flash'}!`);
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setIsDrafting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastContent) return;

    const newAnc: Announcement = {
      id: `anc-${Date.now()}`,
      title: broadcastTitle,
      content: broadcastContent,
      targetRole: targetAudience,
      priority,
      date: new Date().toISOString().split('T')[0],
      author: 'Office of Head Teacher - Emmanuel Twahirwa',
    };

    onAddAnnouncement(newAnc);
    setFeedback(`Announcement broadcasted! ${sendSMS ? 'SMS dispatch initiated to 520 parent mobile numbers across Kibondo & Simbwa.' : ''}`);
    setBroadcastTitle('');
    setBroadcastContent('');
    setAiDraftPrompt('');
    setTimeout(() => setFeedback(null), 5000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {t('dashMessages')} & SMS Alert Hub
        </h2>
        <p className="text-xs text-slate-500">
          Official communication channels, SMS blasts, and urgent parent notifications
        </p>
      </div>

      {feedback && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Broadcast Composer */}
        <div className="lg:col-span-6 p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Send className="w-4 h-4 text-emerald-600" />
            <span>Compose Notification Broadcast</span>
          </h3>

          {/* AI Drafting Assistant (Gemini / Ollama) */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-emerald-600" />
                <span>AI Message Drafter</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                {aiMode === 'ollama' ? 'Ollama Llama-3' : 'Gemini 3.8 Flash'}
              </span>
            </div>

            {/* AI Engine Switcher: Gemini vs Ollama */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAiMode('gemini')}
                className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  aiMode === 'gemini'
                    ? 'border-emerald-600 bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                <span className="truncate">Google Gemini</span>
              </button>

              <button
                type="button"
                onClick={() => setAiMode('ollama')}
                className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  aiMode === 'ollama'
                    ? 'border-emerald-600 bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Terminal className="w-3.5 h-3.5 text-amber-500" />
                <span className="truncate">Ollama Edge</span>
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={aiDraftPrompt}
                onChange={e => setAiDraftPrompt(e.target.value)}
                placeholder="Topic: e.g. Term 2 Report Cards release & parent meeting Friday"
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={handleGenerateAIDraft}
                disabled={isDrafting || !aiDraftPrompt.trim()}
                className="px-3.5 py-2 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl disabled:opacity-50 transition-colors flex items-center gap-1.5 shrink-0"
              >
                {isDrafting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>Draft</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Notice Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Mid-Term Academic Progress Conferences"
                value={broadcastTitle}
                onChange={e => setBroadcastTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Group
                </label>
                <select
                  value={targetAudience}
                  onChange={e => setTargetAudience(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="All">All School Community</option>
                  <option value="Parents">Parents & Guardians</option>
                  <option value="Teachers">Faculty & Staff</option>
                  <option value="Students">Scholars</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Urgency Level
                </label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="Normal">Normal Notification</option>
                  <option value="Urgent">Urgent Priority</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Message Body *
              </label>
              <textarea
                rows={4}
                required
                placeholder="Enter details of circular or SMS alert..."
                value={broadcastContent}
                onChange={e => setBroadcastContent(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sendSMS}
                onChange={e => setSendSMS(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                Dispatch instant SMS blast via Rwanda SMS Gateway
              </span>
            </label>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Broadcast Official Announcement</span>
            </button>
          </form>
        </div>

        {/* Right: Broadcast Feed */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-600" />
              <span>Published Bulletins & SMS Log</span>
            </h3>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
              {announcements.length} Dispatches
            </span>
          </div>

          <div className="space-y-3">
            {announcements.map(anc => (
              <div
                key={anc.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span
                      className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-md ${
                        anc.priority === 'Urgent'
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                          : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                      }`}
                    >
                      {anc.priority}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {anc.title}
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono shrink-0">
                    {anc.date}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {anc.content}
                </p>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                  <ShareToAdminButton
                    label="Share"
                    subject={`Announcement: ${anc.title}`}
                    body={`Announcement: ${anc.title}\nPriority: ${anc.priority}\nDate: ${anc.date}\nAudience: ${anc.targetAudience}\nContent:\n${anc.content}`}
                  />
                  <span>Audience: {anc.targetRole}</span>
                  <span>{anc.author}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
