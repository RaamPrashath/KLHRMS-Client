'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import {
  Download,
  FileClock,
  Hammer,
  LaptopMinimal,
  PackageCheck,
  PackageOpen,
  PackagePlus,
  RotateCcw,
  Search,
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { AssetDetailDialog } from '@/modules/assets/components/AssetDetailDialog';
import { AssetFormDialog } from '@/modules/assets/components/AssetFormDialog';
import {
  ACTION_GREEN,
  ASSET_TAB_OPTIONS,
  REPORT_CARDS,
  createMaintenanceForm,
  createMaintenanceUpdateForm,
  createProvideForm,
  createReturnForm,
  defaultAssetForm,
} from '@/modules/assets/components/assetsPageConfig';
import {
  ActionButton,
  AssetRowSkeleton,
  DateField,
  EmptyState,
  FieldSelect,
  FormGrid,
  MetricCard,
  MiniAssetCard,
  NumberField,
  SectionCard,
  SidePanel,
  TextAreaField,
} from '@/modules/assets/components/assetsPagePrimitives';
import {
  base64ToBlob,
  conditionBadge,
  deriveReturnNextStatus,
  getRowActions,
  humanize,
  readError,
  reportDescriptions,
  statusBadge,
} from '@/modules/assets/components/assetsPageUtils';
import { MaintenanceUpdateDialog } from '@/modules/assets/components/MaintenanceUpdateDialog';
import { exportAssetsPdfAction } from '@/modules/assets/api/assetServerActions';
import { useAssetMutations } from '@/modules/assets/hooks/useAssetMutations';
import {
  useAssetDetailQuery,
  useAssetMetaQuery,
  useAssetsQuery,
} from '@/modules/assets/hooks/useAssetsQuery';
import type {
  AssetInput,
  AssetMaintenanceCreateInput,
  AssetMaintenanceUpdateInput,
  AssetProvideInput,
  AssetReturnInput,
} from '@/modules/assets/schema/assetSchemas';
import {
  assetCategoryOptions,
  assetConditionOptions,
  assetMaintenanceTypeOptions,
  assetStatusOptions,
} from '@/modules/assets/schema/assetSchemas';
import type {
  AssetCategory,
  AssetCondition,
  AssetDetail,
  AssetFiltersState,
  AssetMaintenanceSummary,
  AssetReportType,
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
  const [activeTab, setActiveTab] = useState('register');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AssetStatus | 'ALL'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<AssetCategory | 'ALL'>('ALL');
  const [detailAssetId, setDetailAssetId] = useState<string | null>(null);
  const [detailSnapshot, setDetailSnapshot] = useState<AssetDetail | null>(null);
  const [assetFormOpen, setAssetFormOpen] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [assetForm, setAssetForm] = useState<AssetInput>(defaultAssetForm);
  const [provideForm, setProvideForm] = useState<AssetProvideInput>(() => createProvideForm(memberId));
  const [returnForm, setReturnForm] = useState<AssetReturnInput>(() => createReturnForm(memberId));
  const [maintenanceForm, setMaintenanceForm] = useState<AssetMaintenanceCreateInput>(() =>
    createMaintenanceForm(),
  );
  const [maintenanceUpdateOpen, setMaintenanceUpdateOpen] = useState(false);
  const [maintenanceUpdateAssetId, setMaintenanceUpdateAssetId] = useState<string | null>(null);
  const [maintenanceUpdateForm, setMaintenanceUpdateForm] = useState<AssetMaintenanceUpdateInput | null>(null);

  const deferredSearch = useDeferredValue(search);

  const registerFilters = useMemo<AssetFiltersState>(
    () => ({
      search: deferredSearch || undefined,
      category: categoryFilter === 'ALL' ? undefined : categoryFilter,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      page: 1,
      pageSize: 50,
    }),
    [categoryFilter, deferredSearch, statusFilter],
  );

  const registerQuery = useAssetsQuery(orgSlug, memberId, registerFilters);
  const allAssetsQuery = useAssetsQuery(orgSlug, memberId, {
    page: 1,
    pageSize: 100,
  });
  const availableAssetsQuery = useAssetsQuery(orgSlug, memberId, {
    status: 'AVAILABLE',
    page: 1,
    pageSize: 100,
  });
  const providedAssetsQuery = useAssetsQuery(orgSlug, memberId, {
    status: 'PROVIDED',
    currentHolderMemberId: returnForm.memberId || undefined,
    page: 1,
    pageSize: 100,
  });
  const maintenanceAssetsQuery = useAssetsQuery(orgSlug, memberId, {
    status: 'UNDER_MAINTENANCE',
    page: 1,
    pageSize: 100,
  });
  const metaQuery = useAssetMetaQuery(orgSlug, memberId);
  const detailQuery = useAssetDetailQuery(orgSlug, memberId, detailAssetId);
  const mutations = useAssetMutations(orgSlug, memberId);

  const assets = useMemo(() => registerQuery.data?.items ?? [], [registerQuery.data?.items]);
  const allAssets = useMemo(() => allAssetsQuery.data?.items ?? [], [allAssetsQuery.data?.items]);
  const availableAssets = useMemo(
    () => availableAssetsQuery.data?.items ?? [],
    [availableAssetsQuery.data?.items],
  );
  const providedAssets = useMemo(
    () => providedAssetsQuery.data?.items ?? [],
    [providedAssetsQuery.data?.items],
  );
  const maintenanceAssets = useMemo(
    () => maintenanceAssetsQuery.data?.items ?? [],
    [maintenanceAssetsQuery.data?.items],
  );
  const members = useMemo(() => metaQuery.data?.members ?? [], [metaQuery.data?.members]);
  const selectedAsset = detailQuery.data ?? detailSnapshot;

  const stats = useMemo(
    () => ({
      total: assets.length,
      available: assets.filter((asset) => asset.status === 'AVAILABLE').length,
      provided: assets.filter((asset) => asset.status === 'PROVIDED').length,
      maintenance: assets.filter((asset) => asset.status === 'UNDER_MAINTENANCE').length,
      damaged: assets.filter((asset) => asset.status === 'DAMAGED').length,
    }),
    [assets],
  );

  function openCreateAssetDialog() {
    setEditingAssetId(null);
    setAssetForm(defaultAssetForm);
    setAssetFormOpen(true);
  }

  function openEditAssetDialog(asset: AssetSummary | AssetDetail) {
    setEditingAssetId(asset.id);
    setAssetForm({
      assetCode: asset.assetCode,
      name: asset.name,
      category: asset.category,
      serialNumber: asset.serialNumber ?? '',
      model: asset.model ?? '',
      purchaseDate: asset.purchaseDate ?? '',
      purchasePrice: asset.purchasePrice,
      warrantyExpiryDate: asset.warrantyExpiryDate ?? '',
      condition: asset.condition,
      status: asset.status,
      location: asset.location ?? '',
      quantity: asset.quantity ?? 1,
    });
    setAssetFormOpen(true);
  }

  function openDetail(assetId: string) {
    setDetailAssetId(assetId);
    setDetailSnapshot(null);
  }

  function seedProvideForm(asset: AssetSummary) {
    setActiveTab('provide');
    setProvideForm({
      ...createProvideForm(memberId),
      assetId: asset.id,
      conditionWhileProviding: asset.condition,
    });
  }

  function seedReturnForm(asset: AssetSummary) {
    setActiveTab('returns');
    setReturnForm({
      ...createReturnForm(memberId),
      memberId: asset.currentHolderMemberId ?? '',
      assetId: asset.id,
      returnedCondition: asset.condition,
      nextStatus: deriveReturnNextStatus(asset.condition),
    });
  }

  function seedMaintenanceForm(asset: AssetSummary) {
    setActiveTab('maintenance');
    setMaintenanceForm({
      ...createMaintenanceForm(),
      assetId: asset.id,
      conditionBeforeMaintenance: asset.condition,
    });
  }

  function openMaintenanceCompletion(assetId: string, log: AssetMaintenanceSummary) {
    setMaintenanceUpdateAssetId(assetId);
    setMaintenanceUpdateForm(createMaintenanceUpdateForm(log));
    setMaintenanceUpdateOpen(true);
  }

  async function handleSaveAsset() {
    try {
      if (editingAssetId) {
        const updated = await mutations.updateAsset.mutateAsync({
          assetId: editingAssetId,
          data: assetForm,
        });
        setDetailAssetId(updated.id);
        setDetailSnapshot(updated);
        setAssetFormOpen(false);
        toast.success('Asset register updated');
        return;
      }

      const created = await mutations.createAsset.mutateAsync(assetForm);
      setDetailAssetId(created.id);
      setDetailSnapshot(created);
      setAssetFormOpen(false);
      setAssetForm(defaultAssetForm);
      toast.success('Asset added to register');
    } catch (error) {
      toast.error(readError(error, 'Failed to save asset'));
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

  async function handleProvideAsset() {
    try {
      const updated = await mutations.provideAsset.mutateAsync(provideForm);
      setDetailAssetId(updated.id);
      setDetailSnapshot(updated);
      setProvideForm(createProvideForm(memberId));
      toast.success('Asset provided successfully');
    } catch (error) {
      toast.error(readError(error, 'Failed to provide asset'));
    }
  }

  async function handleReturnAsset() {
    try {
      const updated = await mutations.returnAsset.mutateAsync(returnForm);
      setDetailAssetId(updated.id);
      setDetailSnapshot(updated);
      setReturnForm(createReturnForm(memberId));
      toast.success('Return recorded successfully');
    } catch (error) {
      toast.error(readError(error, 'Failed to return asset'));
    }
  }

  async function handleCreateMaintenance() {
    try {
      const updated = await mutations.createMaintenance.mutateAsync(maintenanceForm);
      setDetailAssetId(updated.id);
      setDetailSnapshot(updated);
      setMaintenanceForm(createMaintenanceForm());
      toast.success('Maintenance log created');
    } catch (error) {
      toast.error(readError(error, 'Failed to create maintenance log'));
    }
  }

  async function handleCompleteMaintenance() {
    if (!maintenanceUpdateAssetId || !maintenanceUpdateForm) return;
    try {
      const updated = await mutations.updateMaintenance.mutateAsync({
        assetId: maintenanceUpdateAssetId,
        data: maintenanceUpdateForm,
      });
      setDetailAssetId(updated.id);
      setDetailSnapshot(updated);
      setMaintenanceUpdateOpen(false);
      setMaintenanceUpdateAssetId(null);
      setMaintenanceUpdateForm(null);
      toast.success('Maintenance updated');
    } catch (error) {
      toast.error(readError(error, 'Failed to update maintenance'));
    }
  }

  async function handleExportReport(reportType: AssetReportType) {
    try {
      const pdf = await exportAssetsPdfAction({
        orgSlug,
        memberId,
        reportType,
      });
      const blob = base64ToBlob(pdf.base64, 'application/pdf');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = pdf.fileName;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Report downloaded as PDF');
    } catch (error) {
      toast.error(readError(error, 'Failed to export report'));
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b7280]">
            Operations
          </p>
          <h1 className="mt-2 text-[40px] font-semibold tracking-[-0.03em] text-[#111827]">
            Asset Management
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-6 text-[#6b7280]">
            Manage the company asset register, provide assets to employees, record returns,
            track maintenance, and export operational reports from one place.
          </p>
        </div>

        {canManageAssets && (
          <Button
            onClick={openCreateAssetDialog}
            className="h-11 rounded-full px-5 text-[15px] font-medium text-white"
            style={{ backgroundColor: ACTION_GREEN }}
          >
            <PackagePlus className="mr-2 size-4" />
            Add Asset
          </Button>
        )}
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="In register" value={stats.total} tone="default" icon={<PackageOpen className="size-4" />} />
        <MetricCard label="Available" value={stats.available} tone="green" icon={<PackageCheck className="size-4" />} />
        <MetricCard label="Provided" value={stats.provided} tone="blue" icon={<LaptopMinimal className="size-4" />} />
        <MetricCard label="Maintenance" value={stats.maintenance} tone="amber" icon={<Hammer className="size-4" />} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-5">
        {/* Animated pill tab bar — matches PlanClient pattern */}
        <div className="w-full overflow-x-auto">
          <div className="inline-flex min-w-fit rounded-2xl border border-[#e5e7eb] bg-[#f5f5f7] p-1">
            {ASSET_TAB_OPTIONS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveTab(tab.value)}
                  className={cn(
                    'relative flex min-w-37 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-[13px] font-semibold transition-colors duration-200',
                    isActive
                      ? 'text-white'
                      : 'text-[#6b7280] hover:bg-white hover:text-[#1d1d1f]',
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="asset-tab-pill"
                      className="absolute inset-0 rounded-2xl bg-[#1d1d1f]"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <TabsContent value="register" className="mt-0 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-1 data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0 duration-200">
          <SectionCard
            title="Asset Register"
            description="Create, review, edit, and archive company-owned assets. Assets must exist here before they can be provided to employees."
          >
            <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-1 items-center gap-3 rounded-[18px] border border-[#e5e7eb] bg-[#fbfcfb] px-4 py-3">
                <Search className="size-4 text-[#6b7280]" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by asset name, code, serial number, model, or location"
                  className="h-auto border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Select
                  value={categoryFilter}
                  onValueChange={(value) => setCategoryFilter(value as AssetCategory | 'ALL')}
                >
                  <SelectTrigger className="h-11 min-w-47.5 rounded-full border-[#e5e7eb] shadow-none">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All categories</SelectItem>
                    {assetCategoryOptions.map((option) => (
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
                  <SelectTrigger className="h-11 min-w-52.5 rounded-full border-[#e5e7eb] shadow-none">
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

            <div className="overflow-hidden rounded-[18px] border border-[#e5e7eb]">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#e5e7eb] bg-[#f7f8fa] hover:bg-[#f7f8fa]">
                    <TableHead className="h-12 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b7280]">
                      Asset
                    </TableHead>
                    <TableHead className="h-12 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b7280]">
                      Category
                    </TableHead>
                    <TableHead className="h-12 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b7280]">
                      Holder
                    </TableHead>
                    <TableHead className="h-12 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b7280]">
                      Condition
                    </TableHead>
                    <TableHead className="h-12 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b7280]">
                      Status
                    </TableHead>
                    <TableHead className="h-12 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b7280]">
                      Location
                    </TableHead>
                    <TableHead className="h-12 px-4 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b7280]">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {registerQuery.isLoading ? (
                    Array.from({ length: 6 }).map((_, index) => (
                      <AssetRowSkeleton key={index} colSpan={7} />
                    ))
                  ) : assets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="px-4 py-16 text-center">
                        <PackageOpen className="mx-auto size-8 text-[#9ca3af]" />
                        <p className="mt-3 text-[15px] font-medium text-[#111827]">
                          No assets match this register view
                        </p>
                        <p className="mt-1 text-[14px] text-[#6b7280]">
                          Adjust the filters or add a new asset to the register.
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    assets.map((asset) => (
                      <TableRow key={asset.id} className="border-[#e5e7eb] align-top">
                        <TableCell className="px-4 py-4">
                          <div className="flex items-start gap-3">
                            <div className="flex size-10 items-center justify-center rounded-2xl border border-[#e5e7eb] bg-[#fafafa] text-[#111827]">
                              <LaptopMinimal className="size-4" />
                            </div>
                            <div>
                              <p className="text-[15px] font-medium text-[#111827]">{asset.name}</p>
                              <p className="mt-0.5 text-[13px] text-[#6b7280]">
                                {asset.assetCode}
                                {asset.serialNumber ? ` · ${asset.serialNumber}` : ''}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-4 text-[14px] text-[#111827]">
                          {humanize(asset.category)}
                        </TableCell>
                        <TableCell className="px-4 py-4 text-[14px] text-[#111827]">
                          {asset.currentHolderName || 'In register'}
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          <Badge
                            className={cn(
                              'rounded-full px-3 py-1 text-[11px] font-medium',
                              conditionBadge(asset.condition),
                            )}
                          >
                            {humanize(asset.condition)}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          <Badge
                            className={cn(
                              'rounded-full px-3 py-1 text-[11px] font-medium',
                              statusBadge(asset.status),
                            )}
                          >
                            {humanize(asset.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-4 text-[14px] text-[#6b7280]">
                          {asset.location || 'Not set'}
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          <div className="flex flex-wrap justify-end gap-2">
                            {getRowActions(asset.status).map((action) => (
                              <ActionButton
                                key={action}
                                label={action}
                                onClick={() => {
                                  if (action === 'View') openDetail(asset.id);
                                  if (action === 'Edit') openEditAssetDialog(asset);
                                  if (action === 'Provide Asset') seedProvideForm(asset);
                                  if (action === 'Return Asset') seedReturnForm(asset);
                                  if (action === 'Log Maintenance') seedMaintenanceForm(asset);
                                  if (action === 'Complete Maintenance') openDetail(asset.id);
                                  if (action === 'Retire') {
                                    void mutations.updateAsset.mutateAsync({
                                      assetId: asset.id,
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
                                    }).then((updated) => {
                                      setDetailSnapshot(updated);
                                      toast.success('Asset retired');
                                    }).catch((error) => {
                                      toast.error(readError(error, 'Failed to retire asset'));
                                    });
                                  }
                                }}
                              />
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="provide" className="mt-0 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-1 data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0 duration-200">
          <SectionCard
            title="Provide Asset"
            description="Provide an existing available asset to a new or existing employee. This creates a permanent provide record and updates the asset status to Provided."
          >
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <FormGrid>
                <Select
                  value={provideForm.memberId || undefined}
                  onValueChange={(value) => setProvideForm({ ...provideForm, memberId: value })}
                >
                  <FieldSelect label="Select Employee">
                    <SelectValue placeholder="Select employee" />
                  </FieldSelect>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={provideForm.assetId || undefined}
                  onValueChange={(value) => {
                    const asset = availableAssets.find((item) => item.id === value);
                    setProvideForm({
                      ...provideForm,
                      assetId: value,
                      conditionWhileProviding: asset?.condition ?? provideForm.conditionWhileProviding,
                    });
                  }}
                >
                  <FieldSelect label="Select Available Asset">
                    <SelectValue placeholder="Select asset" />
                  </FieldSelect>
                  <SelectContent>
                    {availableAssets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.name} · {asset.assetCode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <DateField
                  label="Provided Date"
                  value={provideForm.providedDate || ''}
                  onChange={(value) => setProvideForm({ ...provideForm, providedDate: value })}
                />

                <Select
                  value={provideForm.conditionWhileProviding}
                  onValueChange={(value) =>
                    setProvideForm({
                      ...provideForm,
                      conditionWhileProviding: value as AssetCondition,
                    })
                  }
                >
                  <FieldSelect label="Condition While Providing">
                    <SelectValue />
                  </FieldSelect>
                  <SelectContent>
                    {assetConditionOptions.map((condition) => (
                      <SelectItem key={condition} value={condition}>
                        {humanize(condition)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={provideForm.providedByMemberId || undefined}
                  onValueChange={(value) => setProvideForm({ ...provideForm, providedByMemberId: value })}
                >
                  <FieldSelect label="Provided By">
                    <SelectValue placeholder="Select employee" />
                  </FieldSelect>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <TextAreaField
                  label="Notes"
                  value={provideForm.notes || ''}
                  onChange={(value) => setProvideForm({ ...provideForm, notes: value })}
                />
              </FormGrid>

              <SidePanel
                title="Available now"
                description="Only assets in Available status can be provided."
                count={availableAssets.length}
              >
                {availableAssets.slice(0, 6).map((asset) => (
                  <MiniAssetCard key={asset.id} asset={asset} onChoose={() => seedProvideForm(asset)} />
                ))}
              </SidePanel>
            </div>

            {canManageAssets && (
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={() => void handleProvideAsset()}
                  disabled={mutations.provideAsset.isPending}
                  className="h-11 rounded-full px-6 text-white"
                  style={{ backgroundColor: ACTION_GREEN }}
                >
                  <PackagePlus className="mr-2 size-4" />
                  {mutations.provideAsset.isPending ? 'Saving...' : 'Provide Asset'}
                </Button>
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="returns" className="mt-0 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-1 data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0 duration-200">
          <SectionCard
            title="Returns"
            description="Record returned assets with condition assessment. Every return stays in the permanent asset history."
          >
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <FormGrid>
                <Select
                  value={returnForm.memberId || undefined}
                  onValueChange={(value) =>
                    setReturnForm({
                      ...createReturnForm(memberId),
                      memberId: value,
                    })
                  }
                >
                  <FieldSelect label="Select Employee">
                    <SelectValue placeholder="Select employee" />
                  </FieldSelect>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={returnForm.assetId || undefined}
                  onValueChange={(value) => {
                    const asset = providedAssets.find((item) => item.id === value);
                    const condition = asset?.condition ?? returnForm.returnedCondition;
                    setReturnForm({
                      ...returnForm,
                      assetId: value,
                      returnedCondition: condition,
                      nextStatus: deriveReturnNextStatus(condition),
                    });
                  }}
                >
                  <FieldSelect label="Select Asset">
                    <SelectValue placeholder="Select provided asset" />
                  </FieldSelect>
                  <SelectContent>
                    {providedAssets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.name} · {asset.assetCode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <DateField
                  label="Return Date"
                  value={returnForm.returnDate || ''}
                  onChange={(value) => setReturnForm({ ...returnForm, returnDate: value })}
                />

                <Select
                  value={returnForm.returnedCondition}
                  onValueChange={(value) => {
                    const condition = value as AssetCondition;
                    setReturnForm({
                      ...returnForm,
                      returnedCondition: condition,
                      nextStatus: deriveReturnNextStatus(condition),
                    });
                  }}
                >
                  <FieldSelect label="Returned Condition">
                    <SelectValue />
                  </FieldSelect>
                  <SelectContent>
                    {assetConditionOptions.map((condition) => (
                      <SelectItem key={condition} value={condition}>
                        {humanize(condition)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={returnForm.nextStatus || undefined}
                  onValueChange={(value) =>
                    setReturnForm({
                      ...returnForm,
                      nextStatus: value as AssetReturnInput['nextStatus'],
                    })
                  }
                >
                  <FieldSelect label="Next Status">
                    <SelectValue />
                  </FieldSelect>
                  <SelectContent>
                    <SelectItem value="AVAILABLE">Available</SelectItem>
                    <SelectItem value="UNDER_MAINTENANCE">Under Maintenance</SelectItem>
                    <SelectItem value="DAMAGED">Damaged</SelectItem>
                    <SelectItem value="RETIRED">Retired</SelectItem>
                    <SelectItem value="DISPOSED">Disposed</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={returnForm.receivedByMemberId || undefined}
                  onValueChange={(value) => setReturnForm({ ...returnForm, receivedByMemberId: value })}
                >
                  <FieldSelect label="Received By">
                    <SelectValue placeholder="Select employee" />
                  </FieldSelect>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <TextAreaField
                  label="Return Notes"
                  value={returnForm.returnNotes || ''}
                  onChange={(value) => setReturnForm({ ...returnForm, returnNotes: value })}
                />
              </FormGrid>

              <SidePanel
                title="Currently provided"
                description="Select an employee to narrow the list to assets currently with them."
                count={providedAssets.length}
              >
                {providedAssets.slice(0, 6).map((asset) => (
                  <MiniAssetCard key={asset.id} asset={asset} onChoose={() => seedReturnForm(asset)} />
                ))}
              </SidePanel>
            </div>

            {canManageAssets && (
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={() => void handleReturnAsset()}
                  disabled={mutations.returnAsset.isPending}
                  className="h-11 rounded-full px-6 text-white"
                  style={{ backgroundColor: ACTION_GREEN }}
                >
                  <RotateCcw className="mr-2 size-4" />
                  {mutations.returnAsset.isPending ? 'Saving...' : 'Return Asset'}
                </Button>
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="maintenance" className="mt-0 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-1 data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0 duration-200">
          <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <SectionCard
              title="Log Maintenance"
              description="Create permanent maintenance records for repairs, service, inspections, replacements, upgrades, warranty claims, and damage handling."
            >
              <FormGrid>
                <Select
                  value={maintenanceForm.assetId || undefined}
                  onValueChange={(value) => {
                    const asset = assets.find((item) => item.id === value) ?? availableAssets.find((item) => item.id === value) ?? maintenanceAssets.find((item) => item.id === value);
                    setMaintenanceForm({
                      ...maintenanceForm,
                      assetId: value,
                      conditionBeforeMaintenance: asset?.condition ?? maintenanceForm.conditionBeforeMaintenance,
                    });
                  }}
                >
                  <FieldSelect label="Asset">
                    <SelectValue placeholder="Select asset" />
                  </FieldSelect>
                  <SelectContent>
                    {allAssets
                      .slice(0, 100)
                      .map((asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.name} · {asset.assetCode}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                <Select
                  value={maintenanceForm.maintenanceType}
                  onValueChange={(value) =>
                    setMaintenanceForm({
                      ...maintenanceForm,
                      maintenanceType: value as AssetMaintenanceCreateInput['maintenanceType'],
                    })
                  }
                >
                  <FieldSelect label="Maintenance Type">
                    <SelectValue />
                  </FieldSelect>
                  <SelectContent>
                    {assetMaintenanceTypeOptions.map((type) => (
                      <SelectItem key={type} value={type}>
                        {humanize(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <TextAreaField
                  label="Issue Description"
                  value={maintenanceForm.issueDescription}
                  onChange={(value) => setMaintenanceForm({ ...maintenanceForm, issueDescription: value })}
                />

                <DateField
                  label="Service Date"
                  value={maintenanceForm.serviceDate}
                  onChange={(value) => setMaintenanceForm({ ...maintenanceForm, serviceDate: value })}
                />

                <DateField
                  label="Expected Completion Date"
                  value={maintenanceForm.expectedCompletionDate || ''}
                  onChange={(value) =>
                    setMaintenanceForm({ ...maintenanceForm, expectedCompletionDate: value })
                  }
                />

                <NumberField
                  label="Cost"
                  value={maintenanceForm.cost}
                  onChange={(value) => setMaintenanceForm({ ...maintenanceForm, cost: value })}
                />

                <Select
                  value={maintenanceForm.status}
                  onValueChange={(value) =>
                    setMaintenanceForm({
                      ...maintenanceForm,
                      status: value as AssetMaintenanceCreateInput['status'],
                    })
                  }
                >
                  <FieldSelect label="Status">
                    <SelectValue />
                  </FieldSelect>
                  <SelectContent>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={maintenanceForm.conditionBeforeMaintenance || undefined}
                  onValueChange={(value) =>
                    setMaintenanceForm({
                      ...maintenanceForm,
                      conditionBeforeMaintenance: value as AssetCondition,
                    })
                  }
                >
                  <FieldSelect label="Condition Before Maintenance">
                    <SelectValue />
                  </FieldSelect>
                  <SelectContent>
                    {assetConditionOptions.map((condition) => (
                      <SelectItem key={condition} value={condition}>
                        {humanize(condition)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <TextAreaField
                  label="Notes"
                  value={maintenanceForm.notes || ''}
                  onChange={(value) => setMaintenanceForm({ ...maintenanceForm, notes: value })}
                />
              </FormGrid>

              {canManageAssets && (
                <div className="mt-6 flex justify-end">
                  <Button
                    onClick={() => void handleCreateMaintenance()}
                    disabled={mutations.createMaintenance.isPending}
                    className="h-11 rounded-full px-6 text-white"
                    style={{ backgroundColor: ACTION_GREEN }}
                  >
                    <Hammer className="mr-2 size-4" />
                    {mutations.createMaintenance.isPending ? 'Saving...' : 'Log Maintenance'}
                  </Button>
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Open Maintenance"
              description="Assets under maintenance stay visible here until HR/Admin completes or cancels the maintenance record."
            >
              <div className="space-y-3">
                {maintenanceAssetsQuery.isLoading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-24 rounded-[18px]" />
                  ))
                ) : maintenanceAssets.length === 0 ? (
                  <EmptyState
                    icon={<FileClock className="size-5" />}
                    title="No open maintenance assets"
                    description="Assets moved into maintenance will appear here for completion."
                  />
                ) : (
                  maintenanceAssets.map((asset) => {
                    const openLog = detailSnapshot?.id === asset.id
                      ? detailSnapshot.maintenanceHistory.find(
                          (log) => log.status === 'OPEN' || log.status === 'IN_PROGRESS',
                        )
                      : undefined;

                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => openDetail(asset.id)}
                        className="w-full rounded-[18px] border border-[#e5e7eb] bg-[#fbfcfb] px-4 py-4 text-left transition-colors hover:border-[#cdd5df] hover:bg-white"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[15px] font-medium text-[#111827]">{asset.name}</p>
                            <p className="mt-1 text-[13px] text-[#6b7280]">
                              {asset.assetCode} · {humanize(asset.condition)}
                            </p>
                          </div>
                          <Badge className="rounded-full bg-[#fff7e8] px-3 py-1 text-[11px] font-medium text-[#8a5a00]">
                            Under Maintenance
                          </Badge>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-full border-[#d8dde5] px-4 text-[13px]"
                            onClick={(event) => {
                              event.stopPropagation();
                              openDetail(asset.id);
                            }}
                          >
                            View
                          </Button>
                          <Button
                            type="button"
                            className="rounded-full px-4 text-[13px] text-white"
                            style={{ backgroundColor: ACTION_GREEN }}
                            onClick={(event) => {
                              event.stopPropagation();
                              const activeLog =
                                detailQuery.data?.id === asset.id
                                  ? detailQuery.data.maintenanceHistory.find(
                                      (log) =>
                                        log.status === 'OPEN' || log.status === 'IN_PROGRESS',
                                    )
                                  : openLog;
                              if (!activeLog) {
                                toast.error('Open the asset detail first to load the current maintenance record');
                                return;
                              }
                              openMaintenanceCompletion(asset.id, activeLog);
                            }}
                          >
                            Complete Maintenance
                          </Button>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </SectionCard>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="mt-0 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-1 data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0 duration-200">
          <SectionCard
            title="Reports"
            description="Download the key operational reports as PDF for audits and team reviews."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {REPORT_CARDS.map((reportType) => (
                <div
                  key={reportType}
                  className="rounded-[20px] border border-[#e5e7eb] bg-[#fbfcfb] p-5"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-white text-[#111827] shadow-[inset_0_0_0_1px_#e5e7eb]">
                      <Download className="size-4" />
                    </div>
                    <div>
                      <p className="text-[15px] font-medium text-[#111827]">
                        {humanize(reportType)}
                      </p>
                      <p className="mt-1 text-[13px] leading-5 text-[#6b7280]">
                        {reportDescriptions(reportType)}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="mt-5 w-full rounded-full border-[#d8dde5] text-[14px]"
                    onClick={() => void handleExportReport(reportType)}
                  >
                    <Download className="mr-2 size-4" />
                    Download PDF
                  </Button>
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>

      <AssetFormDialog
        open={assetFormOpen}
        onOpenChange={setAssetFormOpen}
        assetForm={assetForm}
        setAssetForm={setAssetForm}
        isSaving={mutations.createAsset.isPending || mutations.updateAsset.isPending}
        editingAssetId={editingAssetId}
        onSave={() => void handleSaveAsset()}
      />

      <AssetDetailDialog
        open={!!detailAssetId}
        onOpenChange={(open) => !open && setDetailAssetId(null)}
        isLoading={detailQuery.isLoading}
        asset={selectedAsset ?? undefined}
        canManageAssets={canManageAssets}
        onEdit={openEditAssetDialog}
        onArchive={(assetId) => void handleArchiveAsset(assetId)}
        onProvide={seedProvideForm}
        onReturn={seedReturnForm}
        onMaintenance={seedMaintenanceForm}
        onCompleteMaintenance={(assetId, log) => openMaintenanceCompletion(assetId, log)}
      />

      <MaintenanceUpdateDialog
        open={maintenanceUpdateOpen}
        onOpenChange={(open) => {
          if (!open) {
            setMaintenanceUpdateOpen(false);
            setMaintenanceUpdateAssetId(null);
            setMaintenanceUpdateForm(null);
          }
        }}
        form={maintenanceUpdateForm}
        setForm={setMaintenanceUpdateForm}
        isSaving={mutations.updateMaintenance.isPending}
        onSave={() => void handleCompleteMaintenance()}
      />
    </div>
  );
}


