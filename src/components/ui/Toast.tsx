import { useToast, type ToastType } from '../../hooks/useToast';

const typeColors: Record<ToastType, string> = {
  info: 'var(--accent-blue)',
  success: 'var(--accent-green)',
  warning: 'var(--accent-orange)',
  error: 'var(--accent-red)',
};

export default function ToastContainer() {
  const { toasts, dismiss } = useToast();

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 32,
        right: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            background: 'var(--surface-elevated)',
            borderLeft: `3px solid ${typeColors[t.type]}`,
            borderRadius: 4,
            fontSize: 12,
            color: 'var(--text-primary)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            pointerEvents: 'auto',
            animation: 'toast-slide-in 0.2s ease-out',
            maxWidth: 320,
          }}
        >
          <span style={{ flex: 1 }}>{t.message}</span>
          <button
            onClick={() => dismiss(t.id)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              fontSize: 14,
              lineHeight: 1,
              padding: '0 2px',
              flexShrink: 0,
            }}
          >
            &times;
          </button>
        </div>
      ))}
      <style>{`
        @keyframes toast-slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
