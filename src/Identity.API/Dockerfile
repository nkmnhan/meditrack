FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8443

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["Directory.Build.props", "./"]
COPY ["Directory.Packages.props", "./"]
COPY ["src/Identity.API/Identity.API.csproj", "src/Identity.API/"]
COPY ["src/MediTrack.ServiceDefaults/MediTrack.ServiceDefaults.csproj", "src/MediTrack.ServiceDefaults/"]
COPY ["src/MediTrack.Shared/MediTrack.Shared.csproj", "src/MediTrack.Shared/"]
COPY ["src/EventBus/EventBus.csproj", "src/EventBus/"]

RUN dotnet restore "src/Identity.API/Identity.API.csproj"

COPY . .
WORKDIR "/src/src/Identity.API"
RUN dotnet build "Identity.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Identity.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

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
