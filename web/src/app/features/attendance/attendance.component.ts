import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { DataService } from '../../core/data.service';
import { ToastService } from '../../core/toast.service';
import { AttendanceRecord, Employee, TodayAttendance } from '../../core/models';
import { photoFor, initialsFor } from '../../core/employee-photos';

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance.component.html',
  styleUrl: './attendance.component.css',
})
export class AttendanceComponent implements OnInit, OnDestroy {
  isAdmin = false;
  loading = true;
  error = '';

  todayDate = new Date();
  now = new Date();
  private clockId: ReturnType<typeof setInterval> | null = null;

  private codeById = new Map<number, string>();

  get myPhoto(): string | null {
    const code = this.auth.getUser()?.employeeCode;
    return code ? photoFor(code) : null;
  }

  get myName(): string {
    return this.auth.getUser()?.fullName ?? '';
  }

  myInitials(): string {
    return initialsFor(this.myName);
  }

  recordPhoto(r: AttendanceRecord): string | null {
    const code = this.codeById.get(r.employeeId);
    return code ? photoFor(code) : null;
  }

  initialsOf(name: string): string {
    return initialsFor(name);
  }

  month = '';
  myRecords: AttendanceRecord[] = [];
  today: AttendanceRecord | null = null;
  checking = false;
  checkingAction: 'in' | 'out' | null = null;
  apiToday = '';
  private apiTodayRecord: AttendanceRecord | null = null;

  date = '';
  employeeFilter = 0;
  employees: Employee[] = [];
  dayRecords: AttendanceRecord[] = [];
  csvMonth = '';
  exporting = false;

  markEmployeeId = 0;
  markDate = '';
  markStatus = 'Present';
  markIn = '';
  markOut = '';
  markRemarks = '';
  markError = '';
  marking = false;

  constructor(private auth: AuthService, private data: DataService, private toast: ToastService) {}

  ngOnInit(): void {
    this.isAdmin = this.auth.isAdmin();
    const now = new Date();
    this.month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    this.csvMonth = this.month;
    this.date = this.todayStr();
    this.markDate = this.todayStr();
    this.now = new Date();
    this.clockId = setInterval(() => { this.now = new Date(); }, 1000);
    if (this.isAdmin) {
      this.data.employees({ page: 1, pageSize: 100, sortBy: 'name' }).subscribe({
        next: (res) => {
          this.employees = res.items;
          for (const e of res.items) this.codeById.set(e.id, e.employeeCode);
        },
        error: () => {},
      });
    }
    this.data.todayAttendance().subscribe({
      next: (res: TodayAttendance) => {
        this.apiToday = res.date.slice(0, 10);
        this.month = this.apiToday.slice(0, 7);
        this.csvMonth = this.month;
        this.date = this.apiToday;
        this.markDate = this.apiToday;
        this.apiTodayRecord = res.record ?? null;
        if (this.isAdmin) {
          this.loadDay();
        } else {
          this.today = this.apiTodayRecord;
          this.loadMine();
        }
      },
      error: () => {
        if (this.isAdmin) this.loadDay();
        else this.loadMine();
      },
    });
  }

  ngOnDestroy(): void {
    if (this.clockId !== null) clearInterval(this.clockId);
  }

  private todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private effectiveToday(): string {
    return this.apiToday || this.todayStr();
  }

  get heroState(): 'none' | 'in' | 'out' | 'marked' {
    if (!this.today) return 'none';
    if (this.today.checkOutTime) return 'out';
    if (this.today.checkInTime) return 'in';
    return 'marked';
  }

  get summary(): { present: number; absent: number; leave: number; halfDay: number } {
    return this.countByStatus(this.myRecords);
  }

  get daySummary(): { present: number; absent: number; leave: number; halfDay: number } {
    return this.countByStatus(this.dayRecords);
  }

  private countByStatus(rows: AttendanceRecord[]): { present: number; absent: number; leave: number; halfDay: number } {
    const s = { present: 0, absent: 0, leave: 0, halfDay: 0 };
    for (const r of rows) {
      const v = (r.status ?? '').toLowerCase();
      if (v === 'present') s.present++;
      else if (v === 'absent') s.absent++;
      else if (v === 'leave') s.leave++;
      else if (v === 'halfday') s.halfDay++;
    }
    return s;
  }

  loadMine(): void {
    this.loading = true;
    this.error = '';
    this.data.myAttendance(this.month).subscribe({
      next: (rows) => {
        this.myRecords = rows;
        const found = rows.find((r) => r.date.slice(0, 10) === this.effectiveToday());
        this.today = found ?? (this.month === this.apiToday.slice(0, 7) ? this.apiTodayRecord : null);
        this.loading = false;
      },
      error: () => { this.error = 'Could not load your attendance.'; this.loading = false; },
    });
  }

  checkIn(): void {
    this.checking = true;
    this.checkingAction = 'in';
    this.data.checkIn().subscribe({
      next: (rec) => {
        this.checking = false;
        this.checkingAction = null;
        this.toast.success('Checked in at ' + this.shortTime(rec.checkInTime) + '.', 'Checked in');
        if (this.today) this.today = { ...this.today, checkInTime: rec.checkInTime ?? this.today.checkInTime };
        this.loadMine();
      },
      error: (e) => {
        this.checking = false;
        this.checkingAction = null;
        this.toast.error(e?.error?.message || 'Check-in failed. You may already be checked in today.', 'Check-in failed');
      },
    });
  }

  checkOut(): void {
    this.checking = true;
    this.checkingAction = 'out';
    this.data.checkOut().subscribe({
      next: (rec) => {
        this.checking = false;
        this.checkingAction = null;
        this.toast.success('Checked out at ' + this.shortTime(rec.checkOutTime) + '.', 'Checked out');
        if (this.today) this.today = { ...this.today, checkOutTime: rec.checkOutTime ?? this.today.checkOutTime };
        this.loadMine();
      },
      error: (e) => {
        this.checking = false;
        this.checkingAction = null;
        this.toast.error(e?.error?.message || 'Check-out failed. Check in first.', 'Check-out failed');
      },
    });
  }

  loadDay(): void {
    this.loading = true;
    this.error = '';
    this.data.attendance({ date: this.date, employeeId: this.employeeFilter || undefined }).subscribe({
      next: (res) => { this.dayRecords = res.items; this.loading = false; },
      error: () => { this.error = 'Could not load attendance records.'; this.loading = false; },
    });
  }

  exportCsv(): void {
    if (this.exporting || !this.csvMonth) return;
    this.exporting = true;
    this.data.attendanceCsv(this.csvMonth).subscribe({
      next: (blob) => {
        this.exporting = false;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance-${this.csvMonth}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        this.toast.success('Attendance CSV downloaded.', 'Export complete');
      },
      error: () => {
        this.exporting = false;
        this.toast.error('Could not download the attendance CSV.', 'Export failed');
      },
    });
  }

  private toTimeSpan(value: string): string | undefined {
    if (!value) return undefined;
    return value.split(':').length === 2 ? value + ':00' : value;
  }

  mark(): void {
    this.markError = '';
    if (!this.markEmployeeId || !this.markDate || !this.markStatus) {
      this.markError = 'Employee, date and status are required.';
      return;
    }
    this.marking = true;
    this.data.markAttendance({
      employeeId: this.markEmployeeId,
      date: this.markDate,
      status: this.markStatus,
      checkInTime: this.toTimeSpan(this.markIn),
      checkOutTime: this.toTimeSpan(this.markOut),
      remarks: this.markRemarks.trim() || undefined,
    }).subscribe({
      next: () => {
        this.marking = false;
        this.toast.success('Attendance marked.', 'Attendance marked');
        this.markRemarks = '';
        this.loadDay();
      },
      error: (e) => {
        this.marking = false;
        this.markError = e?.error?.message || 'Could not mark attendance.';
      },
    });
  }

  statusClass(status: string): string {
    const s = (status ?? '').toLowerCase();
    if (s === 'present') return 'badge-present';
    if (s === 'absent') return 'badge-absent';
    if (s === 'leave') return 'badge-leave';
    if (s === 'halfday') return 'badge-halfday';
    return 'badge-cancelled';
  }

  statusLabel(status: string): string {
    return (status ?? '').toLowerCase() === 'halfday' ? 'Half Day' : (status ?? '');
  }

  shortTime(value?: string): string {
    return value ? value.slice(0, 5) : '–';
  }

  private timeToMinutes(value?: string): number | null {
    if (!value) return null;
    const parts = value.split(':').map((p) => Number(p));
    if (parts.length < 2 || parts.some((n) => Number.isNaN(n))) return null;
    return parts[0] * 60 + parts[1];
  }

  effectiveHours(r: AttendanceRecord): number | null {
    const inMin = this.timeToMinutes(r.checkInTime);
    const outMin = this.timeToMinutes(r.checkOutTime);
    if (inMin === null || outMin === null || outMin < inMin) return null;
    return (outMin - inMin) / 60;
  }

  effectiveHoursLabel(r: AttendanceRecord): string {
    const h = this.effectiveHours(r);
    if (h !== null) {
      const whole = Math.floor(h);
      const mins = Math.round((h - whole) * 60);
      return mins ? `${whole}h ${mins}m` : `${whole}h`;
    }
    return r.checkInTime ? 'In progress' : '–';
  }

  hoursBarWidth(r: AttendanceRecord): number {
    const h = this.effectiveHours(r);
    return h === null ? 0 : Math.min(100, Math.round((h / 8) * 100));
  }

  isLate(r: AttendanceRecord): boolean {
    const inMin = this.timeToMinutes(r.checkInTime);
    return inMin !== null && inMin > 10 * 60;
  }

  formatDate(value: string): string {
    if (!value) return '';
    const parts = value.split('-').map((p) => Number(p));
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return value;
    return new Date(parts[0], parts[1] - 1, parts[2])
      .toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
