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
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly pageNumber?: number;
  readonly pageSize?: number;
}

export type PagedAuditLogsResponse = PagedResult<AuditLogDto>;

export interface ArchivedAuditLogDto extends AuditLogDto {
  readonly archivedAt: string;
}

export type PagedArchivedAuditLogsResponse = PagedResult<ArchivedAuditLogDto>;

export interface AuditStatsResponse {
  readonly hotRecordCount: number;
  readonly archivedRecordCount: number;
  readonly oldestHotRecord: string | null;
  readonly lastArchivalRun: string | null;
  readonly retentionMonths: number;
}

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

export interface DependencyHealthEntry {
  readonly name: string;
  readonly status: string;
  readonly durationMs: number;
}

export interface ServiceHealthEntry {
  readonly name: string;
  readonly description: string;
  readonly status: "Healthy" | "Degraded" | "Unhealthy";
  readonly responseMs: number;
  readonly dependencies: DependencyHealthEntry[];
}

export interface SystemHealthResponse {
  readonly services: ServiceHealthEntry[];
  readonly overallStatus: "Healthy" | "Degraded" | "Unhealthy";
}

// ============================================================================
// Dashboard Overview Types
// ============================================================================

export interface DashboardOverview {
  readonly totalPatients: number;
  readonly patientsTrend: number;
  readonly todayAppointments: number;
  readonly appointmentsTrend: number;
  readonly claraSessions: number;
  readonly claraSessionsTrend: number;
  readonly activeUsers: number;
  readonly activeUsersTrend: number;
  readonly systemStatus: string;
}

// ============================================================================
// Infrastructure Metrics Types
// ============================================================================

export interface ServiceMetricEntry {
  readonly serviceName: string;
  readonly value: number;
}

export interface PrometheusMetrics {
  readonly requestsPerSecond: number;
  readonly errorRate: number;
  readonly latencyP95Ms: number;
  readonly requestRateByService: ServiceMetricEntry[];
  readonly errorRateByService: ServiceMetricEntry[];
  readonly latencyP95ByService: ServiceMetricEntry[];
}

export interface QueueMetricEntry {
  readonly name: string;
  readonly messages: number;
  readonly consumers: number;
  readonly publishRate: number;
  readonly deliverRate: number;
}

export interface RabbitMQMetrics {
  readonly totalQueues: number;
  readonly totalMessages: number;
  readonly messagePublishRate: number;
  readonly messageDeliverRate: number;
  readonly connections: number;
  readonly channels: number;
  readonly queues: QueueMetricEntry[];
}

export interface DatabaseEntry {
  readonly name: string;
  readonly sizeBytes: number;
  readonly sizeFormatted: string;
  readonly activeConnections: number;
}

export interface DatabaseMetrics {
  readonly activeConnections: number;
  readonly maxConnections: number;
  readonly databaseSizeBytes: number;
  readonly databaseSizeFormatted: string;
  readonly transactionsCommitted: number;
  readonly transactionsRolledBack: number;
  readonly databases: DatabaseEntry[];
}

export interface InfrastructureMetrics {
  readonly prometheus: PrometheusMetrics;
  readonly rabbitMQ: RabbitMQMetrics;
  readonly database: DatabaseMetrics;
}

export interface TimeSeriesDataPoint {
  readonly timestamp: string;
  readonly value: number;
}

export interface TimeSeriesByService {
  readonly serviceName: string;
  readonly data: TimeSeriesDataPoint[];
}

export interface TimeSeriesResponse {
  readonly metric: string;
  readonly range: string;
  readonly data: TimeSeriesDataPoint[];
  readonly byService: TimeSeriesByService[];
}

// ============================================================================
// Patient Analytics Types
// ============================================================================

export interface RegistrationTrendEntry {
  readonly date: string;
  readonly count: number;
}

export interface DistributionEntry {
  readonly label: string;
  readonly count: number;
}

export interface PatientDemographics {
  readonly totalPatients: number;
  readonly activePatients: number;
  readonly inactivePatients: number;
  readonly genderDistribution: DistributionEntry[];
  readonly ageBrackets: DistributionEntry[];
}

// ============================================================================
// Appointment Analytics Types
// ============================================================================

export interface AppointmentVolumeEntry {
  readonly date: string;
  readonly scheduled: number;
  readonly confirmed: number;
  readonly completed: number;
  readonly cancelled: number;
  readonly noShow: number;
  readonly total: number;
}

export interface StatusDistributionEntry {
  readonly status: string;
  readonly count: number;
}

export interface TypeDistributionEntry {
  readonly type: string;
  readonly count: number;
}

export interface BusiestHourEntry {
  readonly hour: number;
  readonly count: number;
}

// ============================================================================
// Identity Analytics Types
// ============================================================================

export interface LoginActivityEntry {
  readonly date: string;
  readonly uniqueUsers: number;
}

export interface RoleDistributionEntry {
  readonly role: string;
  readonly count: number;
}

export interface UserStats {
  readonly totalUsers: number;
  readonly activeUsersLast30Days: number;
  readonly usersByRole: RoleDistributionEntry[];
}
