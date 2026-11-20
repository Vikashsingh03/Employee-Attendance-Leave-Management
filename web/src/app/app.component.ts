import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { AuthService } from './core/auth.service';
import { DataService } from './core/data.service';
import { LeaveRequest } from './core/models';
import { ToastsComponent } from './shared/toasts/toasts.component';
import { photoFor, initialsFor } from './core/employee-photos';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, RouterLink, RouterLinkActive, ToastsComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit, OnDestroy {
  sidebarOpen = false;

  searchQuery = '';
  bellOpen = false;
  pendingLeaves: LeaveRequest[] = [];
  private codeByName = new Map<string, string>();
  private directoryLoaded = false;

  bellPhoto(name: string): string | null {
    const code = this.codeByName.get((name ?? '').trim().toLowerCase());
    return code ? photoFor(code) : null;
  }

  private loadDirectory(): void {
    if (this.directoryLoaded || !this.auth.isLoggedIn() || !this.auth.isAdmin()) return;
    this.directoryLoaded = true;
    this.data.employees({ page: 1, pageSize: 100 }).subscribe({
      next: (res) => {
        for (const e of res.items ?? []) this.codeByName.set(e.fullName.trim().toLowerCase(), e.employeeCode);
      },
      error: () => { this.directoryLoaded = false; },
    });
  }

  private navSub: Subscription | null = null;

  constructor(public auth: AuthService, private router: Router, private data: DataService) {}

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) {
      this.loadPending();
      this.loadDirectory();
    }
    this.navSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => {
        if (this.auth.isLoggedIn()) {
          this.loadPending();
          this.loadDirectory();
        } else {
          this.pendingLeaves = [];
        }
      });
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
  }

  get pendingCount(): number {
    return this.pendingLeaves.length;
  }

  onSearchSubmit(): void {
    const q = this.searchQuery.trim();
    this.closeSidebar();
    this.router.navigate(['/employees'], q ? { queryParams: { q } } : {});
  }

  clearSearch(): void {
    this.searchQuery = '';
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.bellOpen) {
      this.bellOpen = false;
    } else if (this.sidebarOpen) {
      this.sidebarOpen = false;
    }
  }

  loadPending(): void {
    if (!this.auth.isLoggedIn()) {
      return;
    }
    this.data.leaveRequests({ status: 'Pending', page: 1, pageSize: 5 }).subscribe({
      next: (res) => {
        this.pendingLeaves = res.items ?? [];
      },
      error: () => {
        this.pendingLeaves = [];
      },
    });
  }

  toggleBell(): void {
    this.bellOpen = !this.bellOpen;
    if (this.bellOpen) {
      this.loadPending();
    }
  }

  closeBell(): void {
    this.bellOpen = false;
  }

  openLeaves(): void {
    this.bellOpen = false;
    this.router.navigate(['/leaves']);
  }

  get user() {
    return this.auth.getUser();
  }

  get today(): string {
    return new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  get userPhoto(): string | null {
    return photoFor(this.user?.employeeCode);
  }

  get initials(): string {
    return initialsFor(this.user?.fullName ?? '');
  }

  initialsForName(name: string): string {
    return initialsFor(name ?? '');
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  logout(): void {
    this.sidebarOpen = false;
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
