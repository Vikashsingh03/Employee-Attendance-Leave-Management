# Employee Attendance and Leave Management System

A web application for small companies to manage employee attendance and leave requests in one place. Employees check in and out, apply for leave, and track their balances. Admins manage employees, approve or reject leave, mark attendance, and download reports.

Built as the capstone project for the HCLTech .NET Full Stack training (Batch-68), Ajay Kumar Garg Engineering College, Ghaziabad.

## Live Demo

- Website: https://employee-attendance-leave-managemen-tau.vercel.app
- API: https://attendance-leave-api.onrender.com/api/health
- API documentation (Swagger): https://attendance-leave-api.onrender.com/swagger

The API runs on Render's free tier, so the first request after the service has been idle takes about a minute to respond. Open the health link first and wait for it to answer before opening the website.

## What it does

- Admin dashboard with headcount, today's attendance, pending leave requests, and charts
- Employee dashboard with leave balances, pending requests, and monthly attendance
- Employee management: add, edit, search, filter, and deactivate employees
- Leave: apply, approve, reject, and cancel, with automatic balance updates
- Attendance: check-in/check-out, and admin marking for any employee and day
- Holidays: yearly list with add, edit, and delete
- Reports: attendance and leave data as CSV downloads
- Profile photo upload
- JWT login with Admin and Employee roles

## Tech Stack

| Layer | Technology |
| --- | --- |
| Backend | ASP.NET Core 8 Web API, C#, Entity Framework Core |
| Frontend | Angular 18, Chart.js |
| Database | SQL Server (target), SQLite (local and live demo) |
| Authentication | JWT, role-based authorization |
| API docs | Swagger |
| Hosting | Render (API), Vercel (frontend) |

## Database

Seven tables: Departments, Employees, LeaveTypes, LeaveRequests, LeaveBalances, Attendances, Holidays. Seeded with 5 departments, 24 employees, 5 leave types, 13 holidays for 2026, 16 leave requests, and 622 attendance rows.

## Run Locally

Prerequisites: .NET 8 SDK and Node.js 18 or later.

```powershell
# API (http://localhost:5000)
cd api\AttendanceLeave.Api
dotnet run
```

```powershell
# Frontend (http://localhost:4200) — in a second terminal
cd web
npm install
npm start
```

The API creates and seeds the database on first start.

## Demo Accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@company.com | Admin@123 |
| Employee | rahul.sharma@company.com | Emp@123 |
| Employee | priya.verma@company.com | Emp@123 |

All 24 seeded employees log in with `Emp@123` at `<firstname>.<lastname>@company.com`. These are demo accounts — change them before any real use.

## Project Structure

```
api/           ASP.NET Core 8 Web API (Controllers, Data, Models, Services)
web/           Angular 18 frontend
render.yaml    Render Blueprint for the API
```

## Notes

- Leave approve/reject emails are implemented over SMTP, but no SMTP account has been configured or tested for this project, so email is off by default and approvals work without it.
- The code targets SQL Server, and switching is a config change (see `api/AttendanceLeave.Api/DATABASE.md`). The live demo runs on SQLite because Render's free tier has no SQL Server.
- Leave days are calendar days minus Sundays. Public holidays are not subtracted.

## Author

Vikash Kumar Singh — B.Tech CSE, Ajay Kumar Garg Engineering College, Ghaziabad. Roll No. 2300271540137.
