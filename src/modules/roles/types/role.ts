// Role & Permission Management Types

export interface RoleResponse {
  id: string;
  organizationId: string;
  name: string;
  permissions: RolePermissions;
  createdAt: string;
  updatedAt: string;
}

// Matches z.record(z.string(), z.record(z.string(), z.string())) — Zod v4 inference
export type RolePermissions = Record<string, Record<string, string>>;

export interface ApiError {
  status: number;
  message: string;
}
