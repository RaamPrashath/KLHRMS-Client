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
  type: 'ASSIGNED' | 'RETURNED' | 'MAINTENANCE';
  assetName: string;
  memberName?: string | null;
  date: string;
  detail?: string | null;
}

export interface TicketAlertItem {
  id: string;
  ticketId: string;
  assetName: string;
  maintenanceType: string;
  status: string;
  issueDescription: string;
  createdAt: string;
}

export interface BrandModelInventoryRow {
  rowKey: string;
  brand: string;
  model: string;
  totalStock: number;
  inOfficeStock: number;
  providedStock: number;
  maintenanceOrDamagedStock: number;
  temporaryLaptopStockDepth: number;
  lowStockAlert: boolean;
  assetIds: string[];
  unitIds: string[];
  serialNumbers: string[];
}

export interface BrandModelInventoryAnalytics {
  rows: BrandModelInventoryRow[];
  temporaryLaptopStockDepth: number;
}

export interface OsDistributionRow {
  osName: string;
  headcount: number;
  percentage: number;
  memberIds: string[];
}

export interface OsDistributionAnalytics {
  rows: OsDistributionRow[];
  totalLaptopUsers: number;
}

export interface WarrantyExpirationFeedItem {
  assetId: string;
  assetUnitId: string | null;
  assetCode: string;
  assetName: string;
  serialNumber: string | null;
  model: string | null;
  category: string;
  employeeMemberId: string;
  employeeName: string | null;
  employeeEmail: string | null;
  warrantyExpiryDate: string;
  daysUntilExpiry: number;
  hasReminderSent: boolean;
}

export interface WarrantyExpirationFeedData {
  items: WarrantyExpirationFeedItem[];
  total: number;
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
