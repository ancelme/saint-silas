import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  CalendarCheck2,
  Award,
  Wallet,
  Building,
  Info
} from 'lucide-react';
import { fetchDashboardInsights, DashboardInsightsResponse } from '../../services/api';

export const AiDashboardInsights: React.FC = () => {
  const [data, setData] = useState<DashboardInsightsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const insightText = (value?: string) =>
    value?.trim() || 'No current insight is available. Review the charts below for recorded school data.';

  const loadInsights = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchDashboardInsights();
      setData(res);
    } catch (err: any) {
      console.warn('Failed to load live AI insights:', err);
      setError('AI insights could not be loaded. The dashboard charts below continue to show available records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, []);

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-3xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600/10 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                AI Institutional Intelligence & Daily Insights
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Live Data Driven
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Grounded in current St. Silas MySQL database records • Automated academic & fiscal synthesis
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadInsights}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
          <span>Refresh Insights</span>
        </button>
      </div>

      {/* Distinction Disclaimer Banner */}
      <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2.5">
        <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <span className="text-[11px] leading-relaxed">
          <strong>Official Records Notice:</strong> The cards below are AI-synthesized summaries derived directly from live database tables. Official administrative decisions and financial certificates remain governed by the Head Teacher and Bursar.
        </span>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Insights Cards Grid (6 distinct cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. Today's School Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-emerald-600" />
                Today's School Summary
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            {isLoading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-3/4" />
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-md w-full" />
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-md w-5/6" />
              </div>
            ) : (
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                {insightText(data?.insights.schoolSummary)}
              </p>
            )}
          </div>
          {data?.metrics && (
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] font-semibold text-slate-500">
              <span>{data.metrics.totalStudents} Active Pupils</span>
              <span>{data.metrics.totalTeachers} Educators</span>
            </div>
          )}
        </motion.div>

        {/* 2. Attendance Insight */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <CalendarCheck2 className="w-3.5 h-3.5 text-teal-600" />
                Attendance Insight
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
                {data?.metrics ? `${data.metrics.attendanceRate}% Rate` : 'Unavailable'}
              </span>
            </div>
            {isLoading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-3/4" />
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-md w-full" />
              </div>
            ) : (
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                {insightText(data?.insights.attendanceInsight)}
              </p>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-[11px] font-semibold text-teal-600 dark:text-teal-400">
            {data?.metrics ? 'Based on recorded attendance data' : 'No attendance metric available'}
          </div>
        </motion.div>

        {/* 3. Academic Insight */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-600" />
                Academic Insight
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                Current records
              </span>
            </div>
            {isLoading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-3/4" />
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-md w-full" />
              </div>
            ) : (
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                {insightText(data?.insights.academicInsight)}
              </p>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
            AI summary of available academic records
          </div>
        </motion.div>

        {/* 4. Fee & Financial Insight */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-blue-600" />
                Fee & Revenue Insight
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                {data?.metrics ? `${data.metrics.collectionRate}% Collected` : 'Unavailable'}
              </span>
            </div>
            {isLoading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-3/4" />
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-md w-full" />
              </div>
            ) : (
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                {insightText(data?.insights.feeInsight)}
              </p>
            )}
          </div>
          {data?.metrics && (
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] font-semibold text-slate-500">
              <span>Paid: {data.metrics.totalPaid.toLocaleString()} RWF</span>
              <span className="text-rose-600">Bal: {data.metrics.totalBalance.toLocaleString()} RWF</span>
            </div>
          )}
        </motion.div>

        {/* 5. Important Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                Important Alerts
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                Monitoring
              </span>
            </div>
            {isLoading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-3/4" />
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-md w-full" />
              </div>
            ) : (
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                {insightText(data?.insights.importantAlerts)}
              </p>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-[11px] font-semibold text-amber-600">
            {data?.metrics ? `${data.metrics.pendingAdmissions} Pending Admissions` : 'Admissions metric unavailable'}
          </div>
        </motion.div>

        {/* 6. Recommended Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-emerald-600" />
                Recommended Actions
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                Action Plan
              </span>
            </div>
            {isLoading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-3/4" />
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-md w-full" />
              </div>
            ) : (
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                {insightText(data?.insights.recommendedActions)}
              </p>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-[11px] font-semibold text-emerald-600">
            {data?.generatedAt
              ? `Generated ${new Date(data.generatedAt).toLocaleString()}`
              : 'No generated insight timestamp'}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
