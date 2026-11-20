import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend, DoughnutController, ArcElement } from 'chart.js';
import { AuthService } from '../../core/auth.service';
import { DataService } from '../../core/data.service';
import { ToastService } from '../../core/toast.service';
import { photoFor, initialsFor } from '../../core/employee-photos';
import { AdminDashboard, Employee, EmployeeDashboard, LeaveRequest, RecentLeaveRequest, User } from '../../core/models';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend, DoughnutController, ArcElement);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit, OnDestroy {
  isAdmin = false;
  loading = true;
  error = '';
  admin: AdminDashboard | null = null;
  mine: EmployeeDashboard | null = null;
  today = new Date();
  busyId: number | null = null;
  checking = false;
  currentUser: User | null = null;
  myPhoto: string | null = null;
  myPhotoFailed = false;
  recentHires: Employee[] = [];
  upcomingAnniversaries: Array<{ employee: Employee; anniversaryDate: Date; years: number }> = [];
  myRecentLeaves: LeaveRequest[] = [];
  private barChart: Chart | null = null;
  private doughnutChart: Chart | null = null;
  private employeesByName = new Map<string, Employee>();
  private failedPhotos = new Set<string>();
  private counts = new Map<string, number>();
  private countRafs: number[] = [];
  private readonly reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(private auth: AuthService, private data: DataService, private toast: ToastService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isAdmin = this.auth.isAdmin();
    this.currentUser = this.auth.getUser();
    this.myPhoto = this.currentUser ? this.photoByCode(this.currentUser.employeeCode) : null;
    this.myPhotoFailed = false;
    this.loading = true;
    this.error = '';
    if (this.isAdmin) {
      this.loadDirectory();
      this.data.adminDashboard().subscribe({
        next: (d) => {
          this.admin = d;
          this.loading = false;
          this.animateStats([
            ['totalEmployees', d.totalEmployees],
            ['presentToday', d.presentToday],
            ['absentToday', d.absentToday],
            ['onLeaveToday', d.onLeaveToday],
            ['pendingRequests', d.pendingLeaveRequests],
            ['approvedMonth', d.leavesApprovedThisMonth],
          ]);
          setTimeout(() => this.buildCharts(), 0);
        },
        error: () => { this.error = 'Could not load the dashboard. Please try again.'; this.loading = false; },
      });
    } else {
      this.loadMyRecentLeaves();
      this.data.employeeDashboard().subscribe({
        next: (d) => {
          this.mine = d;
          this.loading = false;
          this.animateStats([
            ['myPending', d.myPendingRequests],
            ['present', d.myAttendanceThisMonth.present],
            ['absent', d.myAttendanceThisMonth.absent],
            ['leave', d.myAttendanceThisMonth.leave],
          ]);
        },
        error: () => { this.error = 'Could not load the dashboard. Please try again.'; this.loading = false; },
      });
    }
  }

  retry(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.cancelCountAnims();
    this.barChart?.destroy();
    this.doughnutChart?.destroy();
  }

  statValue(key: string, target: number): number {
    const v = this.counts.get(key);
    return v === undefined ? target : v;
  }

  private animateStats(entries: Array<[string, number]>): void {
    this.cancelCountAnims();
    if (this.reduceMotion) {
      entries.forEach(([k, t]) => this.counts.set(k, t));
      return;
    }
    const duration = 800;
    const start = performance.now();
    entries.forEach(([k]) => this.counts.set(k, 0));
    const tick = (now: number): void => {
      const p = Math.min(1, Math.max(0, (now - start) / duration));
      const eased = 1 - Math.pow(1 - p, 3);
      entries.forEach(([k, t]) => this.counts.set(k, Math.round(t * eased)));
      if (p < 1) this.countRafs.push(requestAnimationFrame(tick));
    };
    this.countRafs.push(requestAnimationFrame(tick));
  }

  private syncStats(entries: Array<[string, number]>): void {
    this.cancelCountAnims();
    entries.forEach(([k, t]) => this.counts.set(k, t));
  }

  private cancelCountAnims(): void {
    this.countRafs.forEach((id) => cancelAnimationFrame(id));
    this.countRafs = [];
  }

  photoByCode(code: string): string | null {
    if (!code || this.failedPhotos.has(code)) return null;
    return photoFor(code);
  }

  photoByName(name: string): string | null {
    const emp = this.employeesByName.get(name.trim().toLowerCase());
    if (!emp) return null;
    return this.photoByCode(emp.employeeCode);
  }

  codeByName(name: string): string {
    return this.employeesByName.get(name.trim().toLowerCase())?.employeeCode ?? '';
  }

  onPhotoError(code: string): void {
    if (code) this.failedPhotos.add(code);
  }

  initials(name: string): string {
    return initialsFor(name ?? '');
  }

  tintForName(name: string): string {
    const tints = ['fb-violet', 'fb-teal', 'fb-amber', 'fb-rose', 'fb-blue', 'fb-green'];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return tints[h % tints.length];
  }

  get firstName(): string {
    return this.currentUser?.fullName?.trim().split(/\s+/)[0] ?? '';
  }


  share(part: number, total: number): number {
    if (!total || total <= 0) return 0;
    return Math.max(0, Math.min(100, (part / total) * 100));
  }

  daysBetween(start: string, end: string): number {
    const a = new Date(this.dayKey(start) + 'T00:00:00');
    const b = new Date(this.dayKey(end) + 'T00:00:00');
    if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
    return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000) + 1);
  }

  daysUntil(date: Date): number {
    const start = new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate());
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return Math.max(0, Math.round((d.getTime() - start.getTime()) / 86400000));
  }

  get totalLeaveRemaining(): number {
    return (this.mine?.myLeaveBalances ?? []).reduce((s, b) => s + (b.remaining || 0), 0);
  }

  private loadDirectory(): void {
    this.data.employees({ page: 1, pageSize: 100 }).subscribe({
      next: (res) => {
        this.employeesByName = new Map(
          res.items.map((e) => [e.fullName.trim().toLowerCase(), e] as [string, Employee]),
        );
        this.recentHires = [...res.items]
          .sort((a, b) => b.dateOfJoining.localeCompare(a.dateOfJoining))
          .slice(0, 5);
        this.upcomingAnniversaries = this.anniversariesWithin30Days(res.items);
      },
      error: () => {},
    });
  }

  private anniversariesWithin30Days(
    employees: Employee[],
  ): Array<{ employee: Employee; anniversaryDate: Date; years: number }> {
    const start = new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate());
    const out: Array<{ employee: Employee; anniversaryDate: Date; years: number }> = [];
    for (const e of employees) {
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(e.dateOfJoining ?? '');
      if (!m) continue;
      const joinYear = Number(m[1]);
      const month = Number(m[2]);
      const day = Number(m[3]);
      let anniv = this.anniversaryInYear(month, day, start.getFullYear());
      if (anniv < start) anniv = this.anniversaryInYear(month, day, start.getFullYear() + 1);
      const daysUntil = Math.round((anniv.getTime() - start.getTime()) / 86400000);
      if (daysUntil < 0 || daysUntil > 30) continue;
      out.push({ employee: e, anniversaryDate: anniv, years: anniv.getFullYear() - joinYear });
    }
    return out
      .sort((a, b) => a.anniversaryDate.getTime() - b.anniversaryDate.getTime())
      .slice(0, 5);
  }

  private anniversaryInYear(month: number, day: number, year: number): Date {
    if (month === 2 && day === 29 && !this.isLeapYear(year)) return new Date(year, 1, 28);
    return new Date(year, month - 1, day);
  }

  private isLeapYear(year: number): boolean {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  }

  get onLeaveTodayList(): RecentLeaveRequest[] {
    if (!this.admin) return [];
    const t = this.dayKey(this.today);
    return this.admin.recentLeaveRequests.filter(
      (r) => r.status === 'Approved' && this.dayKey(r.startDate) <= t && t <= this.dayKey(r.endDate),
    );
  }

  private dayKey(d: string | Date): string {
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
    const dt = typeof d === 'string' ? new Date(d) : d;
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${dt.getFullYear()}-${m}-${day}`;
  }

  private loadMyRecentLeaves(): void {
    const id = this.currentUser?.id;
    if (!id) return;
    this.data.leaveRequests({ employeeId: id, page: 1, pageSize: 5 }).subscribe({
      next: (res) => { this.myRecentLeaves = res.items; },
      error: () => {},
    });
  }

  checkIn(): void {
    this.checking = true;
    this.data.checkIn().subscribe({
      next: (rec) => {
        this.checking = false;
        const time = rec.checkInTime ? rec.checkInTime.slice(0, 5) : '';
        this.toast.success(time ? `Checked in at ${time}.` : 'Checked in.', 'Checked in');
        this.load();
      },
      error: (e) => {
        this.checking = false;
        this.toast.error(e?.error?.message || 'Check-in failed. You may already be checked in today.', 'Check-in failed');
      },
    });
  }

  private buildCharts(): void {
    if (!this.admin) return;
    this.barChart?.destroy();
    this.doughnutChart?.destroy();

    const barCanvas = document.getElementById('deptChart') as HTMLCanvasElement | null;
    if (barCanvas) {
      this.barChart = new Chart(barCanvas, {
        type: 'bar',
        data: {
          labels: this.admin.attendanceByDepartment.map((d) => d.department),
          datasets: [
            { label: 'Present', data: this.admin.attendanceByDepartment.map((d) => d.present), backgroundColor: '#0D9488', borderRadius: 6, maxBarThickness: 28 },
            { label: 'Total', data: this.admin.attendanceByDepartment.map((d) => d.total), backgroundColor: '#DBEAFE', borderRadius: 6, maxBarThickness: 28 },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 800 },
          interaction: { intersect: false, mode: 'index' },
          plugins: {
            legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', boxHeight: 8, color: '#1E1B4B' } },
            tooltip: { backgroundColor: '#1E1B4B', padding: 10, cornerRadius: 8, displayColors: false },
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: '#6B7280' }, border: { display: false } },
            y: { beginAtZero: true, ticks: { stepSize: 1, color: '#6B7280' }, grid: { color: '#E5E0F5' }, border: { display: false } },
          },
        },
      });
    }

    const doughnutCanvas = document.getElementById('statusChart') as HTMLCanvasElement | null;
    if (doughnutCanvas) {
      const statusColors: Record<string, string> = {
        Approved: '#16A34A',
        Pending: '#D97706',
        Rejected: '#E11D48',
        Cancelled: '#6B7280',
      };
      this.doughnutChart = new Chart(doughnutCanvas, {
        type: 'doughnut',
        data: {
          labels: this.admin.leavesByStatus.map((s) => s.status),
          datasets: [{
            data: this.admin.leavesByStatus.map((s) => s.count),
            backgroundColor: this.admin.leavesByStatus.map((s) => statusColors[s.status] ?? '#6B7280'),
            borderColor: '#ffffff',
            borderWidth: 2,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '64%',
          animation: { duration: 800 },
          plugins: {
            legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', boxHeight: 8, color: '#1E1B4B' } },
            tooltip: { backgroundColor: '#1E1B4B', padding: 10, cornerRadius: 8, displayColors: false },
          },
        },
      });
    }
  }

  get pendingRequests(): RecentLeaveRequest[] {
    return (this.admin?.recentLeaveRequests ?? []).filter((r) => r.status === 'Pending');
  }

  statusClass(status: string): string {
    const s = status.toLowerCase();
    if (s === 'approved' || s === 'present') return 'badge-approved';
    if (s === 'rejected' || s === 'absent') return 'badge-rejected';
    if (s === 'pending') return 'badge-pending';
    return 'badge-cancelled';
  }

  usedPercent(total: number, used: number): number {
    if (!total || total <= 0) return 0;
    return Math.min(100, Math.round((used / total) * 100));
  }

  readonly ringCircumference = 2 * Math.PI * 34;

  ringDash(total: number, used: number): string {
    const c = this.ringCircumference;
    const frac = !total || total <= 0 ? 0 : Math.min(1, Math.max(0, (total - used) / total));
    return `${(frac * c).toFixed(1)} ${c.toFixed(1)}`;
  }

  private readonly accentCycle = ['bal-violet', 'bal-teal', 'bal-amber', 'bal-rose', 'bal-blue', 'bal-green'];

  accentFor(i: number): string {
    return this.accentCycle[i % this.accentCycle.length];
  }

  approve(id: number): void {
    this.busyId = id;
    this.data.approveLeave(id).subscribe({
      next: () => {
        this.busyId = null;
        this.toast.success('Leave request approved.');
        this.refreshAdmin();
      },
      error: () => { this.busyId = null; this.toast.error('Could not approve the request.'); },
    });
  }

  reject(id: number): void {
    const comments = prompt('Reason for rejection (shown to the employee):');
    if (comments === null) return;
    if (!comments.trim()) { this.toast.warning('A rejection reason is required.'); return; }
    this.busyId = id;
    this.data.rejectLeave(id, comments.trim()).subscribe({
      next: () => {
        this.busyId = null;
        this.toast.success('Leave request rejected.');
        this.refreshAdmin();
      },
      error: () => { this.busyId = null; this.toast.error('Could not reject the request.'); },
    });
  }

  private refreshAdmin(): void {
    this.data.adminDashboard().subscribe({
      next: (d) => {
        this.admin = d;
        this.syncStats([
          ['totalEmployees', d.totalEmployees],
          ['presentToday', d.presentToday],
          ['absentToday', d.absentToday],
          ['onLeaveToday', d.onLeaveToday],
          ['pendingRequests', d.pendingLeaveRequests],
          ['approvedMonth', d.leavesApprovedThisMonth],
        ]);
        setTimeout(() => this.buildCharts(), 0);
      },
      error: () => {},
    });
  }
}
