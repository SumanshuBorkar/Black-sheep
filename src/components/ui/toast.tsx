"use client";

import { useEffect } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { useUiStore } from "../../store/uiStore";
import { cn } from "@/lib/utils";

/**
 * ToastContainer — renders toast notifications from uiStore
 *
 * Plain English:
 * Toasts are the small pop-up messages like "Added to wardrobe!"
 * or "Item sold — please try another". Any component anywhere
 * in the app can trigger one by calling:
 *   useUiStore.getState().addToast("message", "success")
 *
 * Place <ToastContainer /> once in layout.tsx — it renders nothing
 * until there's something to show.
 */

const ICONS = {
  success: CheckCircle,
  error:   AlertCircle,
  info:    Info,
};

const STYLES = {
  success: "bg-white border-available text-black",
  error:   "bg-white border-sold text-black",
  info:    "bg-white border-black text-black",
};

export function ToastContainer() {
  const { toasts, removeToast } = useUiStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-toast flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-sm">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type];
        return (
          <div
            key={toast.id}
            className={cn(
              "flex items-center gap-3 px-4 py-3 border-2",
              "font-mono text-sm shadow-card animate-slide-up",
              STYLES[toast.type]
            )}
          >
            <Icon size={16} strokeWidth={2} className="shrink-0" />
            <span className="flex-1 uppercase tracking-wide text-xs">
              {toast.message}
            </span>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 opacity-60 hover:opacity-100"
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/**
 * useToast — convenience hook for triggering toasts
 *
 * Usage:
 *   const { toast } = useToast();
 *   toast.success("Added to wardrobe!");
 *   toast.error("Item is sold out.");
 */
export function useToast() {
  const { addToast } = useUiStore();

  return {
    toast: {
      success: (message: string) => addToast(message, "success"),
      error:   (message: string) => addToast(message, "error"),
      info:    (message: string) => addToast(message, "info"),
    },
  };
}
