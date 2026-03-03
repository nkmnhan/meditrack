using Clara.API.Application.Models;
using Npgsql;

namespace Clara.API.Services;

/// <summary>
/// Raw ADO.NET queries to PostgreSQL pg_stat_activity and pg_stat_database views.
/// Uses a direct connection string (not EF Core) to query system-level stats.
/// </summary>
public sealed class DatabaseMonitorService
{
    private readonly string _connectionString;
    private readonly ILogger<DatabaseMonitorService> _logger;

    public DatabaseMonitorService(IConfiguration configuration, ILogger<DatabaseMonitorService> logger)
    {
        // Use the main postgres connection (ClaraDb) for system-level queries.
        // pg_stat_* views show data for all databases regardless of which DB you connect to.
        _connectionString = configuration.GetConnectionString("ClaraDb")
            ?? throw new InvalidOperationException("ClaraDb connection string is required for database monitoring");
        _logger = logger;
    }

    public async Task<DatabaseMetrics> GetMetricsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            await using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync(cancellationToken);

            var activeConnections = await GetActiveConnectionsAsync(connection, cancellationToken);
            var maxConnections = await GetMaxConnectionsAsync(connection, cancellationToken);
            var databases = await GetDatabaseEntriesAsync(connection, cancellationToken);
            var transactionStats = await GetTransactionStatsAsync(connection, cancellationToken);

            var totalSize = databases.Sum(database => database.SizeBytes);

            return new DatabaseMetrics
            {
                ActiveConnections = activeConnections,
                MaxConnections = maxConnections,
                DatabaseSizeBytes = totalSize,
                DatabaseSizeFormatted = FormatBytes(totalSize),
                TransactionsCommitted = transactionStats.Committed,
                TransactionsRolledBack = transactionStats.RolledBack,
                Databases = databases
            };
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "Failed to fetch database metrics");
            return new DatabaseMetrics
            {
                ActiveConnections = 0,
                MaxConnections = 0,
                DatabaseSizeBytes = 0,
                DatabaseSizeFormatted = "0 B",
                TransactionsCommitted = 0,
                TransactionsRolledBack = 0,
                Databases = []
            };
        }
    }

    private static async Task<int> GetActiveConnectionsAsync(
        NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active'";
        var result = await command.ExecuteScalarAsync(cancellationToken);
        return Convert.ToInt32(result);
    }

    private static async Task<int> GetMaxConnectionsAsync(
        NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = "SHOW max_connections";
        var result = await command.ExecuteScalarAsync(cancellationToken);
        return int.TryParse(result?.ToString(), out var maxConnections) ? maxConnections : 100;
    }

    private static async Task<List<DatabaseEntry>> GetDatabaseEntriesAsync(
        NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        var databases = new List<DatabaseEntry>();

        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT
                d.datname AS name,
                pg_database_size(d.datname) AS size_bytes,
                (SELECT COUNT(*) FROM pg_stat_activity WHERE datname = d.datname) AS active_connections
            FROM pg_database d
            WHERE d.datname LIKE 'meditrack_%'
            ORDER BY size_bytes DESC
            """;

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var sizeBytes = reader.GetInt64(1);
            databases.Add(new DatabaseEntry
            {
                Name = reader.GetString(0),
                SizeBytes = sizeBytes,
                SizeFormatted = FormatBytes(sizeBytes),
                ActiveConnections = reader.GetInt32(2)
            });
        }

        return databases;
    }

    private static async Task<(long Committed, long RolledBack)> GetTransactionStatsAsync(
        NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT
                COALESCE(SUM(xact_commit), 0) AS committed,
                COALESCE(SUM(xact_rollback), 0) AS rolled_back
            FROM pg_stat_database
            WHERE datname LIKE 'meditrack_%'
            """;

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (await reader.ReadAsync(cancellationToken))
        {
            return (reader.GetInt64(0), reader.GetInt64(1));
        }

        return (0, 0);
    }

    private static string FormatBytes(long bytes)
    {
        string[] sizes = ["B", "KB", "MB", "GB", "TB"];
        double formattedSize = bytes;
        int order = 0;

        while (formattedSize >= 1024 && order < sizes.Length - 1)
        {
            order++;
            formattedSize /= 1024;
        }

        return $"{formattedSize:0.##} {sizes[order]}";
    }
}
