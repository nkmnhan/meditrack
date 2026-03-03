using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MediTrack.Migrations
{
    /// <inheritdoc />
    public partial class AddLastLoginAtIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_LastLoginAt",
                table: "AspNetUsers",
                column: "LastLoginAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AspNetUsers_LastLoginAt",
                table: "AspNetUsers");
        }
    }
}
