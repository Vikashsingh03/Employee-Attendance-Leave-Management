import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DataService } from '../../core/data.service';
import { ToastService } from '../../core/toast.service';
import { Department, Employee } from '../../core/models';
import { photoFor, initialsFor } from '../../core/employee-photos';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employees.component.html',
  styleUrl: './employees.component.css',
})
export class EmployeesComponent implements OnInit {
  employees: Employee[] = [];
  departments: Department[] = [];
  total = 0;
  companyTotal: number | null = null;
  companyNewThisYear = 0;
  readonly year = new Date().getFullYear();
  page = 1;
  pageSize = 10;
  totalPages = 1;

  search = '';
  departmentId = 0;
  statusFilter: 'all' | 'active' | 'inactive' = 'all';
  sortBy = 'name';
  sortDir = 'asc';
  sortKey = 'name-asc';

  viewMode: 'table' | 'grid' = 'table';
  private readonly avatarTints = ['tint-violet', 'tint-teal', 'tint-amber', 'tint-rose', 'tint-blue', 'tint-green'];

  avatarTint(i: number): string {
    return this.avatarTints[i % this.avatarTints.length];
  }

  photoOf(emp: Employee): string | null {
    return emp.photoUrl || photoFor(emp.employeeCode) || null;
  }

  initialsOf(emp: Employee): string {
    return initialsFor(emp.fullName);
  }

  setView(mode: 'table' | 'grid'): void {
    this.viewMode = mode;
  }

  get newThisYear(): number {
    return this.companyNewThisYear;
  }

  loading = true;
  error = '';

  formMode: 'add' | number | null = null;
  private editIsActive = true;
  private editSalary = 0;
  form: {
    fullName: string; email: string; phone: string; designation: string;
    departmentId: number; dateOfJoining: string; salary: number; password: string; role: string;
  } = { fullName: '', email: '', phone: '', designation: '', departmentId: 0, dateOfJoining: '', salary: 0, password: '', role: 'Employee' };
  formError = '';
  saving = false;
  formEmployee: Employee | null = null;

  selected: Employee | null = null;
  photoMsg = '';
  uploadingPhoto = false;

  profileTab: 'about' | 'job' | 'contact' | 'leave' = 'about';
  @ViewChild('profilePanel') private profilePanel?: ElementRef<HTMLElement>;

  setProfileTab(tab: 'about' | 'job' | 'contact' | 'leave'): void {
    this.profileTab = tab;
  }

  reportingManager(emp: Employee): string {
    if (emp.fullName.trim() === 'Amit Verma') return '—';
    const designation = (emp.designation || '').toLowerCase();
    if (designation.includes('manager') || designation.includes('team lead')) return 'Amit Verma';
    switch ((emp.departmentName || '').trim()) {
      case 'HR': return 'Amit Verma';
      case 'Engineering': return 'Varun Khanna';
      case 'Sales': return 'Vikram Singh';
      case 'Finance': return 'Suresh Chandra';
      case 'Marketing': return 'Karan Malhotra';
      default: return 'Amit Verma';
    }
  }

  reportingManagerTitle(emp: Employee): string {
    switch (this.reportingManager(emp)) {
      case 'Varun Khanna': return 'Team Lead';
      case 'Vikram Singh': return 'Sales Manager';
      case 'Suresh Chandra': return 'Finance Manager';
      case 'Karan Malhotra': return 'Marketing Manager';
      case 'Amit Verma': return 'Admin / HR Manager';
      default: return '';
    }
  }

  constructor(private data: DataService, private toast: ToastService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.data.departments().subscribe({ next: (d) => (this.departments = d), error: () => {} });
    this.loadCompanyTotals();
    this.route.queryParams.subscribe((params) => {
      const q = typeof params['q'] === 'string' ? params['q'] : '';
      if (q !== this.search) {
        this.search = q;
        this.page = 1;
      }
      this.load();
    });
  }

  private loadCompanyTotals(): void {
    this.data.employees({ page: 1, pageSize: 100, status: 'active' }).subscribe({
      next: (res) => {
        this.companyTotal = res.total;
        const y = String(new Date().getFullYear());
        this.companyNewThisYear = res.items.filter((e) => (e.dateOfJoining || '').startsWith(y)).length;
      },
      error: () => {},
    });
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.data.employees({
      search: this.search.trim() || undefined,
      departmentId: this.departmentId || undefined,
      status: this.statusFilter,
      page: this.page, pageSize: this.pageSize,
      sortBy: this.sortBy, sortDir: this.sortDir,
    }).subscribe({
      next: (res) => {
        this.employees = res.items;
        this.total = res.total;
        this.page = res.page;
        this.totalPages = Math.max(1, Math.ceil(res.total / res.pageSize));
        this.loading = false;
      },
      error: () => {
        this.error = 'Could not load employees.';
        this.loading = false;
      },
    });
  }

  get visibleEmployees(): Employee[] {
    return this.employees;
  }

  get rangeStart(): number {
    return this.employees.length ? (this.page - 1) * this.pageSize + 1 : 0;
  }
  get rangeEnd(): number {
    return (this.page - 1) * this.pageSize + this.employees.length;
  }

  initials(emp: Employee): string {
    const parts = emp.fullName.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }

  onSearch(): void { this.page = 1; this.load(); }
  onFilter(): void { this.page = 1; this.load(); }
  onStatusFilter(): void {
    this.page = 1;
    this.load();
  }
  clearFilters(): void {
    this.search = '';
    this.departmentId = 0;
    this.statusFilter = 'all';
    this.onSearch();
  }
  toggleSort(field: string): void {
    if (this.sortBy === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortDir = 'asc';
    }
    this.sortKey = `${this.sortBy}-${this.sortDir}`;
    this.load();
  }
  onSortChange(): void {
    const [field, dir] = this.sortKey.split('-');
    this.sortBy = field;
    this.sortDir = dir === 'desc' ? 'desc' : 'asc';
    this.load();
  }
  prevPage(): void { if (this.page > 1) { this.page--; this.load(); } }
  nextPage(): void { if (this.page < this.totalPages) { this.page++; this.load(); } }

  openAdd(): void {
    this.formMode = 'add';
    this.selected = null;
    this.formEmployee = null;
    this.form = { fullName: '', email: '', phone: '', designation: '', departmentId: 0, dateOfJoining: '', salary: 0, password: '', role: 'Employee' };
    this.formError = '';
  }

  openEdit(emp: Employee): void {
    this.formMode = emp.id;
    this.selected = null;
    this.formError = '';
    this.data.employee(emp.id).subscribe({
      next: (full) => {
        full.photoUrl = full.photoPath ? `${this.apiOrigin()}/${full.photoPath}` : undefined;
        this.formEmployee = full;
        this.editIsActive = full.isActive;
        this.editSalary = full.salary ?? 0;
        this.form = {
          fullName: full.fullName, email: full.email, phone: full.phone || '',
          designation: full.designation, departmentId: full.departmentId,
          dateOfJoining: full.dateOfJoining ? full.dateOfJoining.slice(0, 10) : '',
          salary: full.salary ?? 0,
          password: '', role: full.role || 'Employee',
        };
      },
      error: () => {
        this.formError = 'Could not load this employee. Try again.';
        this.formMode = null;
      },
    });
  }

  cancelForm(): void { this.formMode = null; this.formEmployee = null; }

  save(): void {
    this.formError = '';
    if (!this.form.fullName.trim() || !this.form.email.trim() || !this.form.designation.trim()
        || !this.form.departmentId || !this.form.dateOfJoining) {
      this.formError = 'Full name, email, designation, department and date of joining are required.';
      this.toast.warning(this.formError, 'Check the form');
      return;
    }
    if (this.formMode === 'add' && !this.form.password) {
      this.formError = 'Please set an initial password for the new employee.';
      this.toast.warning(this.formError, 'Check the form');
      return;
    }
    this.saving = true;
    const nameParts = this.form.fullName.trim().split(/\s+/);
    const body = {
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(' ') || nameParts[0],
      email: this.form.email.trim(),
      phone: this.form.phone.trim(),
      designation: this.form.designation.trim(),
      departmentId: this.form.departmentId,
      dateOfJoining: this.form.dateOfJoining,
      salary: this.form.salary ?? (this.formMode === 'add' ? 0 : this.editSalary),
      role: this.form.role,
      ...(this.formMode === 'add' ? { password: this.form.password } : { isActive: this.editIsActive }),
    };
    const done = (msg: string) => {
      this.saving = false;
      this.toast.success(msg);
      this.formMode = null;
      this.formEmployee = null;
      this.loadCompanyTotals();
      this.load();
    };
    if (this.formMode === 'add') {
      this.data.createEmployee(body).subscribe({
        next: () => done('Employee added.'),
        error: (e) => {
          this.saving = false;
          this.formError = e?.error?.message || 'Could not add the employee. Check the email is not already used.';
        },
      });
    } else {
      this.data.updateEmployee(this.formMode as number, body).subscribe({
        next: () => done('Employee updated.'),
        error: () => {
          this.saving = false;
          this.formError = 'Could not update the employee.';
        },
      });
    }
  }

  private apiOrigin(): string {
    return environment.apiUrl.replace(/\/api$/, '');
  }

  view(emp: Employee): void {
    this.selected = null;
    this.photoMsg = '';
    this.profileTab = 'about';
    this.data.employee(emp.id).subscribe({
      next: (full) => {
        full.photoUrl = full.photoPath ? `${this.apiOrigin()}/${full.photoPath}` : undefined;
        this.selected = full;
        this.scrollToProfile();
      },
      error: () => {
        this.selected = emp;
        this.scrollToProfile();
      },
    });
  }

  private scrollToProfile(): void {
    setTimeout(() => {
      this.profilePanel?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }

  closeDetail(): void { this.selected = null; }

  remove(emp: Employee): void {
    if (!confirm(`Deactivate ${emp.fullName} (${emp.employeeCode})? They will no longer be able to log in or appear in lists.`)) return;
    this.data.deleteEmployee(emp.id).subscribe({
      next: () => { this.toast.success('Employee deactivated.'); this.loadCompanyTotals(); this.load(); },
      error: () => {
        this.error = 'Could not deactivate the employee.';
        this.toast.error(this.error);
      },
    });
  }

  reactivate(emp: Employee): void {
    if (!confirm(`Reactivate ${emp.fullName} (${emp.employeeCode})? They will be able to log in again.`)) return;
    this.data.employee(emp.id).subscribe({
      next: (full) => {
        const nameParts = (full.fullName || '').trim().split(/\s+/);
        this.data.updateEmployee(emp.id, {
          firstName: nameParts[0],
          lastName: nameParts.slice(1).join(' ') || nameParts[0],
          phone: full.phone || '',
          designation: full.designation,
          departmentId: full.departmentId,
          dateOfJoining: full.dateOfJoining ? full.dateOfJoining.slice(0, 10) : '',
          salary: full.salary ?? 0,
          role: full.role || 'Employee',
          isActive: true,
        }).subscribe({
          next: () => { this.toast.success('Employee reactivated.'); this.loadCompanyTotals(); this.load(); },
          error: () => { this.toast.error('Could not reactivate the employee.'); },
        });
      },
      error: () => { this.toast.error('Could not load this employee. Try again.'); },
    });
  }

  onPhotoSelected(event: Event, emp?: Employee): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const target = emp ?? this.selected;
    if (!file || !target) return;
    const okType = file.type === 'image/jpeg' || file.type === 'image/png'
      || /\.jpe?g$|\.png$/i.test(file.name);
    if (!okType) {
      this.toast.warning('Only JPG or PNG photos are allowed.', 'Invalid photo');
      input.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.toast.warning('Photo must be 2 MB or smaller.', 'Photo too large');
      input.value = '';
      return;
    }
    this.uploadingPhoto = true;
    this.photoMsg = '';
    this.data.uploadPhoto(target.id, file).subscribe({
      next: (res) => {
        this.uploadingPhoto = false;
        this.photoMsg = 'Photo uploaded.';
        const url = `${this.apiOrigin()}${res.photoUrl}`;
        target.photoUrl = url;
        if (this.selected && this.selected.id === target.id) this.selected.photoUrl = url;
        if (this.formEmployee && this.formEmployee.id === target.id) this.formEmployee.photoUrl = url;
        this.toast.success('Photo uploaded.');
        input.value = '';
        this.load();
      },
      error: () => {
        this.uploadingPhoto = false;
        this.photoMsg = 'Photo upload failed. Use a JPG or PNG image.';
        this.toast.error(this.photoMsg);
        input.value = '';
      },
    });
  }
}
