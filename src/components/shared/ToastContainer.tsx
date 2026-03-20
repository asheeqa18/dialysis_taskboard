import React from "react";
import { useToasts } from "../../hooks/useTasks";

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useToasts();

  if (!toasts.length) return null;

  return (
    <div className="toast-container" aria-live="polite" aria-label="Notifications">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast--${toast.type}`}
          role="alert"
          data-testid={`toast-${toast.type}`}
        >
          <span className="toast__icon">
            {toast.type === "error" ? "⚠" : toast.type === "success" ? "✓" : "ℹ"}
          </span>
          <span className="toast__message">{toast.message}</span>
          {toast.action && (
            <button
              className="toast__action"
              onClick={() => {
                toast.action!.onClick();
                dismissToast(toast.id);
              }}
            >
              {toast.action.label}
            </button>
          )}
          <button
            className="toast__close"
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};