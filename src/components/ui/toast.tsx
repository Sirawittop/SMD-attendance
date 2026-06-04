"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";
export type ToastMode = "top" | "modal";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  mode?: ToastMode;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, duration?: number, mode?: ToastMode) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "success", duration = 3000, mode: ToastMode = "top") => {
      const id = Math.random().toString(36).substring(2, 9);

      if (mode === "modal") {
        // Keep only the latest modal alert.
        setToasts((prev) => [...prev.filter((t) => t.mode !== "modal"), { id, message, type, duration: 0, mode }]);
        return;
      }

      setToasts((prev) => [...prev, { id, message, type, duration, mode }]);
      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }
    },
    [dismissToast]
  );

  const topToasts = toasts.filter((toast) => toast.mode !== "modal");
  const modalToast = [...toasts].reverse().find((toast) => toast.mode === "modal");

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
      <div className="fixed top-5 right-5 z-[70] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {topToasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 p-4 rounded-2xl shadow-lg border text-sm pointer-events-auto transform transition-all duration-300 animate-in slide-in-from-top-4 ${
              toast.type === "success"
                ? "bg-white border-emerald-200 text-emerald-900"
                : toast.type === "error"
                ? "bg-white border-red-200 text-red-900"
                : toast.type === "warning"
                ? "bg-white border-amber-200 text-amber-900"
                : "bg-white border-blue-200 text-blue-900"
            }`}
          >
            {toast.type === "success" && <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />}
            {toast.type === "error" && <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />}
            {toast.type === "warning" && <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />}
            {toast.type === "info" && <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />}

            <span className="flex-grow font-semibold">{toast.message}</span>

            <button
              onClick={() => dismissToast(toast.id)}
              className="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
              aria-label="ปิดแจ้งเตือน"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {modalToast && (() => {
        const toast = modalToast;
        return (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" />

            <div
              className={`relative w-full max-w-lg rounded-3xl border-2 shadow-2xl p-6 sm:p-8 text-center pointer-events-auto transition-all duration-300 ${
                toast.type === "success"
                  ? "bg-white border-emerald-200 text-emerald-900"
                  : toast.type === "error"
                  ? "bg-white border-red-200 text-red-900"
                  : toast.type === "warning"
                  ? "bg-white border-amber-200 text-amber-900"
                  : "bg-white border-blue-200 text-blue-900"
              }`}
            >
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-md">
                {toast.type === "success" && <CheckCircle className="h-12 w-12 text-emerald-600" />}
                {toast.type === "error" && <XCircle className="h-12 w-12 text-red-600" />}
                {toast.type === "warning" && <AlertTriangle className="h-12 w-12 text-amber-600" />}
                {toast.type === "info" && <Info className="h-12 w-12 text-blue-600" />}
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold mb-2">แจ้งเตือน</h3>
              <p className="text-base sm:text-lg font-semibold leading-relaxed mb-6 px-1">{toast.message}</p>

              <button
                onClick={() => dismissToast(toast.id)}
                className={`w-full h-12 rounded-full text-base font-bold text-white shadow-md transition-transform active:scale-[0.98] ${
                  toast.type === "success"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : toast.type === "error"
                    ? "bg-red-600 hover:bg-red-700"
                    : toast.type === "warning"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                ตกลง
              </button>
            </div>
          </div>
        );
      })()}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
