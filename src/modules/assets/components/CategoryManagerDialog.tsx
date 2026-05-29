'use client';

import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { ACTION_GREEN } from '@/modules/assets/lib/assetConfig';
import { humanize, readError } from '@/modules/assets/lib/assetUtils';
import { categoryFieldTypeOptions, type AssetCategoryFieldCreateInput } from '@/modules/assets/schema/assetSchemas';
import type { AssetCategoryDefinition, AssetCategoryFieldDefinition } from '@/modules/assets/types/assetTypes';

export function CategoryManagerDialog({
  open,
  onOpenChange,
  categories,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onCreateField,
  onUpdateField,
  onDeleteField,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: AssetCategoryDefinition[];
  onCreateCategory: (data: { name: string; description?: string }) => Promise<void>;
  onUpdateCategory: (categoryId: string, data: { name?: string; description?: string }) => Promise<void>;
  onDeleteCategory: (categoryId: string) => Promise<void>;
  onCreateField: (categoryId: string, data: AssetCategoryFieldCreateInput) => Promise<void>;
  onUpdateField: (fieldId: string, data: Partial<AssetCategoryFieldCreateInput>) => Promise<void>;
  onDeleteField: (fieldId: string) => Promise<void>;
}) {
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryDesc, setEditCategoryDesc] = useState('');
  const [addingFieldTo, setAddingFieldTo] = useState<string | null>(null);
  const [newField, setNewField] = useState<AssetCategoryFieldCreateInput>({
    fieldName: '',
    fieldType: 'TEXT',
    fieldOptions: [],
    isRequired: false,
    displayOrder: 0,
  });
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editField, setEditField] = useState<Partial<AssetCategoryFieldCreateInput>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [optionsInput, setOptionsInput] = useState('');

  async function handleCreateCategory() {
    if (!newCategoryName.trim()) return;
    setIsSaving(true);
    try {
      await onCreateCategory({
        name: newCategoryName.trim(),
        description: newCategoryDesc.trim() || undefined,
      });
      setNewCategoryName('');
      setNewCategoryDesc('');
      setCreatingCategory(false);
      toast.success('Category created');
    } catch (error) {
      toast.error(readError(error, 'Failed to create category'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateCategory() {
    if (!editingCategoryId || !editCategoryName.trim()) return;
    setIsSaving(true);
    try {
      await onUpdateCategory(editingCategoryId, {
        name: editCategoryName.trim(),
        description: editCategoryDesc.trim() || undefined,
      });
      setEditingCategoryId(null);
      toast.success('Category updated');
    } catch (error) {
      toast.error(readError(error, 'Failed to update category'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteCategory(categoryId: string) {
    setIsSaving(true);
    try {
      await onDeleteCategory(categoryId);
      toast.success('Category deleted');
    } catch (error) {
      toast.error(readError(error, 'Failed to delete category'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateField() {
    if (!addingFieldTo || !newField.fieldName.trim()) return;
    setIsSaving(true);
    try {
      const opts = newField.fieldType === 'SELECT' && newField.fieldOptions && newField.fieldOptions.length > 0
        ? newField.fieldOptions
        : undefined;
      await onCreateField(addingFieldTo, { ...newField, fieldName: newField.fieldName.trim(), fieldOptions: opts });
      setAddingFieldTo(null);
      setNewField({ fieldName: '', fieldType: 'TEXT', fieldOptions: [], isRequired: false, displayOrder: 0 });
      setOptionsInput('');
      toast.success('Field added');
    } catch (error) {
      toast.error(readError(error, 'Failed to create field'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateField(fieldId: string) {
    if (!editField.fieldName?.trim()) return;
    setIsSaving(true);
    try {
      await onUpdateField(fieldId, editField);
      setEditingFieldId(null);
      setEditField({});
      toast.success('Field updated');
    } catch (error) {
      toast.error(readError(error, 'Failed to update field'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteField(fieldId: string) {
    setIsSaving(true);
    try {
      await onDeleteField(fieldId);
      toast.success('Field deleted');
    } catch (error) {
      toast.error(readError(error, 'Failed to delete field'));
    } finally {
      setIsSaving(false);
    }
  }

  function parseOptions(value: string): string[] {
    return value.split(',').map((s) => s.trim()).filter(Boolean);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw]! max-w-230! overflow-hidden rounded-3xl border border-[#e5e7eb] bg-white p-0">
        <div className="flex max-h-[84vh] flex-col">
          <DialogHeader className="border-b border-[#eef0f3] px-6 py-5 text-left">
            <DialogTitle className="text-[24px] font-semibold tracking-[-0.02em] text-[#111827]">
              Manage Asset Categories
            </DialogTitle>
            <DialogDescription className="text-[14px] leading-6 text-[#6b7280]">
              Define categories and their custom fields. Each category can have different fields for asset creation.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto px-6 py-5">
            <div className="space-y-6">
              {creatingCategory ? (
                <div className="rounded-[20px] border border-[#e5e7eb] bg-[#fbfcfb] p-4">
                  <p className="text-[14px] font-medium text-[#111827]">New Category</p>
                  <div className="mt-3 grid gap-3">
                    <div className="grid gap-1.5">
                      <Label className="text-[13px] text-[#6b7280]">Name</Label>
                      <Input
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="e.g. Furniture, Vehicle"
                        className="h-10 rounded-xl border-[#e5e7eb]"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-[13px] text-[#6b7280] ">Description (optional)</Label>
                      <Input
                        value={newCategoryDesc}
                        onChange={(e) => setNewCategoryDesc(e.target.value)}
                        placeholder="Brief description"
                        className="h-10 rounded-xl border-[#e5e7eb]"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleCreateCategory}
                        disabled={isSaving || !newCategoryName.trim()}
                        className="h-9 rounded-full px-4 text-[13px] text-white"
                        style={{ backgroundColor: ACTION_GREEN }}
                      >
                        {isSaving ? 'Creating...' : 'Create'}
                      </Button>
                      <Button variant="ghost" onClick={() => setCreatingCategory(false)} className="h-9 rounded-full px-4 text-[13px]">
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => setCreatingCategory(true)}
                  className="h-10 rounded-full px-5 text-[15px] text-white"
                  style={{ backgroundColor: ACTION_GREEN }}
                >
                  <Plus className="mr-2 size-4" />
                  Add Category
                </Button>
              )}

              <Separator className="bg-[#eef0f3]" />

              {categories.length === 0 ? (
                <div className="rounded-[20px] border border-dashed border-[#d5dbe3] bg-[#fbfcfb] px-5 py-10 text-center">
                  <p className="text-[15px] font-medium text-[#111827]">No categories yet</p>
                  <p className="mt-1 text-[13px] leading-5 text-[#6b7280]">
                    Create a category to define asset types with custom fields.
                  </p>
                </div>
              ) : (
                categories.map((cat) => (
                  <div key={cat.id} className="rounded-[20px] border border-[#e5e7eb] bg-[#fbfcfb] p-4">
                    {editingCategoryId === cat.id ? (
                      <div className="grid gap-3">
                        <div className="grid gap-1.5">
                          <Label className="text-[13px] text-[#6b7280]">Name</Label>
                          <Input
                            value={editCategoryName}
                            onChange={(e) => setEditCategoryName(e.target.value)}
                            className="h-10 rounded-xl border-[#e5e7eb]"
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label className="text-[13px] text-[#6b7280]">Description</Label>
                          <Input
                            value={editCategoryDesc}
                            onChange={(e) => setEditCategoryDesc(e.target.value)}
                            className="h-10 rounded-xl border-[#e5e7eb]"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={handleUpdateCategory}
                            disabled={isSaving || !editCategoryName.trim()}
                            className="h-9 rounded-full px-4 text-[13px] text-white"
                            style={{ backgroundColor: ACTION_GREEN }}
                          >
                            {isSaving ? 'Saving...' : 'Save'}
                          </Button>
                          <Button variant="ghost" onClick={() => setEditingCategoryId(null)} className="h-9 rounded-full px-4 text-[13px]">
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[15px] font-medium text-[#111827]">{cat.name}</p>
                          {cat.description && (
                            <p className="mt-0.5 text-[13px] text-[#6b7280]">{cat.description}</p>
                          )}
                          <Badge className="mt-2 rounded-full bg-white px-2.5 py-0.5 text-[11px] text-[#6b7280] shadow-[inset_0_0_0_1px_#e5e7eb]">
                            {(cat.fields || []).length} fields
                          </Badge>
                        </div>
                        <div className="flex gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-full"
                            onClick={() => {
                              setEditingCategoryId(cat.id);
                              setEditCategoryName(cat.name);
                              setEditCategoryDesc(cat.description || '');
                            }}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-full text-[#b3261e]"
                            onClick={() => handleDeleteCategory(cat.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Fields */}
                    <div className="mt-4 space-y-2">
                      {(cat.fields || []).map((field) => (
                        <div key={field.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 shadow-[inset_0_0_0_1px_#e5e7eb]">
                          {editingFieldId === field.id ? (
                            <div className="flex-1 grid gap-2">
                              <div className="grid gap-1.5">
                                <Label className="text-[12px] text-[#6b7280]">Field Name</Label>
                                <Input
                                  value={editField.fieldName || ''}
                                  onChange={(e) => setEditField({ ...editField, fieldName: e.target.value })}
                                  className="h-9 rounded-xl border-[#e5e7eb] text-[13px]"
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => handleUpdateField(field.id)}
                                  disabled={isSaving || !editField.fieldName?.trim()}
                                  className="h-8 rounded-full px-3 text-[12px] text-white"
                                  style={{ backgroundColor: ACTION_GREEN }}
                                >
                                  Save
                                </Button>
                                <Button variant="ghost" onClick={() => { setEditingFieldId(null); setEditField({}); }} className="h-8 rounded-full px-3 text-[12px]">
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] text-[#111827]">{field.fieldName}</span>
                                <Badge className="rounded-full bg-[#f0f4f8] px-2 py-0.5 text-[10px] text-[#6b7280]">
                                  {field.fieldType}
                                </Badge>
                                {field.isRequired && (
                                  <span className="text-[11px] text-[#b3261e]">Required</span>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 rounded-full"
                                  onClick={() => {
                                    setEditingFieldId(field.id);
                                    setEditField({
                                      fieldName: field.fieldName,
                                      fieldType: field.fieldType,
                                      isRequired: field.isRequired,
                                      displayOrder: field.displayOrder,
                                    });
                                  }}
                                >
                                  <Pencil className="size-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 rounded-full text-[#b3261e]"
                                  onClick={() => handleDeleteField(field.id)}
                                >
                                  <Trash2 className="size-3" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}

                      {addingFieldTo === cat.id ? (
                        <div className="rounded-xl border border-dashed border-[#cdd5df] bg-white p-3">
                          <div className="grid gap-2">
                            <div className="grid gap-1.5">
                              <Label className="text-[12px] text-[#6b7280]">Field Name</Label>
                              <Input
                                value={newField.fieldName}
                                onChange={(e) => setNewField({ ...newField, fieldName: e.target.value })}
                                placeholder="e.g. Serial Number"
                                className="h-9 rounded-xl border-[#e5e7eb] text-[13px]"
                              />
                            </div>
                            <div className="grid gap-1.5">
                              <Label className="text-[12px] text-[#6b7280]">Field Type</Label>
                              <Select
                                value={newField.fieldType}
                                onValueChange={(value) => setNewField({ ...newField, fieldType: value as AssetCategoryFieldCreateInput['fieldType'] })}
                              >
                                <SelectTrigger className="h-9 rounded-xl border-[#e5e7eb] text-[13px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {categoryFieldTypeOptions.map((opt) => (
                                    <SelectItem key={opt} value={opt}>{humanize(opt)}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {newField.fieldType === 'SELECT' && (
                              <div className="grid gap-1.5">
                                <Label className="text-[12px] text-[#6b7280]">Options (comma separated)</Label>
                                <Input
                                  value={optionsInput}
                                  onChange={(e) => {
                                    setOptionsInput(e.target.value);
                                    setNewField({ ...newField, fieldOptions: parseOptions(e.target.value) });
                                  }}
                                  placeholder="Option1, Option2, Option3"
                                  className="h-9 rounded-xl border-[#e5e7eb] text-[13px]"
                                />
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`required-${cat.id}`}
                                checked={newField.isRequired}
                                onChange={(e) => setNewField({ ...newField, isRequired: e.target.checked })}
                                className="size-4 rounded border-[#d8dde5]"
                              />
                              <Label htmlFor={`required-${cat.id}`} className="text-[13px] text-[#6b7280]">Required</Label>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={handleCreateField}
                                disabled={isSaving || !newField.fieldName.trim()}
                                className="h-8 rounded-full px-3 text-[12px] text-white"
                                style={{ backgroundColor: ACTION_GREEN }}
                              >
                                {isSaving ? 'Adding...' : 'Add Field'}
                              </Button>
                              <Button variant="ghost" onClick={() => { setAddingFieldTo(null); setNewField({ fieldName: '', fieldType: 'TEXT', fieldOptions: [], isRequired: false, displayOrder: 0 }); setOptionsInput(''); }} className="h-8 rounded-full px-3 text-[12px]">
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAddingFieldTo(cat.id)}
                          className="h-8 w-full rounded-full border-dashed border-[#cdd5df] text-[12px] text-[#6b7280]"
                        >
                          <Plus className="mr-1 size-3" />
                          Add Field
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <DialogFooter className="border-t border-[#eef0f3] px-6 py-4">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full px-5">
              Done
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
