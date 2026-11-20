# Database — Attendance & Leave Management API

## The short version

This API runs on **two databases** with one setting in
`AttendanceLeave.Api/appsettings.json`:

| `DatabaseProvider` | Database | When to use it |
|---|---|---|
| `"Sqlite"` (default) | `attendance.db` file in the API project folder | Local development, college demo, this sandbox — **no server needed** |
| `"SqlServer"` | SQL Server (see connection string below) | Production / college lab server — this is what the faculty requirements ask for |

Switching is **one value, no code changes**. `Program.cs` reads
`DatabaseProvider` at startup and calls `UseSqlite(...)` or
`UseSqlServer(...)` on the same `AppDbContext`. All queries are plain LINQ,
so they run identically on both providers.

## The two connection strings

Both live in `appsettings.json` under `ConnectionStrings`:

```json
"DatabaseProvider": "Sqlite",
"ConnectionStrings": {
  "SqlServer": "Server=localhost;Database=AttendanceLeaveDB;Trusted_Connection=True;TrustServerCertificate=True",
  "Sqlite": "Data Source=attendance.db"
}
```

- **Sqlite:** `Data Source=attendance.db` — a single file created in the API
  project folder (`api/AttendanceLeave.Api/`) on first run. It is runtime
  data, not source: it is covered by the repo-root `.gitignore` (`*.db`,
  `*.db-shm`, `*.db-wal`).
- **SqlServer:** `Server=localhost;Database=AttendanceLeaveDB;Trusted_Connection=True;TrustServerCertificate=True`
  — the local-dev default. Point `Server=` at your real server for a lab or
  production install (see below).

## How the provider switch works

`Program.cs` (startup):

```csharp
var provider = builder.Configuration["DatabaseProvider"] ?? "Sqlite";
var connectionString = provider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase)
    ? builder.Configuration.GetConnectionString("SqlServer")
    : builder.Configuration.GetConnectionString("Sqlite");

builder.Services.AddDbContext<AppDbContext>(options =>
{
    if (provider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
        options.UseSqlServer(connectionString);
    else
        options.UseSqlite(connectionString);
});
```

Anything other than `SqlServer` (including a missing value) falls back to
SQLite. On a host, prefer environment variables over editing the file:
`DatabaseProvider=SqlServer` and
`ConnectionStrings__SqlServer=Server=...` (double underscore = nested
setting). `Data/AppDbContext.cs` is provider-agnostic — one `DbSet` per
table, no provider-specific code.

## Running on SQL Server locally

1. Install **SQL Server Express** (free) and **SSMS** (SQL Server Management
   Studio) on your Windows laptop.
2. In `appsettings.json`, change **one value**: `"DatabaseProvider": "Sqlite"`
   → `"DatabaseProvider": "SqlServer"`.
3. If your SQL Server instance is not the default `localhost` (e.g. it is
   `localhost\SQLEXPRESS`, or you use SQL authentication instead of Windows
   authentication), edit only the `SqlServer` connection string, e.g.
   `Server=localhost\SQLEXPRESS;Database=AttendanceLeaveDB;Trusted_Connection=True;TrustServerCertificate=True`
   or `Server=...;Database=AttendanceLeaveDB;User Id=...;Password=...;TrustServerCertificate=True`.
4. Run the API (`dotnet run`, or F5 in Visual Studio). The database
   `AttendanceLeaveDB` and all tables are created automatically, and the seed
   data is inserted — see "Seed behaviour" below. Verify in SSMS that the
   database and the 7 tables exist.
5. To go back to SQLite, change the one value back to `"Sqlite"`.

## Why the Render deployment runs SQLite (honest note)

**Render's free tier has no SQL Server.** The code targets SQL Server (the
provider switch + connection string above) to meet the faculty
requirements, but the deployed API on Render runs SQLite:
`render.yaml` sets `DatabaseProvider=Sqlite`. That is fine for the
demo/viva, and switching to SQL Server later is a config change only —
do **not** claim SQL Server is running on Render. (Also note: on Render the
SQLite file lives on the container's ephemeral disk, so data resets when the
free service restarts or redeploys — demo data only, not permanent storage.)

## The 7 tables

Schema is defined by the model classes in `Models/Entities.cs`
(`AppDbContext` in `Data/AppDbContext.cs` adds the unique indexes).
There are **no EF Core migrations** in this project — `EnsureCreated()`
builds the tables from the models.

| Table (`DbSet`) | Key fields |
|---|---|
| `Departments` | `Id`, `Name` (required, ≤100), `Description` |
| `Employees` | `Id`, `EmployeeCode` (unique, auto `EMP001`, `EMP002`…), `FirstName`, `LastName`, `Email` (unique), `Phone`, `Designation`, `DepartmentId` (FK, required), `DateOfJoining`, `Salary` (`decimal(18,2)`), `IsActive` (soft delete — DELETE just flips this), `PhotoPath` (e.g. `uploads/3_abc.png`), `PasswordHash` + `PasswordSalt` (SHA256, password + per-user random salt, Base64 — plain passwords are never stored), `Role` (`Admin` / `Employee`, drives `[Authorize(Roles=...)]`), `CreatedAt` |
| `LeaveTypes` | `Id`, `Name`, `Description`, `DaysAllowedPerYear`, `IsPaid` |
| `LeaveRequests` | `Id`, `EmployeeId` (FK), `LeaveTypeId` (FK), `StartDate`, `EndDate`, `Reason`, `Status` (`Pending` / `Approved` / `Rejected` / `Cancelled`), `AppliedOn`, `ReviewedBy` (FK to Employee, null while Pending; delete → `SetNull`), `ReviewedOn`, `ReviewComments` |
| `LeaveBalances` | `Id`, `EmployeeId`, `LeaveTypeId`, `Year`, `TotalDays` (copied from `LeaveType.DaysAllowedPerYear`), `UsedDays` (approved leaves only). Unique per (Employee, LeaveType, Year). `RemainingDays` is computed (`TotalDays - UsedDays`), never stored |
| `Attendances` | `Id`, `EmployeeId`, `Date` (date only; one row per employee per day — unique index), `Status` (`Present` / `Absent` / `Leave` / `HalfDay`), `CheckInTime`, `CheckOutTime`, `Remarks` |
| `Holidays` | `Id`, `Name`, `Date`, `Description`, `IsPublicHoliday` |

Unique indexes (enforced by the DB, not just code): `Employee.Email`,
`Employee.EmployeeCode`, `(LeaveBalance.EmployeeId, LeaveTypeId, Year)`,
`(Attendance.EmployeeId, Date)`. Deleting a department that still has
employees is blocked in the controller and by `DeleteBehavior.Restrict` at
DB level. SQLite stores dates/times as text; SQL Server uses native types —
nothing in the code depends on provider-specific behaviour.

## Seed behaviour

On every startup `Program.cs` runs:

```csharp
db.Database.EnsureCreated();
await SeedData.SeedAsync(db);
```

`Data/SeedData.cs` is **idempotent per table**: each table is seeded only
when it is empty (`if (!await db.X.AnyAsync())`), and each step reads back
whatever is already in the database instead of assuming a fresh insert. So a
half-seeded database just fills in the missing tables on the next start
instead of crashing on a UNIQUE constraint, and re-running the API never
duplicates data. To get a completely fresh dataset, delete `attendance.db`
(plus `attendance.db-shm` / `attendance.db-wal` if present) while the API is
**not running**, then restart — the file is recreated and re-seeded.

Seeded data (deterministic — fixed random seed, dates anchored to 19 Nov 2026):

- **5 departments:** HR, Engineering, Sales, Finance, Marketing.
- **5 leave types:** Casual Leave (12 days/yr), Sick Leave (10), Earned
  Leave (15), Maternity Leave (180), Paternity Leave (15) — all paid.
- **24 employees** (EMP001–EMP024) across the 5 departments.
- **13 holidays for 2026** (Govt. of India DoPT gazetted list; Eid-ul-Fitr
  and Bakrid can shift by a day with moon sighting).
- **16 leave requests** (Oct–Nov 2026): 7 Approved, 5 Pending, 3 Rejected,
  1 Cancelled — reviewed ones are reviewed by the admin.
- **Leave balances for 2026:** Casual/Sick/Earned for everyone, plus
  Maternity for female employees and Paternity for male employees.
  `UsedDays` is computed from the approved requests, so balances always
  agree with the request history.
- **Attendance for the last 30 days** (21 Oct – 19 Nov 2026): working days
  only (no Sundays, no seeded holidays); approved leave → `Leave`, ~5%
  `Absent`, the rest `Present` with check-in 09:00–09:45 and check-out
  17:30–18:30. Exception: the two demo accounts have **no** 19-Nov record,
  so the live check-in/check-out demo starts from nothing.

## Demo logins

Passwords are demo-only (`Admin@123` / `Emp@123`) and hashed with
SHA256 + salt at seed time:

| Login | Email | Password | Role |
|---|---|---|---|
| Admin | `admin@company.com` (Amit Verma, HR Manager) | `Admin@123` | Admin |
| Employee | `rahul.sharma@company.com` (Rahul Sharma, Software Developer) | `Emp@123` | Employee |
| Employee | `priya.verma@company.com` (Priya Verma, Sales Executive) | `Emp@123` | Employee |

Every other seeded employee logs in as
`firstname.lastname@company.com` with password `Emp@123`.
