import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

type ToastTone = 'success' | 'error';

interface ToastEvent {
  message: string;
  tone: ToastTone;
}

interface ToastItem extends ToastEvent {
  id: number;
}

const SUCCESS_EVENT = 'st-silas:success';
const ERROR_EVENT = 'st-silas:error';
const TOAST_DURATION = 4500;

function dispatchToast(eventName: string, message: string, tone: ToastTone) {
  if (!message.trim()) return;
  window.dispatchEvent(new CustomEvent<ToastEvent>(eventName, {
    detail: { message: message.trim(), tone },
  }));
}

export function notifySuccess(message: string) {
  dispatchToast(SUCCESS_EVENT, message, 'success');
}

export function notifyError(message: string) {
  dispatchToast(ERROR_EVENT, message, 'error');
}

export const AppSuccessToast: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const reduceMotion = useReducedMotion();
  const timers = useRef(new Map<number, number>());

  useEffect(() => {
    const showToast = (event: Event) => {
      const { message, tone } = (event as CustomEvent<ToastEvent>).detail || {};
      if (!message) return;

      const id = Date.now() + Math.random();
      setToasts(current => [...current.slice(-2), { id, message, tone }]);
      timers.current.set(id, window.setTimeout(() => {
        timers.current.delete(id);
        setToasts(current => current.filter(toast => toast.id !== id));
      }, TOAST_DURATION));
    };

    window.addEventListener(SUCCESS_EVENT, showToast);
    window.addEventListener(ERROR_EVENT, showToast);
    return () => {
      window.removeEventListener(SUCCESS_EVENT, showToast);
      window.removeEventListener(ERROR_EVENT, showToast);
      timers.current.forEach(timer => window.clearTimeout(timer));
      timers.current.clear();
    };
  }, []);

  const dismiss = (id: number) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) window.clearTimeout(timer);
    timers.current.delete(id);
    setToasts(current => current.filter(toast => toast.id !== id));
  };

  return (
    <div
      className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(26rem,calc(100vw-2rem))] flex-col gap-2 sm:right-6 sm:top-6"
      aria-live="polite"
      aria-relevant="additions"
    >
      <AnimatePresence initial={false}>
        {toasts.map(toast => {
          const isSuccess = toast.tone === 'success';
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: reduceMotion ? 0 : -18, scale: reduceMotion ? 1 : 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: reduceMotion ? 0 : 32, scale: reduceMotion ? 1 : 0.97 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.8 }}
              role={isSuccess ? 'status' : 'alert'}
              data-motion-toast="true"
              className={`pointer-events-auto flex items-start gap-3 overflow-hidden rounded-2xl border bg-white/95 p-4 shadow-2xl backdrop-blur-xl dark:bg-slate-900/95 ${
                isSuccess
                  ? 'border-emerald-200 text-emerald-950 shadow-emerald-950/10 dark:border-emerald-900 dark:text-emerald-100'
                  : 'border-rose-200 text-rose-950 shadow-rose-950/10 dark:border-rose-900 dark:text-rose-100'
              } relative`}
            >
              <motion.span
                initial={{ scale: reduceMotion ? 1 : 0.6, rotate: reduceMotion ? 0 : -14 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 520, damping: 18 }}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  isSuccess
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                }`}
              >
                {isSuccess
                  ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  : <AlertCircle className="h-5 w-5" aria-hidden="true" />}
              </motion.span>
              <span className="flex-1 pt-1 text-sm font-semibold leading-relaxed">{toast.message}</span>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label={`Dismiss ${toast.tone} message`}
                className={`rounded-lg p-1 transition ${
                  isSuccess
                    ? 'text-emerald-700/70 hover:bg-emerald-50 hover:text-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950'
                    : 'text-rose-700/70 hover:bg-rose-50 hover:text-rose-900 dark:text-rose-300 dark:hover:bg-rose-950'
                }`}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
              <motion.span
                aria-hidden="true"
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: reduceMotion ? 0 : TOAST_DURATION / 1000, ease: 'linear' }}
                className={`absolute inset-x-0 bottom-0 h-0.5 origin-left ${
                  isSuccess ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
