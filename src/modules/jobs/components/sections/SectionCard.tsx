import type { ReactNode } from 'react';

interface SectionCardProps {
  title: string;
  children: ReactNode;
  id?: string;
  required?: boolean;
}

export function SectionCard({
  title,
  children,
  id,
  required,
}: Readonly<SectionCardProps>) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-6 border-b border-neutral-100 pb-3">
        <h2 className="text-sm font-semibold text-neutral-900">
          {title}
          {required ? <RequiredMark /> : null}
        </h2>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

export function RequiredMark() {
  return (
    <span className="ml-1 text-sm font-semibold text-destructive-text" aria-hidden="true">
      *
    </span>
  );
}
