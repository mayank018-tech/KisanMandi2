import { create } from 'zustand';

export type ToastKind = 'success' | 'error' | 'info';

export type ToastItem = {
  id: string;
  title: string;
  kind: ToastKind;
};

type ToastState = {
  toasts: ToastItem[];
  pushToast: (title: string, kind?: ToastKind) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
};

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  pushToast: (title, kind = 'info') => {
    const id = crypto.randomUUID();
    set((state) => ({ toasts: [...state.toasts, { id, title, kind }] }));
    return id;
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((item) => item.id !== id),
    })),
  clearToasts: () => set({ toasts: [] }),
}));

