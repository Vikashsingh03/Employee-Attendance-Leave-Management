# AttendanceLeave API — ASP.NET Core 8, Docker image for Render (free tier).
# Build context is the REPO ROOT (capstone-attendance-leave/), because the
# Dockerfile lives in api/ but the Angular frontend and repo files sit beside it.
# Render: dockerfilePath ./api/Dockerfile, context = repo root.
# Mirrors the proven SmartHR Dockerfile pattern (capstone/Dockerfile).

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy only the .csproj first so `dotnet restore` is cached until the
# project file (or its package references) actually changes.
COPY api/AttendanceLeave.Api/AttendanceLeave.Api.csproj api/AttendanceLeave.Api/
RUN dotnet restore api/AttendanceLeave.Api/AttendanceLeave.Api.csproj

# Copy the rest of the API source and publish.
COPY api/AttendanceLeave.Api/ ./api/AttendanceLeave.Api/
RUN dotnet publish api/AttendanceLeave.Api/AttendanceLeave.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish ./

# No .db file is copied in: the API seeds its own SQLite database at startup
# via DbContext.Database.EnsureCreated() (see Program.cs / SeedData), so the
# database is created fresh inside the container on first run.
# No EXPOSE and no hardcoded port: Render assigns its own PORT at runtime.
# PORT is bound in exactly ONE place — Program.cs (builder.WebHost.UseUrls
# reads $PORT, falling back to http://localhost:5000 when unset). This
# entrypoint passes no --urls flag, so there is no second lever to drift.
# (Do NOT add `ENV ASPNETCORE_URLS=...` here either: ${PORT} would expand
# at BUILD time, when PORT is unset, baking in port 5000 and ignoring
# Render's runtime PORT.)
ENV ASPNETCORE_ENVIRONMENT=Production
ENTRYPOINT ["dotnet", "AttendanceLeave.Api.dll"]
