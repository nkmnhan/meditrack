# SQL Server Transparent Data Encryption (TDE) Configuration

## Overview

Transparent Data Encryption (TDE) encrypts data at rest, protecting PHI stored in databases from unauthorized access at the physical storage level. TDE is a critical HIPAA security requirement.

## Requirements

- **SQL Server Enterprise Edition** (on-premises) or **SQL Server Developer Edition** (development only)
- **Azure SQL Database** (TDE enabled bydefault on Standard and Premium tiers)
- Proper key management and backup procedures

## Azure SQL Database (Recommended for Production)

Azure SQL Database has TDE **enabled by default** for all databases. No additional configuration needed!

### Verify TDE Status

```sql
SELECT 
    db.name AS DatabaseName,
    encryption_state,
    CASE encryption_state
        WHEN 0 THEN 'No database encryption key present, no encryption'
        WHEN 1 THEN 'Unencrypted'
        WHEN 2 THEN 'Encryption in progress'
        WHEN 3 THEN 'Encrypted'
        WHEN 4 THEN 'Key change in progress'
        WHEN 5 THEN 'Decryption in progress'
        WHEN 6 THEN 'Protection change in progress'
    END AS EncryptionState,
    percent_complete,
    encryption_scan_state,
    CASE encryption_scan_state
        WHEN 0 THEN 'No scan has been initiated'
        WHEN 1 THEN 'A scan is in progress'
        WHEN 2 THEN 'A scan is in progress but has been suspended'
        WHEN 3 THEN 'A scan was aborted or suspended'
        WHEN 4 THEN 'A scan completed successfully'
    END AS ScanState
FROM sys.dm_database_encryption_keys dek
JOIN sys.databases db ON dek.database_id = db.database_id
WHERE db.name IN ('MediTrack.Identity', 'MediTrack.Patients', 'MediTrack.Appointments', 'MediTrack.Records', 'MediTrack.Audit');
```

### Azure SQL: Using Customer-Managed Keys (Optional)

For additional control, use Azure Key Vault to manage TDE keys:

1. Create an Azure Key Vault
2. Generate a key in Key Vault
3. Grant SQL Server access to Key Vault
4. Configure SQL Server to use the key

```bash
# Azure CLI commands
az keyvault create --name meditrack-keyvault --resource-group meditrack-rg --location eastus
az keyvault key create --name meditrack-tde-key --vault-name meditrack-keyvault --kty RSA --size 2048

# Configure SQL Server to use the key
az sql server key create \
    --resource-group meditrack-rg \
    --server meditrack-sql \
    --kid "https://meditrack-keyvault.vault.azure.net/keys/meditrack-tde-key"

az sql server tde-key set \
    --resource-group meditrack-rg \
    --server meditrack-sql \
    --server-key-type AzureKeyVault \
    --kid "https://meditrack-keyvault.vault.azure.net/keys/meditrack-tde-key"
```

## On-Premises SQL Server (Enterprise Edition)

### Step 1: Create Master Key

```sql
USE master;
GO

-- Create master key (if not exists)
IF NOT EXISTS (SELECT * FROM sys.symmetric_keys WHERE name = '##MS_DatabaseMasterKey##')
BEGIN
    CREATE MASTER KEY ENCRYPTION BY PASSWORD = 'YourVeryStrongMasterKeyPassword!@#$';
END
GO

-- Backup master key (CRITICAL - store securely!)
BACKUP MASTER KEY TO FILE = '/var/opt/mssql/backup/master-key-backup.key'
ENCRYPTION BY PASSWORD = 'YourBackupPassword!@#$';
GO
```

### Step 2: Create Certificate

```sql
USE master;
GO

-- Create certificate for TDE
CREATE CERTIFICATE TDE_Certificate
WITH SUBJECT = 'MediTrack TDE Certificate';
GO

-- Backup certificate (CRITICAL - store securely!)
BACKUP CERTIFICATE TDE_Certificate
TO FILE = '/var/opt/mssql/backup/TDE_Certificate.cer'
WITH PRIVATE KEY (
    FILE = '/var/opt/mssql/backup/TDE_Certificate.pvk',
    ENCRYPTION BY PASSWORD = 'YourCertificateBackupPassword!@#$'
);
GO
```

### Step 3: Enable TDE on Each Database

```sql
-- MediTrack.Identity Database
USE [MediTrack.Identity];
GO
CREATE DATABASE ENCRYPTION KEY
WITH ALGORITHM = AES_256
ENCRYPTION BY SERVER CERTIFICATE TDE_Certificate;
GO
ALTER DATABASE [MediTrack.Identity] SET ENCRYPTION ON;
GO

-- MediTrack.Patients Database
USE [MediTrack.Patients];
GO
CREATE DATABASE ENCRYPTION KEY
WITH ALGORITHM = AES_256
ENCRYPTION BY SERVER CERTIFICATE TDE_Certificate;
GO
ALTER DATABASE [MediTrack.Patients] SET ENCRYPTION ON;
GO

-- MediTrack.Appointments Database
USE [MediTrack.Appointments];
GO
CREATE DATABASE ENCRYPTION KEY
WITH ALGORITHM = AES_256
ENCRYPTION BY SERVER CERTIFICATE TDE_Certificate;
GO
ALTER DATABASE [MediTrack.Appointments] SET ENCRYPTION ON;
GO

-- MediTrack.Records Database
USE [MediTrack.Records];
GO
CREATE DATABASE ENCRYPTION KEY
WITH ALGORITHM = AES_256
ENCRYPTION BY SERVER CERTIFICATE TDE_Certificate;
GO
ALTER DATABASE [MediTrack.Records] SET ENCRYPTION ON;
GO

-- MediTrack.Audit Database
USE [MediTrack.Audit];
GO
CREATE DATABASE ENCRYPTION KEY
WITH ALGORITHM = AES_256
ENCRYPTION BY SERVER CERTIFICATE TDE_Certificate;
GO
ALTER DATABASE [MediTrack.Audit] SET ENCRYPTION ON;
GO
```

### Step 4: Verify TDE Status

```sql
SELECT 
    db.name AS DatabaseName,
    encryption_state,
    CASE encryption_state
        WHEN 0 THEN 'No database encryption key present, no encryption'
        WHEN 1 THEN 'Unencrypted'
        WHEN 2 THEN 'Encryption in progress'
        WHEN 3 THEN 'Encrypted'
        WHEN 4 THEN 'Key change in progress'
        WHEN 5 THEN 'Decryption in progress'
        WHEN 6 THEN 'Protection change in progress'
    END AS EncryptionState,
    percent_complete,
    encryption_scan_state,
    CASE encryption_scan_state
        WHEN 0 THEN 'No scan has been initiated'
        WHEN 1 THEN 'A scan is in progress'
        WHEN 2 THEN 'A scan is in progress but has been suspended'
        WHEN 3 THEN 'A scan was aborted or suspended'
        WHEN 4 THEN 'A scan completed successfully'
    END AS ScanState,
    encryptor_thumbprint,
    encryptor_type
FROM sys.dm_database_encryption_keys dek
JOIN sys.databases db ON dek.database_id = db.database_id
ORDER BY db.name;
GO
```

Expected output for each database:
- `encryption_state` = 3 (Encrypted)
- `encryption_scan_state` = 4 (Scan completed successfully)

## Docker Development Environment

**Note:** SQL Server Express (used in docker-compose) does NOT support TDE.

For local development with TDE:
1. Use **SQL Server Developer Edition** Docker image (free, full features)
2. Update `docker-compose.yml`:

```yaml
services:
  sqlserver:
    image: mcr.microsoft.com/mssql/server:2022-latest
    # Change to Developer Edition via environment variable
    environment:
      ACCEPT_EULA: "Y"
      MSSQL_PID: "Developer"  # Instead of Express
      SA_PASSWORD: "${SA_PASSWORD}"
    volumes:
      - sqlserver-data:/var/opt/mssql/data
      - ./sql-backup:/var/opt/mssql/backup  # For key backups
```

3. Run TDE setup scripts after databases are created

## Key Management Best Practices

### 1. Backup Keys and Certificates

**CRITICAL:** Without backups, data loss is permanent if the server fails!

```sql
-- Backup master key
BACKUP MASTER KEY TO FILE = '/var/opt/mssql/backup/master-key-backup.key'
ENCRYPTION BY PASSWORD = 'YourBackupPassword!@#$';

-- Backup certificate
BACKUP CERTIFICATE TDE_Certificate
TO FILE = '/var/opt/mssql/backup/TDE_Certificate.cer'
WITH PRIVATE KEY (
    FILE = '/var/opt/mssql/backup/TDE_Certificate.pvk',
    ENCRYPTION BY PASSWORD = 'YourCertificateBackupPassword!@#$'
);
```

**Store backups:**
- Secure offsite location (Azure Key Vault, AWS Secrets Manager, HashiCorp Vault)
- Encrypted storage
- Access controlled (least privilege)
- Regular restore testing

### 2. Key Rotation Schedule

HIPAA recommends rotating encryption keys periodically.

```sql
-- Create new certificate
CREATE CERTIFICATE TDE_Certificate_2026
WITH SUBJECT = 'MediTrack TDE Certificate 2026';
GO

-- Re-encrypt databases with new certificate
USE [MediTrack.Patients];
GO
ALTER DATABASE ENCRYPTION KEY
ENCRYPTION BY SERVER CERTIFICATE TDE_Certificate_2026;
GO

-- Repeat for all databases
```

**Rotation schedule:**
- Every 12-24 months (HIPAA recommendation)
- Immediately after suspected compromise
- When employee with key access leaves

### 3. Access Control

```sql
-- Grant minimal permissions for key management
CREATE LOGIN KeyManager WITH PASSWORD = 'SecurePassword!@#$';
GO
GRANT VIEW DEFINITION ON CERTIFICATE::TDE_Certificate TO KeyManager;
GO
-- Do NOT grant CONTROL permissions to application users
```

### 4. Audit Key Access

Enable SQL Server Audit to track key access:

```sql
USE master;
GO

-- Create server audit
CREATE SERVER AUDIT TDE_Key_Access_Audit
TO FILE (
    FILEPATH = '/var/opt/mssql/audit/',
    MAXSIZE = 100 MB,
    MAX_ROLLOVER_FILES = 10
)
WITH (ON_FAILURE = CONTINUE);
GO

ALTER SERVER AUDIT TDE_Key_Access_Audit WITH (STATE = ON);
GO

-- Create audit specification for key access
CREATE SERVER AUDIT SPECIFICATION TDE_Key_Access_Spec
FOR SERVER AUDIT TDE_Key_Access_Audit
ADD (DATABASE_OBJECT_ACCESS_GROUP);
GO

ALTER SERVER AUDIT SPECIFICATION TDE_Key_Access_Spec WITH (STATE = ON);
GO
```

## Connection String Encryption

In addition to TDE (data at rest), encrypt data in transit:

```json
{
  "ConnectionStrings": {
    "PatientDb": "Server=sqlserver;Database=MediTrack.Patients;User Id=sa;Password=${SA_PASSWORD};Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;Min Pool Size=5;Max Pool Size=100;"
  }
}
```

Key parameters:
- `Encrypt=True` — TLS encryption for data in transit
- `TrustServerCertificate=False` — Validate server certificate (use `True` only for dev with self-signed certs)
- `Min Pool Size=5;Max Pool Size=100` — Connection pooling for performance

## Verification Checklist

- [ ] TDE enabled on all databases (encryption_state = 3)
- [ ] Master key backed up and stored securely offsite
- [ ] TDE certificate backed up and stored securely offsite
- [ ] Connection strings use `Encrypt=True`
- [ ] Key rotation schedule documented and tested
- [ ] Access to keys restricted to authorized personnel only
- [ ] Audit logging enabled for key access
- [ ] Backup/restore procedures tested with encrypted databases
- [ ] Disaster recovery plan includes key restoration procedures
- [ ] Documented in HIPAA compliance audit trail

## Monitoring and Alerting

Create SQL Agent jobs (or Azure Monitor alerts) to:
1. Verify TDE status daily
2. Alert if encryption state changes unexpectedly
3. Monitor key expiration dates
4. Alert on unauthorized key access attempts

```sql
-- Daily TDE status check
SELECT 
    db.name AS DatabaseName,
    CASE encryption_state
        WHEN 3 THEN 'OK - Encrypted'
        ELSE 'ALERT - Not Encrypted!'
    END AS Status
FROM sys.dm_database_encryption_keys dek
JOIN sys.databases db ON dek.database_id = db.database_id
WHERE db.name IN ('MediTrack.Identity', 'MediTrack.Patients', 'MediTrack.Appointments', 'MediTrack.Records', 'MediTrack.Audit')
  AND encryption_state <> 3;
GO
-- If any rows returned, send alert!
```

## Compliance Notes

### HIPAA Security Rule Requirements

TDE satisfies:
- **§164.312(a)(2)(iv)** — Encryption and Decryption (Addressable)
- **§164.312(e)(2)(ii)** — Encryption (Addressable)

### Documentation Requirements

Maintain documentation of:
- TDE implementation date
- Certificate/key creation and rotation dates
- Key backup locations and access logs
- TDE verification procedures
- Incident response for key compromise

### Annual Review

- Verify TDE is operational on all databases
- Test key backup restore procedure
- Review and update key rotation schedule
- Audit key access logs for unauthorized attempts

## Troubleshooting

### Database restore with TDE

```sql
-- On target server, first restore certificate
CREATE CERTIFICATE TDE_Certificate
FROM FILE = '/var/opt/mssql/backup/TDE_Certificate.cer'
WITH PRIVATE KEY (
    FILE = '/var/opt/mssql/backup/TDE_Certificate.pvk',
    DECRYPTION BY PASSWORD = 'YourCertificateBackupPassword!@#$'
);
GO

-- Then restore database normally
RESTORE DATABASE [MediTrack.Patients]
FROM DISK = '/var/opt/mssql/backup/MediTrack.Patients.bak'
WITH REPLACE;
GO
```

### TDE causing performance issues

- TDE encryption overhead: ~5-10% CPU increase
- Most noticeable during bulk operations
- Monitor `sys.dm_db_encryption_key_scan_state` for scan progress
- Consider scheduling key rotation during maintenance windows

## References

- [SQL Server TDE Documentation](https://learn.microsoft.com/en-us/sql/relational-databases/security/encryption/transparent-data-encryption)
- [Azure SQL TDE Documentation](https://learn.microsoft.com/en-us/azure/azure-sql/database/transparent-data-encryption-tde-overview)
- [HIPAA Security Rule – Encryption Requirements](https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html)
