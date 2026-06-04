export type NotificationFilter = 'all' | 'read' | 'unread';
export type NotificationStatus = 'READ' | 'UNREAD';

export interface NotificationRecord {
  id: string;
  organizationId: string;
  memberId: string;
  type: string;
  category: string;
  title: string;
  message: string;
  status: NotificationStatus;
  actionUrl: string | null;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListResponse {
  items: NotificationRecord[];
  total: number;
  unreadCount: number;
}

export interface NotificationUnreadCountResponse {
  unreadCount: number;
}

export interface NotificationMarkAllReadResponse {
  updatedCount: number;
}
