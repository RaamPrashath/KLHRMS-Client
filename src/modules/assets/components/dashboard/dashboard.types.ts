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
  detail?: string | null;
}

export interface TicketAlertItem {
  id: string;
  assetName: string;
  maintenanceType: string;
  status: string;
  issueDescription: string;
  createdAt: string;
}

export interface DashboardData {
  totalAssets: number;
  availableCount: number;
  providedCount: number;
  maintenanceCount: number;
  damagedCount: number;
  retiredCount: number;
  openTicketCount: number;
  statusDistribution: StatusCount[];
  monthlyTrends: MonthlyTrend[];
  recentActivity: RecentActivityItem[];
  recentTickets: TicketAlertItem[];
}
