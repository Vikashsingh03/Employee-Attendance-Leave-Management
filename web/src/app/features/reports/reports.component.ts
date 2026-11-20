import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend, DoughnutController, ArcElement, Plugin } from 'chart.js';
import { DataService } from '../../core/data.service';
import { ToastService } from '../../core/toast.service';
import { Employee, LeaveRequest } from '../../core/models';
import { photoFor, initialsFor } from '../../core/employee-photos';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend, DoughnutController, ArcElement);
@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.css',
})
export class ReportsComponent implements OnInit, OnDestroy {
  month = '';
  statusFilter = '';
  year = new Date().getFullYear();
  summary: LeaveRequest[] = [];
  summaryTotal = 0;
  loadingSummary = false;
  summaryError = '';
  error = '';
  downloading = '';
  failedDownload = '';

  employees: Employee[] = [];
  private deptChart: Chart | null = null;
  private leaveChart: Chart | null = null;

  private codeById = new Map<number, string>();

  summaryPhoto(r: LeaveRequest): string | null {
    const code = this.codeById.get(r.employeeId);
    return code ? photoFor(code) : null;
  }

  initialsOf(name: string): string {
    return initialsFor(name);
  }

  constructor(private data: DataService, private toast: ToastService) {}

  ngOnInit(): void {
    const now = new Date();
    this.month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    this.data.employees({ page: 1, pageSize: 100, sortBy: 'name' }).subscribe({
      next: (res) => {
        this.employees = res.items;
        for (const e of res.items) this.codeById.set(e.id, e.employeeCode);
        setTimeout(() => this.buildCharts(), 0);
      },
      error: () => {},
    });
    this.loadSummary();
  }

  ngOnDestroy(): void {
    this.deptChart?.destroy();
    this.leaveChart?.destroy();
  }

  private buildCharts(): void {
    this.deptChart?.destroy();
    this.leaveChart?.destroy();

    const deptCanvas = document.getElementById('deptHeadcountChart') as HTMLCanvasElement | null;
    if (deptCanvas && this.employees.length) {
      const counts = new Map<string, number>();
      for (const e of this.employees) counts.set(e.departmentName, (counts.get(e.departmentName) ?? 0) + 1);
      const labels = [...counts.keys()];
      const palette = ['#6D28D9', '#0D9488', '#D97706', '#E11D48', '#2563EB', '#16A34A'];
      const totalEmployees = this.employees.length;
      const centreText: Plugin<'doughnut'> = {
        id: 'deptCentre',
        afterDraw: (chart: Chart) => {
          const area = chart.chartArea;
          if (!area) return;
          const cx = (area.left + area.right) / 2;
          const cy = (area.top + area.bottom) / 2;
          const ctx = chart.ctx;
          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#1E1B4B';
          ctx.font = '700 20px Inter, sans-serif';
          ctx.fillText(String(totalEmployees), cx, cy - 9);
          ctx.fillStyle = '#6B7280';
          ctx.font = '500 12px Inter, sans-serif';
          ctx.fillText(totalEmployees === 1 ? 'employee' : 'employees', cx, cy + 11);
          ctx.restore();
        },
      };
      this.deptChart = new Chart(deptCanvas, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data: labels.map((l) => counts.get(l) ?? 0),
            backgroundColor: labels.map((_, i) => palette[i % palette.length]),
            borderColor: '#ffffff',
            borderWidth: 2,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '62%',
          animation: { duration: 800 },
          plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', boxHeight: 8, color: '#1E1B4B' } } },
        },
        plugins: [centreText],
      });
    }

    const leaveCanvas = document.getElementById('leaveTrendChart') as HTMLCanvasElement | null;
    if (leaveCanvas && this.summary.length) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const statuses = ['Approved', 'Pending', 'Rejected', 'Cancelled'];
      const statusColors: Record<string, string> = {
        Approved: '#16A34A', Pending: '#D97706', Rejected: '#E11D48', Cancelled: '#6B7280',
      };
      const byMonthStatus = months.map(() => ({ Approved: 0, Pending: 0, Rejected: 0, Cancelled: 0 } as Record<string, number>));
      for (const r of this.summary) {
        const m = new Date(r.startDate.slice(0, 10) + 'T00:00:00').getMonth();
        const s = statuses.includes(r.status) ? r.status : 'Cancelled';
        if (!Number.isNaN(m)) byMonthStatus[m][s]++;
      }
      this.leaveChart = new Chart(leaveCanvas, {
        type: 'bar',
        data: {
          labels: months,
          datasets: statuses.map((s) => ({
            label: s,
            data: byMonthStatus.map((row) => row[s]),
            backgroundColor: statusColors[s],
            borderRadius: 4,
            maxBarThickness: 28,
          })),
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 800 },
          plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', boxHeight: 8, color: '#1E1B4B' } } },
          scales: {
            x: { stacked: true, grid: { display: false }, ticks: { color: '#6B7280' } },
            y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1, color: '#6B7280' }, grid: { color: '#E5E0F5' }, border: { display: false } },
          },
        },
      });
    }
  }

  get approvedCount(): number {
    return this.summary.filter((r) => r.status.toLowerCase() === 'approved').length;
  }
  get pendingCount(): number {
    return this.summary.filter((r) => r.status.toLowerCase() === 'pending').length;
  }
  get rejectedCount(): number {
    return this.summary.filter((r) => r.status.toLowerCase() === 'rejected').length;
  }

  get attendanceFilename(): string {
    return `attendance-${this.month}.csv`;
  }
  get leavesFilename(): string {
    const suffix = this.statusFilter ? `-${this.statusFilter.toLowerCase()}` : '';
    return `leaves-${this.year}${suffix}.csv`;
  }

  private download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  downloadAttendance(): void {
    this.error = '';
    this.failedDownload = '';
    this.downloading = 'attendance';
    this.data.attendanceCsv(this.month).subscribe({
      next: (blob) => {
        this.downloading = '';
        this.download(blob, this.attendanceFilename);
        this.toast.success('Attendance CSV download started.');
      },
      error: () => {
        this.downloading = '';
        this.failedDownload = 'attendance';
        this.error = 'Could not download the attendance CSV.';
        this.toast.error('Could not download the attendance CSV.', 'Download failed');
      },
    });
  }

  downloadLeaves(): void {
    this.error = '';
    this.failedDownload = '';
    this.downloading = 'leaves';
    this.data.leavesCsv(this.statusFilter, this.year).subscribe({
      next: (blob) => {
        this.downloading = '';
        this.download(blob, this.leavesFilename);
        this.toast.success('Leaves CSV download started.');
      },
      error: () => {
        this.downloading = '';
        this.failedDownload = 'leaves';
        this.error = 'Could not download the leaves CSV.';
        this.toast.error('Could not download the leaves CSV.', 'Download failed');
      },
    });
  }

  retryDownload(): void {
    if (this.failedDownload === 'attendance') this.downloadAttendance();
    else if (this.failedDownload === 'leaves') this.downloadLeaves();
  }

  loadSummary(): void {
    this.loadingSummary = true;
    this.summaryError = '';
    this.data.leaveRequests({ status: this.statusFilter || undefined, page: 1, pageSize: 100 }).subscribe({
      next: (res) => {
        this.summary = res.items; this.summaryTotal = res.total; this.loadingSummary = false;
        setTimeout(() => this.buildCharts(), 0);
      },
      error: () => {
        this.loadingSummary = false;
        this.summaryError = 'Could not load the leave summary.';
        this.toast.error('Could not load the leave summary.');
      },
    });
  }

  printSummary(): void {
    window.print();
  }

  statusClass(status: string): string {
    const s = status.toLowerCase();
    if (s === 'approved') return 'badge-approved';
    if (s === 'rejected') return 'badge-rejected';
    if (s === 'pending') return 'badge-pending';
    return 'badge-cancelled';
  }
}
