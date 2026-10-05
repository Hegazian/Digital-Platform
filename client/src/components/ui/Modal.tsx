'use client';

import React, { useCallback, useEffect, useRef } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Accessible name for the dialog (visible heading preferred). */
  label: string;
  children: React.ReactNode;
  /** Extra classes for the inner panel (width/padding live there). */
  panelClassName?: string;
  /** Close when the dark backdrop is clicked. Default true. */
  closeOnBackdrop?: boolean;
}

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Accessible dialog primitive:
 * - role=dialog + aria-modal + accessible name
 * - Escape closes; Tab is trapped inside; initial focus lands in the panel;
 *   focus returns to the trigger element on close
 * - optional backdrop-click close
 *
 * Every product modal should render through this so keyboard/screen-reader
 * behavior is consistent instead of per-modal guesswork.
 */
export default function Modal({
  open,
  onClose,
  label,
  children,
  panelClassName = '',
  closeOnBackdrop = true,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;

      const focusables = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((el) => el.offsetParent !== null);
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;

    // Initial focus: panel itself (screen readers announce the label),
    // then the first focusable control for keyboard users.
    requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const first = panel.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panel).focus();
    });

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus ONLY when it was orphaned (dialog DOM is gone, browser
      // fell back to <body>). If another surface - e.g. a newly opened dialog
      // during login->dashboard transition - already took focus, stealing it
      // back here would fight that component and break focus management.
      const active = document.activeElement;
      const orphaned = !active || active === document.body;
      if (orphaned && restoreFocusRef.current?.isConnected) {
        restoreFocusRef.current.focus();
      }
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={`relative outline-none ${panelClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
