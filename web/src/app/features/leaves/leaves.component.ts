import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { DataService } from '../../core/data.service';
import { ToastService } from '../../core/toast.service';
import { Holiday, LeaveBalance, LeaveRequest, LeaveType } from '../../core/models';
import { photoFor, initialsFor } from '../../core/employee-photos';

@Component({
  selector: 'app-leaves',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './leaves.component.html',
  styleUrl: './leaves.component.css',
})
export class LeavesComponent implements OnInit {
  isAdmin = false;
  leaveTypes: LeaveType[] = [];
  balances: LeaveBalance[] = [];
  holidays: Holiday[] = [];
  requests: LeaveRequest[] = [];
  total = 0;
  page = 1;
  pageSize = 20;
  totalPages = 1;
  statusFilter = '';
  searchQuery = '';
  typeFilter = 0;

  private codeById = new Map<number, string>();

  requestPhoto(r: LeaveRequest): string | null {
    const code = this.codeById.get(r.employeeId)
      ?? (this.auth.getUser()?.id === r.employeeId ? this.auth.getUser()?.employeeCode : undefined);
    return code ? photoFor(code) : null;
  }

  initialsOf(name: string): string {
    return initialsFor(name);
  }

  loading = true;
  error = '';

  showForm = false;
  leaveTypeId = 0;
  startDate = '';
  endDate = '';
  reason = '';
  formError = '';
  submitting = false;

  reviewRequest: LeaveRequest | null = null;
  reviewAction: 'approve' | 'reject' = 'approve';
  reviewComments = '';
  reviewBusy = false;

  downloadingCsv = false;

  readonly year = new Date().getFullYear();
  readonly statusOptions = ['', 'Pending', 'Approved', 'Rejected', 'Cancelled'];
  private readonly balanceAccents = ['violet', 'teal', 'amber', 'green', 'rose'];

  balanceAccent(i: number): string {
    return 'stat-card--' + this.balanceAccents[i % this.balanceAccents.length];
  }

  chipClass(status: string): string {
    return status ? 'chip-' + status.toLowerCase() : 'chip-all';
  }

  constructor(private auth: AuthService, private data: DataService, private toast: ToastService) {}

  ngOnInit(): void {
    this.isAdmin = this.auth.isAdmin();
    this.data.leaveTypes().subscribe({ next: (t) => (this.leaveTypes = t), error: () => {} });
    if (this.isAdmin) {
      this.data.employees({ page: 1, pageSize: 100, sortBy: 'name' }).subscribe({
        next: (res) => { for (const e of res.items) this.codeById.set(e.id, e.employeeCode); },
        error: () => {},
      });
    }
    this.data.myBalances().subscribe({ next: (b) => (this.balances = b), error: () => {} });
    this.data.holidays(this.year).subscribe({ next: (h) => (this.holidays = h), error: () => {} });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.data.leaveRequests({ status: this.statusFilter || undefined, page: this.page, pageSize: this.pageSize }).subscribe({
      next: (res) => {
        this.requests = res.items;
        this.total = res.total;
        this.page = res.page;
        this.totalPages = Math.max(1, Math.ceil(res.total / res.pageSize));
        this.loading = false;
      },
      error: () => {
        this.error = 'Could not load leave requests.';
        this.loading = false;
      },
    });
  }

  onFilter(): void { this.page = 1; this.load(); }
  setFilter(status: string): void {
    if (this.statusFilter === status) return;
    this.statusFilter = status;
    this.onFilter();
  }
  clearFilters(): void { this.statusFilter = ''; this.searchQuery = ''; this.typeFilter = 0; this.onFilter(); }
  prevPage(): void { if (this.page > 1) { this.page--; this.load(); } }
  nextPage(): void { if (this.page < this.totalPages) { this.page++; this.load(); } }

  get filteredRequests(): LeaveRequest[] {
    const q = this.searchQuery.trim().toLowerCase();
    return this.requests.filter((r) =>
      (!this.typeFilter || r.leaveTypeId === this.typeFilter) &&
      (!q ||
        (r.employeeName || '').toLowerCase().includes(q) ||
        r.leaveTypeName.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q)));
  }

  remainingFor(typeId: number): number | null {
    const b = this.balances.find((x) => x.leaveTypeId === typeId);
    return b ? b.remainingDays : null;
  }

  get requestedDays(): number | null {
    if (!this.startDate || !this.endDate || this.endDate < this.startDate) return null;
    return this.daysBetween(this.startDate, this.endDate);
  }

  get balanceWarning(): string | null {
    const remaining = this.remainingFor(this.leaveTypeId);
    if (remaining === null || this.requestedDays === null) return null;
    if (this.requestedDays > remaining) {
      return `Requested ${this.requestedDays} day${this.requestedDays === 1 ? '' : 's'} exceeds your remaining ${remaining} day${remaining === 1 ? '' : 's'} for this leave type.`;
    }
    return null;
  }

  balanceUsedPct(b: LeaveBalance): number {
    if (!b.totalDays || b.totalDays <= 0) return 0;
    return Math.min(100, Math.round((b.usedDays / b.totalDays) * 100));
  }

  readonly ringCircumference = 2 * Math.PI * 34;

  ringDash(total: number, used: number): string {
    const c = this.ringCircumference;
    const frac = !total || total <= 0 ? 0 : Math.min(1, Math.max(0, (total - used) / total));
    return `${(frac * c).toFixed(1)} ${c.toFixed(1)}`;
  }

  readonly today = new Date();

  get calendarTitle(): string {
    return this.today.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  }

  get calendarDays(): Array<{
    day: number; date: Date; isToday: boolean; isWeekOff: boolean;
    holidayName: string | null; leaves: Array<{ status: string; type: string }>;
  }> {
    const y = this.today.getFullYear();
    const m = this.today.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const holidayByKey = new Map<string, string>();
    for (const h of this.holidays) holidayByKey.set(this.dayKey(h.date), h.name);
    const out: Array<{
      day: number; date: Date; isToday: boolean; isWeekOff: boolean;
      holidayName: string | null; leaves: Array<{ status: string; type: string }>;
    }> = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(y, m, d);
      const key = this.dayKey(date);
      const leaves = this.requests
        .filter((r) => (r.status === 'Approved' || r.status === 'Pending')
          && this.dayKey(r.startDate) <= key && key <= this.dayKey(r.endDate))
        .map((r) => ({ status: r.status, type: r.leaveTypeName }));
      out.push({
        day: d,
        date,
        isToday: key === this.dayKey(this.today),
        isWeekOff: date.getDay() === 0 || date.getDay() === 6,
        holidayName: holidayByKey.get(key) ?? null,
        leaves,
      });
    }
    return out;
  }

  get calendarLeadBlanks(): number[] {
    const first = new Date(this.today.getFullYear(), this.today.getMonth(), 1).getDay();
    return Array.from({ length: first }, (_, i) => i);
  }

  hasLeaveStatus(day: { leaves: Array<{ status: string; type: string }> }, status: string): boolean {
    return day.leaves.some((l) => l.status === status);
  }

  dayTitle(day: { holidayName: string | null; leaves: Array<{ status: string; type: string }> }): string {
    const parts: string[] = [];
    if (day.holidayName) parts.push(day.holidayName);
    if (day.leaves.length) parts.push(day.leaves.map((l) => `${l.type} (${l.status})`).join(', '));
    return parts.length ? parts.join(' · ') : 'No leave';
  }

  private dayKey(d: string | Date): string {
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
    const dt = typeof d === 'string' ? new Date(d) : d;
    const mo = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${dt.getFullYear()}-${mo}-${day}`;
  }

  private daysBetween(start: string, end: string): number {
    const [sy, sm, sd] = start.split('-').map(Number);
    const [ey, em, ed] = end.split('-').map(Number);
    const a = Date.UTC(sy, sm - 1, sd);
    const b = Date.UTC(ey, em - 1, ed);
    return Math.round((b - a) / 86400000) + 1;
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
    if (!this.showForm) this.formError = '';
  }

  apply(): void {
    this.formError = '';
    if (!this.leaveTypeId || !this.startDate || !this.endDate || !this.reason.trim()) {
      this.formError = 'Leave type, start date, end date and reason are all required.';
      this.toast.warning(this.formError, 'Missing details');
      return;
    }
    if (this.endDate < this.startDate) {
      this.formError = 'End date cannot be before the start date.';
      this.toast.warning(this.formError, 'Invalid dates');
      return;
    }
    this.submitting = true;
    this.data.applyLeave({
      leaveTypeId: this.leaveTypeId,
      startDate: this.startDate,
      endDate: this.endDate,
      reason: this.reason.trim(),
    }).subscribe({
      next: () => {
        this.submitting = false;
        this.toast.success('Leave request submitted for approval.', 'Request submitted');
        this.leaveTypeId = 0; this.startDate = ''; this.endDate = ''; this.reason = '';
        this.showForm = false;
        this.data.myBalances().subscribe({ next: (b) => (this.balances = b), error: () => {} });
        this.load();
      },
      error: (e) => {
        this.submitting = false;
        this.formError = e?.error?.message || 'Could not submit the request. Check your remaining balance for this leave type.';
        this.toast.error(this.formError, 'Submission failed');
      },
    });
  }

  cancel(id: number): void {
    if (!confirm('Cancel this leave request?')) return;
    this.data.cancelLeave(id).subscribe({
      next: () => { this.toast.success('Leave request cancelled.', 'Request cancelled'); this.load(); },
      error: () => { this.toast.error('Could not cancel the request (only Pending requests can be cancelled).', 'Cancel failed'); },
    });
  }

  openReview(r: LeaveRequest, action: 'approve' | 'reject'): void {
    this.reviewRequest = r;
    this.reviewAction = action;
    this.reviewComments = '';
    this.reviewBusy = false;
  }

  closeReview(): void {
    this.reviewRequest = null;
    this.reviewComments = '';
    this.reviewBusy = false;
  }

  confirmReview(): void {
    const req = this.reviewRequest;
    if (!req || this.reviewBusy) return;
    const comments = this.reviewComments.trim();
    if (this.reviewAction === 'reject' && !comments) {
      this.toast.warning('A rejection reason is required.', 'Reason required');
      return;
    }
    this.reviewBusy = true;
    const call = this.reviewAction === 'approve'
      ? this.data.approveLeave(req.id, comments)
      : this.data.rejectLeave(req.id, comments);
    call.subscribe({
      next: () => {
        this.reviewBusy = false;
        if (this.reviewAction === 'approve') {
          this.toast.success(`Leave request for ${req.employeeName} approved.`, 'Request approved');
        } else {
          this.toast.success(`Leave request for ${req.employeeName} rejected.`, 'Request rejected');
        }
        this.closeReview();
        this.load();
      },
      error: () => {
        this.reviewBusy = false;
        this.toast.error(
          this.reviewAction === 'approve' ? 'Could not approve the request.' : 'Could not reject the request.',
          'Review failed');
      },
    });
  }

  exportCsv(): void {
    if (this.downloadingCsv) return;
    this.downloadingCsv = true;
    this.data.leavesCsv(this.statusFilter, this.year).subscribe({
      next: (blob) => {
        this.downloadingCsv = false;
        const suffix = this.statusFilter ? `-${this.statusFilter.toLowerCase()}` : '';
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `leaves-${this.year}${suffix}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        this.toast.success('Leaves CSV downloaded.', 'Export complete');
      },
      error: () => {
        this.downloadingCsv = false;
        this.toast.error('Could not download the leaves CSV.', 'Export failed');
      },
    });
  }

  statusClass(status: string): string {
    const s = status.toLowerCase();
    if (s === 'approved') return 'badge-approved';
    if (s === 'rejected') return 'badge-rejected';
    if (s === 'pending') return 'badge-pending';
    return 'badge-cancelled';
  }
}
