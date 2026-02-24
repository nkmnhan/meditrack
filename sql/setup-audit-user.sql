-- ============================================================================
-- MediTrack Audit Database User Setup (Least Privilege)
-- ============================================================================
-- Purpose: Create a dedicated SQL login for the Notification.Worker service
--          with ONLY the permissions required for audit logging.
--
-- HIPAA Compliance: Principle of Least Privilege (§164.308(a)(4)(ii)(B))
-- ============================================================================

USE master;
GO

-- ============================================================================
-- 1. Create SQL Login (replace password with environment variable in deployment)
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = 'meditrack_audit')
BEGIN
    CREATE LOGIN meditrack_audit 
    WITH PASSWORD = N'$(AUDIT_USER_PASSWORD)', -- Use SQLCMD variable
    CHECK_POLICY = ON,
    CHECK_EXPIRATION = OFF; -- Set ON in production with password rotation policy
    
    PRINT 'Created login: meditrack_audit';
END
ELSE
BEGIN
    PRINT 'Login meditrack_audit already exists';
END
GO

-- ============================================================================
-- 2. Create Database User in MediTrack.Audit
-- ============================================================================
USE [MediTrack.Audit];
GO

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'meditrack_audit')
BEGIN
    CREATE USER meditrack_audit FOR LOGIN meditrack_audit;
    PRINT 'Created user: meditrack_audit in MediTrack.Audit database';
END
ELSE
BEGIN
    PRINT 'User meditrack_audit already exists in MediTrack.Audit';
END
GO

-- ============================================================================
-- 3. Grant Minimal Required Permissions
-- ============================================================================
-- The Notification.Worker service needs to:
--   - INSERT audit log entries         (PHIAuditLogs, PHIBreachIncidents)
--   - SELECT for queries/reports       (both tables)
--   - UPDATE for breach investigation  (PHIBreachIncidents only)
--   - Execute EF Core migrations       (DDL - only in Development)
--
-- In Production:
--   - Remove db_ddladmin (run migrations via pipeline)
--   - Grant only INSERT/SELECT on PHIAuditLogs
--   - Grant INSERT/SELECT/UPDATE on PHIBreachIncidents
-- ============================================================================

-- GRANT: SELECT + INSERT on PHIAuditLogs (audit log is append-only)
GRANT SELECT, INSERT ON dbo.PHIAuditLogs TO meditrack_audit;
PRINT 'Granted SELECT, INSERT on PHIAuditLogs';

-- GRANT: SELECT + INSERT + UPDATE on PHIBreachIncidents (need UPDATE for investigation workflow)
GRANT SELECT, INSERT, UPDATE ON dbo.PHIBreachIncidents TO meditrack_audit;
PRINT 'Granted SELECT, INSERT, UPDATE on PHIBreachIncidents';

-- DEVELOPMENT ONLY: Grant db_ddladmin for EF Core migrations
-- REMOVE THIS IN PRODUCTION (migrations should run via deployment pipeline)
IF (SELECT CONVERT(VARCHAR(50), SERVERPROPERTY('MachineName'))) = 'localhost' 
   OR (SELECT CONVERT(VARCHAR(50), SERVERPROPERTY('ServerName'))) LIKE '%dev%'
BEGIN
    ALTER ROLE db_ddladmin ADD MEMBER meditrack_audit;
    PRINT 'WARNING: Granted db_ddladmin to meditrack_audit (DEVELOPMENT ONLY - remove in production!)';
END
GO

-- ============================================================================
-- 4. Verify Permissions
-- ============================================================================
SELECT 
    dp.name AS UserName,
    dp.type_desc AS UserType,
    o.name AS ObjectName,
    p.permission_name AS Permission,
    p.state_desc AS PermissionState
FROM sys.database_permissions p
JOIN sys.database_principals dp ON p.grantee_principal_id = dp.principal_id
LEFT JOIN sys.objects o ON p.major_id = o.object_id
WHERE dp.name = 'meditrack_audit'
ORDER BY ObjectName, Permission;
GO

PRINT 'Audit user setup complete.';
PRINT '';
PRINT 'Connection string format:';
PRINT 'Server=sqlserver;Database=MediTrack.Audit;User Id=meditrack_audit;Password=***;TrustServerCertificate=True';
PRINT '';
PRINT 'IMPORTANT: Store AUDIT_USER_PASSWORD in Azure Key Vault (production) or User Secrets (development).';
GO
