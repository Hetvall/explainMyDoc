"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type ToastVariant = "default" | "success" | "error";

type ToastItem = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  toast: (input: { title: string; description?: string; variant?: ToastVariant }) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

/** Server-safe toast hook: components can call `useToast().toast(...)` from anywhere client-side. */
export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const icons: Record<ToastVariant, React.ReactNode> = {
  default: <Info className="size-4 text-brand" />,
  success: <CheckCircle2 className="size-4 text-success" />,
  error: <AlertCircle className="size-4 text-danger" />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const toast = React.useCallback<ToastContextValue["toast"]>(
    ({ title, description, variant = "default" }) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, title, description, variant }]);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}
        {toasts.map((t) => (
          <ToastPrimitive.Root
            key={t.id}
            duration={5000}
            onOpenChange={(open) => {
              if (!open) {
                setToasts((prev) => prev.filter((item) => item.id !== t.id));
              }
            }}
            className={cn(
              "flex items-start gap-3 rounded-md border border-border bg-surface p-4 shadow-lg data-[state=open]:animate-in-fade",
            )}
          >
            <div className="mt-0.5">{icons[t.variant]}</div>
            <div className="flex-1">
              <ToastPrimitive.Title className="text-sm font-medium">
                {t.title}
              </ToastPrimitive.Title>
              {t.description && (
                <ToastPrimitive.Description className="mt-0.5 text-sm text-foreground-muted">
                  {t.description}
                </ToastPrimitive.Description>
              )}
            </div>
            <ToastPrimitive.Close className="text-foreground-subtle hover:text-foreground">
              <X className="size-4" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed bottom-0 right-0 z-[100] flex w-full max-w-sm flex-col gap-2 p-4 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
