using MediTrack.Identity;
using MediTrack.Identity.Data;
using MediTrack.Identity.Models;
using MediTrack.Identity.Services;
using MediTrack.ServiceDefaults;
using MediTrack.ServiceDefaults.Extensions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults("identity-api");

// EF Core + PostgreSQL
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("IdentityDb")));

// ASP.NET Identity
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
    {
        options.Password.RequireDigit = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireUppercase = true;
        options.Password.RequireNonAlphanumeric = true;
        options.Password.RequiredLength = 8;
    })
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders();

// Duende IdentityServer
builder.Services
    .AddIdentityServer(options =>
    {
        options.Events.RaiseErrorEvents = true;
        options.Events.RaiseInformationEvents = true;
        options.Events.RaiseFailureEvents = true;
        options.Events.RaiseSuccessEvents = true;
        options.EmitStaticAudienceClaim = true;
    })
    .AddInMemoryIdentityResources(IdentityServerConfig.GetIdentityResources())
    .AddInMemoryApiScopes(IdentityServerConfig.GetApiScopes())
    .AddInMemoryClients(IdentityServerConfig.GetClients(builder.Configuration))
    .AddAspNetIdentity<ApplicationUser>()
    .AddProfileService<ProfileService>();

// CORS
builder.Services.AddDefaultCors(builder.Configuration, builder.Environment);

builder.Services.AddRazorPages();

WebApplication app = builder.Build();

// Apply database migrations on startup
using (IServiceScope scope = app.Services.CreateScope())
{
    IServiceProvider services = scope.ServiceProvider;

    ApplicationDbContext dbContext = services.GetRequiredService<ApplicationDbContext>();
    await dbContext.Database.MigrateAsync();

    // Seed default users and roles
    UserManager<ApplicationUser> userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
    RoleManager<IdentityRole> roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
    ILogger<Program> logger = services.GetRequiredService<ILogger<Program>>();

    await UsersSeed.SeedAsync(userManager, roleManager, logger);
}

app.MapDefaultEndpoints();
app.UseCors(CorsExtensions.PolicyName);
app.UseStaticFiles();
app.UseIdentityServer();
app.UseAuthorization();
app.MapRazorPages();

await app.RunAsync();
