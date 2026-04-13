using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Pgvector;

#nullable disable

namespace MediTrack.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:vector", ",,");

            migrationBuilder.CreateTable(
                name: "agent_memories",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    agent_id = table.Column<string>(type: "text", nullable: false),
                    session_id = table.Column<Guid>(type: "uuid", nullable: false),
                    patient_id = table.Column<string>(type: "text", nullable: true),
                    content = table.Column<string>(type: "text", nullable: false),
                    memory_type = table.Column<string>(type: "text", nullable: false),
                    embedding = table.Column<Vector>(type: "vector(1536)", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    last_accessed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    access_count = table.Column<int>(type: "integer", nullable: false, defaultValue: 0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_agent_memories", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "documents",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    file_name = table.Column<string>(type: "text", nullable: false),
                    uploaded_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    uploaded_by = table.Column<string>(type: "text", nullable: false),
                    chunk_count = table.Column<int>(type: "integer", nullable: false),
                    category = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_documents", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "sessions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    doctor_id = table.Column<string>(type: "text", nullable: false),
                    patient_id = table.Column<string>(type: "text", nullable: true),
                    started_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ended_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false),
                    session_type = table.Column<string>(type: "text", nullable: false, defaultValue: "Consultation"),
                    audio_recorded = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    speaker_map = table.Column<Dictionary<string, string>>(type: "jsonb", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sessions", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "knowledge_chunks",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    document_name = table.Column<string>(type: "text", nullable: false),
                    content = table.Column<string>(type: "text", nullable: false),
                    embedding = table.Column<Vector>(type: "vector(1536)", nullable: true),
                    category = table.Column<string>(type: "text", nullable: true),
                    chunk_index = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    document_id = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_knowledge_chunks", x => x.id);
                    table.ForeignKey(
                        name: "FK_knowledge_chunks_documents_document_id",
                        column: x => x.document_id,
                        principalTable: "documents",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "suggestions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    session_id = table.Column<Guid>(type: "uuid", nullable: false),
                    content = table.Column<string>(type: "text", nullable: false),
                    triggered_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    type = table.Column<string>(type: "text", nullable: false),
                    source = table.Column<string>(type: "text", nullable: false),
                    urgency = table.Column<string>(type: "text", nullable: true),
                    confidence = table.Column<float>(type: "real", nullable: true),
                    reasoning = table.Column<string>(type: "text", nullable: true),
                    source_transcript_line_ids = table.Column<List<Guid>>(type: "jsonb", nullable: false),
                    accepted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    dismissed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_suggestions", x => x.id);
                    table.ForeignKey(
                        name: "FK_suggestions_sessions_session_id",
                        column: x => x.session_id,
                        principalTable: "sessions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "transcript_lines",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    session_id = table.Column<Guid>(type: "uuid", nullable: false),
                    speaker = table.Column<string>(type: "text", nullable: false),
                    text = table.Column<string>(type: "text", nullable: false),
                    timestamp = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    confidence = table.Column<float>(type: "real", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_transcript_lines", x => x.id);
                    table.ForeignKey(
                        name: "FK_transcript_lines_sessions_session_id",
                        column: x => x.session_id,
                        principalTable: "sessions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_agent_memories_agent_id",
                table: "agent_memories",
                column: "agent_id");

            migrationBuilder.CreateIndex(
                name: "IX_agent_memories_created_at",
                table: "agent_memories",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "IX_agent_memories_embedding",
                table: "agent_memories",
                column: "embedding")
                .Annotation("Npgsql:IndexMethod", "hnsw")
                .Annotation("Npgsql:IndexOperators", new[] { "vector_cosine_ops" })
                .Annotation("Npgsql:StorageParameter:ef_construction", 64)
                .Annotation("Npgsql:StorageParameter:m", 16);

            migrationBuilder.CreateIndex(
                name: "IX_agent_memories_patient_id",
                table: "agent_memories",
                column: "patient_id");

            migrationBuilder.CreateIndex(
                name: "IX_knowledge_chunks_category",
                table: "knowledge_chunks",
                column: "category");

            migrationBuilder.CreateIndex(
                name: "IX_knowledge_chunks_document_id",
                table: "knowledge_chunks",
                column: "document_id");

            migrationBuilder.CreateIndex(
                name: "IX_knowledge_chunks_document_name",
                table: "knowledge_chunks",
                column: "document_name");

            migrationBuilder.CreateIndex(
                name: "IX_knowledge_chunks_embedding",
                table: "knowledge_chunks",
                column: "embedding")
                .Annotation("Npgsql:IndexMethod", "hnsw")
                .Annotation("Npgsql:IndexOperators", new[] { "vector_cosine_ops" })
                .Annotation("Npgsql:StorageParameter:ef_construction", 64)
                .Annotation("Npgsql:StorageParameter:m", 16);

            migrationBuilder.CreateIndex(
                name: "IX_sessions_doctor_id",
                table: "sessions",
                column: "doctor_id");

            migrationBuilder.CreateIndex(
                name: "IX_sessions_started_at",
                table: "sessions",
                column: "started_at");

            migrationBuilder.CreateIndex(
                name: "IX_suggestions_session_id",
                table: "suggestions",
                column: "session_id");

            migrationBuilder.CreateIndex(
                name: "IX_suggestions_triggered_at",
                table: "suggestions",
                column: "triggered_at");

            migrationBuilder.CreateIndex(
                name: "IX_transcript_lines_session_id",
                table: "transcript_lines",
                column: "session_id");

            migrationBuilder.CreateIndex(
                name: "IX_transcript_lines_timestamp",
                table: "transcript_lines",
                column: "timestamp");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "agent_memories");

            migrationBuilder.DropTable(
                name: "knowledge_chunks");

            migrationBuilder.DropTable(
                name: "suggestions");

            migrationBuilder.DropTable(
                name: "transcript_lines");

            migrationBuilder.DropTable(
                name: "documents");

            migrationBuilder.DropTable(
                name: "sessions");
        }
    }
}
