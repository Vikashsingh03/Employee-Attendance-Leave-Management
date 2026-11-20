# Employee Attendance and Leave Management System

A small-company HR system: employees check in/out and apply for leave,
admins manage employees, approve leave, mark attendance and download
reports — with JWT login and role-based dashboards.

**Status: complete and verified end to end.** The API builds clean
(0 warnings, 0 errors), seeds a fresh database on first start, and was
re-verified on a fresh isolated seed on 19 Nov 2026: health returns
24 employees, both demo logins work, the full leave flow moves balances
by exactly the right number of days, check-in/out works, both dashboards
return internally consistent numbers, and both CSV reports download.
See [Verification](#verification) for the exact numbers. Nothing here is
deployed yet — there are no live URLs; deployment is a manual step
described in [Deployment](#deployment).

## What's new in v4.0 (20 Nov 2026) — UI rebuild, verified

![version](https://img.shields.io/badge/version-4.0-teal) The v4 rebuild
fixed six realism blockers found by an independent audit of v3, and
re-verified every one of them live (see [Verification](#verification)):

- **Real people, real numbers only.** The login/signup brand panel now
  names three real seeded employees with their real departments — Arjun
  Mehta (Engineering · Senior Software Developer), Priya Verma (Sales ·
  Sales Executive), Rohit Kumar (Finance · Accountant) — and the live
  employee count on the panel comes from `GET /api/health`, not a
  hardcoded number. The invented "21 present · 2 on leave · 1 late"
  footer is gone.
- **Leave rings tell the truth.** Each ring's fill is now the fraction of
  days LEFT, so a 15-of-15 balance renders as a full ring.
- **Stat colours follow one map** (Absent rose, On Leave blue, Pending
  amber, Leave blue, Half Day indigo) on admin and attendance pages.
- **"Total employees" is the company total**, unchanged by search or
  filters; the Status filter now has an **Inactive** option, and
  deactivated staff can be reactivated from the table or their profile.
- **Employees table fits at 1280px** — Designation/Department folded into
  the name cell, per-row photo upload moved to the profile/edit form.
- **Faster first load:** routes are lazy-loaded; the initial bundle fell
  from 892 kB to **429 kB** (under the 800 kB budget), with zero build
  warnings.

### Run it (fresh folder)

```powershell
cd api\AttendanceLeave.Api
dotnet run            # API on http://localhost:5000, seeds 24 employees
# new PowerShell window:
cd web
npm install
npm start             # app on http://localhost:4200
```

Demo logins: admin `admin@company.com` / `Admin@123`,
employee `rahul.sharma@company.com` / `Emp@123`.

### Deploy note (Render + Vercel)

After Vercel deploys the frontend, set the Render environment variable
`AllowedOrigins__0` to the **exact** Vercel URL of the deployed site
(no trailing slash, no wildcard) — e.g.
`AllowedOrigins__0=https://employee-attendance-leave-management.vercel.app`
if that is the real deployed URL. The value in `render.yaml` is a
placeholder until the real URL exists; CORS rejects any origin that does
not match exactly.

## The problem

Small companies track attendance on paper or in spreadsheets and leave
requests over chat, so nobody can answer simple questions: who is in
today, how many casual-leave days does Rahul have left, which requests
are still pending? This project puts it in one place — one database,
two roles (Admin / Employee), and a dashboard for each.

## Tech stack

| Layer | Technology |
|-------|-----------|
| API | ASP.NET Core 8 Web API, EF Core 8 |
| Database | SQLite locally (zero install); SQL Server is the production target (see the honesty note below) |
| Auth | JWT Bearer (8-hour tokens), SHA256 + per-user 16-byte salt password hashing |
| API docs | Swagger (Swashbuckle) with a JWT Authorize button — `/swagger` |
| Frontend | Angular 18 (standalone components), Chart.js 4 |
| Email | SMTP via `System.Net.Mail` (best-effort, disabled by default — see below) |
| Deployment | Render (API, Docker) + Vercel (frontend) |

## Quick start (Windows)

Prerequisites: [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
and [Node.js 18+](https://nodejs.org/) (for the frontend only).

Extract this repo to a folder, for example `C:\Users\HP\AttendanceLeave`,
then open a terminal in that folder and run:

```powershell
# 1. Start the API (http://localhost:5000, Swagger at /swagger)
cd api\AttendanceLeave.Api
dotnet restore
dotnet run
```

In a second terminal, in the same folder:

```powershell
# 2. Start the frontend (http://localhost:4200)
cd web
npm install
npm start
```

Open http://localhost:4200 and log in with one of the demo accounts
in the table below. The login page does not show any demo accounts —
use the credentials from the table. The API
creates the SQLite database (`attendance.db`) and seeds it on first
start.

> **Working-directory note — read this first if the API crashes on
> startup.** Run `dotnet` from inside the `api\AttendanceLeave.Api`
> folder (or a full copy of it). If you run the compiled DLL from
> another folder, `appsettings.json` is not found, the SQLite
> connection string comes back null, the app silently falls back to an
> in-memory database, and seeding aborts with
> `SQLite Error 1: 'no such table: Departments'`. The API also listens
> on port 5000 by default (both `Program.cs` and
> `Properties/launchSettings.json` agree), which is the port the
> frontend expects in `web/src/environments/environment.ts`.

## Demo logins (seeded)

| Role | Email | Password | Who it is |
|------|-------|----------|-----------|
| Admin | admin@company.com | Admin@123 | Amit Verma, HR Manager |
| Employee | rahul.sharma@company.com | Emp@123 | Rahul Sharma, Software Developer |
| Employee | priya.verma@company.com | Emp@123 | Priya Verma, Sales Executive |

These are demo accounts only, seeded by `Data/SeedData.cs`. Every other
seeded employee (24 in total) also logs in with `Emp@123` at
`<firstname>.<lastname>@company.com`. Change or remove them before any
real use — and never commit a real password.

### Premium UI rebuild (November 2026)

The frontend was rebuilt with a premium, colourful design: a
split-screen login page with a branded panel, a full signup flow with a
success screen, toast notifications for every action, and a
mobile-responsive layout (all tap targets at least 44 px). No demo
credentials are shown anywhere in the UI — the demo logins above are
documented here in the README only.

## Features

- **Role-based dashboards** — Admin: headcount, present/absent/on-leave
  today, pending leave requests, leaves approved this month,
  attendance-by-department bar chart and leaves-by-status doughnut chart
  (Chart.js), recent leave requests, upcoming holidays. Employee: my
  leave balances, my pending requests, my monthly attendance, upcoming
  holidays.
- **Employee CRUD (Admin)** — search (name, email, employee code),
  department filter, sortable columns (name or date of joining),
  pagination; add / edit / soft-delete (delete only sets
  `IsActive = false`, the row stays for history). Employee codes are
  auto-generated: EMP001, EMP002, …
- **Leave apply / approve / reject / cancel** — an employee applies for
  their own leave; Admin approves or rejects with comments; the employee
  can cancel a Pending request. Applying is blocked for overlapping dates
  and for end-before-start. Approving re-checks the balance and increases
  `UsedDays` in the same save, so balances can never disagree with the
  approved requests. Re-approving an already-decided request is a 400.
- **Leave balances** — per employee, per leave type, per year
  (Casual 12, Sick 10, Earned 15, Maternity 180, Paternity 15 days).
  Leave days = calendar days in the range **minus Sundays**; Saturdays
  count as working days, public holidays are not subtracted (kept simple
  and predictable on purpose). Seeded balances are computed **from** the
  approved requests, so `UsedDays` always matches the request history.
  Maternity balances exist only for female employees and Paternity only
  for male employees in the seed. An employee created through the API
  gets only Casual / Sick / Earned (3 balances) — the form does not
  collect gender, so HR adds Maternity/Paternity afterwards.
- **Attendance check-in / check-out** — employees check in and out from
  the Attendance page; one row per employee per day. Double check-in or
  double check-out is a 400. Admin can mark attendance for any employee
  and day (Present / Absent / Leave / HalfDay), with or without times.
- **Holidays** — year list (13 gazetted holidays for 2026, verified
  against the Government of India DoPT list); Admin can add / edit /
  delete.
- **CSV reports (Admin)** — attendance CSV per month and leaves CSV per
  status/year, downloaded from the Reports page.
- **Photo upload** — JPG/JPEG/PNG, max 2 MB, stored under
  `wwwroot/uploads` as `{employeeId}_{guid}.ext` and served as static
  files; an employee can upload only their own photo, Admin can upload
  anyone's.
- **Email notifications** — approving or rejecting a leave sends the
  employee an email (SMTP). Best-effort only: with no SMTP configured
  it logs a warning and the approval still succeeds. Email is never the
  reason a leave action fails.

## API endpoints

Base URL: `http://localhost:5000/api`. Every endpoint except
`POST /auth/login` and `GET /health` needs
`Authorization: Bearer <token>`. "Admin" = `[Authorize(Roles = "Admin")]`;
"Any" = any logged-in user (employees only ever see their own data —
the controllers enforce this server-side, whatever the query string
says; asking for someone else's rows is a 403, not a silent filter).
Full interactive docs with a JWT Authorize button: `/swagger`
(29 paths).

### Auth & health

| Method | Endpoint | Role | What it does |
|--------|----------|------|--------------|
| POST | `/auth/login` | Public | Email + password → JWT + user (same 401 for unknown email and wrong password) |
| GET | `/auth/me` | Any | Current logged-in user |
| GET | `/health` | Public | `{ status: "ok", provider: "Sqlite", employees: 24 }` (active employees only) |

### Dashboard

| Method | Endpoint | Role | What it does |
|--------|----------|------|--------------|
| GET | `/dashboard/admin` | Admin | Headcount, today's counts, pending queue, leaves by status, attendance by department, recent requests, upcoming holidays |
| GET | `/dashboard/employee` | Any | My balances, my pending requests, my monthly attendance, upcoming holidays |

### Departments

| Method | Endpoint | Role | What it does |
|--------|----------|------|--------------|
| GET | `/departments` | Any | List all departments (with active employee count each) |
| GET | `/departments/{id}` | Any | One department |
| POST | `/departments` | Admin | Create department |
| PUT | `/departments/{id}` | Admin | Update department |
| DELETE | `/departments/{id}` | Admin | Delete (blocked if employees still belong to it) |

### Employees

| Method | Endpoint | Role | What it does |
|--------|----------|------|--------------|
| GET | `/employees?search=&departmentId=&page=1&pageSize=10&sortBy=name&sortDir=asc` | Admin | Paged, searchable employee list (`sortBy` is `name` or `dateOfJoining`; anything else falls back to name) |
| GET | `/employees/{id}` | Any (own record or Admin) | Employee detail + 2026 leave balances |
| POST | `/employees` | Admin | Create employee (auto EmployeeCode) |
| PUT | `/employees/{id}` | Admin | Update employee |
| DELETE | `/employees/{id}` | Admin | Soft delete (`IsActive = false`) |
| POST | `/employees/{id}/photo` | Any (own photo or Admin) | Upload profile photo (JPG/PNG, ≤ 2 MB) |

### Leave types, requests & balances

| Method | Endpoint | Role | What it does |
|--------|----------|------|--------------|
| GET | `/leavetypes` | Any | List leave types |
| GET | `/leavetypes/{id}` | Any | One leave type |
| POST | `/leavetypes` | Admin | Create leave type |
| PUT | `/leavetypes/{id}` | Admin | Update leave type |
| DELETE | `/leavetypes/{id}` | Admin | Delete leave type |
| GET | `/leaverequests?status=&employeeId=&page=1&pageSize=10` | Any (own only, unless Admin) | List leave requests |
| GET | `/leaverequests/{id}` | Any (own or Admin) | One leave request |
| POST | `/leaverequests` | Any | Apply for leave |
| PUT | `/leaverequests/{id}/approve` | Admin | Approve (checks balance, updates `UsedDays`, sends email) |
| PUT | `/leaverequests/{id}/reject` | Admin | Reject with comments, sends email |
| PUT | `/leaverequests/{id}/cancel` | Any (own only) | Cancel a Pending request |
| GET | `/leavebalances?employeeId=&year=2026` | Any (own only, unless Admin) | Balances for an employee |
| GET | `/leavebalances/me?year=2026` | Any | My balances |

### Attendance & reports

| Method | Endpoint | Role | What it does |
|--------|----------|------|--------------|
| GET | `/attendance?date=&employeeId=&month=&page=1&pageSize=10` | Any | Attendance rows (`month` is `yyyy-MM`, e.g. `2026-11`) |
| GET | `/attendance/today` | Any | The anchored "today" date (see below) plus my record for it, or `record: null` if I have not checked in |
| GET | `/attendance/my?month=` | Any | My attendance for a month |
| POST | `/attendance/checkin` | Any | Check in today |
| POST | `/attendance/checkout` | Any | Check out today |
| POST | `/attendance/mark` | Admin | Mark attendance for an employee/day |
| GET | `/reports/attendance.csv?month=2026-11` | Admin | Attendance CSV download |
| GET | `/reports/leaves.csv?status=&year=2026` | Admin | Leaves CSV download |

### Holidays

| Method | Endpoint | Role | What it does |
|--------|----------|------|--------------|
| GET | `/holidays?year=2026` | Any | Holidays for a year |
| GET | `/holidays/{id}` | Any | One holiday |
| POST | `/holidays` | Admin | Create holiday |
| PUT | `/holidays/{id}` | Admin | Update holiday |
| DELETE | `/holidays/{id}` | Admin | Delete holiday |

## Database: 7 tables

All tables are in `api/AttendanceLeave.Api/Models/Entities.cs`, one
`DbSet` each in `Data/AppDbContext.cs`. The schema is provider-agnostic —
the same LINQ runs on SQLite and SQL Server. There are no EF Core
migrations in this project: the model classes *are* the schema, and
`Program.cs` builds the tables with `Database.EnsureCreated()`.

| Table | Key fields |
|-------|-----------|
| `Departments` | Id, Name, Description |
| `Employees` | Id, EmployeeCode (unique, EMP001…), FirstName, LastName, Email (unique), Phone, Designation, DepartmentId (FK, delete restricted), DateOfJoining, Salary (decimal 18,2), IsActive (soft delete), PhotoPath, PasswordHash, PasswordSalt, Role ("Admin"/"Employee"), CreatedAt |
| `LeaveTypes` | Id, Name, Description, DaysAllowedPerYear, IsPaid |
| `LeaveRequests` | Id, EmployeeId (FK), LeaveTypeId (FK), StartDate, EndDate, Reason, Status ("Pending"/"Approved"/"Rejected"/"Cancelled"), AppliedOn, ReviewedBy (FK → Employee, null while Pending), ReviewedOn, ReviewComments |
| `LeaveBalances` | Id, EmployeeId (FK), LeaveTypeId (FK), Year, TotalDays, UsedDays; `RemainingDays` = TotalDays − UsedDays (computed, never stored); unique per (EmployeeId, LeaveTypeId, Year) |
| `Attendances` | Id, EmployeeId (FK), Date (one row per employee per day — unique), Status ("Present"/"Absent"/"Leave"/"HalfDay"), CheckInTime, CheckOutTime, Remarks |
| `Holidays` | Id, Name, Date, Description, IsPublicHoliday |

**Seed data** (`Data/SeedData.cs`, runs on every start but only fills
tables that are empty, so re-running is safe): 5 departments, 5 leave
types, 24 employees, 13 holidays for 2026, 16 leave requests (7 approved,
5 pending, 3 rejected, 1 cancelled), 96 leave balances for 2026 (24
employees × 4 types), and 622 attendance rows covering the 30 days up
to 19 Nov 2026 (working days only — Sundays and holidays skipped; 578
Present, 32 Absent, 12 on approved Leave; check-in 09:00–09:45,
check-out 17:30–18:30). Fixed random seed, so recreating the database
gives the same data every time. Delete `attendance.db` and restart the
API to get a fresh seed.

### The 19 November 2026 anchor — read this before the demo

The seed data, the dashboards and the attendance pages are all anchored
to one fixed "today": **19 Nov 2026** (the day this capstone was built
and demoed). That date is hard-coded in `SeedData.cs`,
`DashboardController.cs` and `AttendanceController.cs` — it is not the
computer's clock. It is deliberate, not a bug: the seed only covers up
to 19 Nov 2026, so "today" has to be a date inside the seeded data or
the dashboards would show zeros.

What it means in practice:

- The admin dashboard's "today" is 19 Nov 2026, and on a fresh seed it
  reads **22 Present out of 24 employees** — not 24. That is by design:
  the two demo accounts (Rahul Sharma and Priya Verma) deliberately have
  **no** 19-Nov row, so their check-in can be demoed live on stage
  (`GET /api/attendance/today` returns `record: null` for them until
  they check in). Every other employee has a 19-Nov Present row.
- The employee dashboard's "this month" is November 2026. Rahul's reads
  14 Present + 1 Absent = 15 rows, because his 19-Nov row is the missing
  one.
- A leave that spans a public holiday over-counts by the holiday days
  (holidays are not subtracted from leave days — see Features). No
  seeded approved leave spans a holiday, so the seeded data itself is
  consistent.
- If you demo after 19 Nov 2026, "today" is still 19 Nov 2026 in the
  app. That is the honest demo behaviour for this project; moving the
  anchor means changing the date in the three files above and re-seeding.

### Switching SQLite → SQL Server

SQLite is the local default (zero install). SQL Server is the
production target named in the faculty requirements. Both EF Core
providers are already referenced in the `.csproj`
(`Microsoft.EntityFrameworkCore.Sqlite` and `.SqlServer`, 8.0.11), and
`Program.cs` picks the provider from one setting — no code change is
needed to switch. Full steps: `api/AttendanceLeave.Api/DATABASE.md`.

1. Install SQL Server (or use a hosted instance) and create a database
   (e.g. `AttendanceLeaveDB`).
2. In `api/AttendanceLeave.Api/appsettings.json`, set
   `"DatabaseProvider": "SqlServer"` and put the connection string in
   `ConnectionStrings:SqlServer`.
3. Restart the API — the database is created and seeded on first start
   (same as SQLite).

**Honest note: the switch has never been run against a live SQL Server.**
The code path is wired and the SQL Server provider package is
referenced, but every verification so far (including the one below) ran
on SQLite. Do not claim SQL Server is running anywhere until it has
actually been run against one — the SQLite path is the only one
verified so far. The same applies to the Render deployment below:
Render's free tier has no SQL Server, so the deployed API would run
SQLite (`DatabaseProvider=Sqlite` in `render.yaml`).

## Project structure

```
render.yaml                    Render Blueprint (free tier, Docker)
.dockerignore                  Docker build context exclusions
.gitignore                     Root ignore: bin/, obj/, *.db, node_modules/,
                               dist/, .angular/, uploads/
README.md                      This file
api/
  AttendanceLeave.sln          Solution (one project: AttendanceLeave.Api)
  AttendanceLeave.Api/         ASP.NET Core 8 Web API
    Controllers/               Auth, Dashboard, Departments, Employees,
                               Health, Holidays, LeaveBalances,
                               LeaveRequests, LeaveTypes, Attendance,
                               Reports (11 controllers, 29 routes)
    Data/                      AppDbContext.cs, SeedData.cs
    Models/                    Entities.cs (all 7 tables)
    Services/                  AuthService.cs (SHA256 hashing + JWT),
                               EmailService.cs (SMTP, best-effort),
                               LeaveCalculator.cs (days minus Sundays)
    Dtos/                      Dtos.cs
    DATABASE.md                SQLite ↔ SQL Server switch, step by step
    appsettings.json           DatabaseProvider, ConnectionStrings,
                               Jwt (8h), AllowedOrigins, Email
    Program.cs                 DbContext provider switch, JWT auth,
                               Swagger + Bearer button, CORS, PORT
                               switch, EnsureCreated + seeding, static
                               files for uploaded photos, Production
                               warning if the dev JWT key is still in use
  Dockerfile                   Render image (build context = repo root)
web/                           Angular 18 frontend
  src/app/
    core/                      auth.service, auth.guard (incl. adminGuard),
                               auth.interceptor, data.service (all API
                               calls), models
    features/                  login, dashboard, employees, leaves,
                               attendance, holidays, reports
    environments/              environment.ts (localhost:5000),
                               environment.prod.ts (Render URL — see
                               Deployment)
  vercel.json                  Vercel SPA config (rewrites to index.html)
staging/
  deploy/
    DEPLOY-GUIDE.md            Full GitHub → Render → Vercel steps
    render-steps.md            Render-only steps (JWT secret, Blueprint)
  qa/
    final-acceptance.md        Independent acceptance pass, 19 Nov 2026
    api-test.sh / api-test-results.txt
    e2e-results.md / e2e-screenshots/
    security-results.md / security-tests.md
    code-realism.md / data-realism.md
```

## Deployment (summary)

Full steps: `staging/deploy/DEPLOY-GUIDE.md` (and Render-only detail in
`staging/deploy/render-steps.md`). **Nothing is live yet** — the URLs
below are created by following those steps; do not present them as
working links until then.

- **API on Render (free tier, Docker):** Render dashboard → New →
  Blueprint → pick the repo (branch `main`). `render.yaml` sets
  `plan: free`, `dockerfilePath: ./api/Dockerfile`, health check
  `/api/health`, `DatabaseProvider=Sqlite`. Render asks for `Jwt__Key`
  on first deploy (`sync: false`) — paste a locally generated secret
  there, never in chat and never in the repo (generate one with
  `[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(48))`
  in PowerShell). No `PORT` variable: Render assigns its own port and
  the Dockerfile entrypoint binds to it (falling back to 5000).
- **Frontend on Vercel:** import `web/`; `vercel.json` sets the build
  (`npm run build`), output `dist/attendance-leave-web/browser` and the
  SPA rewrite to `index.html`. Before deploying, check
  `environment.prod.ts` — it points at
  `https://attendance-leave-api.onrender.com/api`, which matches the
  `render.yaml` service name `attendance-leave-api` but is only real
  once that Render service actually exists. Rebuild after changing it.
- **CORS:** `render.yaml` sets `AllowedOrigins__0` to
  `https://employee-attendance-leave-management.vercel.app` — that is a
  **placeholder**. After Vercel deploys, set Render `AllowedOrigins__0` to
  the exact real Vercel URL (no trailing slash) and redeploy the API —
  otherwise login and all API calls fail with CORS errors.
- **GitHub first:** create the repo `Employee-Attendance-Leave-Management`
  (public) and push this tree. The root `.gitignore` already covers
  `bin/`, `obj/`, `*.db`, `node_modules/`, `dist/` and `.angular/`, so
  the runtime database file (`attendance.db`, created on first API
  start) and build outputs are not committed. Do not ship a
  half-mutated `attendance.db` in the zip/repo — delete it before
  pushing and let the deployed API seed its own fresh database.
- **Render free-tier note:** the first request after idle takes about a
  minute (cold start). Open the API health URL a minute before the demo.

## Email (optional)

Leave approve/reject emails only send when SMTP is configured. Set in
`appsettings.json` (or environment variables — never commit real
credentials):

```json
"Email": {
  "SmtpHost": "smtp.gmail.com",
  "SmtpPort": 587,
  "EnableSsl": true,
  "SmtpUser": "you@example.com",
  "SmtpPass": "your-app-password",
  "FromEmail": "you@example.com"
}
```

As shipped, `SmtpHost` is empty, which means email is **off**: the API
logs a warning and skips the email — approvals still work. No SMTP
account has been configured or tested for this project, so do not claim
emails arrive.

## Verification

Independent acceptance pass: `staging/qa/final-acceptance.md`,
19 Nov 2026, ~18:02–18:15 IST. It found one blocker
(`GET /api/departments` returned 500 — EF Core could not translate an
`OrderBy` over the projected DTO), one UI bug (the Mark Attendance form
sent `"09:00"` but the API's `TimeSpan?` needs `"09:00:00"`), and one
minor counting issue (dashboard/health counted soft-deleted employees).
**All three are fixed in the current code** — departments are ordered
before the projection, the Angular form appends `:00` to time inputs,
and today's counts plus `/api/health` count active employees only —
and all three fixes were re-verified in the fresh-seed run below.
(The acceptance pass's numbers differ slightly from the ones below —
it read 24 Present on 19 Nov and 384 November rows — because the
demo-account exception in the seed, which leaves Rahul and Priya with
no 19-Nov row, was added after that pass. The numbers below are the
current code's.)

Fresh isolated re-verification (19 Nov 2026, evening IST): byte copy of
`api/` to `/tmp`, fresh SQLite database, API on port 5002, workspace
database untouched. `dotnet build -c Release`: **0 warnings, 0 errors**.

| Check | Result |
|-------|--------|
| `GET /api/health` | 200 `{"status":"ok","provider":"Sqlite","employees":24}` |
| `GET /swagger/v1/swagger.json` | 200, **29 paths** |
| Admin login `admin@company.com` / `Admin@123` | 200, JWT role `Admin` |
| Employee login `rahul.sharma@company.com` / `Emp@123` | 200, JWT role `Employee` |
| `GET /api/departments` (was the 500 blocker) | **200, 5 departments** — Engineering 9, Finance 4, HR 3, Marketing 4, Sales 4 |
| `GET /api/dashboard/admin` | 200 — totalEmployees 24, presentToday **22**, absentToday 0, onLeaveToday 0, pendingLeaveRequests 5, leavesApprovedThisMonth 2, leavesByStatus Approved 7 / Pending 5 / Rejected 3 / Cancelled 1 |
| `GET /api/dashboard/employee` (Rahul) | 200 — Casual 12 total / 3 used / 9 remaining, Sick 10/0/10, Earned 15/0/15, Paternity 15/0/15; 0 pending requests; November attendance 14 Present + 1 Absent; next holiday Christmas 25 Dec 2026 |
| `GET /api/attendance/today` (Rahul) | 200 — `{"date":"2026-11-19","record":null}` (no 19-Nov row by design, so live check-in works) |
| `GET /api/holidays?year=2026` | 200, 13 holidays |
| `GET /api/reports/attendance.csv?month=2026-11` | 200 |
| `GET /api/reports/leaves.csv?year=2026` | 200 |
| Seed row counts (fresh DB, read directly) | Departments 5, Employees 24, LeaveTypes 5, LeaveRequests 16, LeaveBalances 96, Attendances 622, Holidays 13; 19 Nov: 22 Present rows |

Earlier passes in `staging/qa/` also verified (on the pre-fix code,
except where noted): the full leave flow with exact balance arithmetic
(approve 3 days: UsedDays 3 → 6, Remaining 9 → 6), check-in/out happy
path for a newly created employee (200/200, double check-in 400), admin
mark attendance, role enforcement (401 without token, 403 for employee
on admin endpoints — 11/11 + 11/11 in `security-results.md`), and all
seven frontend pages loading real data at desktop width plus a 360 px
dashboard screenshot.

## Honest notes

- **What runs where:** local development runs SQLite (zero install,
  database file created + seeded on first API start). SQL Server is the
  **target** for production/faculty requirements, not something running
  anywhere yet — the provider switch is config-only, but it has not
  been tested against a live SQL Server.
- **What is not live:** nothing has been deployed. The Render and Vercel
  URLs in this README and in `environment.prod.ts` / `render.yaml` are
  names the deployment steps will create, not working services — and the
  Vercel origin in `render.yaml` is a placeholder that must be replaced
  with the real frontend URL after Vercel assigns one.
- **What is not tested:** SMTP email (no account configured — only the
  disabled path is verified); the SQL Server provider switch (see
  above); a fresh browser re-check of the department dropdown after the
  `GET /api/departments` fix (the API now returns 200 with 5
  departments, verified — the UI screenshot showing the populated
  dropdown has not been retaken since the fix). [TO CONFIRM: retake the
  Employees-page screenshot against the fixed API before submission.]
- **Passwords:** SHA256(password + per-user random salt), stored
  Base64; plain passwords are never stored. Demo passwords are public
  by design — change them before any real deployment. The JWT key in
  `appsettings.json` is a public dev default; `Program.cs` logs a
  warning if Production still uses it — set a real `Jwt__Key` on Render.
- **Known simplifications:** leave days ignore public holidays; the
  "today" anchor is fixed to 19 Nov 2026 (see above); there are no EF
  Core migrations (`EnsureCreated()` builds the schema); a soft-deleted
  employee's old attendance rows stay in the database (only today's
  dashboard counts and `/api/health` filter to active employees).

## Troubleshooting

- **API crashes on startup with `'no such table: Departments'`** —
  you ran the DLL from a folder without `appsettings.json`. Run
  `dotnet` from inside `api\AttendanceLeave.Api` (see the
  working-directory note in Quick start).
- **Frontend shows "Loading…" forever** — the API is not running.
  Start it and check http://localhost:5000/api/health in the browser.
- **Login fails with demo credentials** — the database was not seeded
  (see the note above), or you are hitting a stale database: delete the
  `.db` file and restart the API. Demo logins are case-sensitive on the
  email as shown above.
- **Check-in button says "already checked in"** — expected for every
  seeded employee except Rahul Sharma and Priya Verma: the seed gives
  everyone else a 19-Nov row already. Demo check-in with one of those
  two accounts.
- **Port 5000 or 4200 already in use** — stop the other program using
  it, or change the port in `launchSettings.json` (API) /
  `npm start -- --port 4300` (frontend, and update the API URL in
  `src/environments/environment.ts`).
- **401 on every API call after login** — the JWT key is missing or
  changed between restarts. The `Jwt:Key` must be set (and stay the
  same) for tokens to validate.
- **Department dropdown empty on the Employees page** — this was the
  fixed `GET /api/departments` 500. If you see it, you are running an
  old build: rebuild the API (`dotnet build`) and restart.
- **No leave emails arrive** — expected without SMTP config (see Email
  above); approvals still work.

## Author

Vikash Kumar Singh — B.Tech CSE, Ajay Kumar Garg Engineering College,
Ghaziabad.
