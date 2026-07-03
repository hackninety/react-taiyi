import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';

interface ToastItem {
  id: number;
  text: string;
  kind: 'success' | 'error';
}

const ToastContext = createContext<(text: string, kind?: 'success' | 'error') => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const push = useCallback((text: string, kind: 'success' | 'error' = 'success') => {
    const id = nextId.current++;
    setItems((prev) => [...prev, { id, text, kind }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toast-wrap" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            {t.kind === 'success' ? '✓ ' : '✕ '}{t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
