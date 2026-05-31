export interface MicrosoftSettings {
  tenant_id: string;
  client_id: string;
  client_secret: string;
  is_enabled: boolean;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_summary: SyncSummary | null;
}

export interface SyncSummary {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
}

export interface ConnectionTestResult {
  connected: boolean;
  tenant_name: string;
  tenant_id: string;
  error: string | null;
}

export interface SyncRunResponse {
  id: string;
  status: string;
  total_fetched: number;
  created_count: number;
  updated_count: number;
  skipped_count: number;
  failed_count: number;
  errors: SyncError[] | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface SyncRunListItem {
  id: string;
  status: string;
  total_fetched: number;
  created_count: number;
  updated_count: number;
  failed_count: number;
  started_at: string | null;
  completed_at: string | null;
  has_errors: boolean;
}

export interface SyncError {
  email: string;
  error: string;
}

export interface SyncStatusResponse {
  is_configured: boolean;
  tenant_id: string;
  client_id: string;
  client_secret_configured: boolean;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_summary: SyncSummary | null;
}
