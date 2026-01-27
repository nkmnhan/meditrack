# MediTrack

A healthcare management system built for practicing full-stack development with modern technologies and understanding HIPAA/PHI compliance requirements.

> **⚠️ Educational Project**: This is a personal learning project to practice full-stack development and healthcare data standards. Not intended for production use with real patient data.

## 🎯 Project Goals

- Practice building a **HIPAA-compliant** healthcare application
- Learn secure handling of **Protected Health Information (PHI)**
- Develop full-stack skills with enterprise-grade technologies
- Understand medical data standards and regulations
- Implement enterprise-grade authentication with **OAuth 2.0 & OpenID Connect**

## 🛠️ Tech Stack

### Frontend
- **React** - UI framework
- **TypeScript** - Type safety
- **Material-UI / Tailwind CSS** - Styling
- **React Router** - Navigation
- **Axios** - API calls
- **OIDC Client** - Authentication integration

### Backend
- **.NET 8 / ASP.NET Core** - Web API
- **Entity Framework Core** - ORM
- **Duende IdentityServer** - OAuth 2.0 / OpenID Connect authentication
- **JWT Bearer Authentication** - Token validation
- **AutoMapper** - Object mapping
- **FluentValidation** - Input validation

### Authentication & Security
- **Duende IdentityServer (Open Source)** - Identity Provider
  - OAuth 2.0 & OpenID Connect implementation
  - Self-hosted identity solution
  - Support for multiple clients (Web, Mobile, API)
  - Token management and validation
  - Role-based access control (RBAC)
  - Claims-based authorization

### Database
- **SQL Server** - Primary database
- **Azure SQL Database** - Cloud hosting
- Separate databases for:
  - Application data (Patients, Appointments, etc.)
  - Identity data (Users, Roles, Tokens)

### Cloud & DevOps
- **Azure App Service** - Web hosting
- **Azure Key Vault** - Secrets management
- **Azure Storage** - File storage (medical documents)
- **Application Insights** - Monitoring

## 🏥 Domain: Healthcare Management

### Core Features (Planned)

#### Patient Management
- Patient registration and profiles
- Medical history tracking
- Contact information and emergency contacts
- Insurance information

#### Appointment System
- Schedule and manage appointments
- Doctor availability management
- Appointment reminders
- Waitlist management

#### Medical Records
- Electronic Health Records (EHR)
- Visit notes and diagnosis
- Prescription management
- Lab results tracking
- Medical document storage

#### Security & Compliance
- **OAuth 2.0 / OpenID Connect** authentication
- **Role-based access control (RBAC)**
  - Admin: Full system access
  - Doctor: Patient records, appointments, prescriptions
  - Nurse: Patient vitals, appointments
  - Patient: Own records only
  - Receptionist: Appointments, basic patient info
- Audit logging for PHI access
- Data encryption at rest and in transit
- Secure authentication and authorization
- HIPAA compliance considerations
- Multi-factor authentication (MFA) support

## 📋 HIPAA/PHI Learning Objectives

- Implement proper **data encryption**
- Create comprehensive **audit trails**
- Practice **least privilege access** control
- Secure **data transmission** (HTTPS, TLS)
- Handle **breach notification** scenarios
- Implement **data retention** policies
- Practice **de-identification** techniques
- **Token-based authentication** with proper expiration
- **Secure token storage** practices

## 🏗️ Architecture
```
┌─────────────────────────────────────────────────────┐
│                   React SPA                         │
│              (Frontend - Port 3000)                 │
│  - Login UI                                         │
│  - OIDC Client Integration                          │
│  - Token Management                                 │
└──────────────┬──────────────────────────────────────┘
               │ HTTPS / OAuth 2.0
               │
┌──────────────▼──────────────────────────────────────┐
│          Duende IdentityServer                      │
│         (Identity Provider - Port 5001)             │
│  - User Authentication                              │
│  - Token Generation (Access, Refresh, ID)           │
│  - Authorization Server                             │
│  - OpenID Connect Provider                          │
└──────────────┬──────────────────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
┌──────▼─────┐   ┌──────▼──────┐
│  Identity  │   │ Application │
│  Database  │   │  Database   │
│  (Users,   │   │ (Patients,  │
│   Roles)   │   │  Records)   │
└────────────┘   └─────────────┘
       │                │
       └────────┬───────┘
                │
┌───────────────▼─────────────┐
│      .NET Core Web API      │
│      (Backend - Port 5000)  │
│  - JWT Bearer Validation    │
│  - Claims Authorization     │
│  - Business Logic           │
└───────────────┬─────────────┘
                │ EF Core
┌───────────────▼─────────────┐
│         SQL Server          │
│    (Medical Data Store)     │
└─────────────────────────────┘
```

### Authentication Flow
```
1. User → Frontend: Login request
2. Frontend → IdentityServer: Redirect to login
3. User → IdentityServer: Enter credentials
4. IdentityServer → Frontend: Return tokens (access, refresh, id)
5. Frontend → API: Request with access token
6. API → IdentityServer: Validate token
7. API → Frontend: Return protected data
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- .NET 8 SDK
- SQL Server 2019+ or Azure SQL
- Azure subscription (for cloud deployment - optional)
- Visual Studio 2022 / VS Code / Rider

### Installation

#### 1. **Clone the repository**
```bash
git clone https://github.com/yourusername/meditrack.git
cd meditrack
```

#### 2. **Setup Identity Server**
```bash
cd src/MediTrack.IdentityServer
dotnet restore

# Install Duende IdentityServer templates
dotnet new install Duende.IdentityServer.Templates

# Update database for identity
dotnet ef database update --context PersistedGrantDbContext
dotnet ef database update --context ConfigurationDbContext
dotnet ef database update --context ApplicationDbContext

# Run Identity Server
dotnet run
# Identity Server will run on https://localhost:5001
```

#### 3. **Setup Backend API**
```bash
cd src/MediTrack.Api
dotnet restore

# Update connection string in appsettings.json
# Update database
dotnet ef database update

# Run API
dotnet run
# API will run on https://localhost:5000
```

#### 4. **Setup Frontend**
```bash
cd src/MediTrack.Web
npm install

# Configure OIDC settings in .env
npm start
# Frontend will run on http://localhost:3000
```

#### 5. **Configure Environment Variables**

**Identity Server (appsettings.json)**
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=.;Database=MediTrack.Identity;Trusted_Connection=True;"
  },
  "IdentityServer": {
    "IssuerUri": "https://localhost:5001",
    "Clients": [
      {
        "ClientId": "meditrack-web",
        "ClientName": "MediTrack Web Application"
      }
    ]
  }
}
```

**Backend API (appsettings.json)**
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=.;Database=MediTrack.Application;Trusted_Connection=True;"
  },
  "IdentityServer": {
    "Authority": "https://localhost:5001",
    "ApiName": "meditrack-api",
    "RequireHttpsMetadata": true
  }
}
```

**Frontend (.env)**
```env
REACT_APP_API_URL=https://localhost:5000
REACT_APP_IDENTITY_URL=https://localhost:5001
REACT_APP_CLIENT_ID=meditrack-web
REACT_APP_REDIRECT_URI=http://localhost:3000/callback
```

## 📁 Project Structure
```
meditrack/
├── src/
│   ├── MediTrack.IdentityServer/       # OAuth 2.0 / OpenID Connect Provider
│   │   ├── Config.cs                   # Clients, Resources, Scopes
│   │   ├── Models/                     # Identity models
│   │   ├── Data/                       # Identity database context
│   │   └── Program.cs
│   │
│   ├── MediTrack.Api/                  # ASP.NET Core Web API
│   │   ├── Controllers/                # API endpoints
│   │   ├── Models/                     # Domain models
│   │   ├── Services/                   # Business logic
│   │   ├── Data/                       # Application database context
│   │   └── Program.cs
│   │
│   ├── MediTrack.Web/                  # React Frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── services/
│   │   │   │   └── authService.ts     # OIDC client integration
│   │   │   ├── pages/
│   │   │   └── App.tsx
│   │   └── package.json
│   │
│   └── MediTrack.Shared/               # Shared DTOs and contracts
│       └── Models/
│
├── tests/
│   ├── MediTrack.Api.Tests/
│   └── MediTrack.Integration.Tests/
│
├── docs/
│   ├── architecture.md
│   ├── security.md
│   └── deployment.md
│
├── .gitignore
├── README.md
└── MediTrack.sln
```

## 🔐 Authentication Setup

### Duende IdentityServer Configuration

**Supported Flows:**
- Authorization Code Flow (with PKCE)
- Client Credentials Flow (for service-to-service)
- Refresh Token Flow

**Roles:**
- `Admin` - Full system access
- `Doctor` - Medical records, prescriptions
- `Nurse` - Patient care, vitals
- `Receptionist` - Appointments, scheduling
- `Patient` - Personal records only

**Scopes:**
- `openid` - OpenID Connect
- `profile` - User profile information
- `meditrack-api` - API access
- `offline_access` - Refresh tokens

## 📚 Learning Resources

### OAuth 2.0 & OpenID Connect
- [Duende IdentityServer Documentation](https://docs.duendesoftware.com/identityserver/v7)
- [OAuth 2.0 Simplified](https://aaronparecki.com/oauth-2-simplified/)
- [OpenID Connect Explained](https://openid.net/connect/)

### HIPAA Compliance
- [HIPAA Privacy Rule](https://www.hhs.gov/hipaa/for-professionals/privacy/index.html)
- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)
- [Azure HIPAA Compliance](https://learn.microsoft.com/en-us/azure/compliance/offerings/offering-hipaa-us)

### Healthcare Standards
- HL7 FHIR (Fast Healthcare Interoperability Resources)
- ICD-10 (Diagnosis codes)
- CPT (Procedure codes)

## 🗺️ Roadmap

### Phase 1: Foundation
- [x] Project setup
- [ ] Duende IdentityServer configuration
- [ ] Database schema design
- [ ] User registration and login
- [ ] Role-based authorization
- [ ] Basic patient CRUD operations

### Phase 2: Core Features
- [ ] Appointment scheduling
- [ ] Medical records management
- [ ] Doctor/Staff management
- [ ] Claims-based authorization
- [ ] Audit logging integration
- [ ] Basic reporting

### Phase 3: Security & Compliance
- [ ] Comprehensive audit logging
- [ ] Data encryption (at rest & in transit)
- [ ] Multi-factor authentication (MFA)
- [ ] Token refresh implementation
- [ ] Session management
- [ ] HIPAA compliance checklist
- [ ] Penetration testing

### Phase 4: Advanced Features
- [ ] External login providers (Google, Microsoft)
- [ ] API rate limiting
- [ ] Advanced search and filtering
- [ ] Document management system
- [ ] Real-time notifications (SignalR)

### Phase 5: Cloud Deployment
- [ ] Deploy IdentityServer to Azure
- [ ] Deploy API to Azure App Service
- [ ] Deploy Frontend to Azure Static Web Apps
- [ ] Configure Azure SQL
- [ ] Setup CI/CD pipeline (GitHub Actions / Azure DevOps)
- [ ] Monitoring and logging (Application Insights)
- [ ] Load testing

## 📝 Notes

### What I'm Learning
- OAuth 2.0 and OpenID Connect protocols
- Implementing self-hosted identity solutions
- Handling sensitive medical data securely
- Token-based authentication patterns
- Claims-based authorization
- Building role-based access systems
- Cloud deployment with Azure
- Healthcare domain modeling

### Challenges & Solutions
_Document challenges and solutions here as you encounter them_

**Example:**
- **Challenge**: Token expiration handling in React
- **Solution**: Implemented automatic token refresh with refresh tokens

## 🔧 Development Commands
```bash
# Run all services
dotnet run --project src/MediTrack.IdentityServer
dotnet run --project src/MediTrack.Api
npm start --prefix src/MediTrack.Web

# Run tests
dotnet test

# Update database migrations
dotnet ef migrations add InitialCreate --project src/MediTrack.Api
dotnet ef database update --project src/MediTrack.Api

# Build for production
dotnet publish -c Release
npm run build --prefix src/MediTrack.Web
```

## ⚖️ License & Disclaimer

### License
MIT License - This is a personal learning project.

### Duende IdentityServer License
This project uses **Duende IdentityServer** which is:
- ✅ **FREE** for development, testing, and personal projects
- ✅ **FREE** for companies/individuals making less than $1M USD annually
- ⚠️ Requires a **commercial license** for production use in larger organizations

See [Duende Software Licensing](https://duendesoftware.com/products/identityserver#pricing) for details.

### Medical Disclaimer
This project is created solely for educational and skill development purposes. It is **NOT** intended for use with real patient data or in actual healthcare settings. Always consult with legal and compliance experts before handling real Protected Health Information (PHI).

## 🤝 Contributing

This is a personal practice project, but feedback and suggestions are welcome!

## 📞 Contact

This is a personal practice project. Feel free to reach out for collaboration or questions!

---

**Practice Project** | Built with ❤️ for learning | OAuth 2.0 + HIPAA Compliance | 2025
