import type { ReactNode } from 'react';

interface SectionCardProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function SectionCard({
  title,
  description,
  children,
}: Readonly<SectionCardProps>) {
  return (
    <section className="space-y-5 rounded-xl border border-neutral-100 bg-surface p-5 shadow-[var(--shadow-1)] sm:p-6">
      <div>
        <h2 className="text-[17px] font-semibold text-neutral-900">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-sm text-neutral-500">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
