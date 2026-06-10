'use client';

import { useState, useRef, useEffect } from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { UserPersonalDetailsTab } from '@/modules/settings/components/UserPersonalDetailsTab';
import { UserPasswordTab } from '@/modules/settings/components/UserPasswordTab';
import { cn } from '@/lib/utils';

const ACCOUNT_TABS = [
  { value: 'personal-details', label: 'Personal details' },
  { value: 'password', label: 'Password' },
] as const;

type AccountTab = typeof ACCOUNT_TABS[number]['value'];

export function AccountSettingsClient({
  orgSlug,
  memberId,
}: {
  orgSlug: string;
  memberId: string;
}) {
  const [activeTab, setActiveTab] = useState<AccountTab>('personal-details');
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  const activeIdx = ACCOUNT_TABS.findIndex((t) => t.value === activeTab);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const activeBtn = container.querySelector<HTMLButtonElement>(`[data-tab-index="${activeIdx}"]`);
    if (!activeBtn) return;
    const cr = container.getBoundingClientRect();
    const br = activeBtn.getBoundingClientRect();
    setIndicatorStyle({ left: br.left - cr.left, width: br.width });
  }, [activeIdx]);

  return (
    <div className="w-full">
      {/* Custom sliding tab bar */}
      <div
        ref={containerRef}
        className="flex items-center self-start rounded-xl bg-neutral-50 p-1 border border-black/4 relative w-fit mb-6"
      >
        <div
          className="absolute top-1 bottom-1 rounded-lg bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
        />
        {ACCOUNT_TABS.map(({ value, label }, idx) => (
          <button
            key={value}
            data-tab-index={idx}
            type="button"
            onClick={() => setActiveTab(value)}
            aria-label={label}
            aria-pressed={activeTab === value}
            className={cn(
              'inline-flex items-center gap-1.5 h-8 px-4 text-[13px] font-medium rounded-lg relative z-10 transition-colors duration-200 cursor-pointer',
              activeTab === value
                ? 'text-primary'
                : 'text-neutral-500 hover:text-neutral-900',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as AccountTab)} className="w-full">
        <TabsContent value="personal-details" className="mt-0 max-w-2xl focus-visible:outline-none">
          <UserPersonalDetailsTab orgSlug={orgSlug} memberId={memberId} />
        </TabsContent>

        <TabsContent value="password" className="mt-0 max-w-2xl focus-visible:outline-none">
          <UserPasswordTab orgSlug={orgSlug} memberId={memberId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
