---
applyTo: "**/*.cs,src/MediTrack.Web/src/**/*.{ts,tsx},design/src/**/*.{ts,tsx},docker-compose*.yml"
---

# Security Rules — OWASP Top 10:2025

## Access Control (A01)

- Every endpoint **must** have `[Authorize]` or `.RequireAuthorization()` with a specific role/policy — never unauthenticated by default
- Always check resource ownership (IDOR) — a Patient cannot access another Patient's data
- Client-side role checks are UX only; backend authorization is authoritative
- Validate redirects against allowlists
- SSRF prevention: never fetch user-controlled URLs; allowlist hosts; block internal IPs

## Security Misconfiguration (A02)

- `AllowedHosts` = specific hosts (never `*` in production)
- Apply security headers on all services (see below)
- No stack traces to clients
- No default credentials in any environment

## Injection (A05)

- Parameterized queries only via EF Core LINQ — **never** `FromSqlRaw` with string concatenation
- **Never** `dangerouslySetInnerHTML` in React
- LLM prompt injection defense: wrap user content in XML delimiters when building prompts

## Cryptographic Failures (A04)

- **Never** hardcode secrets, connection strings, or API keys
- Use environment variables or Azure Key Vault
- Strong hashing: bcrypt/Argon2 for passwords
- TLS everywhere — no plain HTTP in production

## Authentication Failures (A07)

- Rate limiting on login endpoints
- Account lockout after failed attempts
- Invalidate sessions/tokens on logout
- CAPTCHA on public-facing forms

## Security Logging (A09)

- Log all security events (login, logout, failed auth, permission denied)
- **Never** log secrets, passwords, tokens, or PHI in any log output
- Structured logging (key-value pairs, not interpolated strings)
- Alert on anomalies

## Required Security Headers (every service)

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: (appropriate per service)
```

## Secrets Management

- **Never** commit real secrets to source control
- Placeholders in `appsettings.json` → override via environment variables at runtime
- IdentityServer client secrets from `IConfiguration`, not inline strings

## Healthcare-Specific (PHI — HIPAA)

- Every MCP tool call in Clara that touches patient data **must** be audit-logged via `IPHIAuditService`
- Audit includes: `patientId`, `action`, fields accessed, `success`, timestamp
- Audit calls are best-effort (wrapped in try/catch) — they must never interrupt clinical workflows
- Never log PHI in application logs — only structured audit events
