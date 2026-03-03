using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MediTrack.Migrations
{
    /// <inheritdoc />
    public partial class AddCreatedAtIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Patients_CreatedAt",
                table: "Patients",
                column: "CreatedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Patients_CreatedAt",
                table: "Patients");
        }
    }
}
