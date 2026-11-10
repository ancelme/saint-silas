import React from 'react';
import { ShareDocumentButton } from './ShareDocumentButton';

export interface AdminReportDraft {
  subject: string;
  body: string;
}

export function shareRecordInChat(draft: AdminReportDraft) {
  window.dispatchEvent(new CustomEvent<AdminReportDraft>('saint-silas:share-record', { detail: draft }));
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
  label = 'Share',
}) => (
  <ShareDocumentButton
    title={subject}
    text={body}
    label={label}
    className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-emerald-900/60 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-emerald-950/40 ${className}`}
  />
);
