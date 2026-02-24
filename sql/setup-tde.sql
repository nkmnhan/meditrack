-- =====================================================================
-- MediTrack TDE (Transparent Data Encryption) Setup Script
-- =====================================================================
-- This script enables TDE on all MediTrack databases for HIPAA compliance
-- 
-- Requirements:
--   - SQL Server Enterprise or Developer Edition
--   - Master key password (replace placeholders)
--   - Certificate backup password (replace placeholders)
--   - Secure storage for backups
--
-- WARNING: Keep backups of master key and certificate in a secure location!
--          Without these, encrypted data cannot be recovered!
-- =====================================================================

USE master;
GO

PRINT '========================================';
PRINT 'Step 1: Create Database Master Key';
PRINT '========================================';
GO

-- Check if master key already exists
IF NOT EXISTS (SELECT * FROM sys.symmetric_keys WHERE name = '##MS_DatabaseMasterKey##')
BEGIN
    PRINT 'Creating master key...';
    
    -- Use SQLCMD variable for password (run with: sqlcmd -v MASTER_KEY_PASSWORD="YourSecurePassword" -i setup-tde.sql)
    -- Or set with: :setvar MASTER_KEY_PASSWORD "YourSecurePassword"
    CREATE MASTER KEY ENCRYPTION BY PASSWORD = N'$(MASTER_KEY_PASSWORD)';
    
    PRINT 'Master key created successfully.';
    PRINT '';
    PRINT 'IMPORTANT: Backup the master key immediately!';
    PRINT 'Run: BACKUP MASTER KEY TO FILE = ''/var/opt/mssql/backup/master-key-backup.key''';
    PRINT '     ENCRYPTION BY PASSWORD = ''YourBackupPassword'';';
END
ELSE
BEGIN
    PRINT 'Master key already exists.';
END
GO

PRINT '';
PRINT '========================================';
PRINT 'Step 2: Create TDE Certificate';
PRINT '========================================';
GO

-- Check if certificate already exists
IF NOT EXISTS (SELECT * FROM sys.certificates WHERE name = 'MediTrack_TDE_Certificate')
BEGIN
    PRINT 'Creating TDE certificate...';
    
    CREATE CERTIFICATE MediTrack_TDE_Certificate
    WITH SUBJECT = 'MediTrack TDE Certificate - Created ' + CONVERT(VARCHAR, GETDATE(), 120),
    EXPIRY_DATE = '2027-12-31';
    
    PRINT 'TDE certificate created successfully.';
    PRINT '';
    PRINT 'IMPORTANT: Backup the certificate immediately!';
    PRINT 'Run: BACKUP CERTIFICATE MediTrack_TDE_Certificate';
    PRINT '     TO FILE = ''/var/opt/mssql/backup/MediTrack_TDE_Certificate.cer''';
    PRINT '     WITH PRIVATE KEY (';
    PRINT '         FILE = ''/var/opt/mssql/backup/MediTrack_TDE_Certificate.pvk'',';
    PRINT '         ENCRYPTION BY PASSWORD = ''YourCertificateBackupPassword''';
    PRINT '     );';
END
ELSE
BEGIN
    PRINT 'TDE certificate already exists.';
END
GO

PRINT '';
PRINT '========================================';
PRINT 'Step 3: Enable TDE on Databases';
PRINT '========================================';
GO

-- Function to enable TDE on a database
DECLARE @DatabaseName NVARCHAR(128);
DECLARE @SQL NVARCHAR(MAX);
DECLARE @EncryptionState INT;

-- List of databases to encrypt
DECLARE DatabaseCursor CURSOR FOR
SELECT name 
FROM sys.databases 
WHERE name IN ('MediTrack.Identity', 'MediTrack.Patients', 'MediTrack.Appointments', 'MediTrack.Records', 'MediTrack.Audit')
  AND state_desc = 'ONLINE';

OPEN DatabaseCursor;
FETCH NEXT FROM DatabaseCursor INTO @DatabaseName;

WHILE @@FETCH_STATUS = 0
BEGIN
    PRINT '';
    PRINT 'Processing database: ' + @DatabaseName;
    
    -- Check if database encryption key exists
    SET @SQL = N'USE [' + @DatabaseName + ']; 
                 SELECT @State = encryption_state 
                 FROM sys.dm_database_encryption_keys 
                 WHERE database_id = DB_ID(''' + @DatabaseName + ''');';
    
    EXEC sp_executesql @SQL, N'@State INT OUTPUT', @EncryptionState OUTPUT;
    
    IF @EncryptionState IS NULL
    BEGIN
        -- Create database encryption key
        PRINT '  Creating database encryption key...';
        SET @SQL = N'USE [' + @DatabaseName + ']; 
                     CREATE DATABASE ENCRYPTION KEY
                     WITH ALGORITHM = AES_256
                     ENCRYPTION BY SERVER CERTIFICATE MediTrack_TDE_Certificate;';
        EXEC sp_executesql @SQL;
        
        -- Enable encryption
        PRINT '  Enabling encryption...';
        SET @SQL = N'ALTER DATABASE [' + @DatabaseName + '] SET ENCRYPTION ON;';
        EXEC sp_executesql @SQL;
        
        PRINT '  Encryption enabled for ' + @DatabaseName;
    END
    ELSE IF @EncryptionState = 3
    BEGIN
        PRINT '  Database is already encrypted.';
    END
    ELSE
    BEGIN
        PRINT '  Database encryption is in progress (state: ' + CAST(@EncryptionState AS VARCHAR) + ')';
    END
    
    FETCH NEXT FROM DatabaseCursor INTO @DatabaseName;
END

CLOSE DatabaseCursor;
DEALLOCATE DatabaseCursor;
GO

PRINT '';
PRINT '========================================';
PRINT 'Step 4: Verify TDE Status';
PRINT '========================================';
GO

-- Wait a moment for encryption to start
WAITFOR DELAY '00:00:02';

-- Display encryption status
SELECT 
    db.name AS DatabaseName,
    CASE dek.encryption_state
        WHEN 0 THEN 'No encryption key'
        WHEN 1 THEN 'Unencrypted'
        WHEN 2 THEN 'Encryption in progress'
        WHEN 3 THEN 'Encrypted'
        WHEN 4 THEN 'Key change in progress'
        WHEN 5 THEN 'Decryption in progress'
        WHEN 6 THEN 'Protection change in progress'
    END AS EncryptionState,
    dek.percent_complete AS PercentComplete,
    dek.encryption_scan_state,
    CASE dek.encryption_scan_state
        WHEN 0 THEN 'No scan initiated'
        WHEN 1 THEN 'Scan in progress'
        WHEN 2 THEN 'Scan in progress (suspended)'
        WHEN 3 THEN 'Scan aborted/suspended'
        WHEN 4 THEN 'Scan completed'
    END AS ScanState,
    dek.encryptor_thumbprint,
    dek.encryptor_type,
    c.name AS CertificateName,
    c.expiry_date AS CertificateExpiry
FROM sys.databases db
LEFT JOIN sys.dm_database_encryption_keys dek ON db.database_id = dek.database_id
LEFT JOIN sys.certificates c ON dek.encryptor_thumbprint = c.thumbprint
WHERE db.name IN ('MediTrack.Identity', 'MediTrack.Patients', 'MediTrack.Appointments', 'MediTrack.Records', 'MediTrack.Audit')
ORDER BY db.name;
GO

PRINT '';
PRINT '========================================';
PRINT 'TDE Setup Complete';
PRINT '========================================';
PRINT '';
PRINT 'Next Steps:';
PRINT '1. Backup master key and certificate to secure location';
PRINT '2. Test restore procedure on a different server';
PRINT '3. Document backup locations and passwords in secure vault';
PRINT '4. Schedule key rotation (recommended every 12-24 months)';
PRINT '5. Enable auditing for key access';
PRINT '6. Update disaster recovery procedures';
PRINT '';
PRINT 'CRITICAL REMINDER:';
PRINT 'Without backups of the master key and certificate,';
PRINT 'encrypted data CANNOT be recovered if the server fails!';
PRINT '';
GO

-- Display certificate information
PRINT 'Certificate Information:';
SELECT 
    name AS CertificateName,
    subject,
    start_date,
    expiry_date,
    CASE 
        WHEN expiry_date < DATEADD(MONTH, 3, GETDATE()) THEN 'WARNING: Certificate expiring soon!'
        ELSE 'Certificate valid'
    END AS Status,
    thumbprint
FROM sys.certificates
WHERE name = 'MediTrack_TDE_Certificate';
GO
