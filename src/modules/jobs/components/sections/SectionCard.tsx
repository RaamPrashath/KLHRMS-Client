import type { ReactNode } from 'react';

interface SectionCardProps {
  title: string;
  children: ReactNode;
  id?: string;
  required?: boolean;
  hideHeaderBorder?: boolean;
}

export function SectionCard({
  title,
  children,
  id,
  required,
  hideHeaderBorder,
}: Readonly<SectionCardProps>) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl bg-surface p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className={`mb-5 ${hideHeaderBorder ? '' : 'border-b border-neutral-200 pb-3'}`}>
        <h2 className="text-xl font-semibold text-neutral-900">
          {title} {required ? <RequiredMark /> : null}
        </h2>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

export function RequiredMark() {
  return (
    <span className="inline-flex text-sm font-semibold leading-none text-destructive-text" aria-hidden="true">
      *
    </span>
  );
}
