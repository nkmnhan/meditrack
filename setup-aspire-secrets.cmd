@echo off
setlocal DisableDelayedExpansion
echo ========================================
echo MediTrack - Aspire.Nexus Secrets Setup
echo ========================================
echo.

set "SECRETS_DIR=%APPDATA%\Microsoft\UserSecrets\aspire-nexus"

if not exist "%SECRETS_DIR%" (
    mkdir "%SECRETS_DIR%"
)

(
echo {
echo   "AppHost": {
echo     "Environment": {
echo       "LogLevel": "Information",
echo       "AspNetCoreEnvironment": "Development"
echo     },
echo     "Infrastructure": {
echo       "DockerComposePath": "../../docker-compose.yml",
echo       "DockerComposeProject": "meditrack",
echo       "DockerComposeServices": [ "postgres", "rabbitmq" ]
echo     },
echo     "Services": {
echo       "identity-api": {
echo         "Type": "DotNet",
echo         "Port": 5001,
echo         "Active": true,
echo         "Group": "Backend",
echo         "ProjectPath": "../Identity.API/Identity.API.csproj",
echo         "SolutionPath": "../../MediTrack.sln",
echo         "Certificate": {
echo           "Path": "../../dev-certs/certs/localhost.pem",
echo           "KeyPath": "../../dev-certs/certs/localhost-key.pem"
echo         },
echo         "EnvironmentVariables": {
echo           "IdentityUrl": "https://localhost:5001",
echo           "ServiceClientSecret": "service-secret-dev",
echo           "WebClientUrl": "https://localhost:3000",
echo           "ConnectionStrings__IdentityDb": "Host=localhost;Port=5432;Database=meditrack_identity;Username=meditrack;Password=MediTrack_Dev@2026!",
echo           "ConnectionStrings__rabbitmq": "amqp://meditrack:meditrack_secret@localhost:5672/"
echo         }
echo       },
echo       "patient-api": {
echo         "Type": "DotNet",
echo         "Port": 5002,
echo         "Active": true,
echo         "Group": "Backend",
echo         "ProjectPath": "../Patient.API/Patient.API.csproj",
echo         "Certificate": {
echo           "Path": "../../dev-certs/certs/localhost.pem",
echo           "KeyPath": "../../dev-certs/certs/localhost-key.pem"
echo         },
echo         "EnvironmentVariables": {
echo           "IdentityUrl": "https://localhost:5001",
echo           "ConnectionStrings__PatientDb": "Host=localhost;Port=5432;Database=meditrack_patients;Username=meditrack;Password=MediTrack_Dev@2026!",
echo           "ConnectionStrings__rabbitmq": "amqp://meditrack:meditrack_secret@localhost:5672/"
echo         }
echo       },
echo       "appointment-api": {
echo         "Type": "DotNet",
echo         "Port": 5003,
echo         "Active": true,
echo         "Group": "Backend",
echo         "ProjectPath": "../Appointment.API/Appointment.API.csproj",
echo         "Certificate": {
echo           "Path": "../../dev-certs/certs/localhost.pem",
echo           "KeyPath": "../../dev-certs/certs/localhost-key.pem"
echo         },
echo         "EnvironmentVariables": {
echo           "IdentityUrl": "https://localhost:5001",
echo           "ConnectionStrings__AppointmentDb": "Host=localhost;Port=5432;Database=meditrack_appointments;Username=meditrack;Password=MediTrack_Dev@2026!",
echo           "ConnectionStrings__rabbitmq": "amqp://meditrack:meditrack_secret@localhost:5672/"
echo         }
echo       },
echo       "medicalrecords-api": {
echo         "Type": "DotNet",
echo         "Port": 5004,
echo         "Active": true,
echo         "Group": "Backend",
echo         "ProjectPath": "../MedicalRecords.API/MedicalRecords.API.csproj",
echo         "Certificate": {
echo           "Path": "../../dev-certs/certs/localhost.pem",
echo           "KeyPath": "../../dev-certs/certs/localhost-key.pem"
echo         },
echo         "EnvironmentVariables": {
echo           "IdentityUrl": "https://localhost:5001",
echo           "ConnectionStrings__MedicalRecordsDb": "Host=localhost;Port=5432;Database=meditrack_records;Username=meditrack;Password=MediTrack_Dev@2026!",
echo           "ConnectionStrings__rabbitmq": "amqp://meditrack:meditrack_secret@localhost:5672/"
echo         }
echo       },
echo       "notification-worker": {
echo         "Type": "DotNet",
echo         "Active": true,
echo         "Group": "Backend",
echo         "ProjectPath": "../Notification.Worker/Notification.Worker.csproj",
echo         "EnvironmentVariables": {
echo           "ConnectionStrings__AuditDatabase": "Host=localhost;Port=5432;Database=meditrack_audit;Username=meditrack;Password=MediTrack_Dev@2026!",
echo           "ConnectionStrings__rabbitmq": "amqp://meditrack:meditrack_secret@localhost:5672/"
echo         }
echo       },
echo       "clara-api": {
echo         "Type": "DotNet",
echo         "Port": 5005,
echo         "Active": true,
echo         "Group": "Backend",
echo         "ProjectPath": "../Clara.API/Clara.API.csproj",
echo         "Certificate": {
echo           "Path": "../../dev-certs/certs/localhost.pem",
echo           "KeyPath": "../../dev-certs/certs/localhost-key.pem"
echo         },
echo         "EnvironmentVariables": {
echo           "IdentityUrl": "https://localhost:5001",
echo           "ConnectionStrings__ClaraDb": "Host=localhost;Port=5432;Database=meditrack_clara;Username=meditrack;Password=MediTrack_Dev@2026!",
echo           "ConnectionStrings__AuditDatabase": "Host=localhost;Port=5432;Database=meditrack_audit;Username=meditrack;Password=MediTrack_Dev@2026!",
echo           "ConnectionStrings__rabbitmq": "amqp://meditrack:meditrack_secret@localhost:5672/"
echo         }
echo       },
echo       "simulator": {
echo         "Type": "DotNet",
echo         "Active": true,
echo         "Group": "Tools",
echo         "ProjectPath": "../MediTrack.Simulator/MediTrack.Simulator.csproj",
echo         "EnvironmentVariables": {
echo           "ConnectionStrings__IdentityDb": "Host=localhost;Port=5432;Database=meditrack_identity;Username=meditrack;Password=MediTrack_Dev@2026!",
echo           "ConnectionStrings__PatientDb": "Host=localhost;Port=5432;Database=meditrack_patients;Username=meditrack;Password=MediTrack_Dev@2026!",
echo           "ConnectionStrings__AppointmentDb": "Host=localhost;Port=5432;Database=meditrack_appointments;Username=meditrack;Password=MediTrack_Dev@2026!",
echo           "ConnectionStrings__MedicalRecordsDb": "Host=localhost;Port=5432;Database=meditrack_records;Username=meditrack;Password=MediTrack_Dev@2026!",
echo           "ConnectionStrings__AuditDatabase": "Host=localhost;Port=5432;Database=meditrack_audit;Username=meditrack;Password=MediTrack_Dev@2026!",
echo           "ConnectionStrings__ClaraDb": "Host=localhost;Port=5432;Database=meditrack_clara;Username=meditrack;Password=MediTrack_Dev@2026!"
echo         }
echo       },
echo       "web": {
echo         "Type": "Client",
echo         "Port": 3000,
echo         "Https": true,
echo         "Active": true,
echo         "Group": "Frontend",
echo         "WorkingDirectory": "../MediTrack.Web",
echo         "DevCommand": "npm run dev",
echo         "EnvironmentVariables": {
echo           "PORT": "3000",
echo           "VITE_IDENTITY_URL": "https://localhost:5001",
echo           "VITE_PATIENT_API_URL": "https://localhost:5002",
echo           "VITE_APPOINTMENT_API_URL": "https://localhost:5003",
echo           "VITE_MEDICALRECORDS_API_URL": "https://localhost:5004",
echo           "VITE_CLARA_API_URL": "https://localhost:5005"
echo         }
echo       }
echo     }
echo   }
echo }
) > "%SECRETS_DIR%\secrets.json"

echo.
echo [OK] User secrets written to: %SECRETS_DIR%\secrets.json
echo.
echo To start: double-click start-aspire.cmd
echo.
pause
