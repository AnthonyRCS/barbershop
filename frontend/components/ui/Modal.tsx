"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}

export function Modal({ isOpen, onClose, title, children, footer, size = "md" }: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const modalNode = (
    <div
      className="fixed inset-0 z-[2147483000] flex items-end sm:items-center sm:justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={cn(
          "premium-card relative z-10 animate-slide-in overflow-hidden shadow-2xl shadow-black/25 dark:shadow-black/70",
          "w-full sm:w-full",
          "rounded-t-[1.75rem] sm:rounded-2xl",
          "max-h-[calc(100dvh-0.5rem)] sm:max-h-[90dvh]",
          "pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:pb-0",
          size === "sm" && "max-w-sm",
          size === "md" && "max-w-md",
          size === "lg" && "max-w-lg",
        )}
      >
        <div className="mx-auto mb-1.5 mt-3 h-1 w-10 rounded-full bg-neutral-300 dark:bg-neutral-700 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/70 bg-muted/20 px-5 py-4 sm:px-6">
          <h2 className="text-base font-semibold tracking-tight text-neutral-950 dark:text-white sm:text-lg">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition-colors hover:bg-neutral-200 active:bg-neutral-200 dark:bg-white/[0.08] dark:text-neutral-300 dark:hover:bg-white/[0.12] dark:active:bg-white/[0.14]"
            aria-label="Cerrar"
            type="button"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[calc(100dvh-9rem)] overflow-y-auto px-5 py-5 sm:max-h-[calc(90dvh-10rem)] sm:px-6">
          {children}
        </div>

        {/* Footer */}
        {footer ? (
          <div className="flex justify-end gap-3 border-t border-border/70 bg-muted/20 px-5 py-4 sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
}
