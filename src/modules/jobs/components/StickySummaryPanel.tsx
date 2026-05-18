'use client';

import { CheckCircle2, Circle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface StickySummaryPanelProps {
  sectionCompletion: Record<string, boolean>;
}

const SECTION_LABELS = [
  { key: 'basicInfo', label: 'Basic information', targetId: 'basic-information' },
  { key: 'hiringContext', label: 'Hiring context', targetId: 'hiring-context' },
  { key: 'compensation', label: 'Compensation', targetId: 'compensation' },
  { key: 'requirements', label: 'Requirements', targetId: 'candidate-requirements' },
  { key: 'postingContent', label: 'Posting content', targetId: 'job-posting-content' },
];

export function StickySummaryPanel({
  sectionCompletion,
}: Readonly<StickySummaryPanelProps>) {
  const completedCount = Object.values(sectionCompletion).filter(Boolean).length;
  const totalSections = SECTION_LABELS.length;
  const [activeSection, setActiveSection] = useState(SECTION_LABELS[0]?.targetId);
  const progress = Math.round((completedCount / totalSections) * 100);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target.id) {
          setActiveSection(visible.target.id);
        }
      },
      {
        root: null,
        rootMargin: '-18% 0px -64% 0px',
        threshold: [0.12, 0.3, 0.55],
      },
    );

    SECTION_LABELS.forEach(({ targetId }) => {
      const section = document.getElementById(targetId);
      if (section) observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (targetId: string) => {
    document.getElementById(targetId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <div className="sticky top-28">
          <h3 className="mb-3 px-1 text-xs font-medium uppercase tracking-wider text-neutral-500">
            Form contents
          </h3>
          <div className="mb-3 px-1">
            <div className="h-1 overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full bg-primary transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            {SECTION_LABELS.map(({ key, label, targetId }) => {
              const done = sectionCompletion[key] ?? false;
              const active = activeSection === targetId;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => scrollToSection(targetId)}
                  className={[
                    'flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left transition-colors',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                    active ? 'bg-primary-ghost text-neutral-900' : 'hover:bg-primary-ghost/50',
                  ].join(' ')}
                >
                  {done ? (
                    <CheckCircle2 className="size-4 shrink-0 text-success-text" />
                  ) : (
                    <Circle className={active ? 'size-4 shrink-0 text-primary' : 'size-4 shrink-0 text-neutral-300'} />
                  )}
                  <span className={done || active ? 'text-sm text-neutral-900' : 'text-sm text-neutral-400'}>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 px-1 text-xs text-neutral-500">
            {completedCount}/{totalSections} sections complete
          </div>
      </div>
    </aside>
  );
}
