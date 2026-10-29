import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Settings,
  Database,
  Download,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Building,
  Save,
  ShieldCheck,
  Server,
  Lock,
  Loader2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchSystemSettings,
  updateSystemSetting,
  downloadDatabaseBackup,
  getSystemHealth
} from '../../services/api';

export const SettingsTab: React.FC = () => {
  const { user, changeAccountPassword } = useAuth();

  const [settings, setSettings] = useState<Record<string, string>>({});
  const [health, setHealth] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    loadSettingsAndHealth();
  }, []);

  const loadSettingsAndHealth = async () => {
    setIsLoading(true);
    try {
      const [settingsRes, healthRes] = await Promise.all([
        fetchSystemSettings(),
        getSystemHealth(),
      ]);
      setSettings(settingsRes);
      setHealth(healthRes);
    } catch (e) {
      console.warn('Could not load settings:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      await downloadDatabaseBackup();
      setToastMsg({ type: 'success', text: 'MySQL database backup (.sql) successfully generated and downloaded.' });
      setTimeout(() => setToastMsg(null), 4000);
    } catch (err: any) {
      setToastMsg({ type: 'error', text: err.message || 'Failed to export database backup' });
      setTimeout(() => setToastMsg(null), 4000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveSchoolParameters = async () => {
    if (!['owner', 'super_admin', 'admin'].includes(user?.role || '')) return;
    setIsSavingSettings(true);
    try {
      const keys = ['tuition_nursery', 'tuition_lower_primary', 'tuition_upper_primary', 'term_1_dates', 'term_2_dates', 'term_3_dates'];
      await Promise.all(keys.map(key => updateSystemSetting(key, settings[key] || '')));
      setToastMsg({ type: 'success', text: 'School fees and academic term dates updated.' });
      setTimeout(() => setToastMsg(null), 4000);
    } catch (error: any) {
      setToastMsg({ type: 'error', text: error.message || 'Failed to save school parameters.' });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setToastMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (newPassword.length < 6) {
      setToastMsg({ type: 'error', text: 'Password must be at least 6 characters long' });
      return;
    }

    setIsChangingPassword(true);
    const res = await changeAccountPassword(currentPassword, newPassword);
    setIsChangingPassword(false);

    if (res.success) {
      setToastMsg({ type: 'success', text: 'Account password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setToastMsg(null), 4000);
    } else {
      setToastMsg({ type: 'error', text: res.error || 'Failed to change password' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold ${
            toastMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
          }`}
        >
          {toastMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{toastMsg.text}</span>
        </motion.div>
      )}

      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5" />
            Institutional Governance & Infrastructure
          </span>
          <h2 className="text-xl font-black font-heading text-slate-900 dark:text-white mt-1">
            School System & Database Configuration
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Super Administrator controls, MySQL database management, backup exports, and security credentials.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportBackup}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-emerald-900/10 transition-all cursor-pointer"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Exporting Dump...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download MySQL Dump (.sql)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Database & Infrastructure Status Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-600" />
          <span>Production Database Architecture</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Database Engine</span>
            <div className="flex items-center gap-2 mt-1">
              <Server className="w-4 h-4 text-emerald-600" />
              <p className="text-sm font-black text-slate-900 dark:text-white uppercase font-mono">
                {health?.database?.engine || 'SQL Engine'}
              </p>
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">
              Normalized tables with FK relationships
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Connection Status</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-sm font-bold text-emerald-600">Active & Parameterized</p>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Protected against SQL injection</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-[11px] font-bold text-slate-400 uppercase">REB Accreditation</span>
            <p className="text-sm font-black text-slate-900 dark:text-white font-mono mt-1">
              CODE: 530413
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Gatsibo District Center</p>
          </div>
        </div>
      </div>

      {/* Institutional Settings & Password Change Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Institutional Settings */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building className="w-4 h-4 text-teal-600" />
            <span>Official Institutional Parameters</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-500 font-semibold mb-1">Official Legal Name</label>
              <input
                type="text"
                disabled
                value={settings.school_name || 'St. Silas Private Primary School'}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-500 font-semibold mb-1">District</label>
                <input
                  type="text"
                  disabled
                  value={settings.district || 'Gatsibo'}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-semibold mb-1">Sector & Cell</label>
                <input
                  type="text"
                  disabled
                  value={`${settings.sector || 'Kabarore'} / ${settings.cell || 'Simbwa'}`}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
              {[
                ['tuition_nursery', 'Nursery Fee', settings.tuition_nursery || '45000'],
                ['tuition_lower_primary', 'Lower Primary', settings.tuition_lower_primary || '55000'],
                ['tuition_upper_primary', 'Upper Primary', settings.tuition_upper_primary || '65000'],
              ].map(([key, label, fallback]) => (
                <label key={key} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 block">
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">{label}</span>
                  <input
                    type="number"
                    min="0"
                    value={settings[key] ?? fallback}
                    onChange={event => setSettings(previous => ({ ...previous, [key]: event.target.value }))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs font-bold text-emerald-600"
                  />
                </label>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
              {[
                ['term_1_dates', 'Term 1 Dates', 'Sept 08 - Dec 19'],
                ['term_2_dates', 'Term 2 Dates', 'Jan 05 - Apr 03'],
                ['term_3_dates', 'Term 3 Dates', 'Apr 20 - Jul 10'],
              ].map(([key, label, fallback]) => (
                <label key={key} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 block">
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">{label}</span>
                  <input
                    type="text"
                    value={settings[key] ?? fallback}
                    onChange={event => setSettings(previous => ({ ...previous, [key]: event.target.value }))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs"
                  />
                </label>
              ))}
            </div>
            {['owner', 'super_admin', 'admin'].includes(user?.role || '') && (
              <button
                type="button"
                onClick={handleSaveSchoolParameters}
                disabled={isSavingSettings}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"
              >
                {isSavingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save fees and academic dates
              </button>
            )}
          </div>
        </div>

        {/* Security & Password Change */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-600" />
            <span>Account Security & Password</span>
          </h3>

          <form onSubmit={handlePasswordSubmit} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isChangingPassword}
              className="w-full mt-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Updating Password in MySQL...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Update Master Password</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
