FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080
EXPOSE 8443

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["Directory.Build.props", "./"]
COPY ["Directory.Packages.props", "./"]
COPY ["src/MedicalRecords.API/MedicalRecords.API.csproj", "src/MedicalRecords.API/"]
COPY ["src/MedicalRecords.Domain/MedicalRecords.Domain.csproj", "src/MedicalRecords.Domain/"]
COPY ["src/MedicalRecords.Infrastructure/MedicalRecords.Infrastructure.csproj", "src/MedicalRecords.Infrastructure/"]
COPY ["src/IntegrationEventLogEF/IntegrationEventLogEF.csproj", "src/IntegrationEventLogEF/"]
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
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "MedicalRecords.API.dll"]
