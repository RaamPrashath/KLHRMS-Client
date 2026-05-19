'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Hammer, PackagePlus, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { AssetRegisterTab } from '@/modules/assets/components/AssetRegisterTab';
import { CategoryTab } from '@/modules/assets/components/CategoryTab';
import { DashboardTab } from '@/modules/assets/components/dashboard/DashboardTab';
import { IssueAssetTab } from '@/modules/assets/components/IssueAssetTab';
import { MyTicketsTab } from '@/modules/assets/components/MyTicketsTab';
import { RaiseTicketDialog } from '@/modules/assets/components/RaiseTicketDialog';
import { ReportsTab } from '@/modules/assets/components/ReportsTab';
import { AssetDetailDialog } from '@/modules/assets/components/AssetDetailDialog';
import { AssetFormDialog } from '@/modules/assets/components/AssetFormDialog';
import { AssetSettingsDialog } from '@/modules/assets/components/AssetSettingsDialog';
import {
  ACTION_GREEN,
  defaultAssetForm,
  getAssetTabOptions,
} from '@/modules/assets/lib/assetConfig';
import { humanize, readError } from '@/modules/assets/lib/assetUtils';
import { useAssetMutations } from '@/modules/assets/hooks/useAssetMutations';
import {
  useAssetCategoriesQuery,
  useAssetDetailQuery,
  useAssetMetaQuery,
  useAssetsQuery,
  useAvailableAssetGroupsQuery,
} from '@/modules/assets/hooks/useAssetsQuery';
import {
  assetStatusOptions,
  type AssetCategoryFieldCreateInput,
  type BulkAssetCreateInput,
} from '@/modules/assets/schema/assetSchemas';
import type {
  AssetCategory,
  AssetDetail,
  AssetStatus,
  AssetSummary,
} from '@/modules/assets/types/assetTypes';

export function AssetsPageShell({
  orgSlug,
  memberId,
  canManageAssets,
}: {
  orgSlug: string;
  memberId: string;
  canManageAssets: boolean;
}) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AssetStatus | 'ALL'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<AssetCategory | 'ALL'>('ALL');
  const [categorySearch, setCategorySearch] = useState('');
  const [detailAssetId, setDetailAssetId] = useState<string | null>(null);
  const [detailSnapshot, setDetailSnapshot] = useState<AssetDetail | null>(null);
  const [assetFormOpen, setAssetFormOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'create' | 'manage'>('manage');
  const [employeeTab, setEmployeeTab] = useState<'assets' | 'tickets'>('assets');
  const [raiseTicketOpen, setRaiseTicketOpen] = useState(false);

  const router = useRouter();
  const tabOptions = useMemo(() => getAssetTabOptions(canManageAssets), [canManageAssets]);

  const registerQuery = useAssetsQuery(orgSlug, memberId, { page: 1, pageSize: 100 });
  const metaQuery = useAssetMetaQuery(orgSlug, memberId);
  const categoriesQuery = useAssetCategoriesQuery(orgSlug, memberId);
  const availableGroupsQuery = useAvailableAssetGroupsQuery(orgSlug, memberId);
  const detailQuery = useAssetDetailQuery(orgSlug, memberId, detailAssetId);
  const mutations = useAssetMutations(orgSlug, memberId);

  const allFetchedAssets = useMemo(() => registerQuery.data?.items ?? [], [registerQuery.data?.items]);

  const filteredAssets = useMemo(() => {
    let result = allFetchedAssets;
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.assetCode.toLowerCase().includes(q) ||
          (a.serialNumber ?? '').toLowerCase().includes(q) ||
          (a.model ?? '').toLowerCase().includes(q) ||
          (a.location ?? '').toLowerCase().includes(q),
      );
    }
    if (categoryFilter !== 'ALL') {
      result = result.filter((a) => a.category === categoryFilter);
    }
    if (statusFilter !== 'ALL') {
      result = result.filter((a) => a.status === statusFilter);
    }
    return result;
  }, [allFetchedAssets, search, categoryFilter, statusFilter]);

  const members = useMemo(() => metaQuery.data?.members ?? [], [metaQuery.data?.members]);
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const availableGroups = useMemo(() => availableGroupsQuery.data ?? [], [availableGroupsQuery.data]);
  const selectedAsset = detailQuery.data ?? detailSnapshot;
  const categoryOptions = useMemo(() => {
    const values = new Set<string>();
    for (const asset of allFetchedAssets) values.add(asset.category);
    for (const category of categories) values.add(category.name.toUpperCase().replaceAll(' ', '_'));
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [allFetchedAssets, categories]);

  function openCreateAssetDialog() {
    setAssetFormOpen(true);
  }

  function openDetail(assetId: string) {
    setDetailAssetId(assetId);
    setDetailSnapshot(null);
  }

  function seedProvideForm(_asset: AssetSummary) {
    setActiveTab('provide');
    setSearch('');
  }

  function seedMaintenanceForm(_asset: AssetSummary) {
    router.push(`/${orgSlug}/maintenance`);
  }

  async function handleSaveBulkAsset(data: BulkAssetCreateInput) {
    try {
      await mutations.bulkCreateAssets.mutateAsync(data);
      setAssetFormOpen(false);
      toast.success('Assets created successfully');
    } catch (error) {
      toast.error(readError(error, 'Failed to create assets'));
      throw error;
    }
  }

  async function handleArchiveAsset(assetId: string) {
    try {
      await mutations.archiveAsset.mutateAsync(assetId);
      if (detailAssetId === assetId) {
        setDetailAssetId(null);
        setDetailSnapshot(null);
      }
      toast.success('Asset archived');
    } catch (error) {
      toast.error(readError(error, 'Failed to archive asset'));
    }
  }

  async function handleIssueGroupAsset(data: import('@/modules/assets/types/assetTypes').AssetIssueInput) {
    try {
      await mutations.issueAssets.mutateAsync(data);
    } catch (error) {
      throw error;
    }
  }

  async function handleAddField(categoryId: string, data: AssetCategoryFieldCreateInput) {
    await mutations.createCategoryField.mutateAsync({ categoryId, data });
  }

  async function handleEditCategory(categoryId: string, data: { name?: string; assetCode?: string | null }) {
    await mutations.updateCategory.mutateAsync({ categoryId, data });
  }

  async function handleDeleteCategory(categoryId: string) {
    await mutations.deleteCategory.mutateAsync(categoryId);
  }

  async function handleRaiseTicket(data: { assetId: string; maintenanceType: string; issueDescription: string }) {
    await mutations.createMaintenance.mutateAsync({
      assetId: data.assetId,
      maintenanceType: data.maintenanceType as any,
      issueDescription: data.issueDescription,
      serviceDate: new Date().toISOString().split('T')[0],
      status: 'OPEN',
      conditionBeforeMaintenance: 'GOOD',
      notes: '',
    });
  }

  async function handleDecommissionAsset(assetId: string) {
    try {
      const asset = allFetchedAssets.find((a) => a.id === assetId);
      if (!asset) return;
      await mutations.updateAsset.mutateAsync({
        assetId,
        data: {
          ...defaultAssetForm,
          ...asset,
          serialNumber: asset.serialNumber ?? '',
          model: asset.model ?? '',
          purchaseDate: asset.purchaseDate ?? '',
          warrantyExpiryDate: asset.warrantyExpiryDate ?? '',
          location: asset.location ?? '',
          quantity: asset.quantity ?? 1,
          status: 'RETIRED',
        },
      });
      toast.success('Asset retired');
    } catch (error) {
      toast.error(readError(error, 'Failed to retire asset'));
    }
  }

  if (!canManageAssets) {
    return (
      <div className="w-full">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-[#111827]">Assets</h1>
            <p className="mt-1 text-[14px] text-[#6b7280]">View equipment and devices assigned to you</p>
          </div>
          <Button
            onClick={() => setRaiseTicketOpen(true)}
            className="h-9 shrink-0 rounded-lg px-4 text-[13px] font-medium text-white shadow-sm"
            style={{ backgroundColor: '#b3261e' }}
          >
            <Hammer className="mr-1.5 size-4" />
            Report Issue
          </Button>
        </div>

        <div className="mb-5">
          <div className="inline-flex rounded-lg bg-[#f4f5f7] p-0.5">
            <button
              type="button"
              onClick={() => setEmployeeTab('assets')}
              className={`relative rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-200 ${
                employeeTab === 'assets' ? 'text-white' : 'text-[#6b7280] hover:text-[#111827]'
              }`}
            >
              {employeeTab === 'assets' && (
                <motion.span
                  layoutId="employee-tab-pill"
                  className="absolute inset-0 rounded-md bg-[#1d1d1f]"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative z-10">My Assets</span>
            </button>
            <button
              type="button"
              onClick={() => setEmployeeTab('tickets')}
              className={`relative rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-200 ${
                employeeTab === 'tickets' ? 'text-white' : 'text-[#6b7280] hover:text-[#111827]'
              }`}
            >
              {employeeTab === 'tickets' && (
                <motion.span
                  layoutId="employee-tab-pill"
                  className="absolute inset-0 rounded-md bg-[#1d1d1f]"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative z-10">My Tickets</span>
            </button>
          </div>
        </div>

        {employeeTab === 'assets' ? (
          <>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="w-full sm:max-w-xs flex items-center gap-2 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2">
                <Search className="size-4 shrink-0 text-[#9ca3af]" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search assets..."
                  className="h-auto border-0 bg-transparent px-0 py-0 text-[13px] shadow-none focus-visible:ring-0 placeholder:text-[#9ca3af]"
                />
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={categoryFilter}
                  onValueChange={(value) => setCategoryFilter(value as AssetCategory | 'ALL')}
                >
                  <SelectTrigger className="h-9 w-auto min-w-32.5 rounded-lg border border-[#e5e7eb] bg-white px-3 text-[13px] shadow-none">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All categories</SelectItem>
                    {categoryOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {humanize(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as AssetStatus | 'ALL')}
                >
                  <SelectTrigger className="h-9 w-auto min-w-32.5 rounded-lg border border-[#e5e7eb] bg-white px-3 text-[13px] shadow-none">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All statuses</SelectItem>
                    {assetStatusOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {humanize(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <AssetRegisterTab
              assets={filteredAssets}
              isLoading={registerQuery.isLoading}
              onOpenDetail={openDetail}
              onEdit={() => {}}
              onProvide={() => {}}
              onMaintenance={seedMaintenanceForm}
              onDecommission={() => {}}
            />
          </>
        ) : (
          <div className="rounded-xl border border-[#e5e7eb] bg-white p-5">
            <MyTicketsTab orgSlug={orgSlug} memberId={memberId} />
          </div>
        )}

        <AssetDetailDialog
          open={!!detailAssetId}
          onOpenChange={(open) => !open && setDetailAssetId(null)}
          isLoading={detailQuery.isLoading}
          asset={selectedAsset ?? undefined}
          canManageAssets={false}
          onEdit={() => {}}
          onArchive={() => {}}
          onProvide={() => {}}
          onReturn={() => {}}
          onMaintenance={seedMaintenanceForm}
        />
        <RaiseTicketDialog
          open={raiseTicketOpen}
          onOpenChange={setRaiseTicketOpen}
          assets={allFetchedAssets}
          memberId={memberId}
          onSubmit={handleRaiseTicket}
        />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-tight text-[#111827]">Asset Management</h1>
        <p className="mt-1 text-[14px] text-[#6b7280]">Manage your company equipment, track assignments, and log maintenance</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 overflow-x-auto">
            <div className="inline-flex min-w-fit rounded-lg bg-[#f4f5f7] p-0.5">
              {tabOptions.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.value;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setActiveTab(tab.value)}
                    className={cn(
                      'relative flex items-center gap-2 rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-200',
                      isActive
                        ? 'text-white'
                        : 'text-[#6b7280] hover:text-[#111827]',
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="asset-tab-pill"
                        className="absolute inset-0 rounded-md bg-[#1d1d1f]"
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      <Icon className="size-3.5" />
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <Button
            onClick={openCreateAssetDialog}
            className="h-9 shrink-0 rounded-lg px-4 text-[13px] font-medium text-white shadow-sm"
            style={{ backgroundColor: ACTION_GREEN }}
          >
            <PackagePlus className="mr-1.5 size-4" />
            Add Asset
          </Button>
        </div>

        <TabsContent value="dashboard" className="mt-0">
          <DashboardTab orgSlug={orgSlug} memberId={memberId} />
        </TabsContent>

        <TabsContent value="register" className="mt-0">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="w-full sm:max-w-xs flex items-center gap-2 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2">
              <Search className="size-4 shrink-0 text-[#9ca3af]" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search assets..."
                className="h-auto border-0 bg-transparent px-0 py-0 text-[13px] shadow-none focus-visible:ring-0 placeholder:text-[#9ca3af]"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={categoryFilter}
                onValueChange={(value) => setCategoryFilter(value as AssetCategory | 'ALL')}
              >
                <SelectTrigger className="h-9 w-auto min-w-32.5 rounded-lg border border-[#e5e7eb] bg-white px-3 text-[13px] shadow-none">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All categories</SelectItem>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {humanize(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as AssetStatus | 'ALL')}
              >
                <SelectTrigger className="h-9 w-auto min-w-32.5 rounded-lg border border-[#e5e7eb] bg-white px-3 text-[13px] shadow-none">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  {assetStatusOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {humanize(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <AssetRegisterTab
            assets={filteredAssets}
            isLoading={registerQuery.isLoading}
            onOpenDetail={openDetail}
            onEdit={() => {}}
            onProvide={seedProvideForm}
            onMaintenance={seedMaintenanceForm}
            onDecommission={handleDecommissionAsset}
          />
        </TabsContent>

        <TabsContent value="categories" className="mt-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="w-full sm:max-w-xs flex items-center gap-2 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2">
              <Search className="size-4 shrink-0 text-[#9ca3af]" />
              <Input
                value={categorySearch}
                onChange={(event) => setCategorySearch(event.target.value)}
                placeholder="Search categories..."
                className="h-auto border-0 bg-transparent px-0 py-0 text-[13px] shadow-none focus-visible:ring-0 placeholder:text-[#9ca3af]"
              />
            </div>
            {canManageAssets && (
              <Button
                onClick={() => { setSettingsTab('create'); setSettingsOpen(true); }}
                className="h-9 shrink-0 rounded-lg px-4 text-[13px] font-medium text-white shadow-sm"
                style={{ backgroundColor: ACTION_GREEN }}
              >
                <Plus className="mr-1.5 size-4" />
                Create Category
              </Button>
            )}
          </div>
          <CategoryTab
            categories={categories}
            categorySearch={categorySearch}
            isLoading={categoriesQuery.isLoading}
            canManageAssets={canManageAssets}
            onAddField={handleAddField}
            onEditCategory={(id, name) => handleEditCategory(id, { name })}
            onDeleteCategory={handleDeleteCategory}
          />
        </TabsContent>

        <TabsContent value="provide" className="mt-0">
          <IssueAssetTab
            members={members}
            availableGroups={availableGroups}
            canManageAssets={canManageAssets}
            memberId={memberId}
            onIssue={handleIssueGroupAsset}
            isGroupsLoading={availableGroupsQuery.isLoading}
          />
        </TabsContent>

        <TabsContent value="reports" className="mt-0">
          <ReportsTab
            orgSlug={orgSlug}
            memberId={memberId}
            members={members}
          />
        </TabsContent>
      </Tabs>

      <AssetFormDialog
        open={assetFormOpen}
        onOpenChange={setAssetFormOpen}
        isSaving={mutations.bulkCreateAssets.isPending}
        onSaveBulk={handleSaveBulkAsset}
        categories={categories}
      />

      <AssetDetailDialog
        open={!!detailAssetId}
        onOpenChange={(open) => !open && setDetailAssetId(null)}
        isLoading={detailQuery.isLoading}
        asset={selectedAsset ?? undefined}
        canManageAssets={canManageAssets}
        onEdit={() => {}}
        onArchive={(assetId) => void handleArchiveAsset(assetId)}
        onProvide={seedProvideForm}
        onReturn={() => router.push(`/${orgSlug}/assets`)}
        onMaintenance={seedMaintenanceForm}
      />

      <AssetSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        defaultTab={settingsTab}
        categories={categories}
        onCreateCategory={(data) => mutations.createCategory.mutateAsync(data)}
        onCreateField={(categoryId, data) =>
          mutations.createCategoryField.mutateAsync({ categoryId, data: data as any })
        }
        onUpdateCategory={(categoryId, data) =>
          mutations.updateCategory.mutateAsync({ categoryId, data })
        }
        onDeleteCategory={(categoryId) =>
          mutations.deleteCategory.mutateAsync(categoryId)
        }
      />
    </div>
  );
}
