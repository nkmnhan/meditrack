using MediTrack.Identity;
using MediTrack.Identity.Data;
using MediTrack.Identity.Models;
using MediTrack.Identity.Services;
using MediTrack.ServiceDefaults;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults("identity-api");

// EF Core + SQL Server
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("IdentityDb")));

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

builder.Services.AddRazorPages();

WebApplication app = builder.Build();

// Migrate database and seed on startup (dev only)
if (app.Environment.IsDevelopment())
{
    using IServiceScope scope = app.Services.CreateScope();
    IServiceProvider services = scope.ServiceProvider;

    ApplicationDbContext dbContext = services.GetRequiredService<ApplicationDbContext>();
    await dbContext.Database.EnsureCreatedAsync();

    UserManager<ApplicationUser> userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
    RoleManager<IdentityRole> roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
    ILogger<Program> logger = services.GetRequiredService<ILogger<Program>>();

    await UsersSeed.SeedAsync(userManager, roleManager, logger);
}

app.MapDefaultEndpoints();
app.UseStaticFiles();
app.UseIdentityServer();
app.UseAuthorization();
app.MapRazorPages();

await app.RunAsync();
