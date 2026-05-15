'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronRight,
  Edit3,
  MoreHorizontal,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ACTION_GREEN } from '@/modules/assets/lib/assetConfig';
import { humanize, readError } from '@/modules/assets/lib/assetUtils';
import {
  type AssetCategoryFieldCreateInput,
  categoryFieldTypeOptions,
} from '@/modules/assets/schema/assetSchemas';
import type { ExpandedState } from '@tanstack/react-table';
import type {
  AssetCategoryDefinition,
  AssetCategoryFieldDefinition,
} from '@/modules/assets/types/assetTypes';

// ── Inline field row for create flow ─────────────────────────────────────────

function FieldRow({
  field,
  index,
  onUpdate,
  onRemove,
}: {
  field: AssetCategoryFieldCreateInput;
  index: number;
  onUpdate: (index: number, field: AssetCategoryFieldCreateInput) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-white p-2.5 shadow-[inset_0_0_0_1px_#e5e7eb]">
      <div className="flex-1 grid grid-cols-[1fr_130px_auto] gap-2.5 items-center">
        <Input
          value={field.fieldName}
          onChange={(e) => onUpdate(index, { ...field, fieldName: e.target.value })}
          placeholder="Field name"
          className="h-10 rounded-xl border-[#e5e7eb] text-[14px]"
        />
        <Select
          value={field.fieldType}
          onValueChange={(v) =>
            onUpdate(index, { ...field, fieldType: v as AssetCategoryFieldCreateInput['fieldType'] })
          }
        >
          <SelectTrigger className="h-10 rounded-xl border-[#e5e7eb] text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categoryFieldTypeOptions.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {humanize(opt)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-1.5 cursor-pointer text-[13px] text-[#6b7280]">
          <input
            type="checkbox"
            checked={field.isRequired}
            onChange={(e) => onUpdate(index, { ...field, isRequired: e.target.checked })}
            className="size-4 rounded border-[#d8dde5] accent-[#00874a]"
          />
          Required
        </label>
      </div>
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-[#9ca3af] transition-colors hover:bg-[#f3f4f6] hover:text-[#b3261e]"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

// ── Add Field Dialog (for existing categories) ───────────────────────────────

function AddFieldDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (data: AssetCategoryFieldCreateInput) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<AssetCategoryFieldCreateInput['fieldType']>('TEXT');
  const [required, setRequired] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({ fieldName: name.trim(), fieldType: type, isRequired: required, displayOrder: 0 });
      setName('');
      setType('TEXT');
      setRequired(false);
      onOpenChange(false);
      toast.success('Field added');
    } catch (error) {
      toast.error(readError(error, 'Failed to add field'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border border-[#e5e7eb] bg-white p-0 max-w-md">
        <div className="px-5 py-4 border-b border-[#eef0f3]">
          <DialogTitle className="text-[18px] font-semibold text-[#111827]">Add Field</DialogTitle>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="grid gap-1.5">
            <Label className="text-[13px] text-[#6b7280]">Field Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Serial Number"
              className="h-11 rounded-xl border-[#e5e7eb] text-[15px]"
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-[13px] text-[#6b7280]">Field Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as AssetCategoryFieldCreateInput['fieldType'])}>
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
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              className="size-4 rounded border-[#d8dde5] accent-[#00874a]"
            />
            Required field
          </label>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#eef0f3]">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full px-5 text-[13px]">
            Cancel
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={saving || !name.trim()}
            className="rounded-full px-5 text-[13px] text-white"
            style={{ backgroundColor: ACTION_GREEN }}
          >
            {saving ? 'Adding...' : 'Add Field'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Category Dialog ─────────────────────────────────────────────────────

function EditCategoryDialog({
  open,
  onOpenChange,
  currentName,
  currentAssetCode,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentName: string;
  currentAssetCode: string | null;
  onSave: (name: string, assetCode?: string | null) => Promise<void>;
}) {
  const [name, setName] = useState(currentName);
  const [assetCode, setAssetCode] = useState(currentAssetCode ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave(name.trim(), assetCode.trim() || null);
      onOpenChange(false);
      toast.success('Category updated');
    } catch (error) {
      toast.error(readError(error, 'Failed to update category'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border border-[#e5e7eb] bg-white p-0 max-w-md">
        <div className="px-5 py-4 border-b border-[#eef0f3]">
          <DialogTitle className="text-[18px] font-semibold text-[#111827]">Edit Category</DialogTitle>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="grid gap-1.5">
            <Label className="text-[13px] text-[#6b7280]">Category Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Category name"
              className="h-11 rounded-xl border-[#e5e7eb] text-[15px]"
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-[13px] text-[#6b7280]">Asset ID / Code</Label>
            <Input
              value={assetCode}
              onChange={(e) => setAssetCode(e.target.value)}
              placeholder="e.g. AST-LAP"
              className="h-11 rounded-xl border-[#e5e7eb] text-[15px]"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#eef0f3]">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full px-5 text-[13px]">
            Cancel
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={saving || !name.trim()}
            className="rounded-full px-5 text-[13px] text-white"
            style={{ backgroundColor: ACTION_GREEN }}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Confirm Delete Dialog ────────────────────────────────────────────────────

function ConfirmDeleteDialog({
  open,
  onOpenChange,
  categoryName,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categoryName: string;
  onConfirm: () => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await onConfirm();
      onOpenChange(false);
      toast.success('Category deleted');
    } catch (error) {
      toast.error(readError(error, 'Failed to delete category'));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border border-[#e5e7eb] bg-white p-0 max-w-md">
        <div className="px-5 py-4 border-b border-[#eef0f3]">
          <DialogTitle className="text-[18px] font-semibold text-[#111827]">Delete Category</DialogTitle>
          <DialogDescription className="text-[14px] text-[#6b7280] mt-1">
            Are you sure you want to delete <span className="font-medium text-[#111827]">{categoryName}</span>?
            All custom fields under this category will be removed. This cannot be undone.
          </DialogDescription>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full px-5 text-[13px]">
            Cancel
          </Button>
          <Button
            onClick={() => void handleDelete()}
            disabled={deleting}
            className="rounded-full px-5 text-[13px] text-white bg-[#b3261e] hover:bg-[#8a1a15]"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Three-dot action menu ────────────────────────────────────────────────────

function CategoryActionsMenu({
  categoryId,
  categoryName,
  onAddField,
  onEdit,
  onDelete,
  menuOpen,
  setMenuOpen,
}: {
  categoryId: string;
  categoryName: string;
  onAddField: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  menuOpen: string | null;
  setMenuOpen: (v: string | null) => void;
}) {
  const isOpen = menuOpen === categoryId;
  const menuRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setMenuOpen(isOpen ? null : categoryId); }}
        className="flex size-8 items-center justify-center rounded-full text-[#9ca3af] transition-colors hover:bg-[#f3f4f6] hover:text-[#1d1d1f]"
      >
        <MoreHorizontal className="size-4" />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-[#e5e7eb] bg-white py-1 shadow-lg">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setMenuOpen(null); onAddField(categoryId); }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] text-[#111827] transition-colors hover:bg-[#f8f9fa]"
            >
              <Plus className="size-3.5 text-[#6b7280]" />
              Add Field
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setMenuOpen(null); onEdit(categoryId); }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] text-[#111827] transition-colors hover:bg-[#f8f9fa]"
            >
              <Edit3 className="size-3.5 text-[#6b7280]" />
              Edit Category
            </button>
            <div className="mx-3 my-1 border-t border-[#eef0f3]" />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setMenuOpen(null); onDelete(categoryId); }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] text-[#b3261e] transition-colors hover:bg-[#fff3f2]"
            >
              <Trash2 className="size-3.5" />
              Delete Category
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main AssetSettingsDialog ─────────────────────────────────────────────────

export function AssetSettingsDialog({
  open,
  onOpenChange,
  defaultTab,
  categories,
  onCreateCategory,
  onCreateField,
  onUpdateCategory,
  onDeleteCategory,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'create' | 'manage';
  categories: AssetCategoryDefinition[];
  onCreateCategory: (data: { name: string }) => Promise<AssetCategoryDefinition>;
  onCreateField: (categoryId: string, data: AssetCategoryFieldCreateInput) => Promise<AssetCategoryFieldDefinition>;
  onUpdateCategory: (categoryId: string, data: { name: string }) => Promise<AssetCategoryDefinition>;
  onDeleteCategory: (categoryId: string) => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');

  useEffect(() => {
    if (open && defaultTab) setActiveTab(defaultTab);
  }, [open, defaultTab]);

  // Create tab
  const [catName, setCatName] = useState('');
  const [catAssetCode, setCatAssetCode] = useState('');
  const [fields, setFields] = useState<AssetCategoryFieldCreateInput[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Manage tab
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [addFieldTarget, setAddFieldTarget] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  function addField() {
    setFields([...fields, { fieldName: '', fieldType: 'TEXT', isRequired: false, displayOrder: fields.length }]);
  }

  function updateField(index: number, field: AssetCategoryFieldCreateInput) {
    const next = [...fields];
    next[index] = field;
    setFields(next);
  }

  function removeField(index: number) {
    setFields(fields.filter((_, i) => i !== index));
  }

  async function handleCreate() {
    if (!catName.trim()) return;
    setIsSaving(true);
    try {
      const cat = await onCreateCategory({ name: catName.trim(), assetCode: catAssetCode.trim() || null });
      const catId = cat.id;
      for (const field of fields.filter((f) => f.fieldName.trim())) {
        await onCreateField(catId, {
          fieldName: field.fieldName.trim(),
          fieldType: field.fieldType,
          isRequired: field.isRequired,
          displayOrder: field.displayOrder,
        });
      }
      setCatName('');
      setCatAssetCode('');
      setFields([]);
      setActiveTab('manage');
      toast.success('Category created');
    } catch (error) {
      toast.error(readError(error, 'Failed to create category'));
    } finally {
      setIsSaving(false);
    }
  }

  const editCategory = categories.find((c) => c.id === editTarget);
  const deleteCategory = categories.find((c) => c.id === deleteTarget);

  // TanStack Table
  const columns = useMemo<ColumnDef<AssetCategoryDefinition>[]>(
    () => [
      {
        id: 'expander',
        header: '',
        cell: ({ row }) => (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); row.toggleExpanded(); }}
            className="flex size-7 items-center justify-center rounded-full text-[#9ca3af] transition-colors hover:bg-[#f3f4f6] hover:text-[#1d1d1f]"
          >
            <ChevronRight
              className={cn('size-4 transition-transform duration-150', row.getIsExpanded() && 'rotate-90')}
            />
          </button>
        ),
        size: 36,
      },
      {
        id: 'name',
        header: 'Category',
        accessorKey: 'name',
        cell: ({ getValue, row }) => (
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-medium text-[#111827]">{getValue() as string}</span>
            {row.original.assetCode && (
              <span className="rounded-md bg-[#f0f4f8] px-2 py-0.5 text-[11px] font-mono text-[#6b7280]">
                {row.original.assetCode}
              </span>
            )}
            <Badge className="rounded-full bg-[#f0f4f8] px-2 py-0.5 text-[10px] text-[#6b7280]">
              {(row.original.fields || []).length} fields
            </Badge>
          </div>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <CategoryActionsMenu
              categoryId={row.original.id}
              categoryName={row.original.name}
              onAddField={(id) => setAddFieldTarget(id)}
              onEdit={(id) => setEditTarget(id)}
              onDelete={(id) => setDeleteTarget(id)}
              menuOpen={menuOpen}
              setMenuOpen={setMenuOpen}
            />
          </div>
        ),
        size: 60,
      },
    ],
    [menuOpen],
  );

  const table = useReactTable({
    data: categories,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
    state: { expanded },
    onExpandedChange: setExpanded,
  });

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-40 bg-black/30"
              onClick={() => onOpenChange(false)}
            />
            <motion.div
              initial={{ opacity: 0, x: 320, y: 40, scale: 0.92 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 320, y: 40, scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.9 }}
              className="fixed left-1/2 top-1/2 z-50 flex h-145 w-[92vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-[#e5e7eb] bg-white shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#eef0f3] px-6 py-4 shrink-0">
                <div>
                  <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-[#111827]">Asset Settings</h2>
                  <p className="mt-0.5 text-[14px] text-[#6b7280]">Manage categories and their custom fields</p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="flex size-9 items-center justify-center rounded-full text-[#9ca3af] transition-colors hover:bg-[#f3f4f6] hover:text-[#111827]"
                >
                  <X className="size-4.5" />
                </button>
              </div>

              {/* Tab switcher */}
              <div className="flex gap-2 border-b border-[#eef0f3] px-6 pt-3 shrink-0">
                {(['create', 'manage'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      'relative px-5 pb-3 text-[14px] font-medium transition-colors',
                      activeTab === tab ? 'text-[#111827]' : 'text-[#9ca3af] hover:text-[#6b7280]',
                    )}
                  >
                    {tab === 'create' ? 'Create Categories' : 'Manage Categories'}
                    {activeTab === tab && (
                      <motion.span
                        layoutId="settings-tab-underline"
                        className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#1d1d1f]"
                        transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                {activeTab === 'create' ? (
                  <div className="space-y-5">
                    <div className="grid gap-1.5">
                      <Label className="text-[13px] text-[#6b7280]">Category Name</Label>
                      <Input
                        value={catName}
                        onChange={(e) => setCatName(e.target.value)}
                        placeholder="e.g. Laptop, Accessories"
                        className="h-11 rounded-xl border-[#e5e7eb] text-[15px]"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-[13px] text-[#6b7280]">Asset ID / Code</Label>
                      <Input
                        value={catAssetCode}
                        onChange={(e) => setCatAssetCode(e.target.value)}
                        placeholder="e.g. AST-LAP (reusable for all assets in this category)"
                        className="h-11 rounded-xl border-[#e5e7eb] text-[15px]"
                      />
                      <p className="text-[11px] text-[#9ca3af]">This code will be reused by all physical assets in this category. Not required to be unique.</p>
                    </div>

                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-[13px] font-medium text-[#6b7280]">Custom Fields</span>
                        <button
                          type="button"
                          onClick={addField}
                          className="flex items-center gap-1 rounded-full border border-[#d8dde5] px-3 py-1.5 text-[12px] font-medium text-[#6b7280] transition-colors hover:border-[#cdd5df] hover:text-[#1d1d1f]"
                        >
                          <Plus className="size-3.5" />
                          Add Field
                        </button>
                      </div>

                      <div className="space-y-2.5">
                        {fields.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-[#d5dbe3] px-4 py-6 text-center">
                            <p className="text-[14px] font-medium text-[#111827]">No custom fields yet</p>
                            <p className="mt-0.5 text-[13px] text-[#6b7280]">
                              Click &quot;Add Field&quot; to define what data to collect for this category.
                            </p>
                          </div>
                        ) : (
                          fields.map((field, i) => (
                            <FieldRow key={i} field={field} index={i} onUpdate={updateField} onRemove={removeField} />
                          ))
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end border-t border-[#eef0f3] pt-4">
                      <Button
                        onClick={() => void handleCreate()}
                        disabled={isSaving || !catName.trim()}
                        className="h-10 rounded-full px-6 text-[14px] font-medium text-white"
                        style={{ backgroundColor: ACTION_GREEN }}
                      >
                        {isSaving ? 'Creating...' : 'Create Category'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {categories.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-[#d5dbe3] bg-[#fbfcfb] px-5 py-12 text-center">
                        <p className="text-[15px] font-medium text-[#111827]">No categories yet</p>
                        <p className="mt-1 text-[14px] text-[#6b7280]">
                          Switch to the Create tab to add your first category.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-2xl border border-[#e5e7eb]">
                        <Table>
                          <TableHeader>
                            {table.getHeaderGroups().map((hg) => (
                              <TableRow key={hg.id}>
                                {hg.headers.map((header) => (
                                  <TableHead
                                    key={header.id}
                                    className="text-[11px] font-semibold uppercase tracking-widest text-[#6b7280]"
                                  >
                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                  </TableHead>
                                ))}
                              </TableRow>
                            ))}
                          </TableHeader>
                          <TableBody>
                            {table.getRowModel().rows.map((row) => (
                              <Fragment key={row.id}>
                                <TableRow
                                  className="cursor-pointer"
                                  onClick={() => row.toggleExpanded()}
                                >
                                  {row.getVisibleCells().map((cell) => (
                                    <TableCell key={cell.id} className="py-3">
                                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                  ))}
                                </TableRow>
                                {row.getIsExpanded() && (
                                  <TableRow key={`${row.id}-expanded`}>
                                    <TableCell colSpan={columns.length} className="bg-[#fbfcfb] py-3.5">
                                      {(row.original.fields || []).length === 0 ? (
                                        <p className="py-3 text-center text-[14px] text-[#9ca3af]">No fields defined</p>
                                      ) : (
                                        <div className="space-y-2">
                                          {(row.original.fields || [])
                                            .sort((a, b) => a.displayOrder - b.displayOrder)
                                            .map((f) => (
                                              <div
                                                key={f.id}
                                                className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-[inset_0_0_0_1px_#e5e7eb]"
                                              >
                                                <div className="flex items-center gap-3">
                                                  <span className="text-[14px] font-medium text-[#111827]">{f.fieldName}</span>
                                                  <Badge className="rounded-full bg-[#f0f4f8] px-2.5 py-0.5 text-[11px] font-medium text-[#6b7280]">
                                                    {f.fieldType}
                                                  </Badge>
                                                </div>
                                                {f.isRequired && (
                                                  <span className="rounded-full bg-[#fff3f2] px-2.5 py-0.5 text-[11px] font-medium text-[#b3261e]">
                                                    Required
                                                  </span>
                                                )}
                                              </div>
                                            ))}
                                        </div>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                )}
                              </Fragment>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add field to category dialog */}
      <AddFieldDialog
        open={!!addFieldTarget}
        onOpenChange={(v) => { if (!v) setAddFieldTarget(null); }}
        onSave={async (data) => {
          if (!addFieldTarget) return;
          await onCreateField(addFieldTarget, data);
        }}
      />

      {/* Edit category dialog */}
      <EditCategoryDialog
        open={!!editTarget}
        onOpenChange={(v) => { if (!v) setEditTarget(null); }}
        currentName={editCategory?.name ?? ''}
        currentAssetCode={editCategory?.assetCode ?? null}
        onSave={async (name, assetCode) => {
          if (!editTarget) return;
          await onUpdateCategory(editTarget, { name, assetCode });
        }}
      />

      {/* Delete category confirmation */}
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        categoryName={deleteCategory?.name ?? ''}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await onDeleteCategory(deleteTarget);
        }}
      />
    </>
  );
}
