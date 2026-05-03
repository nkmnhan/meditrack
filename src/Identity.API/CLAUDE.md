# Identity Service — Domain Context

## Overview
Authentication & authorization via Duende IdentityServer 7. Simple pattern (single project). Manages users, roles, and OAuth2/OIDC flows.

## Domain Glossary
| Term | Meaning |
|------|---------|
| **ApplicationUser** | Extends ASP.NET Identity `IdentityUser` with `FirstName`, `LastName`, `LastLoginAt` |
| **Roles** | `Admin`, `Doctor`, `Nurse`, `Patient` — defined in `UserRoles` constants class |
| **OIDC** | OpenID Connect — used by frontend (`oidc-client-ts` + `react-oidc-context`) |
| **Client** | OAuth2 client (e.g., `meditrack-web` SPA client, service-to-service clients) |

## Key Files
| File | Purpose |
|------|---------|
| `Models/ApplicationUser.cs` | User entity extending IdentityUser |
| `Config.cs` | IdentityServer client/scope/resource configuration |
| `Program.cs` | Composition root with IdentityServer + ASP.NET Identity setup |
| `Data/IdentityServerDbContextFactory.cs` | Design-time EF migration factories (dev-only, not deployed) |

## Seeding — Simulator Dependency

> ⚠️ **Important**: `UsersSeed.cs` was removed in favour of the `MediTrack.Simulator` as the single
> source of seeding. **A bare deployment without running the Simulator will result in no admin user,
> no roles, and empty IdentityServer configuration tables — meaning no client can authenticate.**
>
> For CI pipelines, disaster recovery, or any environment where the Simulator is not run:
> - Run `dotnet run --project src/MediTrack.Simulator` once after `dotnet ef database update` to seed all data.
> - Or restore a minimal startup seed by re-adding role + admin user creation to `Program.cs`.

## Frontend Integration
- Login flow: `oidc-client-ts` redirects to Identity.API → user authenticates → redirect back with tokens
- Token refresh: handled by `oidc-client-ts` silently
- Role-based UI: `RoleGuard` component (UX only, not security)

## Port: 5001 | HTTPS required for OIDC
