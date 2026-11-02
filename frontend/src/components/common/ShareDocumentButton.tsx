import React, { useState } from 'react';
import { Check, Copy, Share2, X } from 'lucide-react';

interface ShareDocumentButtonProps {
  title: string;
  text: string;
  className?: string;
}

export const ShareDocumentButton: React.FC<ShareDocumentButtonProps> = ({ title, text, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const sharePayload = `${title}\n${text}\n${window.location.origin}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: window.location.origin });
        setIsOpen(false);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(sharePayload)}`, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(sharePayload);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="relative print:hidden">
      <button
        type="button"
        onClick={() => setIsOpen(open => !open)}
        className={`inline-flex items-center gap-2 rounded-xl font-bold cursor-pointer ${className}`}
      >
        <Share2 className="h-4 w-4" />
        <span>Share</span>
      </button>
      {isOpen && (
        <>
          <button
            type="button"
            aria-label="Close share menu"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-1 flex items-center justify-between px-2 py-1">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Share document with</span>
              <button type="button" onClick={() => setIsOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              type="button"
              onClick={handleShare}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Share2 className="h-4 w-4 text-emerald-600" />
              Device share / WhatsApp
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-blue-600" />}
              {copied ? 'Document details copied' : 'Copy document details'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
