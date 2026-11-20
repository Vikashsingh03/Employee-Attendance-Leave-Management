import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AdminDashboard, AttendanceRecord, Department, Employee, EmployeeDashboard,
  Holiday, LeaveBalance, LeaveRequest, LeaveType, PagedResult, TodayAttendance,
} from './models';

@Injectable({ providedIn: 'root' })
export class DataService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  health(): Observable<{ status: string; provider: string; employees: number }> {
    return this.http.get<{ status: string; provider: string; employees: number }>(`${this.base}/health`);
  }

  adminDashboard(): Observable<AdminDashboard> {
    return this.http.get<AdminDashboard>(`${this.base}/dashboard/admin`);
  }
  employeeDashboard(): Observable<EmployeeDashboard> {
    return this.http.get<EmployeeDashboard>(`${this.base}/dashboard/employee`);
  }

  departments(): Observable<Department[]> {
    return this.http.get<Department[]>(`${this.base}/departments`);
  }

  employees(params: {
    search?: string; departmentId?: number; status?: string; page?: number; pageSize?: number;
    sortBy?: string; sortDir?: string;
  }): Observable<PagedResult<Employee>> {
    let p = new HttpParams();
    if (params.search) p = p.set('search', params.search);
    if (params.departmentId) p = p.set('departmentId', String(params.departmentId));
    if (params.status) p = p.set('status', params.status);
    p = p.set('page', String(params.page ?? 1));
    p = p.set('pageSize', String(params.pageSize ?? 10));
    if (params.sortBy) p = p.set('sortBy', params.sortBy);
    if (params.sortDir) p = p.set('sortDir', params.sortDir);
    return this.http.get<PagedResult<Employee>>(`${this.base}/employees`, { params: p });
  }
  employee(id: number): Observable<Employee> {
    return this.http.get<Employee>(`${this.base}/employees/${id}`);
  }
  createEmployee(body: {
    firstName: string; lastName: string; email: string; phone?: string;
    designation?: string; departmentId: number; dateOfJoining: string;
    salary?: number; password?: string; role: string;
  }): Observable<{ id: number; employeeCode: string }> {
    return this.http.post<{ id: number; employeeCode: string }>(`${this.base}/employees`, body);
  }
  updateEmployee(id: number, body: {
    firstName: string; lastName: string; phone?: string;
    designation?: string; departmentId: number; dateOfJoining: string;
    salary?: number; role: string; isActive?: boolean;
  }): Observable<void> {
    return this.http.put<void>(`${this.base}/employees/${id}`, body);
  }
  deleteEmployee(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/employees/${id}`);
  }
  uploadPhoto(id: number, file: File): Observable<{ photoUrl: string }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ photoUrl: string }>(`${this.base}/employees/${id}/photo`, form);
  }

  leaveTypes(): Observable<LeaveType[]> {
    return this.http.get<LeaveType[]>(`${this.base}/leavetypes`);
  }
  leaveRequests(params: { status?: string; employeeId?: number; page?: number; pageSize?: number }): Observable<PagedResult<LeaveRequest>> {
    let p = new HttpParams();
    if (params.status) p = p.set('status', params.status);
    if (params.employeeId) p = p.set('employeeId', String(params.employeeId));
    p = p.set('page', String(params.page ?? 1));
    p = p.set('pageSize', String(params.pageSize ?? 50));
    return this.http.get<PagedResult<LeaveRequest>>(`${this.base}/leaverequests`, { params: p });
  }
  applyLeave(body: { leaveTypeId: number; startDate: string; endDate: string; reason: string }): Observable<LeaveRequest> {
    return this.http.post<LeaveRequest>(`${this.base}/leaverequests`, body);
  }
  approveLeave(id: number, comments?: string): Observable<LeaveRequest> {
    return this.http.put<LeaveRequest>(`${this.base}/leaverequests/${id}/approve`, { comments: comments ?? '' });
  }
  rejectLeave(id: number, comments: string): Observable<LeaveRequest> {
    return this.http.put<LeaveRequest>(`${this.base}/leaverequests/${id}/reject`, { comments });
  }
  cancelLeave(id: number): Observable<LeaveRequest> {
    return this.http.put<LeaveRequest>(`${this.base}/leaverequests/${id}/cancel`, {});
  }

  myBalances(): Observable<LeaveBalance[]> {
    return this.http.get<LeaveBalance[]>(`${this.base}/leavebalances/me`);
  }

  attendance(params: { date?: string; employeeId?: number; month?: string; page?: number; pageSize?: number }): Observable<PagedResult<AttendanceRecord>> {
    let p = new HttpParams();
    if (params.date) p = p.set('date', params.date);
    if (params.employeeId) p = p.set('employeeId', String(params.employeeId));
    if (params.month) p = p.set('month', params.month);
    p = p.set('page', String(params.page ?? 1));
    p = p.set('pageSize', String(params.pageSize ?? 50));
    return this.http.get<PagedResult<AttendanceRecord>>(`${this.base}/attendance`, { params: p });
  }
  myAttendance(month: string): Observable<AttendanceRecord[]> {
    return this.http.get<AttendanceRecord[]>(`${this.base}/attendance/my`, {
      params: new HttpParams().set('month', month),
    });
  }
  todayAttendance(): Observable<TodayAttendance> {
    return this.http.get<TodayAttendance>(`${this.base}/attendance/today`);
  }
  checkIn(): Observable<AttendanceRecord> {
    return this.http.post<AttendanceRecord>(`${this.base}/attendance/checkin`, {});
  }
  checkOut(): Observable<AttendanceRecord> {
    return this.http.post<AttendanceRecord>(`${this.base}/attendance/checkout`, {});
  }
  markAttendance(body: {
    employeeId: number; date: string; status: string;
    checkInTime?: string; checkOutTime?: string; remarks?: string;
  }): Observable<AttendanceRecord> {
    return this.http.post<AttendanceRecord>(`${this.base}/attendance/mark`, body);
  }

  holidays(year: number): Observable<Holiday[]> {
    return this.http.get<Holiday[]>(`${this.base}/holidays`, {
      params: new HttpParams().set('year', String(year)),
    });
  }
  createHoliday(body: Partial<Holiday>): Observable<Holiday> {
    return this.http.post<Holiday>(`${this.base}/holidays`, body);
  }
  updateHoliday(id: number, body: Partial<Holiday>): Observable<Holiday> {
    return this.http.put<Holiday>(`${this.base}/holidays/${id}`, body);
  }
  deleteHoliday(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/holidays/${id}`);
  }

  attendanceCsv(month: string): Observable<Blob> {
    return this.http.get(`${this.base}/reports/attendance.csv`, {
      params: new HttpParams().set('month', month),
      responseType: 'blob',
    });
  }
  leavesCsv(status: string, year: number): Observable<Blob> {
    return this.http.get(`${this.base}/reports/leaves.csv`, {
      params: new HttpParams().set('status', status).set('year', String(year)),
      responseType: 'blob',
    });
  }
}
