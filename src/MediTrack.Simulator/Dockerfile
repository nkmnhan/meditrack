FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["Directory.Build.props", "./"]
COPY ["Directory.Packages.props", "./"]

# Copy all referenced project files for restore
COPY ["src/MediTrack.Simulator/MediTrack.Simulator.csproj", "src/MediTrack.Simulator/"]
COPY ["src/Identity.API/Identity.API.csproj", "src/Identity.API/"]
COPY ["src/Patient.API/Patient.API.csproj", "src/Patient.API/"]
COPY ["src/Appointment.API/Appointment.API.csproj", "src/Appointment.API/"]
COPY ["src/MedicalRecords.API/MedicalRecords.API.csproj", "src/MedicalRecords.API/"]
COPY ["src/MedicalRecords.Domain/MedicalRecords.Domain.csproj", "src/MedicalRecords.Domain/"]
COPY ["src/MedicalRecords.Infrastructure/MedicalRecords.Infrastructure.csproj", "src/MedicalRecords.Infrastructure/"]
COPY ["src/Notification.Worker/Notification.Worker.csproj", "src/Notification.Worker/"]
COPY ["src/Clara.API/Clara.API.csproj", "src/Clara.API/"]
COPY ["src/MediTrack.ServiceDefaults/MediTrack.ServiceDefaults.csproj", "src/MediTrack.ServiceDefaults/"]
COPY ["src/EventBus/EventBus.csproj", "src/EventBus/"]
COPY ["src/EventBusRabbitMQ/EventBusRabbitMQ.csproj", "src/EventBusRabbitMQ/"]
COPY ["src/MediTrack.Shared/MediTrack.Shared.csproj", "src/MediTrack.Shared/"]

RUN dotnet restore "src/MediTrack.Simulator/MediTrack.Simulator.csproj"

COPY . .
WORKDIR "/src/src/MediTrack.Simulator"
RUN dotnet build "MediTrack.Simulator.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "MediTrack.Simulator.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "MediTrack.Simulator.dll"]
