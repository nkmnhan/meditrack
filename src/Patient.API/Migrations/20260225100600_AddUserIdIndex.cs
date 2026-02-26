using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Patient.API.Infrastructure;

#nullable disable

namespace MediTrack.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(PatientDbContext))]
    [Migration("20260225100600_AddUserIdIndex")]
    public partial class AddUserIdIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Patients_UserId",
                table: "Patients",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Patients_UserId",
                table: "Patients");
        }
    }
}
