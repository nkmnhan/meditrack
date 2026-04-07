using Npgsql;
using Pgvector;

namespace Clara.IntegrationTests;

/// <summary>
/// Creates a configured NpgsqlDataSource with pgvector and dynamic JSON support.
/// Isolated in its own file to avoid extension method conflicts between
/// Pgvector (NpgsqlDataSourceBuilder.UseVector) and Pgvector.EntityFrameworkCore
/// (NpgsqlDbContextOptionsBuilder.UseVector).
/// </summary>
public static class TestDataSourceFactory
{
    public static NpgsqlDataSource Create(string connectionString)
    {
        var builder = new NpgsqlDataSourceBuilder(connectionString);
        builder.UseVector();
        builder.EnableDynamicJson();
        return builder.Build();
    }
}
