using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MediTrack.Migrations
{
    /// <inheritdoc />
    public partial class AddSessionAnalyticsIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_sessions_doctor_id",
                table: "sessions",
                column: "doctor_id");

            migrationBuilder.CreateIndex(
                name: "IX_sessions_started_at",
                table: "sessions",
                column: "started_at");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_sessions_doctor_id",
                table: "sessions");

            migrationBuilder.DropIndex(
                name: "IX_sessions_started_at",
                table: "sessions");
        }
    }
}
