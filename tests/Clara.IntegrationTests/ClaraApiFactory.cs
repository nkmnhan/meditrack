using Clara.API.Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

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
                ["IdentityUrl"] = "https://localhost:5001",
            });
        });

        builder.ConfigureTestServices(services =>
        {
            services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                options.DefaultChallengeScheme = TestAuthHandler.SchemeName;
            })
            .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(
                TestAuthHandler.SchemeName, _ => { });

            // Replace ClaraDbContext with pgvector + dynamic JSON data source
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<ClaraDbContext>));
            if (descriptor is not null)
                services.Remove(descriptor);

            var testConnectionString = Environment.GetEnvironmentVariable("CLARA_TEST_DB")
                ?? DefaultTestConnectionString;

            var dataSource = TestDataSourceFactory.Create(testConnectionString);

            services.AddDbContext<ClaraDbContext>(options =>
                options.UseNpgsql(dataSource, npgsql => npgsql.UseVector()));

            // Replace real AI services with fakes to avoid calling OpenAI
            services.AddSingleton<IEmbeddingGenerator<string, Embedding<float>>>(
                new FakeEmbeddingGenerator());
        });
    }
}
