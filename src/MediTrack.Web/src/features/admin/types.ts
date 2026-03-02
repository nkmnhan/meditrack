import type { PagedResult } from "@/shared/types/pagination";

// ============================================================================
// Audit Log Types
// ============================================================================

export interface AuditLogDto {
  readonly id: string;
  readonly timestamp: string;
  readonly username: string;
  readonly userRole: string;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId: string;
  readonly severity: string;
  readonly success: boolean;
  readonly errorMessage: string | null;
}

export interface AuditLogSearchParams {
  readonly action?: string;
  readonly user?: string;
  readonly search?: string;
  readonly severity?: string;
  readonly pageNumber?: number;
  readonly pageSize?: number;
}

export type PagedAuditLogsResponse = PagedResult<AuditLogDto>;

// ============================================================================
// User Management Types
// ============================================================================

export interface UserListItem {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly role: string;
  readonly isActive: boolean;
  readonly lastLoginAt: string | null;
  readonly createdAt: string;
}

export interface UserSearchParams {
  readonly role?: string;
  readonly status?: "active" | "inactive";
  readonly search?: string;
  readonly pageNumber?: number;
  readonly pageSize?: number;
}

export type PagedUsersResponse = PagedResult<UserListItem>;

export interface ChangeUserRoleRequest {
  readonly newRole: string;
}

// ============================================================================
// Analytics Types (match backend AnalyticsModels.cs property names)
// ============================================================================

export interface AnalyticsOverview {
  readonly totalSessions: number;
  readonly sessionsTrend: number;
  readonly aiDraftsSaved: number;
  readonly aiDraftsTrend: number;
  readonly activeProviders: number;
  readonly activeProvidersTrend: number;
  readonly avgSessionMinutes: number;
  readonly avgSessionTrend: number;
}

export interface SessionVolumeEntry {
  readonly date: string;
  readonly sessionCount: number;
}

export interface SuggestionBreakdownEntry {
  readonly type: string;
  readonly count: number;
  readonly percentage: number;
}

export interface ProviderLeaderboardEntry {
  readonly doctorId: string;
  readonly doctorName: string;
  readonly sessionCount: number;
  readonly suggestionsSaved: number;
  readonly saveRate: number;
}

// ============================================================================
// System Health Types
// ============================================================================

export interface ServiceHealthEntry {
  readonly name: string;
  readonly description: string;
  readonly status: "Healthy" | "Degraded" | "Unhealthy";
  readonly responseMs: number;
}

export interface SystemHealthResponse {
  readonly services: ServiceHealthEntry[];
  readonly overallStatus: "Healthy" | "Degraded" | "Unhealthy";
}
