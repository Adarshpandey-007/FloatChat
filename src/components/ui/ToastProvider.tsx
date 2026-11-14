"use client";
import { createContext, useCallback, useContext, useState, ReactNode, useRef, useEffect } from 'react';

export type Toast = {
  id: string;
  title?: string;
  message: string;
  type?: 'info' | 'success' | 'error';
  duration?: number; // ms
};

interface ToastContextValue {
  toasts: Toast[];
  push: (t: Omit<Toast, 'id'>) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<string, any>>({});

  const dismiss = useCallback((id: string) => {
    setToasts(ts => ts.filter(t => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID();
    // Shorter duration for bulk processing notifications
    const defaultDuration = t.message.includes('bulk') || t.message.includes('Bulk') || t.message.includes('Processing') || t.message.includes('Starting') ? 2000 : 4000;
    const toast: Toast = { duration: defaultDuration, type: 'info', ...t, id };
    
    setToasts(ts => {
      // Limit to 3 toasts during bulk operations to reduce clutter
      const isBulkRelated = t.message.includes('bulk') || t.message.includes('Bulk') || t.message.includes('Processing') || t.message.includes('Starting');
      if (isBulkRelated && ts.length >= 2) {
        // Remove oldest toast when adding new bulk-related toast
        const oldestId = ts[0]?.id;
        if (oldestId && timers.current[oldestId]) {
          clearTimeout(timers.current[oldestId]);
          delete timers.current[oldestId];
        }
        return [...ts.slice(1), toast];
      }
      return [...ts, toast];
    });
    
    if (toast.duration) {
      timers.current[id] = setTimeout(() => dismiss(id), toast.duration);
    }
    return id;
  }, [dismiss]);

  const clear = useCallback(() => {
    Object.values(timers.current).forEach(clearTimeout);
    timers.current = {};
    setToasts([]);
  }, []);

  useEffect(() => () => clear(), [clear]);

  return (
    <ToastContext.Provider value={{ toasts, push, dismiss, clear }}>
      {children}
      <div 
        role="region" 
        aria-label="Notifications" 
        aria-live="polite" 
        className="fixed z-40 top-4 right-4 flex flex-col gap-1 max-w-xs pointer-events-none"
      >
        {toasts.map(t => (
          <div 
            key={t.id} 
            role="status" 
            className={`pointer-events-auto rounded-lg shadow-sm px-3 py-2 text-xs border bg-white/95 backdrop-blur flex items-center gap-2 transition-all duration-200 ${t.type === 'error' ? 'border-red-400 text-red-700 bg-red-50/95' : t.type === 'success' ? 'border-emerald-400 text-emerald-700 bg-emerald-50/95' : 'border-blue-400 text-blue-700 bg-blue-50/95'}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.type === 'error' ? 'bg-red-500' : t.type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>
            <div className="flex-1 leading-tight">
              {t.title && <div className="font-medium mb-0.5">{t.title}</div>}
              <div className="whitespace-pre-line">{t.message}</div>
            </div>
            <button 
              onClick={() => dismiss(t.id)} 
              aria-label="Dismiss notification"
              className="text-xs opacity-50 hover:opacity-80 transition-opacity ml-1 p-0.5 focus:outline-none focus:ring-1 focus:ring-cyan-500 rounded"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
