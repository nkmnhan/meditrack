# Plan: OWASP Top 10 Hardening

## Overview

Systematic hardening of MediTrack against [OWASP Top 10 (2021)](https://owasp.org/www-project-top-ten/) risks. Based on a full codebase security scan.

---

## A01 — Broken Access Control

### Fixed

- [x] Dev seeder endpoint — environment-gated (already only mapped in Development)

### To Do

| Task | Files | Severity |
|------|-------|----------|
| Add IDOR (ownership) checks on Patient endpoints | `Patient.API/Apis/PatientsApi.cs`, `PatientService.cs` | HIGH |
| Add IDOR checks on Appointment endpoints | `Appointment.API/Apis/AppointmentsApi.cs`, `AppointmentService.cs` | HIGH |
| Add IDOR checks on MedicalRecords endpoints | `MedicalRecords.API/Apis/MedicalRecordsApi.cs` | HIGH |
| Add granular role-based policies per endpoint | All API files | MEDIUM |
| Validate `postLogoutRedirectUri` against allowlist | `Identity.API/Pages/Account/Logout/LoggedOut.cshtml.cs` | MEDIUM |

**IDOR pattern to implement:**
```csharp
// In every endpoint that returns a resource:
// 1. Get current user ID from claims
// 2. Verify user owns the resource OR has Admin/Doctor role
var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
if (resource.PatientId != currentUserId && !User.IsInRole(UserRoles.Admin))
    return Results.Forbid();
```

---

## A02 — Cryptographic Failures

### Fixed

- [x] Hardcoded RabbitMQ `guest/guest` in `appsettings.json` → replaced with env var placeholders
- [x] Hardcoded `service-secret` in `IdentityServerConfig.cs` → reads from `IConfiguration`
- [x] Docker Compose uses env vars for all credentials

### To Do

| Task | Files | Severity |
|------|-------|----------|
| Add HSTS middleware to all backend services | All `Program.cs` files | MEDIUM |
| Document secret rotation procedure | `CLAUDE.md` (Secrets Rule section) | LOW |

---

## A03 — Injection

### Status: PASS

- All queries use EF Core LINQ (parameterized)
- No `FromSqlRaw` or `ExecuteSqlRaw` with string concatenation
- No `dangerouslySetInnerHTML` in React
- FluentValidation on all input DTOs

---

## A04 — Insecure Design

### To Do

| Task | Files | Severity |
|------|-------|----------|
| Add rate limiting middleware (ASP.NET Core built-in) | All `Program.cs` | MEDIUM |
| Configure Identity lockout policy explicitly | `Identity.API/Program.cs` | LOW |

**Rate limiting pattern:**
```csharp
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("login", opt =>
    {
        opt.PermitLimit = 5;
        opt.Window = TimeSpan.FromMinutes(1);
    });
});
```

---

## A05 — Security Misconfiguration

### Fixed

- [x] nginx.conf — added CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy headers
- [x] RabbitMQ credentials externalized from `appsettings.json`

### To Do

| Task | Files | Severity |
|------|-------|----------|
| Set `AllowedHosts` to specific hosts in production appsettings | All `appsettings.json` | MEDIUM |
| Add security headers middleware to all backend services | All `Program.cs` | MEDIUM |
| Restrict CORS to specific methods/headers instead of `AllowAnyMethod/AllowAnyHeader` | `CorsExtensions.cs` | LOW |
| Ensure `app.UseDeveloperExceptionPage()` is not in production | All `Program.cs` | LOW |

**Security headers middleware pattern:**
```csharp
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    await next();
});
```

---

## A06 — Vulnerable and Outdated Components

### To Do

| Task | Frequency | Command |
|------|-----------|---------|
| Audit npm packages | Every sprint | `npm audit` |
| Audit NuGet packages | Every sprint | `dotnet list package --vulnerable` |
| Update dependencies | Monthly | Review changelogs before updating |
| Add Dependabot to GitHub | Once | `.github/dependabot.yml` |

---

## A07 — Identification and Authentication Failures

### Fixed

- [x] OIDC config — added `monitorSession`, `revokeTokensOnSignout`, `accessTokenExpiringNotificationTimeInSeconds`

### To Do

| Task | Files | Severity |
|------|-------|----------|
| Configure explicit lockout policy (duration, max attempts) | `Identity.API/Program.cs` | MEDIUM |
| Add rate limiting on login endpoint | `Identity.API` | MEDIUM |
| Handle token refresh failures in React (redirect to login) | `AuthProvider.tsx` | MEDIUM |
| Implement MFA (design exists in `docs/mfa-design.md`) | `Identity.API` | LOW (future) |

---

## A08 — Software and Data Integrity Failures

### Status: Partially Mitigated

- JSON deserialization in EventBus uses type-validated subscriptions (allowlist-based)
- No untrusted type deserialization

### To Do

| Task | Files | Severity |
|------|-------|----------|
| Add `npm ci --audit` to CI/CD pipeline | `.github/workflows/` | LOW |
| Add SRI attributes if external scripts are ever added | `index.html` | LOW |

---

## A09 — Security Logging and Monitoring Failures

### Status: STRONG

- PHI audit logging implemented via EventBus + Notification.Worker
- Login success/failure events logged via IdentityServer
- Structured audit log entries with user ID, IP, user agent

### To Do

| Task | Files | Severity |
|------|-------|----------|
| Add audit logging for authorization failures (403s) | All API endpoints | MEDIUM |
| Ensure sensitive data is never logged (tokens, passwords) | All services | MEDIUM |
| Add alerting for repeated failed login attempts | `Notification.Worker` | LOW |

---

## A10 — Server-Side Request Forgery (SSRF)

### Status: PASS

- No user-controlled URL fetching
- All external URLs come from configuration
- Telehealth URIs validated as absolute URIs only

---

## Priority Order

1. **IDOR ownership checks** (A01) — highest impact, patient data at risk
2. **Security headers on backend services** (A05) — quick win
3. **Rate limiting** (A04/A07) — prevents brute-force
4. **AllowedHosts config** (A05) — prevents host header injection
5. **Open redirect fix** (A01) — validation against allowlist
6. **Granular role policies** (A01) — defense in depth
7. **CI/CD audit pipeline** (A06/A08) — automated safety net
