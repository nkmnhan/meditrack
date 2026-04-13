FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8443

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["Directory.Build.props", "./"]
COPY ["Directory.Packages.props", "./"]
COPY ["src/MedicalRecords.API/MedicalRecords.API.csproj", "src/MedicalRecords.API/"]
COPY ["src/MedicalRecords.Domain/MedicalRecords.Domain.csproj", "src/MedicalRecords.Domain/"]
COPY ["src/MedicalRecords.Infrastructure/MedicalRecords.Infrastructure.csproj", "src/MedicalRecords.Infrastructure/"]
COPY ["src/EventBusRabbitMQ/EventBusRabbitMQ.csproj", "src/EventBusRabbitMQ/"]
COPY ["src/EventBus/EventBus.csproj", "src/EventBus/"]
COPY ["src/MediTrack.ServiceDefaults/MediTrack.ServiceDefaults.csproj", "src/MediTrack.ServiceDefaults/"]
COPY ["src/MediTrack.Shared/MediTrack.Shared.csproj", "src/MediTrack.Shared/"]

RUN dotnet restore "src/MedicalRecords.API/MedicalRecords.API.csproj"

COPY . .
WORKDIR "/src/src/MedicalRecords.API"
RUN dotnet build "MedicalRecords.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "MedicalRecords.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
# Root required so the entrypoint can install the dev CA via update-ca-certificates.
# Production: rootCA.pem is never mounted — entrypoint is a strict no-op.
USER root
WORKDIR /app
COPY scripts/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
COPY --from=publish /app/publish .
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["dotnet", "MedicalRecords.API.dll"]
