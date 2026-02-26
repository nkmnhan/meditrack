using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Notification.Worker.Data;

#nullable disable

namespace MediTrack.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(AuditDbContext))]
    [Migration("20260225081634_InitialPostgres")]
    public partial class InitialPostgres : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PHIAuditLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EventId = table.Column<Guid>(type: "uuid", nullable: false),
                    Timestamp = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UserId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Username = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    UserRole = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Action = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ResourceType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ResourceId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    PatientId = table.Column<Guid>(type: "uuid", nullable: false),
                    IpAddress = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: true),
                    UserAgent = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Success = table.Column<bool>(type: "boolean", nullable: false),
                    ErrorMessage = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    EventType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    AdditionalContext = table.Column<string>(type: "text", nullable: true),
                    Severity = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    AlertTriggered = table.Column<bool>(type: "boolean", nullable: false),
                    Reviewed = table.Column<bool>(type: "boolean", nullable: false),
                    ReviewedBy = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    ReviewedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ReviewNotes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PHIAuditLogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PHIBreachIncidents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EventId = table.Column<Guid>(type: "uuid", nullable: false),
                    DetectedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UserId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Username = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    PatientId = table.Column<Guid>(type: "uuid", nullable: false),
                    Severity = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    PatientsAffected = table.Column<int>(type: "integer", nullable: false),
                    RequiresBreachNotification = table.Column<bool>(type: "boolean", nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    AssignedTo = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    InvestigationNotes = table.Column<string>(type: "text", nullable: true),
                    Resolution = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    ResolvedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    NotificationSent = table.Column<bool>(type: "boolean", nullable: false),
                    NotificationSentAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PHIBreachIncidents", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PHIAuditLogs_AlertTriggered",
                table: "PHIAuditLogs",
                column: "AlertTriggered");

            migrationBuilder.CreateIndex(
                name: "IX_PHIAuditLogs_EventType",
                table: "PHIAuditLogs",
                column: "EventType");

            migrationBuilder.CreateIndex(
                name: "IX_PHIAuditLogs_PatientId",
                table: "PHIAuditLogs",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_PHIAuditLogs_PatientId_Timestamp",
                table: "PHIAuditLogs",
                columns: new[] { "PatientId", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_PHIAuditLogs_ResourceType",
                table: "PHIAuditLogs",
                column: "ResourceType");

            migrationBuilder.CreateIndex(
                name: "IX_PHIAuditLogs_Reviewed",
                table: "PHIAuditLogs",
                column: "Reviewed");

            migrationBuilder.CreateIndex(
                name: "IX_PHIAuditLogs_Severity",
                table: "PHIAuditLogs",
                column: "Severity");

            migrationBuilder.CreateIndex(
                name: "IX_PHIAuditLogs_Success",
                table: "PHIAuditLogs",
                column: "Success");

            migrationBuilder.CreateIndex(
                name: "IX_PHIAuditLogs_Timestamp",
                table: "PHIAuditLogs",
                column: "Timestamp");

            migrationBuilder.CreateIndex(
                name: "IX_PHIAuditLogs_UserId",
                table: "PHIAuditLogs",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_PHIAuditLogs_UserId_Timestamp",
                table: "PHIAuditLogs",
                columns: new[] { "UserId", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_PHIBreachIncidents_DetectedAt",
                table: "PHIBreachIncidents",
                column: "DetectedAt");

            migrationBuilder.CreateIndex(
                name: "IX_PHIBreachIncidents_RequiresBreachNotification",
                table: "PHIBreachIncidents",
                column: "RequiresBreachNotification");

            migrationBuilder.CreateIndex(
                name: "IX_PHIBreachIncidents_Severity",
                table: "PHIBreachIncidents",
                column: "Severity");

            migrationBuilder.CreateIndex(
                name: "IX_PHIBreachIncidents_Status",
                table: "PHIBreachIncidents",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PHIAuditLogs");

            migrationBuilder.DropTable(
                name: "PHIBreachIncidents");
        }
    }
}
