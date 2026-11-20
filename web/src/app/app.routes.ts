import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./features/login/login.component').then((m) => m.LoginComponent) },
  { path: 'signup', loadComponent: () => import('./features/signup/signup.component').then((m) => m.SignupComponent) },
  { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent), canActivate: [authGuard] },
  { path: 'employees', loadComponent: () => import('./features/employees/employees.component').then((m) => m.EmployeesComponent), canActivate: [authGuard, adminGuard] },
  { path: 'leaves', loadComponent: () => import('./features/leaves/leaves.component').then((m) => m.LeavesComponent), canActivate: [authGuard] },
  { path: 'attendance', loadComponent: () => import('./features/attendance/attendance.component').then((m) => m.AttendanceComponent), canActivate: [authGuard] },
  { path: 'holidays', loadComponent: () => import('./features/holidays/holidays.component').then((m) => m.HolidaysComponent), canActivate: [authGuard] },
  { path: 'reports', loadComponent: () => import('./features/reports/reports.component').then((m) => m.ReportsComponent), canActivate: [authGuard, adminGuard] },
  { path: '**', redirectTo: '/dashboard' },
];
