import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { DataService } from '../../core/data.service';
import { ToastService } from '../../core/toast.service';
import { Holiday } from '../../core/models';

@Component({
  selector: 'app-holidays',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './holidays.component.html',
  styleUrl: './holidays.component.css',
})
export class HolidaysComponent implements OnInit {
  isAdmin = false;
  year = new Date().getFullYear();
  years: number[] = [];
  holidays: Holiday[] = [];
  loading = true;
  error = '';

  nextUpcomingId: number | null = null;

  viewMode: 'list' | 'calendar' = 'list';
  calMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  get calendarWeeks(): Array<Array<{ day: number; holidays: Holiday[] } | null>> {
    const year = this.calMonth.getFullYear();
    const month = this.calMonth.getMonth();
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const weeks: Array<Array<{ day: number; holidays: Holiday[] } | null>> = [];
    let week: Array<{ day: number; holidays: Holiday[] } | null> = [];
    for (let i = 0; i < first.getDay(); i++) week.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      week.push({ day: d, holidays: this.holidaysOn(year, month, d) });
      if (week.length === 7) { weeks.push(week); week = []; }
    }
    if (week.length) {
      while (week.length < 7) week.push(null);
      weeks.push(week);
    }
    return weeks;
  }

  get calMonthLabel(): string {
    return this.calMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }

  get calAtYearStart(): boolean {
    return this.calMonth.getFullYear() === this.year && this.calMonth.getMonth() === 0;
  }

  get calAtYearEnd(): boolean {
    return this.calMonth.getFullYear() === this.year && this.calMonth.getMonth() === 11;
  }

  holidaysOn(year: number, month: number, day: number): Holiday[] {
    return this.holidays.filter((h) => {
      const d = new Date(h.date.slice(0, 10) + 'T00:00:00');
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  }

  isTodayCell(year: number, month: number, day: number): boolean {
    const t = new Date();
    return t.getFullYear() === year && t.getMonth() === month && t.getDate() === day;
  }

  prevCalMonth(): void {
    if (!this.calAtYearStart) this.calMonth = new Date(this.calMonth.getFullYear(), this.calMonth.getMonth() - 1, 1);
  }

  nextCalMonth(): void {
    if (!this.calAtYearEnd) this.calMonth = new Date(this.calMonth.getFullYear(), this.calMonth.getMonth() + 1, 1);
  }

  get monthGroups(): { label: string; holidays: Holiday[] }[] {
    const groups = new Map<string, Holiday[]>();
    for (const h of this.holidays) {
      const d = new Date(h.date.slice(0, 10) + 'T00:00:00');
      const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      const list = groups.get(label) ?? [];
      list.push(h);
      groups.set(label, list);
    }
    return [...groups.entries()].map(([label, holidays]) => ({ label, holidays }));
  }

  get upcomingHoliday(): Holiday | null {
    return this.holidays.find((h) => h.id === this.nextUpcomingId) ?? null;
  }

  get upcomingInDays(): number | null {
    const h = this.upcomingHoliday;
    if (!h) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(h.date.slice(0, 10) + 'T00:00:00');
    return Math.max(0, Math.round((d.getTime() - today.getTime()) / 86400000));
  }

  paletteIndex(monthGroup: number, i: number): number {
    return (monthGroup * 2 + i) % 6;
  }

  formOpen = false;
  editingId: number | null = null;
  name = '';
  date = '';
  description = '';
  formError = '';
  saving = false;

  constructor(
    private auth: AuthService,
    private data: DataService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.auth.isAdmin();
    for (let y = this.year - 1; y <= this.year + 1; y++) this.years.push(y);
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.data.holidays(this.year).subscribe({
      next: (h) => {
        this.holidays = h;
        this.loading = false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const next = h.find((x) => new Date(x.date.slice(0, 10) + 'T00:00:00') >= today);
        this.nextUpcomingId = next ? next.id : null;
      },
      error: () => {
        this.error = 'Could not load holidays.';
        this.loading = false;
        this.nextUpcomingId = null;
        this.toast.error('Could not load holidays.');
      },
    });
  }

  onYear(): void {
    const now = new Date();
    this.calMonth = this.year === now.getFullYear()
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : new Date(this.year, 0, 1);
    this.load();
  }

  openAdd(): void {
    this.formOpen = true;
    this.editingId = null;
    this.name = ''; this.date = ''; this.description = '';
    this.formError = '';
  }

  openEdit(h: Holiday): void {
    this.formOpen = true;
    this.editingId = h.id;
    this.name = h.name;
    this.date = h.date.slice(0, 10);
    this.description = h.description ?? '';
    this.formError = '';
  }

  cancelForm(): void { this.formOpen = false; this.editingId = null; this.name = ''; this.date = ''; this.description = ''; }

  save(): void {
    this.formError = '';
    if (!this.name.trim() || !this.date) {
      this.formError = 'Holiday name and date are required.';
      return;
    }
    this.saving = true;
    const body = { name: this.name.trim(), date: this.date, description: this.description.trim() || undefined };
    const done = (msg: string) => {
      this.saving = false;
      this.toast.success(msg);
      this.cancelForm();
      this.load();
    };
    if (this.editingId === null) {
      this.data.createHoliday(body).subscribe({
        next: () => done('Holiday added.'),
        error: () => { this.saving = false; this.formError = 'Could not add the holiday.'; this.toast.error('Could not add the holiday.'); },
      });
    } else {
      this.data.updateHoliday(this.editingId, body).subscribe({
        next: () => done('Holiday updated.'),
        error: () => { this.saving = false; this.formError = 'Could not update the holiday.'; this.toast.error('Could not update the holiday.'); },
      });
    }
  }

  remove(h: Holiday): void {
    if (!confirm(`Delete the holiday "${h.name}"?`)) return;
    this.data.deleteHoliday(h.id).subscribe({
      next: () => { this.toast.success('Holiday deleted.'); this.load(); },
      error: () => { this.error = 'Could not delete the holiday.'; this.toast.error('Could not delete the holiday.'); },
    });
  }
}
