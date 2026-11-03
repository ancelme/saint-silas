import React from 'react';
import { Share2 } from 'lucide-react';

export interface AdminReportDraft {
  subject: string;
  body: string;
}

export function shareReportWithAdmin(draft: AdminReportDraft) {
  window.dispatchEvent(new CustomEvent<AdminReportDraft>('saint-silas:share-report', { detail: draft }));
}

interface ShareToAdminButtonProps {
  subject: string;
  body: string;
  className?: string;
  label?: string;
}

export const ShareToAdminButton: React.FC<ShareToAdminButtonProps> = ({
  subject,
  body,
  className = '',
  label = 'Share with Admin',
}) => (
  <button
    type="button"
    onClick={() => shareReportWithAdmin({ subject, body })}
    className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-emerald-900/60 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-emerald-950/40 ${className}`}
    aria-label={`${label}: ${subject}`}
    title={`${label}: ${subject}`}
  >
    <Share2 className="h-3.5 w-3.5 shrink-0" />
    <span>{label}</span>
  </button>
);
