'use client';

import { useState } from 'react';
import { Edit3, Plus, Tag, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { ACTION_GREEN } from '@/modules/assets/lib/assetConfig';
import { readError } from '@/modules/assets/lib/assetUtils';
import type { AssetIdDefinition } from '@/modules/assets/types/assetTypes';

export function AssetIdManager({
  assetIds,
  isLoading,
  canManageAssets,
  onCreate,
  onUpdate,
  onDelete,
}: {
  assetIds: AssetIdDefinition[];
  isLoading: boolean;
  canManageAssets: boolean;
  onCreate: (data: { assetIdName: string }) => Promise<unknown>;
  onUpdate: (id: string, data: { assetIdName?: string }) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
}) {
  const [newAssetIdName, setNewAssetIdName] = useState('');
  const [creating, setCreating] = useState(false);

  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [editAssetIdName, setEditAssetIdName] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const deleteItem = assetIds.find((a) => a.id === deleteTarget);

  async function handleCreate() {
    if (!newAssetIdName.trim()) return;
    setCreating(true);
    try {
      await onCreate({ assetIdName: newAssetIdName.trim() });
      setNewAssetIdName('');
      toast.success('Asset ID created');
    } catch (error) {
      toast.error(readError(error, 'Failed to create asset ID'));
    } finally {
      setCreating(false);
    }
  }

  async function handleEdit() {
    if (!editTarget || !editAssetIdName.trim()) return;
    setSaving(true);
    try {
      await onUpdate(editTarget, { assetIdName: editAssetIdName.trim() });
      setEditTarget(null);
      toast.success('Asset ID updated');
    } catch (error) {
      toast.error(readError(error, 'Failed to update asset ID'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await onDelete(deleteTarget);
      setDeleteTarget(null);
      toast.success('Asset ID deleted');
    } catch (error) {
      toast.error(readError(error, 'Failed to delete asset ID'));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center gap-2">
        <Tag className="size-4 text-[#6b7280]" />
        <h3 className="text-[15px] font-semibold text-[#111827]">Asset IDs</h3>
        <Badge className="rounded-full bg-[#f0f4f8] px-2 py-0.5 text-[10px] font-medium text-[#6b7280]">
          {assetIds.length}
        </Badge>
      </div>

      {canManageAssets && (
        <div className="mb-4 flex gap-2">
          <Input
            value={newAssetIdName}
            onChange={(e) => setNewAssetIdName(e.target.value)}
            placeholder="New asset ID name..."
            className="h-9 flex-1 rounded-lg border-[#e5e7eb] text-[13px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newAssetIdName.trim()) {
                e.preventDefault();
                void handleCreate();
              }
            }}
          />
          <Button
            onClick={() => void handleCreate()}
            disabled={creating || !newAssetIdName.trim()}
            size="sm"
            className="h-9 shrink-0 rounded-lg px-3 text-[13px] font-medium text-white"
            style={{ backgroundColor: ACTION_GREEN }}
          >
            <Plus className="mr-1 size-3.5" />
            {creating ? 'Adding...' : 'Add'}
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-[#f3f4f6]" />
            ))}
          </div>
        ) : assetIds.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#d5dbe3] bg-[#fbfcfb] px-4 py-6 text-center">
            <Tag className="mx-auto size-5 text-[#9ca3af]" />
            <p className="mt-2 text-[13px] font-medium text-[#111827]">No asset IDs defined</p>
            <p className="mt-0.5 text-[12px] text-[#6b7280]">
              Create asset ID patterns to use when registering assets
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {assetIds.map((aid) => (
              <div
                key={aid.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-[#e5e7eb] bg-white px-3.5 py-2.5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#f0f4f8] text-[#6b7280]">
                    <Tag className="size-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-[#111827] truncate">{aid.assetIdName}</p>
                  </div>
                </div>
                {canManageAssets && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditTarget(aid.id);
                        setEditAssetIdName(aid.assetIdName);
                      }}
                      className="flex size-7 items-center justify-center rounded-full text-[#9ca3af] transition-colors hover:bg-[#f3f4f6] hover:text-[#111827]"
                    >
                      <Edit3 className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(aid.id)}
                      className="flex size-7 items-center justify-center rounded-full text-[#9ca3af] transition-colors hover:bg-[#fff3f2] hover:text-[#b3261e]"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(v) => { if (!v) setEditTarget(null); }}>
        <DialogContent className="rounded-3xl border border-[#e5e7eb] bg-white p-0 max-w-md">
          <div className="px-5 py-4 border-b border-[#eef0f3]">
            <DialogTitle className="text-[18px] font-semibold text-[#111827]">Edit Asset ID</DialogTitle>
          </div>
          <div className="px-5 py-4">
            <div className="grid gap-1.5">
              <Label className="text-[13px] text-[#6b7280]">Asset ID Name</Label>
              <Input
                value={editAssetIdName}
                onChange={(e) => setEditAssetIdName(e.target.value)}
                placeholder="Asset ID name"
                className="h-11 rounded-xl border-[#e5e7eb] text-[15px]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#eef0f3]">
            <Button variant="ghost" onClick={() => setEditTarget(null)} className="rounded-full px-5 text-[13px]">
              Cancel
            </Button>
            <Button
              onClick={() => void handleEdit()}
              disabled={saving || !editAssetIdName.trim()}
              className="rounded-full px-5 text-[13px] text-white"
              style={{ backgroundColor: ACTION_GREEN }}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <DialogContent className="rounded-3xl border border-[#e5e7eb] bg-white p-0 max-w-md">
          <div className="px-5 py-4 border-b border-[#eef0f3]">
            <DialogTitle className="text-[18px] font-semibold text-[#111827]">Delete Asset ID</DialogTitle>
            <DialogDescription className="text-[14px] text-[#6b7280] mt-1">
              Are you sure you want to delete <span className="font-medium text-[#111827]">{deleteItem?.assetIdName}</span>?
              This action cannot be undone.
            </DialogDescription>
          </div>
          <div className="flex justify-end gap-2 px-5 py-4">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} className="rounded-full px-5 text-[13px]">
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
    </div>
  );
}
