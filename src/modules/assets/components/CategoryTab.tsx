'use client';

import { useMemo, useState, Fragment } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';
import type { ColumnDef } from '@tanstack/react-table';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Edit3,
  LayoutGrid,
  Plus,
  Search,
  Trash2,
  Layers,
  Settings,
  Database,
  Info,
  Laptop,
  X,
  Cpu,
  Smartphone,
  Network,
  Building,
  FolderKey,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ACTION_GREEN } from '@/modules/assets/lib/assetConfig';
import { humanize, readError } from '@/modules/assets/lib/assetUtils';
import {
  categoryFieldTypeOptions,
  type AssetCategoryFieldCreateInput,
} from '@/modules/assets/schema/assetSchemas';
import type {
  AssetCategoryDefinition,
} from '@/modules/assets/types/assetTypes';

const getCategoryIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('laptop') || n.includes('computer') || n.includes('desktop')) return Laptop;
  if (n.includes('server') || n.includes('cloud') || n.includes('host') || n.includes('infrastructure')) return Cpu;
  if (n.includes('phone') || n.includes('mobile') || n.includes('tablet') || n.includes('device')) return Smartphone;
  if (n.includes('network') || n.includes('router') || n.includes('switch') || n.includes('wifi')) return Network;
  if (n.includes('database') || n.includes('storage') || n.includes('drive')) return Database;
  if (n.includes('office') || n.includes('desk') || n.includes('chair') || n.includes('furniture')) return Building;
  if (n.includes('software') || n.includes('license') || n.includes('key')) return FolderKey;
  return Layers;
};

export function CategoryTab({
  categories,
  categorySearch,
  isLoading,
  canManageAssets,
  onAddField,
  onEditCategory,
  onDeleteCategory,
  onCreateCategory,
  onSearchChange,
}: {
  categories: AssetCategoryDefinition[];
  categorySearch: string;
  isLoading: boolean;
  canManageAssets: boolean;
  onAddField: (categoryId: string, data: AssetCategoryFieldCreateInput) => Promise<void>;
  onEditCategory: (categoryId: string, name: string, assetCode?: string | null) => Promise<void>;
  onDeleteCategory: (categoryId: string) => Promise<void>;
  onCreateCategory: () => void;
  onSearchChange: (value: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [catAddFieldTarget, setCatAddFieldTarget] = useState<string | null>(null);
  const [catFieldName, setCatFieldName] = useState('');
  const [catFieldType, setCatFieldType] = useState<AssetCategoryFieldCreateInput['fieldType']>('TEXT');
  const [catFieldRequired, setCatFieldRequired] = useState(false);
  const [catFieldSaving, setCatFieldSaving] = useState(false);
  const [catEditTarget, setCatEditTarget] = useState<string | null>(null);
  const [catEditName, setCatEditName] = useState('');
  const [catEditSaving, setCatEditSaving] = useState(false);
  const [catDeleteTarget, setCatDeleteTarget] = useState<string | null>(null);
  const [catDeleteSaving, setCatDeleteSaving] = useState(false);

  const [rowSelection, setRowSelection] = useState({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [schemaFilter, setSchemaFilter] = useState<'ALL' | 'HAS_FIELDS' | 'EMPTY'>('ALL');

  const filteredCategories = useMemo(() => {
    let result = categories.filter((c) => c.name.toLowerCase().includes(categorySearch.toLowerCase()));
    if (schemaFilter === 'HAS_FIELDS') {
      result = result.filter((c) => (c.fields?.length ?? 0) > 0);
    } else if (schemaFilter === 'EMPTY') {
      result = result.filter((c) => (c.fields?.length ?? 0) === 0);
    }
    return result;
  }, [categories, categorySearch, schemaFilter]);

  const catEditCategory = categories.find((c) => c.id === catEditTarget);
  const catDeleteCategory = categories.find((c) => c.id === catDeleteTarget);

  // Top metric calculations
  const totalCategories = categories.length;
  const activeFields = useMemo(() => {
    return categories.reduce((acc, cat) => acc + (cat.fields?.length || 0), 0);
  }, [categories]);
  const emptySchemas = useMemo(() => {
    return categories.filter((cat) => (cat.fields?.length || 0) === 0).length;
  }, [categories]);

  async function handleAddCategoryField() {
    if (!catAddFieldTarget || !catFieldName.trim()) return;
    setCatFieldSaving(true);
    try {
      await onAddField(catAddFieldTarget, {
        fieldName: catFieldName.trim(),
        fieldType: catFieldType,
        isRequired: catFieldRequired,
        displayOrder: 0,
      });
      setCatFieldName('');
      setCatFieldType('TEXT');
      setCatFieldRequired(false);
      setCatAddFieldTarget(null);
      toast.success('Field added');
    } catch (error) {
      toast.error(readError(error, 'Failed to add field'));
    } finally {
      setCatFieldSaving(false);
    }
  }

  async function handleEditCategory() {
    if (!catEditTarget || !catEditName.trim()) return;
    setCatEditSaving(true);
    try {
      await onEditCategory(catEditTarget, catEditName.trim());
      setCatEditTarget(null);
      toast.success('Category renamed');
    } catch (error) {
      toast.error(readError(error, 'Failed to rename category'));
    } finally {
      setCatEditSaving(false);
    }
  }

  async function handleDeleteCategory() {
    if (!catDeleteTarget) return;
    setCatDeleteSaving(true);
    try {
      await onDeleteCategory(catDeleteTarget);
      setCatDeleteTarget(null);
      toast.success('Category deleted');
    } catch (error) {
      toast.error(readError(error, 'Failed to delete category'));
    } finally {
      setCatDeleteSaving(false);
    }
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  const columns = useMemo<ColumnDef<AssetCategoryDefinition>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Category Name',
        cell: ({ row }) => {
          const cat = row.original;
          const Icon = getCategoryIcon(cat.name);
          return (
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-50/50 dark:bg-slate-900/10 border border-border text-muted-foreground shadow-sm">
                <Icon className="size-4.5" />
              </div>
              <div className="min-w-0">
                <div className="text-[13.5px] font-semibold text-slate-900 dark:text-white leading-snug">
                  {cat.name}
                </div>
                {cat.assetCode ? (
                  <span className="inline-block font-mono text-[10.5px] font-medium text-muted-foreground mt-0.5 tracking-tight uppercase">
                    {cat.assetCode}
                  </span>
                ) : (
                  <span className="inline-block text-[10px] text-muted-foreground/60 italic mt-0.5">
                    No token code
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        id: 'fieldsCapacity',
        header: 'Field Capacity',
        cell: ({ row }) => {
          const fields = row.original.fields || [];
          const count = fields.length;
          
          let toneClass = "text-amber-700 border-amber-100 bg-amber-50/50";
          let label = "Setup required";
          
          if (count > 0) {
            const allRequired = fields.every((f) => f.isRequired);
            if (allRequired) {
              toneClass = "text-emerald-700 border-emerald-100 bg-emerald-50/30";
              label = "100% Required rules";
            } else {
              toneClass = "text-zinc-600 border-zinc-200 bg-zinc-50/80";
              label = "Mixed Validation Rules";
            }
          }
          
          return (
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200">
                {count} {count === 1 ? 'Field' : 'Fields'}
              </span>
              <span className={cn("inline-flex items-center w-fit rounded px-1.5 py-0.5 text-[10.5px] font-medium border", toneClass)}>
                {label}
              </span>
            </div>
          );
        },
      },
      {
        id: 'previews',
        header: 'Quick Field Previews',
        cell: ({ row }) => {
          const fields = row.original.fields || [];
          const sorted = [...fields].sort((a, b) => a.displayOrder - b.displayOrder);
          const limit = 3;
          const display = sorted.slice(0, limit);
          const overflow = sorted.length - limit;
          
          if (sorted.length === 0) {
            return (
              <span className="text-[12px] text-muted-foreground/60 italic font-normal">
                No structural fields assigned yet
              </span>
            );
          }
          
          return (
            <div className="flex flex-wrap items-center gap-1.5 max-w-70">
              {display.map((f) => (
                <span
                  key={f.id}
                  className="inline-flex items-center rounded-md bg-slate-50/50 dark:bg-slate-900/10 border border-border px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-400 shadow-sm"
                >
                  {f.fieldName}
                </span>
              ))}
              {overflow > 0 && (
                <span className="inline-flex items-center rounded-md bg-[#eaf7f1] border border-emerald-100 px-2 py-0.5 text-[11.5px] font-semibold text-primary">
                  +{overflow} more
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: 'expand',
        header: () => null,
        cell: ({ row }) => {
          const isExpanded = expandedId === row.original.id;
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(row.original.id);
              }}
              className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-900/50 transition-colors"
            >
              <ChevronRight
                className={cn('size-4 transition-transform duration-150', isExpanded && 'rotate-90')}
              />
            </button>
          );
        },
        enableSorting: false,
        size: 40,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const cat = row.original;
          if (!canManageAssets) return null;
          return (
            <div className="flex items-center justify-end gap-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              <button
                type="button"
                onClick={() => {
                  setCatAddFieldTarget(cat.id);
                  setCatFieldName('');
                  setCatFieldType('TEXT');
                  setCatFieldRequired(false);
                }}
                title="Add Field"
                className="flex size-7.5 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:border-emerald-250 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:text-primary shadow-sm transition-all duration-150"
              >
                <Plus className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setCatEditTarget(cat.id);
                  setCatEditName(cat.name);
                }}
                title="Settings"
                className="flex size-7.5 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:border-slate-350 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50 hover:text-slate-800 dark:hover:text-slate-200 shadow-sm transition-all duration-150"
              >
                <Settings className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setCatDeleteTarget(cat.id)}
                title="Delete"
                className="flex size-7.5 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground/60 hover:border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-600 shadow-sm transition-all duration-150"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          );
        },
        enableSorting: false,
        size: 130,
      },
    ],
    [canManageAssets, expandedId]
  );

  const table = useReactTable({
    data: filteredCategories,
    columns,
    state: {
      rowSelection,
      pagination,
    },
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const pageCount = table.getPageCount();
  const pageIndex = pagination.pageIndex;
  const pageSize = pagination.pageSize;
  const totalCount = filteredCategories.length;
  
  const startIdx = totalCount === 0 ? 0 : pageIndex * pageSize + 1;
  const endIdx = Math.min((pageIndex + 1) * pageSize, totalCount);

  const paginationPages = useMemo(() => {
    if (pageCount <= 7) {
      return Array.from({ length: pageCount }, (_, i) => i);
    }
    const pages: (number | 'ellipsis')[] = [0];
    if (pageIndex > 2) pages.push('ellipsis');
    const start = Math.max(1, pageIndex - 1);
    const end = Math.min(pageCount - 2, pageIndex + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (pageIndex < pageCount - 3) pages.push('ellipsis');
    pages.push(pageCount - 1);
    return pages;
  }, [pageCount, pageIndex]);

  const renderExpandedRow = (cat: AssetCategoryDefinition) => {
    return (
      <div className="bg-zinc-50/40 px-12 py-5 border-y border-zinc-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[12.5px] font-bold text-zinc-700 uppercase tracking-wide">
              Schema Structure Specification
            </span>
            <span className="px-2 py-0.5 rounded-full bg-zinc-200/50 text-[10.5px] font-semibold text-zinc-600">
              {(cat.fields || []).length} definitions
            </span>
          </div>
          {canManageAssets && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCatAddFieldTarget(cat.id);
                setCatFieldName('');
                setCatFieldType('TEXT');
                setCatFieldRequired(false);
              }}
              className="h-8 rounded-lg text-[11.5px] font-medium border-zinc-200 hover:border-emerald-300 hover:bg-emerald-50 hover:text-primary transition-all"
            >
              <Plus className="mr-1 size-3.5" />
              Add custom field
            </Button>
          )}
        </div>

        {(cat.fields || []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 px-4 border border-dashed border-zinc-200 rounded-xl bg-white">
            <Layers className="size-6 text-zinc-300 mb-1.5" />
            <p className="text-[12.5px] font-medium text-zinc-500">No schema fields defined yet</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Add fields to capture unique metadata properties for this category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(cat.fields || [])
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between rounded-xl bg-white border border-zinc-200/70 p-3 shadow-[0_1px_3px_rgba(0,0,0,0.01)] hover:border-zinc-300 transition-colors"
                >
                  <div className="min-w-0 flex flex-col gap-0.5">
                    <span className="text-[12.5px] font-semibold text-zinc-800 truncate">{f.fieldName}</span>
                    <span className="text-[10px] font-medium text-zinc-400 tracking-wide uppercase">
                      Type: {f.fieldType}
                    </span>
                  </div>
                  {f.isRequired && (
                    <span className="rounded-full bg-rose-50 border border-rose-100 px-2 py-0.5 text-[9.5px] font-bold text-rose-600 uppercase tracking-tight">
                      Required
                    </span>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>

      {/* Main Table Shell */}
      <div className="bg-card rounded-2xl border border-border shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden flex flex-col">
        {/* Search and Create Section inside Card Container */}
        <div className="px-8 py-6 border-b border-border">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search categories..."
                value={categorySearch}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  setPagination({ pageIndex: 0, pageSize: 10 });
                }}
                className="pl-9 bg-muted/30 border border-border focus:bg-background text-sm h-9 rounded-xl focus:ring-1 focus:ring-primary focus-visible:ring-1"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Select
                value={schemaFilter}
                onValueChange={(value) => {
                  setSchemaFilter(value as 'ALL' | 'HAS_FIELDS' | 'EMPTY');
                  setPagination({ pageIndex: 0, pageSize: 10 });
                }}
              >
                <SelectTrigger className="h-9 w-[140px] text-xs border border-border bg-card rounded-xl">
                  <SelectValue placeholder="Schema Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">All</SelectItem>
                  <SelectItem value="HAS_FIELDS" className="text-xs">Has Fields</SelectItem>
                  <SelectItem value="EMPTY" className="text-xs">Empty</SelectItem>
                </SelectContent>
              </Select>
              {schemaFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => {
                    setSchemaFilter('ALL');
                    setPagination({ pageIndex: 0, pageSize: 10 });
                  }}
                  className="flex size-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-muted transition-colors"
                >
                  <X className="size-4" />
                </button>
              )}
              {canManageAssets && (
                <button
                  type="button"
                  onClick={onCreateCategory}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#3862f6] to-[#6366f1] px-4 text-[13px] font-bold text-white shadow-[0_4px_12px_rgba(56,98,246,0.15)] hover:opacity-95 transition-all duration-200 cursor-pointer shrink-0"
                >
                  <Plus className="mr-1.5 size-4" />
                  Create Category
                </button>
              )}
            </div>
          </div>
        </div>
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-muted/60 border border-border" />
            ))}
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
            <div className="mx-auto flex size-10 items-center justify-center rounded-lg bg-muted/40 border border-border text-muted-foreground">
              <LayoutGrid className="size-5" />
            </div>
            <p className="mt-3 text-[15px] font-semibold text-foreground">
              {categorySearch ? 'No categories match your search' : 'No categories yet'}
            </p>
            {!categorySearch && (
              <p className="mt-1 text-[13px] text-muted-foreground">
                Create categories to organize your assets with custom fields.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="border-b border-border bg-slate-50/50 dark:bg-slate-900/10 hover:bg-transparent">
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        style={{ width: header.column.columnDef.size }}
                        className="h-11 px-6 text-[12px] font-bold text-muted-foreground uppercase tracking-wider select-none"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => {
                  const isExpanded = expandedId === row.original.id;
                  return (
                    <Fragment key={row.id}>
                      <TableRow
                        onClick={() => toggleExpand(row.original.id)}
                        className={cn(
                          "group border-b border-border hover:bg-slate-50/30 dark:hover:bg-slate-900/10 transition-colors cursor-pointer select-none",
                          isExpanded && "bg-slate-50/10 dark:bg-slate-900/5"
                        )}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            style={{ width: cell.column.columnDef.size }}
                            onClick={(e) => {
                              const isInteractive = (e.target as HTMLElement).closest('input[type="checkbox"], button, a, [role="button"]');
                              if (isInteractive) {
                                e.stopPropagation();
                              }
                            }}
                            className="px-6 py-3.5 text-slate-705 dark:text-slate-350 align-middle font-medium"
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                      {isExpanded && (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={columns.length} className="p-0">
                            {renderExpandedRow(row.original)}
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination Footer */}
        {filteredCategories.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border bg-slate-50/30 dark:bg-slate-900/10">
            {/* Rows Per View Selection */}
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-muted-foreground whitespace-nowrap">Show</span>
              <Select
                value={pageSize.toString()}
                onValueChange={(val) => {
                  table.setPageSize(Number(val));
                }}
              >
                <SelectTrigger className="h-8 w-[72px] text-xs border border-border bg-card rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['10', '25', '50', '100'].map((size) => (
                    <SelectItem key={size} value={size} className="text-xs">
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-[13px] text-muted-foreground whitespace-nowrap">per page</span>
            </div>

            {/* Step navigations */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="h-7 rounded-lg border-border px-2.5 text-[11px] font-semibold bg-card hover:bg-muted"
              >
                Previous
              </Button>
              {paginationPages.map((p, idx) =>
                p === 'ellipsis' ? (
                  <span key={`e-${idx}`} className="flex size-7 items-center justify-center text-[12px] text-muted-foreground">
                    &hellip;
                  </span>
                ) : (
                  <Button
                    key={p}
                    variant={pageIndex === p ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => table.setPageIndex(p)}
                    className={cn(
                      'h-7 min-w-7 rounded-lg px-1 text-[11px] font-semibold',
                      pageIndex === p
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'border-border text-muted-foreground bg-card hover:bg-muted',
                    )}
                  >
                    {p + 1}
                  </Button>
                )
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="h-7 rounded-lg border-border px-2.5 text-[11px] font-semibold bg-card hover:bg-muted"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add Field Dialog */}
      <Dialog open={!!catAddFieldTarget} onOpenChange={(v) => { if (!v) setCatAddFieldTarget(null); }}>
        <DialogContent className="rounded-3xl border border-zinc-200 bg-white p-0 max-w-md shadow-lg">
          <div className="px-5 py-4 border-b border-zinc-100">
            <DialogTitle className="text-[17px] font-bold text-zinc-900">Add Schema Field</DialogTitle>
          </div>
          <div className="px-5 py-4 space-y-4">
            <div className="grid gap-1.5">
              <Label className="text-[12.5px] font-semibold text-zinc-500">Field Name</Label>
              <Input
                value={catFieldName}
                onChange={(e) => setCatFieldName(e.target.value)}
                placeholder="e.g. Serial Number"
                className="h-10 rounded-xl border-zinc-200 text-[14px] shadow-sm focus:ring-emerald-500"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-[12.5px] font-semibold text-zinc-500">Field Type</Label>
              <Select value={catFieldType} onValueChange={(v) => setCatFieldType(v as AssetCategoryFieldCreateInput['fieldType'])}>
                <SelectTrigger className="h-10 rounded-xl border-zinc-200 text-[14px] shadow-sm focus:ring-emerald-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-zinc-200">
                  {categoryFieldTypeOptions.map((opt) => (
                    <SelectItem key={opt} value={opt} className="rounded-lg text-[13.5px]">{humanize(opt)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2.5 text-[13.5px] font-medium text-zinc-800 cursor-pointer py-1">
              <input
                type="checkbox"
                checked={catFieldRequired}
                onChange={(e) => setCatFieldRequired(e.target.checked)}
                className="size-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
              />
              Required field in schema
            </label>
          </div>
          <div className="flex justify-end gap-2 px-5 py-4 border-t border-zinc-100 bg-zinc-50/20">
            <Button variant="ghost" onClick={() => setCatAddFieldTarget(null)} className="rounded-full px-5 text-[13px] h-9.5">
              Cancel
            </Button>
            <Button
              onClick={() => void handleAddCategoryField()}
              disabled={catFieldSaving || !catFieldName.trim()}
              className="bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-950 text-white rounded-lg shadow-sm border border-zinc-800 transition-colors h-9.5 px-5 text-[13px] font-medium"
            >
              {catFieldSaving ? 'Adding...' : 'Add Field'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={!!catEditTarget} onOpenChange={(v) => { if (!v) setCatEditTarget(null); }}>
        <DialogContent className="rounded-3xl border border-zinc-200 bg-white p-0 max-w-md shadow-lg">
          <div className="px-5 py-4 border-b border-zinc-100">
            <DialogTitle className="text-[17px] font-bold text-zinc-900">Rename Category</DialogTitle>
          </div>
          <div className="px-5 py-4">
            <div className="grid gap-1.5">
              <Label className="text-[12.5px] font-semibold text-zinc-500">Category Name</Label>
              <Input
                value={catEditName}
                onChange={(e) => setCatEditName(e.target.value)}
                placeholder="Category name"
                className="h-10 rounded-xl border-zinc-200 text-[14px] shadow-sm focus:ring-emerald-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 px-5 py-4 border-t border-zinc-100 bg-zinc-50/20">
            <Button variant="ghost" onClick={() => setCatEditTarget(null)} className="rounded-full px-5 text-[13px] h-9.5">
              Cancel
            </Button>
            <Button
              onClick={() => void handleEditCategory()}
              disabled={catEditSaving || !catEditName.trim()}
              className="bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-950 text-white rounded-lg shadow-sm border border-zinc-800 transition-colors h-9.5 px-5 text-[13px] font-medium"
            >
              {catEditSaving ? 'Saving...' : 'Rename'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Category Dialog */}
      <Dialog open={!!catDeleteTarget} onOpenChange={(v) => { if (!v) setCatDeleteTarget(null); }}>
        <DialogContent className="rounded-3xl border border-zinc-200 bg-white p-0 max-w-md shadow-lg">
          <div className="px-5 py-4 border-b border-zinc-100">
            <DialogTitle className="text-[17px] font-bold text-zinc-900">Delete Category</DialogTitle>
            <DialogDescription className="text-[13.5px] text-zinc-500 mt-2 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-zinc-900">{catDeleteCategory?.name}</span>?
              All custom fields under this category will be permanently removed. This action cannot be undone.
            </DialogDescription>
          </div>
          <div className="flex justify-end gap-2 px-5 py-4 bg-zinc-50/20">
            <Button variant="ghost" onClick={() => setCatDeleteTarget(null)} className="rounded-full px-5 text-[13px] h-9.5">
              Cancel
            </Button>
            <Button
              onClick={() => void handleDeleteCategory()}
              disabled={catDeleteSaving}
              className="bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-lg shadow-sm transition-colors h-9.5 px-5 text-[13px] font-medium"
            >
              {catDeleteSaving ? 'Deleting...' : 'Delete Permanently'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
