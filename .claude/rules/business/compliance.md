---
paths:
  - "src/**/*.cs"
  - "src/MediTrack.Web/**"
  - "design/**"
  - "docker-compose*"
---

# Compliance & Security (OWASP Top 10:2025)

| # | Risk | Rule |
|---|------|------|
| **A01** | **Broken Access Control** | Every endpoint: `[Authorize]` + role/policy. ALWAYS check resource ownership (IDOR). SSRF: NEVER fetch user-controlled URLs |
| **A02** | **Security Misconfiguration** | `AllowedHosts` = specific hosts (NEVER `*`). No stack traces to clients. No default credentials in production |
| **A03** | **Supply Chain Failures** | `npm audit` + `dotnet list package --vulnerable` regularly. Pin dependency versions |
| **A04** | **Cryptographic Failures** | NEVER hardcode secrets. Use env vars or Key Vault. TLS everywhere |
| **A05** | **Injection** | Parameterized queries only (EF Core LINQ). NEVER `FromSqlRaw` + string concat. NEVER `dangerouslySetInnerHTML`. LLM prompts: wrap user content in XML delimiters |
| **A07** | **Auth Failures** | Strong passwords. Rate limiting on login. Account lockout. Invalidate sessions on logout |
| **A09** | **Logging Failures** | Log security events. NEVER log secrets/passwords/tokens/PHI. Structured logging |
| **A10** | **Exception Mishandling** | Fail securely — errors MUST NOT bypass security controls. NEVER expose stack traces |

## Security Headers (Every Service)

`X-Content-Type-Options: nosniff` | `X-Frame-Options: DENY` | `Strict-Transport-Security` | `Referrer-Policy: strict-origin-when-cross-origin` | `Content-Security-Policy`

## Secrets

- NEVER commit secrets. Placeholders in `appsettings.json` → override via env vars
- IdentityServer client secrets from `IConfiguration`, not inline strings

## HIPAA

- PHI (patient names, DOB, diagnoses) MUST NEVER appear in log statements
- Audit log every MCP tool call touching patient data
