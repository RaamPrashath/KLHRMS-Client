'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { KanbanSquare, LayoutDashboard, List, Plus, Search } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { CandidatesJobPageClient } from '@/app/(authenticated)/[orgSlug]/candidates/[jobSlug]/CandidatesJobPageClient';
import { CandidatesJobContext } from '@/modules/candidates/components/CandidatesJobContext';
import { usePipelineJobPostings } from '@/modules/candidates/hooks/useAtsPipeline';

const TABS = [
  { key: 'overview', icon: LayoutDashboard, label: 'Overview' },
  { key: 'kanban', icon: KanbanSquare, label: 'Kanban' },
  { key: 'table', icon: List, label: 'Table' },
] as const;

type PipelineTabKey = (typeof TABS)[number]['key'];

export function AtsPipelineSectionLayout({
  orgSlug,
  memberId,
  jobSlug,
  children,
}: {
  readonly orgSlug: string;
  readonly memberId: string;
  readonly jobSlug: string;
  readonly children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const postingsQuery = usePipelineJobPostings(orgSlug, memberId);
  const postings = postingsQuery.data ?? [];
  const currentPosting = postings.find((posting) => posting.slug === jobSlug) ?? null;

  const activeTabFromPath = useMemo<PipelineTabKey>(
    () =>
      pathname.endsWith('/kanban')
        ? 'kanban'
        : pathname.endsWith('/table')
          ? 'table'
          : 'overview',
    [pathname],
  );
  const [pendingTab, setPendingTab] = useState<PipelineTabKey | null>(null);
  const activeTab = pendingTab && pendingTab !== activeTabFromPath ? pendingTab : activeTabFromPath;

  const [searchQuery, setSearchQuery] = useState('');
  const addStageSignalRef = useRef(0);
  const [addStageSignal, setAddStageSignal] = useState(0);

  const triggerAddStage = useCallback(() => {
    addStageSignalRef.current += 1;
    setAddStageSignal(addStageSignalRef.current);
  }, []);

  useEffect(() => {
    void router.prefetch(`/${orgSlug}/candidates/${jobSlug}/overview`);
    void router.prefetch(`/${orgSlug}/candidates/${jobSlug}/kanban`);
    void router.prefetch(`/${orgSlug}/candidates/${jobSlug}/table`);
  }, [jobSlug, orgSlug, router]);

  function handleTabChange(nextTab: PipelineTabKey) {
    if (nextTab === activeTab) return;
    setPendingTab(nextTab);
    router.push(`/${orgSlug}/candidates/${jobSlug}/${nextTab}`);
  }

  const tabContent =
    activeTab === 'overview' ? (
      children
    ) : (
      <CandidatesJobPageClient
        orgSlug={orgSlug}
        memberId={memberId}
        jobSlug={jobSlug}
        defaultView={activeTab}
      />
    );

  const ctxValue = useMemo(
    () => ({ searchQuery, setSearchQuery, addStageSignal }),
    [searchQuery, addStageSignal],
  );

  return (
    <CandidatesJobContext.Provider value={ctxValue}>
      <div className="min-h-full bg-canvas">
        <div className="sticky top-0 z-20 bg-canvas/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 p-7 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-4xl font-semibold tracking-tight text-neutral-900">ATS Pipeline</p>
            </div>
            <Select
              value={currentPosting?.slug}
              onValueChange={(value) => router.push(`/${orgSlug}/jobs/${value}/pipeline`)}
              disabled={postingsQuery.isLoading || postings.length === 0}
            >
              <SelectTrigger className="w-full bg-surface lg:w-[320px]">
                <SelectValue placeholder="Select job posting" />
              </SelectTrigger>
              <SelectContent>
                {postings.map((posting) => (
                  <SelectItem key={posting.id} value={posting.slug}>
                    {posting.title}{posting.status !== 'PUBLISHED' ? ' [Closed]' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-7 pb-3">
            <div className="flex items-center self-start rounded-xl border border-black/4 bg-neutral-50 p-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = tab.key === activeTab;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => handleTabChange(tab.key)}
                    aria-pressed={isActive}
                    className={cn(
                      'relative inline-flex h-8 items-center gap-1.5 rounded-lg px-4 text-[13px] font-medium transition-[color,transform] duration-150 ease-out',
                      isActive ? 'text-primary' : 'text-neutral-500 hover:text-neutral-900',
                    )}
                  >
                    {isActive ? (
                      <motion.span
                        layoutId="ats-candidates-tab-pill"
                        className="absolute inset-0 rounded-lg bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                        transition={{
                          type: 'spring',
                          stiffness: 520,
                          damping: 36,
                          mass: 0.65,
                        }}
                      />
                    ) : null}
                    <span className="relative z-10 inline-flex items-center gap-1.5">
                      <Icon className="size-3.5" />
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {activeTab !== 'overview' ? (
              <>
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search all candidates"
                    className="h-10 bg-white pl-9 text-[13px]"
                  />
                </div>
                <Button size="lg" onClick={triggerAddStage} className='text-[16px]'>
                  <Plus className="size-5" />
                  Stage
                </Button>
              </>
            ) : null}
          </div>
        </div>
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="mx-auto max-w-7xl px-6"
            >
              {tabContent}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </CandidatesJobContext.Provider>
  );
}
