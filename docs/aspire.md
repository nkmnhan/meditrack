# Running MediTrack with .NET Aspire

This document explains how to use [.NET Aspire](https://learn.microsoft.com/en-us/dotnet/aspire/) to run the MediTrack application locally. .NET Aspire provides a powerful orchestrator that starts all the necessary microservices, databases, and message brokers, and wires them together automatically.

## Prerequisites

- [.NET 8 SDK or later](https://dotnet.microsoft.com/download)
- [Docker Desktop](https://www.docker.com/products/docker-desktop) or [Podman](https://podman.io/) (required for spinning up SQL Server and RabbitMQ containers)
- Node.js (for running the React frontend)

## Overview of the Aspire Setup

The .NET Aspire orchestrator is defined in the `src/MediTrack.AppHost` project. When you run this project, it automatically spins up the following resources:

### Infrastructure Containers
- **SQL Server (`sqlserver`)**: A persistent SQL Server container with data volumes.
- **RabbitMQ (`rabbitmq`)**: A persistent RabbitMQ container with the management plugin enabled.

### Databases (Provisioned automatically in SQL Server)
- `IdentityDb`
- `PatientDb`
- `AppointmentDb`
- `MedicalRecordsDb`
- `AuditDatabase`

### Back-end Services
- **Identity API (`identity-api`)**: Handles authentication and authorization.
- **Patient API (`patient-api`)**: Manages patient records and references `PatientDb`, `identity-api`, and `rabbitmq`.
- **Appointment API (`appointment-api`)**: Manages scheduling and appointments.
- **Medical Records API (`medicalrecords-api`)**: Manages health records.
- **Notification Worker (`notification-worker`)**: Connects to `AuditDatabase` and `rabbitmq` to process async messages.

### Front-end Application
- **Web (`web`)**: The React/Vite front-end application (`MediTrack.Web`). Aspire will automatically start it via `npm run dev` and inject the necessary API URLs (e.g., `VITE_IDENTITY_URL`, `VITE_PATIENT_API_URL`) as environment variables.

## How to Run

### Using the .NET CLI

1. Open a terminal at the root of the repository.
2. Ensure Docker Desktop (or your container engine) is running.
3. Run the AppHost project:

```bash
dotnet run --project src/MediTrack.AppHost/MediTrack.AppHost.csproj
```

##### OR

```bash
cd src/MediTrack.AppHost
dotnet run
```

### Using Visual Studio

1. Open the `MediTrack.sln` solution.
2. Set **MediTrack.AppHost** as the Startup Project.
3. Press **F5** (or click Start). Visual Studio will launch the Aspire dashboard.

### Using Visual Studio Code / Rider

- **VS Code**: Install the [C# Dev Kit extension](https://marketplace.visualstudio.com/items?itemName=ms-dotnettools.csdevkit). Set `.NET Aspire AppHost` as your launch configuration and start debugging.
- **Rider**: Rider natively supports .NET Aspire. Right-click the `MediTrack.AppHost` project and select **Run 'MediTrack.AppHost'**.

## The Aspire Dashboard

When the AppHost starts, it will launch the **.NET Aspire Dashboard** in your default web browser. 

From the Dashboard, you can:
- **View Resources:** See the status of all containers, APIs, and the front-end web app.
- **Access Endpoints:** Click directly on the provided endpoint URLs to navigate to the APIs (and their Swagger UI) or the web app.
- **View Logs:** Inspect real-time structured logs from every container and microservice in one centralized place.
- **Traces & Metrics:** View distributed OpenTelemetry traces across the microservices to see how requests flow between the frontend, APIs, and RabbitMQ.

## Troubleshooting

- **Containers failing to start:** Ensure Docker is running. If you get ports already allocated errors, make sure you don't have other instances of SQL Server (port 1433) or RabbitMQ (ports 5672/15672) running externally on your local machine.
- **Frontend not starting:** Aspire attempts to run `npm run dev` in the `src/MediTrack.Web` folder. Ensure you have run `npm install` inside that folder at least once before starting the AppHost, or ensure Node.js is installed and accessible in your system path.
- **Environment bindings:** If a service isn't connecting to the database or RabbitMQ, check the **Environment Variables** tab in the Aspire Dashboard for that specific resource to ensure the connection strings and API URLs were injected correctly.
