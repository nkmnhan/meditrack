---
paths:
  - "src/**/*.cs"
  - "src/MediTrack.Web/**"
  - "docker-compose*"
---

# Security Rules (OWASP Top 10)

| Risk | Rule |
|------|------|
| **Broken Access Control** | Every endpoint: `[Authorize]` + role/policy. Always check resource ownership (IDOR). Client-side role checks = UX only |
| **Cryptographic Failures** | Never hardcode secrets. Use env vars or Key Vault. Strong hashing (bcrypt/Argon2 for passwords) |
| **Injection** | Parameterized queries only (EF Core LINQ). Never `FromSqlRaw` + string concat. Never `dangerouslySetInnerHTML` |
| **Insecure Design** | Rate-limit auth endpoints. Account lockout. CAPTCHA on public forms |
| **Security Misconfiguration** | `AllowedHosts` = specific hosts (never `*`). Security headers on all services. No stack traces to clients |
| **Vulnerable Components** | `npm audit` + `dotnet list package --vulnerable` regularly |
| **Auth Failures** | Strong passwords. Rate limiting on login. Invalidate sessions on logout |
| **Integrity Failures** | Validate deserialized types against allowlists. SRI for external scripts |
| **Logging & Monitoring** | Log security events. Never log secrets/passwords/tokens. Structured logging |
| **SSRF** | Never fetch user-controlled URLs without validation. Allowlist hosts. Block internal IPs |

## Security Headers (Every Service)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy` (appropriate per service)

## Secrets
- Never commit secrets. Placeholders in `appsettings.json` → override via env vars
- IdentityServer client secrets from `IConfiguration`, not inline strings
