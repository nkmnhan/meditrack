FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080
EXPOSE 8443

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["Directory.Build.props", "./"]
COPY ["Directory.Packages.props", "./"]
COPY ["src/EmergenAI.API/EmergenAI.API.csproj", "src/EmergenAI.API/"]
COPY ["src/MediTrack.ServiceDefaults/MediTrack.ServiceDefaults.csproj", "src/MediTrack.ServiceDefaults/"]
COPY ["src/EventBusRabbitMQ/EventBusRabbitMQ.csproj", "src/EventBusRabbitMQ/"]
COPY ["src/EventBus/EventBus.csproj", "src/EventBus/"]
COPY ["src/MediTrack.Shared/MediTrack.Shared.csproj", "src/MediTrack.Shared/"]

RUN dotnet restore "src/EmergenAI.API/EmergenAI.API.csproj"

COPY . .
WORKDIR "/src/src/EmergenAI.API"
RUN dotnet build "EmergenAI.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "EmergenAI.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app

# Copy skills and seed data from repo root
COPY --from=publish /app/publish .
COPY skills/core/ /app/skills/core/
COPY SeedData/Guidelines/ /app/SeedData/Guidelines/

ENTRYPOINT ["dotnet", "EmergenAI.API.dll"]
