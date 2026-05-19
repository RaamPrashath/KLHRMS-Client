'use client';

import { useMemo, useState } from 'react';
import {
  ChevronRight,
  Edit3,
  LayoutGrid,
  MoreHorizontal,
  Plus,
  Trash2,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { ACTION_GREEN } from '@/modules/assets/lib/assetConfig';
import { humanize, readError } from '@/modules/assets/lib/assetUtils';
import {
  categoryFieldTypeOptions,
  type AssetCategoryFieldCreateInput,
} from '@/modules/assets/schema/assetSchemas';
import type {
  AssetCategoryDefinition,
} from '@/modules/assets/types/assetTypes';

export function CategoryTab({
  categories,
  categorySearch,
  isLoading,
  canManageAssets,
  onAddField,
  onEditCategory,
  onDeleteCategory,
}: {
  categories: AssetCategoryDefinition[];
  categorySearch: string;
  isLoading: boolean;
  canManageAssets: boolean;
  onAddField: (categoryId: string, data: AssetCategoryFieldCreateInput) => Promise<void>;
  onEditCategory: (categoryId: string, name: string, assetCode?: string | null) => Promise<void>;
  onDeleteCategory: (categoryId: string) => Promise<void>;
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
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.name.toLowerCase().includes(categorySearch.toLowerCase())),
    [categories, categorySearch],
  );

  const catEditCategory = categories.find((c) => c.id === catEditTarget);
  const catDeleteCategory = categories.find((c) => c.id === catDeleteTarget);

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

  return (
    <>
      <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-[#f3f4f6]" />
            ))}
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
            <div className="mx-auto flex size-10 items-center justify-center rounded-lg bg-[#f9fafb]">
              <LayoutGrid className="size-5 text-[#9ca3af]" />
            </div>
            <p className="mt-3 text-[15px] font-medium text-[#111827]">
              {categorySearch ? 'No categories match your search' : 'No categories yet'}
            </p>
            {!categorySearch && (
              <p className="mt-1 text-[13px] text-[#6b7280]">
                Create categories to organize your assets with custom fields.
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#eef0f3]">
            {filteredCategories.map((cat) => {
              const isExpanded = expandedId === cat.id;
              return (
                <div key={cat.id}>
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-[#fafbfc]"
                    onClick={() => toggleExpand(cat.id)}
                  >
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleExpand(cat.id); }}
                      className="flex size-7 shrink-0 items-center justify-center rounded-full text-[#9ca3af] transition-colors hover:bg-[#f3f4f6] hover:text-[#1d1d1f]"
                    >
                      <ChevronRight
                        className={cn('size-4 transition-transform duration-150', isExpanded && 'rotate-90')}
                      />
                    </button>
                    <div className="flex flex-1 items-center gap-2.5 min-w-0">
                      <span className="text-[14px] font-medium text-[#111827] truncate">{cat.name}</span>
                      {cat.assetCode && (
                        <span className="rounded-md bg-[#f3f5f7] px-2 py-0.5 text-[11px] font-mono font-medium text-[#6b7280] tracking-tight">
                          {cat.assetCode}
                        </span>
                      )}
                      <Badge className="rounded-full bg-[#f0f4f8] px-2 py-0.5 text-[10px] font-medium text-[#6b7280] shrink-0">
                        {(cat.fields || []).length} {cat.fields?.length === 1 ? 'field' : 'fields'}
                      </Badge>
                    </div>
                    {canManageAssets && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu open={menuOpenId === cat.id} onOpenChange={(v) => setMenuOpenId(v ? cat.id : null)}>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="flex size-8 items-center justify-center rounded-full text-[#9ca3af] transition-colors hover:bg-[#f3f4f6] hover:text-[#1d1d1f]"
                            >
                              <MoreHorizontal className="size-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 rounded-lg border border-[#e5e7eb] p-1 shadow-lg">
                            <DropdownMenuItem
                              onClick={() => { setCatAddFieldTarget(cat.id); setCatFieldName(''); setCatFieldType('TEXT'); setCatFieldRequired(false); }}
                              className="rounded-md py-1.5 text-[13px] cursor-pointer"
                            >
                              <Plus className="mr-2 size-3.5 text-[#6b7280]" />
                              Add Field
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => { setCatEditTarget(cat.id); setCatEditName(cat.name); }}
                              className="rounded-md py-1.5 text-[13px] cursor-pointer"
                            >
                              <Edit3 className="mr-2 size-3.5 text-[#6b7280]" />
                              Edit Category
                            </DropdownMenuItem>
                            <div className="mx-1 my-1 border-t border-[#eef0f3]" />
                            <DropdownMenuItem
                              onClick={() => setCatDeleteTarget(cat.id)}
                              className="rounded-md py-1.5 text-[13px] cursor-pointer text-[#b3261e]"
                            >
                              <Trash2 className="mr-2 size-3.5" />
                              Delete Category
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                  {isExpanded && (
                    <div className="border-t border-[#eef0f3] bg-[#fbfcfb] px-4 py-3 space-y-3">
                      {cat.assetCode && (
                        <div className="flex items-center gap-2 text-[12px] text-[#6b7280]">
                          <span className="font-medium">Asset ID / Code:</span>
                          <span className="font-mono bg-white rounded px-1.5 py-0.5 border border-[#e5e7eb]">{cat.assetCode}</span>
                        </div>
                      )}
                      {(cat.fields || []).length === 0 ? (
                        <p className="py-2 text-center text-[14px] text-[#9ca3af]">No fields defined for this category</p>
                      ) : (
                        <div className="space-y-1.5">
                          {(cat.fields || [])
                            .sort((a, b) => a.displayOrder - b.displayOrder)
                            .map((f) => (
                              <div
                                key={f.id}
                                className="flex items-center justify-between rounded-lg bg-white px-3.5 py-2.5 shadow-[inset_0_0_0_1px_#e5e7eb]"
                              >
                                <div className="flex items-center gap-2.5">
                                  <span className="text-[13px] font-medium text-[#111827]">{f.fieldName}</span>
                                  <Badge className="rounded-full bg-[#f0f4f8] px-2 py-0.5 text-[10px] font-medium text-[#6b7280]">
                                    {f.fieldType}
                                  </Badge>
                                </div>
                                {f.isRequired && (
                                  <span className="rounded-full bg-[#fff3f2] px-2 py-0.5 text-[10px] font-medium text-[#b3261e]">
                                    Required
                                  </span>
                                )}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Field Dialog */}
      <Dialog open={!!catAddFieldTarget} onOpenChange={(v) => { if (!v) setCatAddFieldTarget(null); }}>
        <DialogContent className="rounded-3xl border border-[#e5e7eb] bg-white p-0 max-w-md">
          <div className="px-5 py-4 border-b border-[#eef0f3]">
            <DialogTitle className="text-[18px] font-semibold text-[#111827]">Add Field</DialogTitle>
          </div>
          <div className="px-5 py-4 space-y-4">
            <div className="grid gap-1.5">
              <Label className="text-[13px] text-[#6b7280]">Field Name</Label>
              <Input
                value={catFieldName}
                onChange={(e) => setCatFieldName(e.target.value)}
                placeholder="e.g. Serial Number"
                className="h-11 rounded-xl border-[#e5e7eb] text-[15px]"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-[13px] text-[#6b7280]">Field Type</Label>
              <Select value={catFieldType} onValueChange={(v) => setCatFieldType(v as AssetCategoryFieldCreateInput['fieldType'])}>
                <SelectTrigger className="h-11 rounded-xl border-[#e5e7eb] text-[15px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryFieldTypeOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>{humanize(opt)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-[14px] text-[#111827] cursor-pointer">
              <input
                type="checkbox"
                checked={catFieldRequired}
                onChange={(e) => setCatFieldRequired(e.target.checked)}
                className="size-4 rounded border-[#d8dde5] accent-[#00874a]"
              />
              Required field
            </label>
          </div>
          <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#eef0f3]">
            <Button variant="ghost" onClick={() => setCatAddFieldTarget(null)} className="rounded-full px-5 text-[13px]">
              Cancel
            </Button>
            <Button
              onClick={() => void handleAddCategoryField()}
              disabled={catFieldSaving || !catFieldName.trim()}
              className="rounded-full px-5 text-[13px] text-white"
              style={{ backgroundColor: ACTION_GREEN }}
            >
              {catFieldSaving ? 'Adding...' : 'Add Field'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={!!catEditTarget} onOpenChange={(v) => { if (!v) setCatEditTarget(null); }}>
        <DialogContent className="rounded-3xl border border-[#e5e7eb] bg-white p-0 max-w-md">
          <div className="px-5 py-4 border-b border-[#eef0f3]">
            <DialogTitle className="text-[18px] font-semibold text-[#111827]">Edit Category</DialogTitle>
          </div>
          <div className="px-5 py-4">
            <div className="grid gap-1.5">
              <Label className="text-[13px] text-[#6b7280]">Category Name</Label>
              <Input
                value={catEditName}
                onChange={(e) => setCatEditName(e.target.value)}
                placeholder="Category name"
                className="h-11 rounded-xl border-[#e5e7eb] text-[15px]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#eef0f3]">
            <Button variant="ghost" onClick={() => setCatEditTarget(null)} className="rounded-full px-5 text-[13px]">
              Cancel
            </Button>
            <Button
              onClick={() => void handleEditCategory()}
              disabled={catEditSaving || !catEditName.trim()}
              className="rounded-full px-5 text-[13px] text-white"
              style={{ backgroundColor: ACTION_GREEN }}
            >
              {catEditSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Category Dialog */}
      <Dialog open={!!catDeleteTarget} onOpenChange={(v) => { if (!v) setCatDeleteTarget(null); }}>
        <DialogContent className="rounded-3xl border border-[#e5e7eb] bg-white p-0 max-w-md">
          <div className="px-5 py-4 border-b border-[#eef0f3]">
            <DialogTitle className="text-[18px] font-semibold text-[#111827]">Delete Category</DialogTitle>
            <DialogDescription className="text-[14px] text-[#6b7280] mt-1">
              Are you sure you want to delete <span className="font-medium text-[#111827]">{catDeleteCategory?.name}</span>?
              All custom fields under this category will be removed. This cannot be undone.
            </DialogDescription>
          </div>
          <div className="flex justify-end gap-2 px-5 py-4">
            <Button variant="ghost" onClick={() => setCatDeleteTarget(null)} className="rounded-full px-5 text-[13px]">
              Cancel
            </Button>
            <Button
              onClick={() => void handleDeleteCategory()}
              disabled={catDeleteSaving}
              className="rounded-full px-5 text-[13px] text-white bg-[#b3261e] hover:bg-[#8a1a15]"
            >
              {catDeleteSaving ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
