# MediTrack.ServiceDefaults — Shared Service Infrastructure

## Overview
One-call bootstrapper for every .NET service. Wires OpenTelemetry, health checks, CORS, HTTPS security headers, resilience pipelines, and JWT authentication in a consistent, policy-enforced way.

## Key Files
| File | Purpose |
|------|---------|
| `ServiceDefaultsExtensions.cs` | Entry point: `AddServiceDefaults(serviceName)` + `MapDefaultEndpoints()` |
| `Extensions/AuthenticationExtensions.cs` | JWT Bearer config — validates against IdentityServer. `RequireHttpsMetadata = true` always |
| `Extensions/OpenTelemetryExtensions.cs` | Tracing (OTLP → Jaeger) + metrics (Prometheus) |
| `Extensions/HealthCheckExtensions.cs` | `/health` + `/alive` endpoints |
| `Extensions/SecurityExtensions.cs` | Registers `SecurityHeadersMiddleware` |
| `Extensions/CorsExtensions.cs` | Allows `http://localhost:3000` in dev, locked down in prod |
| `Extensions/CompressionExtensions.cs` | Brotli + gzip response compression |
| `Extensions/ResilienceExtensions.cs` | Polly retry + circuit breaker for outgoing HTTP |
| `Middleware/SecurityHeadersMiddleware.cs` | Sets CSP, HSTS, X-Frame-Options, X-Content-Type-Options |
| `AuthorizationPolicies.cs` | Named policies: `RequireDoctor`, `RequireAdmin`, `RequireNurseOrDoctor`, etc. |

## Usage (every service Program.cs)
```csharp
builder.AddServiceDefaults("patient-api");  // ← call first
// ...
app.MapDefaultEndpoints();  // ← maps /health and /alive
```

## Rule
**NEVER** duplicate these cross-cutting concerns in individual services. Add to ServiceDefaults if it applies to 2+ services.
