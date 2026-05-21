'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, KanbanSquare, LayoutDashboard, List, Plus, Search } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { CandidatesJobPageClient } from '@/app/(authenticated)/[orgSlug]/candidates/[jobSlug]/CandidatesJobPageClient';
import { CandidatesJobContext } from '@/modules/candidates/components/CandidatesJobContext';
import { usePipelineJobPostings } from '@/modules/candidates/hooks/useAtsPipeline';
import type { RolePermissions } from '@/modules/roles/types/role';

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
  permissions,
  children,
}: {
  readonly orgSlug: string;
  readonly memberId: string;
  readonly jobSlug: string;
  readonly permissions?: RolePermissions | null;
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
  const [navigatingTab, setNavigatingTab] = useState<PipelineTabKey | null>(null);
  const activeTab = activeTabFromPath;
  const visibleTab = navigatingTab ?? activeTab;
  const isTabNavigating = navigatingTab !== null && navigatingTab !== activeTabFromPath;

  const [searchQuery, setSearchQuery] = useState('');
  const addStageSignalRef = useRef(0);
  const [addStageSignal, setAddStageSignal] = useState(0);

  const triggerAddStage = useCallback(() => {
    addStageSignalRef.current += 1;
    setAddStageSignal(addStageSignalRef.current);
  }, []);

  const consumeAddStageSignal = useCallback(() => {
    addStageSignalRef.current = 0;
    setAddStageSignal(0);
  }, []);

  useEffect(() => {
    void router.prefetch(`/${orgSlug}/candidates/${jobSlug}`);
    void router.prefetch(`/${orgSlug}/candidates/${jobSlug}/kanban`);
    void router.prefetch(`/${orgSlug}/candidates/${jobSlug}/table`);
  }, [jobSlug, orgSlug, router]);

  useEffect(() => {
    if (navigatingTab === activeTabFromPath) {
      const id = window.setTimeout(() => setNavigatingTab(null), 0);
      return () => window.clearTimeout(id);
    }
  }, [activeTabFromPath, navigatingTab]);

  function handleTabChange(nextTab: PipelineTabKey) {
    if (nextTab === activeTabFromPath) return;
    setAddStageSignal(0);
    addStageSignalRef.current = 0;
    setNavigatingTab(nextTab);
    router.push(
      nextTab === 'overview'
        ? `/${orgSlug}/candidates/${jobSlug}`
        : `/${orgSlug}/candidates/${jobSlug}/${nextTab}`,
    );
  }

  const tabContent = isTabNavigating ? (
    <div className="space-y-5 pb-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: visibleTab === 'overview' ? 8 : 4 }, (_, index) => (
          <Skeleton key={index} className="h-[120px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[calc(100dvh-250px)] min-h-[420px] rounded-xl" />
    </div>
  ) : activeTab === 'overview' ? (
      children
    ) : (
      <CandidatesJobPageClient
        orgSlug={orgSlug}
        memberId={memberId}
        jobSlug={jobSlug}
        defaultView={activeTab}
        permissions={permissions}
      />
    );

  const ctxValue = useMemo(
    () => ({ searchQuery, setSearchQuery, addStageSignal, consumeAddStageSignal }),
    [searchQuery, addStageSignal, consumeAddStageSignal],
  );

  return (
    <CandidatesJobContext.Provider value={ctxValue}>
      <div className="min-h-full bg-canvas">
        <div className="sticky top-0 z-20 bg-canvas/95 backdrop-blur">
          <div className="flex flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push(`/${orgSlug}/candidates`)}
                className="flex size-10 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                aria-label="Back to candidates"
              >
                <ArrowLeft className="size-5" />
              </button>
              {postingsQuery.isLoading ? (
                <Skeleton className="h-10 w-64 rounded-lg" />
              ) : (
                <p className="text-4xl font-semibold tracking-tight text-neutral-900">
                  {currentPosting?.title ?? 'Recruitment pipeline'}
                </p>
              )}
            </div>
            <Select
              value={currentPosting?.slug}
              onValueChange={(value) => router.push(`/${orgSlug}/candidates/${value}`)}
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
          <div className="flex items-center gap-3 px-6 pb-2">
            <div className="flex items-center self-start rounded-xl border border-black/4 bg-neutral-50 p-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = tab.key === visibleTab;
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
            {visibleTab !== 'overview' && !isTabNavigating ? (
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
              key={isTabNavigating ? `loading-${visibleTab}` : activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="px-4 sm:px-6"
            >
              {tabContent}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </CandidatesJobContext.Provider>
  );
}
