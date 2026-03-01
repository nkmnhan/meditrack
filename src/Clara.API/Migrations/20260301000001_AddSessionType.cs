using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MediTrack.Migrations
{
    /// <inheritdoc />
    public partial class AddSessionType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "session_type",
                table: "sessions",
                type: "text",
                nullable: false,
                defaultValue: "Consultation");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "session_type",
                table: "sessions");
        }
    }
}
