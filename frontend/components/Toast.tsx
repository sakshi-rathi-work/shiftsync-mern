// Toast notification system — bottom-right, auto-dismiss, colored left-border
'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const COLORS: Record<ToastType, { border: string; icon: string; bg: string }> = {
  success: { border: '#3FB876', icon: '#3FB876', bg: 'rgba(63,184,118,0.08)' },
  error:   { border: '#E1584F', icon: '#E1584F', bg: 'rgba(225,88,79,0.08)' },
  warning: { border: '#E3A73B', icon: '#E3A73B', bg: 'rgba(227,167,59,0.08)' },
  info:    { border: '#7A7CD6', icon: '#7A7CD6', bg: 'rgba(122,124,214,0.08)' },
};

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={16} />,
  error:   <XCircle size={16} />,
  warning: <AlertTriangle size={16} />,
  info:    <Info size={16} />,
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const colors = COLORS[toast.type];

  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-lg border max-w-sm animate-in"
      style={{
        background: colors.bg,
        borderColor: 'rgba(50,47,61,0.8)',
        borderLeftColor: colors.border,
        borderLeftWidth: '3px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        color: '#F2F1F7',
      }}
    >
      <span style={{ color: colors.icon, marginTop: '1px', flexShrink: 0 }}>
        {ICONS[toast.type]}
      </span>
      <p className="text-sm flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={onDismiss}
        className="shrink-0 transition-opacity hover:opacity-70"
        style={{ color: '#6B687A' }}
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((type: ToastType, message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev.slice(-4), { id, type, message }]); // max 5 at once
  }, []);

  const value: ToastContextValue = {
    toast,
    success: (msg) => toast('success', msg),
    error:   (msg) => toast('error', msg),
    warning: (msg) => toast('warning', msg),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast container */}
      <div
        className="fixed bottom-5 right-5 flex flex-col gap-2 z-50"
        aria-live="polite"
        aria-label="Notifications"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
