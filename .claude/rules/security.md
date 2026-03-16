---
paths:
  - "src/**/*.cs"
  - "src/MediTrack.Web/**"
  - "design/**"
  - "docker-compose*"
---

# Security Rules (OWASP Top 10:2025)

| # | Risk | Rule |
|---|------|------|
| **A01** | **Broken Access Control** | Every endpoint: `[Authorize]` + role/policy. Always check resource ownership (IDOR). Client-side role checks = UX only. Validate redirects against allowlists. SSRF: never fetch user-controlled URLs, allowlist hosts, block internal IPs |
| **A02** | **Security Misconfiguration** | `AllowedHosts` = specific hosts (never `*`). Security headers on all services. No stack traces to clients. No default credentials in production |
| **A03** | **Software Supply Chain Failures** | `npm audit` + `dotnet list package --vulnerable` regularly. Pin dependency versions. Verify package integrity. Review transitive dependencies |
| **A04** | **Cryptographic Failures** | Never hardcode secrets. Use env vars or Key Vault. Strong hashing (bcrypt/Argon2 for passwords). TLS everywhere |
| **A05** | **Injection** | Parameterized queries only (EF Core LINQ). Never `FromSqlRaw` + string concat. Never `dangerouslySetInnerHTML`. LLM prompt injection: wrap user content in XML delimiters |
| **A06** | **Vulnerable & Outdated Components** | Keep frameworks updated. Monitor CVE advisories. Automated dependency scanning in CI |
| **A07** | **Identification & Auth Failures** | Strong passwords. Rate limiting on login. Account lockout. Invalidate sessions on logout. CAPTCHA on public forms |
| **A08** | **Software & Data Integrity Failures** | Validate deserialized types against allowlists. SRI for external scripts. Verify CI/CD pipeline integrity |
| **A09** | **Security Logging & Monitoring Failures** | Log security events. Never log secrets/passwords/tokens/PHI. Structured logging. Alert on anomalies |
| **A10** | **Mishandling of Exceptional Conditions** | Fail securely — errors must not bypass security controls. Catch exceptions at boundaries. Never expose stack traces. Validate all error paths maintain authorization |

## Security Headers (Every Service)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy` (appropriate per service)

## Secrets
- Never commit secrets. Placeholders in `appsettings.json` → override via env vars
- IdentityServer client secrets from `IConfiguration`, not inline strings
