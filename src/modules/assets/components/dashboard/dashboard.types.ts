export interface StatusCount {
  name: string;
  value: number;
  color: string;
}

export interface MonthlyTrend {
  month: string;
  count: number;
}

export interface RecentActivityItem {
  type: 'PROVIDED' | 'RETURNED' | 'MAINTENANCE';
  assetName: string;
  memberName?: string | null;
  date: string;
}

export interface DashboardData {
  totalAssets: number;
  availableCount: number;
  providedCount: number;
  maintenanceCount: number;
  damagedCount: number;
  retiredCount: number;
  statusDistribution: StatusCount[];
  monthlyTrends: MonthlyTrend[];
  recentActivity: RecentActivityItem[];
}
