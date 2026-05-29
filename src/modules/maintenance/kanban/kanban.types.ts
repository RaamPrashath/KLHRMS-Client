import type { AssetSwapPreview } from '@/modules/assets/types/assetTypes';

export interface KanbanIssue {
  id: string;
  assetId: string | null;
  title: string | null;
  ticketId: string;
  description: string;
  assetLifecycleStatus: string | null;
  assetLifecycleStatusLabel: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'done' | 'cancelled';
  assignees: { name: string; avatar?: string }[];
  dueDate: string;
  createdAt: string;
  commentCount: number;
  attachmentCount: number;
  swapPreview?: AssetSwapPreview | null;
}

export interface KanbanColumnData {
  id: string;
  title: string;
  issues: KanbanIssue[];
}

export type ColumnId = 'open' | 'in_progress' | 'done' | 'cancelled';

export interface ColumnConfig {
  id: ColumnId;
  title: string;
  bg: string;
  text: string;
  dot: string;
}
