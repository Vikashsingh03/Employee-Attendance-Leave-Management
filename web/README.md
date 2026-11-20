# Employee Attendance and Leave Management System — Frontend

Angular 18 frontend for the capstone project
(Employee Attendance and Leave Management System).
Backend: ASP.NET Core 8 Web API (see `../api/`).

## Run locally

```bash
npm install
npm start        # http://localhost:4200
```

The API must be running on `http://localhost:5000`
(see `src/environments/environment.ts`).

## Production build

```bash
npm run build    # ng build (production config by default)
```

The production build replaces `src/environments/environment.ts` with
`src/environments/environment.prod.ts` (see `fileReplacements` in
`angular.json`).

## Deployment URL

`environment.prod.ts` points at
`https://attendance-leave-api.onrender.com/api` — **placeholder**.
Update it to the real Render API service URL before deploying the
frontend, then rebuild.

## Demo accounts (seeded by the backend)

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@company.com | Admin@123 |
| Employee | rahul.sharma@company.com | Emp@123 |
| Employee | priya.verma@company.com | Emp@123 |

## Pages

- `/login` — sign in; demo accounts shown as a hint on the card.
- `/dashboard` — Admin: stat cards, attendance-by-department bar chart,
  leaves-by-status doughnut chart, pending approvals (approve/reject inline),
  upcoming holidays. Employee: leave balances, pending requests,
  monthly attendance, upcoming holidays.
- `/employees` (Admin) — search, department filter, sortable columns,
  pagination, add/edit/delete, detail view with leave balances and
  photo upload.
- `/leaves` — Employee: apply for leave (balance shown per type,
  end date must be on/after start date), my requests, cancel Pending.
  Admin: approvals queue with status filter and approve/reject.
- `/attendance` — Employee: Check In / Check Out + monthly table.
  Admin: day view (date + employee filter) + Mark Attendance form.
- `/holidays` — year list; Admin can add/edit/delete.
- `/reports` (Admin) — attendance CSV and leaves CSV downloads,
  printable leave summary.

## Tech

- Angular 18.2 (standalone components + Router), TypeScript 5.5
- Chart.js 4.4 for the dashboard charts
- JWT: token + user stored in `localStorage` after login; an HTTP
  interceptor attaches `Authorization: Bearer <token>` to every request.
- Auth guard redirects to `/login` without a token; Admin-only routes
  (`/employees`, `/reports`) are blocked for Employee accounts.

## Design

White / light-grey background, single deep-teal accent (`#0f766e`),
dark slate text, thin borders, soft shadows. No gradients, no emoji,
system font stack (Segoe UI / Roboto / Arial). Responsive down to 360px.
