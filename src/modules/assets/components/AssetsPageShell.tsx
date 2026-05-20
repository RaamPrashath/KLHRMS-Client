'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { EmployeeAssetGallery } from '@/modules/assets/components/EmployeeAssetGallery';
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
  assetMaintenanceTypeOptions,
  assetStatusOptions,
  type AssetCategoryFieldCreateInput,
  type AssetIssueInput,
  type BulkAssetCreateInput as BulkAssetCreateSchemaInput,
} from '@/modules/assets/schema/assetSchemas';
import type {
  AssetCategory,
  AssetDetail,
  BulkAssetCreateInput as BulkAssetCreateMutationInput,
  AssetStatus,
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

  function seedProvideForm() {
    setActiveTab('provide');
    setSearch('');
  }

  function seedMaintenanceForm() {
    router.push(`/${orgSlug}/maintenance`);
  }

  async function handleSaveBulkAsset(data: BulkAssetCreateSchemaInput) {
    try {
      const payload: BulkAssetCreateMutationInput = {
        assetCode: data.assetCode,
        name: data.name,
        categoryDefinitionId: data.categoryDefinitionId ?? null,
        condition: data.condition,
        location: data.location ?? '',
        serialNumbers: data.serialNumbers,
        customFields: data.customFields.map((field) => ({
          fieldDefinitionId: field.fieldDefinitionId,
          value: field.value ?? null,
        })),
      };
      await mutations.bulkCreateAssets.mutateAsync(payload);
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

  async function handleIssueGroupAsset(data: AssetIssueInput) {
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
    const maintenanceType = assetMaintenanceTypeOptions.find((option) => option === data.maintenanceType);
    if (!maintenanceType) {
      throw new Error(`Unsupported maintenance type: ${data.maintenanceType}`);
    }

    await mutations.createMaintenance.mutateAsync({
      assetId: data.assetId,
      maintenanceType,
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
        <div className="mb-2 border-b border-[#e5e7eb] pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-4xl font-semibold tracking-tight text-[#111827]">Assets</h1>
              <p className="mt-1 text-[14px] text-[#6b7280]">View equipment and devices assigned to you</p>
            </div>

            <Button
              onClick={() => setRaiseTicketOpen(true)}
              className="h-8 shrink-0 rounded-lg px-4 text-[13px] font-medium text-white shadow-sm self-start sm:self-auto"
              style={{ backgroundColor: '#b3261e' }}
            >
              <Hammer className="mr-1.5 size-4" />
              Report Issue
            </Button>
          </div>

          <div className="mt-6 overflow-x-auto pb-1">
            <div className="inline-flex min-w-fit items-center rounded-xl border border-black/4 bg-neutral-50 p-1">
              <button
                type="button"
                onClick={() => setEmployeeTab('assets')}
                className={cn(
                  'inline-flex h-8 items-center rounded-lg px-4 text-[13px] font-medium transition-all duration-200 ease-out',
                  employeeTab === 'assets'
                    ? 'bg-white text-[#00874A] shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                    : 'text-neutral-500 hover:text-neutral-900',
                )}
              >
                My Assets
              </button>
              <button
                type="button"
                onClick={() => setEmployeeTab('tickets')}
                className={cn(
                  'inline-flex h-8 items-center rounded-lg px-4 text-[13px] font-medium transition-all duration-200 ease-out',
                  employeeTab === 'tickets'
                    ? 'bg-white text-[#00874A] shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                    : 'text-neutral-500 hover:text-neutral-900',
                )}
              >
                My Tickets
              </button>
            </div>
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
            <EmployeeAssetGallery assets={filteredAssets} isLoading={registerQuery.isLoading} />
          </>
        ) : (
          <div className="rounded-xl border border-[#e5e7eb] bg-white p-5">
            <MyTicketsTab orgSlug={orgSlug} memberId={memberId} />
          </div>
        )}

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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-6">
        <div className="mb-2 border-b border-[#e5e7eb] pb-4">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-[#111827]">Asset Management</h1>
            <p className="mt-1 text-[14px] text-[#6b7280]">
              Manage your company equipment, track assignments, and log maintenance
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="overflow-x-auto pb-1">
              <div className="inline-flex min-w-fit items-center rounded-xl border border-black/4 bg-neutral-50 p-1">
                {tabOptions.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.value;
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setActiveTab(tab.value)}
                      className={cn(
                        'inline-flex h-8 items-center gap-1.5 rounded-lg px-4 text-[13px] font-medium transition-all duration-200 ease-out',
                        isActive
                          ? 'bg-white text-[#00874A] shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                          : 'text-neutral-500 hover:text-neutral-900',
                      )}
                    >
                      <Icon className="size-3.5 shrink-0" />
                      <span className="whitespace-nowrap">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Button
              onClick={openCreateAssetDialog}
              className="h-8 shrink-0 bg-primary px-4 text-[13px] font-medium text-white shadow-[0_12px_30px_rgba(0,135,74,0.20)] hover:bg-primary-hover transition-all duration-200 ease-out hover:scale-[1.02] active:scale-[0.98] self-start sm:self-auto"
            >
              <PackagePlus className="mr-1.5 size-3.5" />
              Add New Asset
            </Button>
          </div>
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
          mutations.createCategoryField.mutateAsync({ categoryId, data })
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
