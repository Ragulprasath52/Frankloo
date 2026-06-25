import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export default function GlobalOverlays() {
  const toasts = useStore((state) => state.toasts);
  const removeToast = useStore((state) => state.removeToast);
  const confirmModal = useStore((state) => state.confirmModal);

  return (
    <>
      {/* Toast Stacking Container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none w-full max-w-sm">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>

      {/* Confirm Modal Overlay */}
      {confirmModal.isOpen && <ConfirmDialog modal={confirmModal} />}
    </>
  );
}

// Single Toast Card Component
function ToastCard({ toast, onClose }: { toast: any; onClose: () => void }) {
  const { type, title, message } = toast;
  
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-rose-500 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-blue-500 shrink-0" />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return 'rgba(16, 185, 129, 0.2)';
      case 'error':
        return 'rgba(244, 63, 94, 0.2)';
      case 'warning':
        return 'rgba(245, 158, 11, 0.2)';
      default:
        return 'rgba(59, 130, 246, 0.2)';
    }
  };

  return (
    <div
      className="pointer-events-auto flex gap-3 p-4 rounded-xl border shadow-xl animate-slide-in-right backdrop-blur-md transition-all duration-300"
      style={{
        background: 'var(--bg-surface-glass, rgba(23, 27, 31, 0.85))',
        borderColor: getBorderColor(),
        color: 'var(--text-primary)',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.25)',
      }}
    >
      <div className="pt-0.5">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-bold leading-none tracking-wide text-white">{title}</h4>
        {message && (
          <p className="text-[11px] font-medium leading-normal mt-1.5" style={{ color: 'var(--text-muted)' }}>
            {message}
          </p>
        )}
      </div>
      <button
        onClick={onClose}
        className="shrink-0 p-0.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// Custom Confirm Modal Dialog Component
function ConfirmDialog({ modal }: { modal: any }) {
  const { title, message, confirmText, cancelText, onConfirm, onCancel } = modal;
  const modalRef = useRef<HTMLDivElement>(null);

  // Trap focus and close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // Focus confirmation button on mount
    const confirmButton = modalRef.current?.querySelector('.confirm-btn') as HTMLElement;
    if (confirmButton) {
      confirmButton.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Blurred Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-[4px] animate-fade-in"
        onClick={onCancel}
      />

      {/* Modal Card Content */}
      <div
        ref={modalRef}
        className="relative w-full max-w-md modal-card p-6 rounded-2xl border shadow-2xl animate-scale-in flex flex-col gap-4 text-left"
        style={{
          background: 'var(--bg-surface, #161b22)',
          borderColor: 'var(--border, #30363d)',
          color: 'var(--text-primary)',
        }}
      >
        <div className="flex flex-col gap-1.5">
          <h3 className="text-sm font-bold text-white tracking-wide">{title}</h3>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {message}
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold rounded-lg transition"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="confirm-btn px-4 py-2 text-xs font-semibold rounded-lg bg-red-650 hover:bg-red-700 text-white transition shadow-md shadow-red-950/20"
            style={{ backgroundColor: 'var(--danger, #cf222e)' }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
