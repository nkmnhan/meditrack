# MediTrack — Security

## Authentication & Authorization

- **Protocol**: OpenID Connect (OIDC) + OAuth 2.0 with PKCE
- **Identity Provider**: Duende IdentityServer (Identity.API)
- **Token Type**: JWT Bearer tokens
- **Frontend**: `oidc-client-ts` / `react-oidc-context` manages the OIDC flow

## API Security

- All APIs require a valid Bearer token (`Authorization: Bearer <token>`)
- Each API validates the token against the IdentityServer discovery document
- Scopes: `patient-api`, `appointment-api`, `medicalrecords-api`

## Secrets Management

- Secrets are passed via environment variables (never committed to source control)
- Use `.env` (from `.env.example`) for local development
- In production, use Docker secrets or a vault solution (e.g., Azure Key Vault, HashiCorp Vault)

## HIPAA Considerations (Planned)

- Audit logging for all PHI access
- Encryption at rest (SQL Server TDE)
- Encryption in transit (TLS everywhere)
- Role-based access control (RBAC) aligned with clinical roles

## Dependency Security

- All packages pinned to specific versions in `Directory.Packages.props`
- Renovate / Dependabot to be configured for automated dependency updates
