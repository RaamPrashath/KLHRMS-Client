export interface KanbanIssue {
  id: string;
  assetId: string;
  title: string;
  ticketId: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'done' | 'cancelled';
  assignees: { name: string; avatar?: string }[];
  dueDate: string;
  createdAt: string;
  commentCount: number;
  attachmentCount: number;
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
