using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace Clara.IntegrationTests;

/// <summary>
/// Test server factory for Clara.API integration tests.
/// Requires a real PostgreSQL instance with pgvector extension installed.
/// Set CLARA_TEST_DB environment variable to override the default connection string.
/// Default: Host=localhost;Database=meditrack_clara_test;Username=meditrack;Password=meditrack
/// </summary>
public sealed class ClaraApiFactory : WebApplicationFactory<Program>
{
    private static readonly string DefaultTestConnectionString =
        "Host=localhost;Database=meditrack_clara_test;Username=meditrack;Password=meditrack;Include Error Detail=true";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        var testConnectionString = Environment.GetEnvironmentVariable("CLARA_TEST_DB")
            ?? DefaultTestConnectionString;

        builder.ConfigureAppConfiguration(config =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:ClaraDb"] = testConnectionString,
            });
        });
    }
}
