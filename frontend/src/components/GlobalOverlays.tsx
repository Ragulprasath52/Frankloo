import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export default function GlobalOverlays() {
  const toasts = useStore((state) => state.toasts);
  const removeToast = useStore((state) => state.removeToast);
  const confirmModal = useStore((state) => state.confirmModal);
  const draggedEmail = useStore((state) => state.draggedEmail);
  const previewRef = useRef<HTMLDivElement>(null);

  // Track global drag coordinates when dragging an email
  useEffect(() => {
    if (!draggedEmail) return;

    const handleDragOver = (e: DragEvent) => {
      if (previewRef.current) {
        previewRef.current.style.transform = `translate3d(${e.clientX - 120}px, ${e.clientY - 40}px, 0) scale(1.03) rotate(2.5deg)`;
      }
    };

    const handleDragEnd = () => {
      useStore.getState().setDraggedEmail(null);
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragend', handleDragEnd);
    window.addEventListener('mouseup', handleDragEnd);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragend', handleDragEnd);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }, [draggedEmail]);

  return (
    <>
      {/* Toast Stacking Container */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 md:left-auto md:right-4 md:translate-x-0 md:bottom-auto md:top-4 z-[9999] flex flex-col gap-3 pointer-events-none w-full max-w-sm px-4 md:px-0">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>

      {/* Confirm Modal Overlay */}
      {confirmModal.isOpen && <ConfirmDialog modal={confirmModal} />}
      {/* Custom Drag Preview Overlay */}
      {draggedEmail && (
        <div
          ref={previewRef}
          className="fixed pointer-events-none z-[99999] bg-white/95 dark:bg-[#1e2227]/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-2xl flex flex-col gap-1 w-64 text-slate-800 dark:text-slate-200"
          style={{
            left: 0,
            top: 0,
            transform: 'translate3d(-1000px, -1000px, 0) scale(1.03) rotate(2.5deg)',
            willChange: 'transform',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div className="flex items-center justify-between gap-1.5 mb-1 border-b border-slate-200 dark:border-slate-800 pb-1">
            <span className="text-[9px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              {draggedEmail.source} Email
            </span>
            {JSON.parse(draggedEmail.sourceDetails || '{}').attachments?.length > 0 && (
              <span className="text-[9px] bg-indigo-500/10 text-indigo-500 px-1.5 py-0.5 rounded font-bold">
                📎 {JSON.parse(draggedEmail.sourceDetails || '{}').attachments.length} Att.
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold text-slate-450 dark:text-slate-400 truncate">
            From: {JSON.parse(draggedEmail.sourceDetails || '{}').sender || 'Unknown Sender'}
          </span>
          <span className="text-xs font-bold leading-tight line-clamp-2">
            Subject: {draggedEmail.title}
          </span>
          <div className="mt-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-800 text-[9px] font-semibold text-slate-500">
            Estimated Title: <span className="text-indigo-500 dark:text-indigo-400 font-bold">{draggedEmail.title.replace(/^(Fwd|Re|Fw|[FWD]):\s*/i, '').trim()}</span>
          </div>
        </div>
      )}
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
      className="pointer-events-auto relative flex flex-col gap-2 p-4 rounded-xl border shadow-xl animate-slide-in-right backdrop-blur-md transition-all duration-300"
      style={{
        background: 'var(--bg-surface-glass, rgba(23, 27, 31, 0.85))',
        borderColor: getBorderColor(),
        color: 'var(--text-primary)',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.25)',
      }}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0">{getIcon()}</div>
        <div className="flex-1 min-w-0 pr-6">
          <h4 className="text-xs font-bold leading-5 tracking-wide text-white">{title}</h4>
          {message && (
            <p className="text-[11px] font-medium leading-normal mt-1.5" style={{ color: 'var(--text-muted)' }}>
              {message}
            </p>
          )}
        </div>
      </div>
      {toast.action && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toast.action.onClick();
            onClose();
          }}
          className="self-start mt-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer pointer-events-auto shadow-sm"
        >
          {toast.action.label}
        </button>
      )}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-0.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"
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
