import { useEffect } from 'react';
import { CheckCircle2, Info, XCircle } from 'lucide-react';
import { useToastStore } from '../../stores/toastStore';

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
} as const;

const CONTAINER_CLASSES = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-rose-200 bg-rose-50 text-rose-800',
  info: 'border-slate-200 bg-white text-slate-800',
} as const;

export default function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((toast) =>
      window.setTimeout(() => removeToast(toast.id), 2600)
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [removeToast, toasts]);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-3 top-20 z-[80] flex w-[92vw] max-w-sm flex-col gap-2 sm:right-4">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.kind];
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-2 rounded-xl border px-3 py-2 text-sm shadow-[var(--km-shadow-md)] ${CONTAINER_CLASSES[toast.kind]}`}
          >
            <Icon className="h-4 w-4" />
            <span>{toast.title}</span>
          </div>
        );
      })}
    </div>
  );
}

