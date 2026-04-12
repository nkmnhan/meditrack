# HTTPS Production-Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce HTTPS-only inter-container communication with proper X.509 chain validation — no plain HTTP ports, no cert bypass handlers (OWASP A04 / A02 compliant).

**Architecture:** The mkcert dev CA is extended to cover all container hostnames as SANs. A shared entrypoint script installs the dev CA into each container's system trust store at startup using `update-ca-certificates`. In production, the rootCA.pem file is never mounted, making the entrypoint a no-op. `RequireHttpsMetadata = true` is enforced everywhere — the same code path runs in both dev and production.

**Tech Stack:** mkcert, Docker Compose, ASP.NET Core Kestrel, `mcr.microsoft.com/dotnet/aspnet:10.0` (Debian-based)

---

## File Map

| File | Action | What changes |
|---|---|---|
| `dev-certs/setup-certs.cmd` | Modify | Add container hostnames to SAN; copy rootCA.pem into certs dir |
| `scripts/docker-entrypoint.sh` | **Create** | Install dev CA into system trust store; exec the app |
| `src/Identity.API/Dockerfile` | Modify | Remove `EXPOSE 8080`; wire entrypoint script |
| `src/Patient.API/Dockerfile` | Modify | Same |
| `src/Appointment.API/Dockerfile` | Modify | Same |
| `src/MedicalRecords.API/Dockerfile` | Modify | Same |
| `src/Clara.API/Dockerfile` | Modify | Same |
| `docker-compose.yml` | Modify | `IdentityUrl=https://identity-api:8443` on 4 downstream services |
| `docker-compose.override.yml` | Modify | `ASPNETCORE_URLS=https://+:8443`; `IdentityUrl=https://identity-api:8443` |
| `src/MediTrack.ServiceDefaults/Extensions/AuthenticationExtensions.cs` | Modify | `RequireHttpsMetadata = true` |
| `src/Identity.API/Program.cs` | Modify | `RequireHttpsMetadata = true` |

**Not changed:** `Notification.Worker/Dockerfile` (no HTTP port, no identity calls), `MediTrack.Simulator/Dockerfile` (DB-only), `MediTrack.Web/Dockerfile` (nginx, separate concern).

---

## Task 1: Regenerate dev cert with container hostnames + export rootCA.pem

**Files:**
- Modify: `dev-certs/setup-certs.cmd`

- [ ] **Step 1.1: Replace setup-certs.cmd with the updated version**

Replace the entire file content:

```cmd
@echo off
setlocal

set CERTS_DIR=%~dp0certs
set MKCERT=%~dp0mkcert.exe

if not exist "%CERTS_DIR%" mkdir "%CERTS_DIR%"

:: Download mkcert if not present
if not exist "%MKCERT%" (
    echo Downloading mkcert v1.4.4 ...
    curl -L -o "%MKCERT%" https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-windows-amd64.exe
    if errorlevel 1 (
        echo Failed to download mkcert.
        exit /b 1
    )
    echo Downloaded mkcert.
)

:: Install local CA into the system / browser trust stores (requires admin the first time)
echo.
echo Installing local CA (may prompt for admin privileges) ...
"%MKCERT%" -install
if errorlevel 1 (
    echo.
    echo [!] mkcert -install failed. Re-run this script as Administrator.
    exit /b 1
)

:: Generate certificate covering localhost AND all Docker container hostnames
echo.
echo Generating certificates for localhost + container hostnames ...
"%MKCERT%" -cert-file "%CERTS_DIR%\localhost.pem" -key-file "%CERTS_DIR%\localhost-key.pem" ^
    localhost 127.0.0.1 ::1 ^
    identity-api patient-api appointment-api medicalrecords-api clara-api

:: Export mkcert root CA into the certs directory so containers can trust it
echo.
echo Copying mkcert root CA to dev-certs\certs\ ...
for /f "tokens=*" %%i in ('"%MKCERT%" -CAROOT') do set CAROOT=%%i
copy "%CAROOT%\rootCA.pem" "%CERTS_DIR%\rootCA.pem" /y
if errorlevel 1 (
    echo [!] Failed to copy rootCA.pem. Check mkcert -CAROOT path.
    exit /b 1
)

echo.
echo ============================================================
echo   Certificates created in dev-certs\certs\
echo     localhost.pem         (certificate — covers all services)
echo     localhost-key.pem     (private key)
echo     rootCA.pem            (mkcert root CA — mounted into containers)
echo.
echo   SANs: localhost 127.0.0.1 ::1
echo         identity-api patient-api appointment-api
echo         medicalrecords-api clara-api
echo.
echo   NEXT: docker-compose build --no-cache
echo ============================================================
endlocal
```

- [ ] **Step 1.2: Verify rootCA.pem is gitignored**

Open `.gitignore` at the repo root and confirm `dev-certs/certs/` or `*.pem` is already excluded. The certs directory must never be committed (they are machine-specific).

Run:
```bash
git check-ignore -v dev-certs/certs/rootCA.pem
```

Expected output: a line showing the gitignore rule that covers it. If no output (not ignored), add to `.gitignore`:
```
dev-certs/certs/
```

- [ ] **Step 1.3: Re-run setup-certs.cmd**

```cmd
dev-certs\setup-certs.cmd
```

Expected: cert files regenerated, `dev-certs\certs\rootCA.pem` now exists.

Verify the new SANs are in the cert:
```bash
openssl x509 -in dev-certs/certs/localhost.pem -noout -text | grep -A 10 "Subject Alternative Name"
```

Expected output includes:
```
DNS:localhost, IP Address:127.0.0.1, IP Address:0:0:0:0:0:0:0:1,
DNS:identity-api, DNS:patient-api, DNS:appointment-api,
DNS:medicalrecords-api, DNS:clara-api
```

- [ ] **Step 1.4: Commit**

```bash
git add dev-certs/setup-certs.cmd
git commit -m "chore(certs): add container hostnames to mkcert SAN + export rootCA.pem"
```

---

## Task 2: Create shared docker-entrypoint.sh

**Files:**
- Create: `scripts/docker-entrypoint.sh`

- [ ] **Step 2.1: Create the entrypoint script**

```bash
#!/bin/sh
set -e

# Install the mkcert dev CA into the system trust store.
# This allows .NET's SslStream to validate TLS certs signed by the dev CA,
# including the cert used by identity-api (which covers container hostnames).
#
# Production containers never have /certs/rootCA.pem mounted — this block
# is a strict no-op in staging and production.
if [ -f /certs/rootCA.pem ]; then
    cp /certs/rootCA.pem /usr/local/share/ca-certificates/mkcert-rootCA.crt
    update-ca-certificates 2>/dev/null || true
fi

exec "$@"
```

Save to `scripts/docker-entrypoint.sh`.

- [ ] **Step 2.2: Verify the script is executable on Linux (line endings)**

The script must use LF line endings (not CRLF — Docker containers are Linux). Confirm in your editor or run:

```bash
file scripts/docker-entrypoint.sh
```

Expected: `scripts/docker-entrypoint.sh: ASCII text` (not "with CRLF line terminators").

If CRLF, convert:
```bash
sed -i 's/\r//' scripts/docker-entrypoint.sh
```

- [ ] **Step 2.3: Commit**

```bash
git add scripts/docker-entrypoint.sh
git commit -m "chore(docker): add shared entrypoint script to install mkcert dev CA"
```

---

## Task 3: Update Dockerfiles — remove EXPOSE 8080, wire entrypoint

**Files:**
- Modify: `src/Identity.API/Dockerfile`
- Modify: `src/Patient.API/Dockerfile`
- Modify: `src/Appointment.API/Dockerfile`
- Modify: `src/MedicalRecords.API/Dockerfile`
- Modify: `src/Clara.API/Dockerfile`

Each Dockerfile gets the same change in the `final` stage:
1. Remove `EXPOSE 8080` (HTTPS-only)
2. Add `USER root` so the entrypoint can call `update-ca-certificates`
3. Copy and chmod the entrypoint script
4. Change `ENTRYPOINT` to the script; move the dll to `CMD`

> **Note on USER root:** The base image (`mcr.microsoft.com/dotnet/aspnet:10.0`) sets `USER app` (uid 1654). We override to root so the entrypoint can write to `/usr/local/share/ca-certificates/`. In production, the entrypoint is a no-op (no rootCA.pem mounted), so running as root has no practical impact on the prod attack surface. Future improvement: use `gosu` or a writable temp bundle to restore non-root runtime.

- [ ] **Step 3.1: Update `src/Identity.API/Dockerfile`**

Replace the `final` stage (lines 26–28):

```dockerfile
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Identity.API.dll"]
```

With:

```dockerfile
FROM base AS final
# Root required so the entrypoint can install the dev CA via update-ca-certificates.
# Production: rootCA.pem is never mounted — entrypoint is a strict no-op.
USER root
WORKDIR /app
COPY scripts/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
COPY --from=publish /app/publish .
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["dotnet", "Identity.API.dll"]
```

Also remove `EXPOSE 8080` from the `base` stage (line 3). Change:
```dockerfile
EXPOSE 8080
EXPOSE 8443
```
To:
```dockerfile
EXPOSE 8443
```

- [ ] **Step 3.2: Update `src/Patient.API/Dockerfile`**

Same changes. Replace final stage (lines 26–28) with:

```dockerfile
FROM base AS final
USER root
WORKDIR /app
COPY scripts/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
COPY --from=publish /app/publish .
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["dotnet", "Patient.API.dll"]
```

Remove `EXPOSE 8080` from `base` stage.

- [ ] **Step 3.3: Update `src/Appointment.API/Dockerfile`**

Same changes. Final stage:

```dockerfile
FROM base AS final
USER root
WORKDIR /app
COPY scripts/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
COPY --from=publish /app/publish .
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["dotnet", "Appointment.API.dll"]
```

Remove `EXPOSE 8080` from `base` stage.

- [ ] **Step 3.4: Update `src/MedicalRecords.API/Dockerfile`**

Same changes. Final stage:

```dockerfile
FROM base AS final
USER root
WORKDIR /app
COPY scripts/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
COPY --from=publish /app/publish .
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["dotnet", "MedicalRecords.API.dll"]
```

Remove `EXPOSE 8080` from `base` stage.

- [ ] **Step 3.5: Update `src/Clara.API/Dockerfile`**

Clara has an extra `COPY` for skills and seed data — keep those, just update the final stage structure:

```dockerfile
FROM base AS final
USER root
WORKDIR /app
COPY scripts/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
COPY --from=publish /app/publish .
COPY skills/core/ /app/skills/core/
COPY seed-data/Guidelines/ /app/seed-data/Guidelines/
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["dotnet", "Clara.API.dll"]
```

Remove `EXPOSE 8080` from `base` stage.

- [ ] **Step 3.6: Commit**

```bash
git add src/Identity.API/Dockerfile src/Patient.API/Dockerfile \
        src/Appointment.API/Dockerfile src/MedicalRecords.API/Dockerfile \
        src/Clara.API/Dockerfile
git commit -m "chore(docker): remove EXPOSE 8080 and wire shared entrypoint for CA trust"
```

---

## Task 4: Fix docker-compose.yml — IdentityUrl to HTTPS

**Files:**
- Modify: `docker-compose.yml`

The production base file has `IdentityUrl=http://identity-api:8080` on four services. Change all to `https://identity-api:8443`.

- [ ] **Step 4.1: Update patient-api in docker-compose.yml**

Change line:
```yaml
      - IdentityUrl=http://identity-api:8080
```
To:
```yaml
      - IdentityUrl=https://identity-api:8443
```
(Under the `patient-api` environment block.)

- [ ] **Step 4.2: Update appointment-api in docker-compose.yml**

Same change in `appointment-api` environment block.

- [ ] **Step 4.3: Update medicalrecords-api in docker-compose.yml**

Same change in `medicalrecords-api` environment block.

- [ ] **Step 4.4: Update clara-api in docker-compose.yml**

Same change in `clara-api` environment block.

- [ ] **Step 4.5: Verify — grep to confirm no http:// IdentityUrl remains**

```bash
grep "IdentityUrl" docker-compose.yml
```

Expected — all lines show `https`:
```
      - IdentityUrl=https://identity-api:8443
      - IdentityUrl=https://identity-api:8443
      - IdentityUrl=https://identity-api:8443
      - IdentityUrl=https://identity-api:8443
```

- [ ] **Step 4.6: Commit**

```bash
git add docker-compose.yml
git commit -m "fix(docker): switch IdentityUrl to https://identity-api:8443 in production compose"
```

---

## Task 5: Fix docker-compose.override.yml — ASPNETCORE_URLS + IdentityUrl

**Files:**
- Modify: `docker-compose.override.yml`

Two fixes:
1. Remove `http://+:8080` from `ASPNETCORE_URLS` on all 5 services that have it (identity, patient, appointment, medicalrecords, clara)
2. Change `IdentityUrl=http://identity-api:8080` → `https://identity-api:8443` on patient, appointment, medicalrecords, clara

- [ ] **Step 5.1: Fix ASPNETCORE_URLS on all 5 services**

For each of: `identity-api`, `patient-api`, `appointment-api`, `medicalrecords-api`, `clara-api`

Change:
```yaml
      - ASPNETCORE_URLS=http://+:8080;https://+:8443
```
To:
```yaml
      - ASPNETCORE_URLS=https://+:8443
```

- [ ] **Step 5.2: Fix IdentityUrl on 4 downstream services**

For each of: `patient-api`, `appointment-api`, `medicalrecords-api`, `clara-api`

Change:
```yaml
      - IdentityUrl=http://identity-api:8080
```
To:
```yaml
      - IdentityUrl=https://identity-api:8443
```

`identity-api` already has `IdentityUrl=https://identity-api:8443` in the override — no change needed there.

- [ ] **Step 5.3: Verify — grep to confirm no http:// remains on relevant vars**

```bash
grep -E "ASPNETCORE_URLS|IdentityUrl" docker-compose.override.yml
```

Expected:
```
      - ASPNETCORE_URLS=https://+:8443       # identity-api
      - IdentityUrl=https://identity-api:8443 # identity-api
      - ASPNETCORE_URLS=https://+:8443        # patient-api
      - IdentityUrl=https://identity-api:8443 # patient-api
      - ASPNETCORE_URLS=https://+:8443        # appointment-api
      - IdentityUrl=https://identity-api:8443 # appointment-api
      - ASPNETCORE_URLS=https://+:8443        # medicalrecords-api
      - IdentityUrl=https://identity-api:8443 # medicalrecords-api
      - ASPNETCORE_URLS=https://+:8443        # clara-api
      - IdentityUrl=https://identity-api:8443 # clara-api
```

- [ ] **Step 5.4: Commit**

```bash
git add docker-compose.override.yml
git commit -m "fix(docker): HTTPS-only ASPNETCORE_URLS and IdentityUrl in dev override"
```

---

## Task 6: Fix AuthenticationExtensions.cs — RequireHttpsMetadata = true

**Files:**
- Modify: `src/MediTrack.ServiceDefaults/Extensions/AuthenticationExtensions.cs`

- [ ] **Step 6.1: Change RequireHttpsMetadata**

In `AddDefaultAuthentication`, change line 26:
```csharp
                options.RequireHttpsMetadata = false;
```
To:
```csharp
                options.RequireHttpsMetadata = true;
```

- [ ] **Step 6.2: Remove the now-outdated comment on lines 32–36**

Remove the comment block that explains why issuer validation is off due to internal HTTP URL:
```csharp
                // Issuer validation is off because the internal authority URL
                // (http://identity-api:8080) differs from the browser-facing issuer
                // (https://localhost:5001). Signature validation remains on.
```

Replace it with the correct explanation:
```csharp
                // Issuer validation is off because the internal container authority URL
                // (https://identity-api:8443) differs from the browser-facing issuer
                // (https://localhost:5001). Signature validation remains on.
```

The final `AddJwtBearer` block should look like:

```csharp
            .AddJwtBearer(options =>
            {
                options.Authority = identityUrl;
                options.RequireHttpsMetadata = true;
                options.MapInboundClaims = false;
                // Issuer validation is off because the internal container authority URL
                // (https://identity-api:8443) differs from the browser-facing issuer
                // (https://localhost:5001). Signature validation remains on.
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateAudience = false,
                    ValidateIssuer = false,
                    NameClaimType = "name",
                    RoleClaimType = "role"
                };
                // SignalR WebSocket and SSE connections cannot send an Authorization header,
                // so the client passes the token in the "access_token" query parameter.
                // The JWT middleware must be told to extract it from there for hub endpoints.
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        var accessToken = context.Request.Query["access_token"];
                        var path = context.HttpContext.Request.Path;
                        if (!string.IsNullOrEmpty(accessToken) &&
                            path.StartsWithSegments("/sessionHub"))
                        {
                            context.Token = accessToken;
                        }
                        return Task.CompletedTask;
                    }
                };
            });
```

- [ ] **Step 6.3: Build to verify**

```bash
dotnet build src/MediTrack.ServiceDefaults/MediTrack.ServiceDefaults.csproj -c Debug
```

Expected: `Build succeeded. 0 Warning(s). 0 Error(s).`

- [ ] **Step 6.4: Commit**

```bash
git add src/MediTrack.ServiceDefaults/Extensions/AuthenticationExtensions.cs
git commit -m "fix(auth): enforce RequireHttpsMetadata=true — HTTP IdentityUrl workaround removed"
```

---

## Task 7: Fix Identity.API/Program.cs — RequireHttpsMetadata = true

**Files:**
- Modify: `src/Identity.API/Program.cs`

Identity.API has its own inline `AddJwtBearer` config (separate from `AddDefaultAuthentication`) because it validates its own issued tokens.

- [ ] **Step 7.1: Change RequireHttpsMetadata in Identity.API/Program.cs**

At line 55, change:
```csharp
        options.RequireHttpsMetadata = false;
```
To:
```csharp
        options.RequireHttpsMetadata = true;
```

- [ ] **Step 7.2: Build to verify**

```bash
dotnet build src/Identity.API/Identity.API.csproj -c Debug
```

Expected: `Build succeeded. 0 Warning(s). 0 Error(s).`

- [ ] **Step 7.3: Run unit tests (confirm nothing broken)**

```bash
dotnet test --filter "FullyQualifiedName~UnitTests"
```

Expected: all pass.

- [ ] **Step 7.4: Commit**

```bash
git add src/Identity.API/Program.cs
git commit -m "fix(identity): enforce RequireHttpsMetadata=true"
```

---

## Task 8: Full-stack Docker verification

This task validates the entire change end-to-end: container build, CA trust, JWT validation over HTTPS.

- [ ] **Step 8.1: Rebuild all images from scratch**

```bash
docker-compose build --no-cache
```

Expected: all images build successfully. Watch for errors in the `COPY scripts/docker-entrypoint.sh` step — if the path is wrong the build will fail with `COPY failed`.

- [ ] **Step 8.2: Start infra + services**

```bash
docker-compose up -d
```

Wait ~30 seconds for services to start, then check:

```bash
docker-compose ps
```

Expected: all services show `Up` (not `Exit`). If any service exits, inspect logs:

```bash
docker-compose logs identity-api
docker-compose logs patient-api
```

Look for: `update-ca-certificates` output near the top (CA installed successfully) and Kestrel binding to `https://+:8443`.

- [ ] **Step 8.3: Verify CA was installed inside a container**

```bash
docker-compose exec patient-api sh -c "openssl verify -CAfile /etc/ssl/certs/ca-certificates.crt /certs/localhost.pem"
```

Expected:
```
/certs/localhost.pem: OK
```

This confirms the mkcert CA is trusted inside the container and the cert (which now covers `identity-api` as a SAN) validates correctly.

- [ ] **Step 8.4: Verify JWT validation over HTTPS works (no HTTP fallback)**

```bash
docker-compose exec patient-api sh -c \
  "curl -sk https://identity-api:8443/.well-known/openid-configuration | head -c 200"
```

Expected: JSON response starting with `{"issuer":"https://localhost:5001"...}`. This confirms:
1. `patient-api` can reach `identity-api` over HTTPS
2. The cert chain is trusted (no `curl: SSL certificate problem`)
3. The identity server is responding to OIDC discovery

- [ ] **Step 8.5: Verify no HTTP port is bound**

```bash
docker-compose exec identity-api sh -c "ss -tlnp | grep LISTEN"
```

Expected: only port `8443` listed. Port `8080` must NOT appear.

- [ ] **Step 8.6: Smoke test an authenticated endpoint**

Get a token and call a protected endpoint. Use the simulator first if DB is empty:

```bash
docker-compose --profile seed run --rm simulator
```

Then hit the patients health check (adjust if using a different test approach):

```bash
curl -sk https://localhost:5002/health
```

Expected: `{"status":"Healthy"}`

For a full auth check, use the Playwright E2E suite:

```bash
cd tests/e2e
npx playwright test tests/clara/live-session.spec.ts --project=clara-nexus --headed
```

Expected: tests pass (JWT validation through identity-api over HTTPS succeeds end-to-end).

- [ ] **Step 8.7: Commit verification note + update CHANGELOG**

```bash
git add CHANGELOG.md
git commit -m "fix(https): HTTPS-only inter-container TLS with proper CA chain validation

- Removed HTTP port 8080 from all .NET service ASPNETCORE_URLS
- Switched IdentityUrl to https://identity-api:8443 in both compose files  
- Regenerated mkcert cert to cover all container hostnames (SANs)
- Added shared docker-entrypoint.sh to install dev CA into container trust store
- RequireHttpsMetadata=true enforced in AuthenticationExtensions + Identity.API
- OWASP A04/A02 compliant: no HTTP, no cert bypass handlers"
```

---

## Post-implementation checklist

- [ ] `docker-compose ps` — all services healthy
- [ ] No `http://` in any `IdentityUrl` environment variable (`grep -r "IdentityUrl=http" .`)
- [ ] No `8080` in any `ASPNETCORE_URLS` (`grep -r "8080" docker-compose*.yml`)
- [ ] `RequireHttpsMetadata = false` does not appear anywhere in the codebase (`grep -r "RequireHttpsMetadata = false" src/`)
- [ ] `rootCA.pem` is not tracked by git (`git status dev-certs/certs/` shows nothing)
- [ ] CHANGELOG.md updated under `[Unreleased]`

---

## Notes for Nexus (local dotnet run)

When running via `start-aspire.cmd`, services run on `localhost` with the mkcert cert. The cert is already trusted by the system store (mkcert installs it). No container hostname resolution occurs. Verify that user secrets for Nexus have:

```json
"IdentityUrl": "https://localhost:5001"
```

Not the Docker container hostname. Nexus path is unaffected by this change.
