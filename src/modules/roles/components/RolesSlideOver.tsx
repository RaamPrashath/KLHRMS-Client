'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { RoleForm } from '@/modules/roles/components/RoleForm';
import { type RoleResponse } from '@/modules/roles/types/role';

export type SlideOverMode = 'create' | 'edit';

export interface RolesSlideOverProps {
  open: boolean;
  mode: SlideOverMode;
  orgSlug: string;
  memberId: string;
  role?: RoleResponse | null;
  onClose: () => void;
}

export function RolesSlideOver({
  open,
  mode,
  orgSlug,
  memberId,
  role,
  onClose,
}: Readonly<RolesSlideOverProps>) {
  const shouldReduceMotion = useReducedMotion();

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const panelVariants = {
    hidden: { x: shouldReduceMotion ? 0 : '100%', opacity: shouldReduceMotion ? 0 : 1 },
    visible: {
      x: 0,
      opacity: 1,
      transition: { type: 'spring', damping: 30, stiffness: 300, mass: 0.8 },
    },
    exit: {
      x: shouldReduceMotion ? 0 : '100%',
      opacity: shouldReduceMotion ? 0 : 1,
      transition: { type: 'spring', damping: 35, stiffness: 350, mass: 0.6 },
    },
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.15 } },
  };

  const title = mode === 'create' ? 'Create role' : `Edit role`;
  const subtitle =
    mode === 'create'
      ? 'Define a name and configure permissions.'
      : `Updating permissions for ${role?.name ?? ''}.`;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            aria-hidden="true"
          />

          {/* Panel — 50vw on desktop, full width on mobile */}
          <motion.aside
            key="panel"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="
              fixed inset-y-0 right-0 z-50
              w-full sm:w-1/2
              bg-surface
              shadow-(--shadow-4)
              flex flex-col
              overflow-hidden
            "
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-5 border-b border-neutral-100 shrink-0">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900 tracking-tight">
                  {title}
                </h2>
                <p className="text-sm text-neutral-500 mt-0.5">{subtitle}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close panel"
                className="
                  size-8 flex items-center justify-center rounded-md shrink-0
                  text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50
                  transition-colors duration-100 motion-reduce:transition-none
                  mt-0.5
                "
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {(mode === 'create' || (mode === 'edit' && role)) && (
                <RoleForm
                  mode={mode}
                  orgSlug={orgSlug}
                  memberId={memberId}
                  initialRole={role ?? undefined}
                  onSuccess={onClose}
                  onCancel={onClose}
                />
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
