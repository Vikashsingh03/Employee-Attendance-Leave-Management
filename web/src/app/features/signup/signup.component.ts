import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { DataService } from '../../core/data.service';
import { ToastService } from '../../core/toast.service';
import { Department } from '../../core/models';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css',
})
export class SignupComponent implements OnInit {
  fullName = '';
  email = '';
  departmentId: number | null = null;
  password = '';
  confirmPassword = '';

  showPassword = false;
  showConfirmPassword = false;

  departments: Department[] = [];
  departmentsLoading = true;
  departmentsError = '';

  employeeCount: number | null = null;

  error = '';
  loading = false;
  submitted = false;

  private readonly emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  constructor(
    private auth: AuthService,
    private data: DataService,
    private toast: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
      return;
    }
    this.data.health().subscribe({
      next: (h) => { this.employeeCount = h.employees; },
      error: () => { this.employeeCount = null; },
    });
    this.data.departments().subscribe({
      next: (list) => {
        this.departments = list ?? [];
        this.departmentsLoading = false;
      },
      error: () => {
        this.departmentsLoading = false;
        this.departmentsError =
          'Could not load departments. Please refresh the page and try again.';
      },
    });
  }

  get emailValid(): boolean {
    return this.emailPattern.test(this.email.trim());
  }

  get passwordValid(): boolean {
    return this.hasMinLength && this.hasUppercase && this.hasNumber;
  }

  get hasMinLength(): boolean {
    return this.password.length >= 8;
  }

  get hasUppercase(): boolean {
    return /[A-Z]/.test(this.password);
  }

  get hasNumber(): boolean {
    return /\d/.test(this.password);
  }

  get passwordsMatch(): boolean {
    return this.password === this.confirmPassword;
  }

  get passwordStrength(): number {
    const pw = this.password;
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Za-z]/.test(pw) && /\d/.test(pw)) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) score++;
    return score;
  }

  get passwordStrengthLabel(): string {
    return ['', 'Weak', 'Fair', 'Good', 'Strong'][this.passwordStrength];
  }

  private isFormValid(): boolean {
    return (
      this.fullName.trim().length > 0 &&
      this.emailValid &&
      this.departmentId !== null &&
      this.passwordValid &&
      this.confirmPassword.length > 0 &&
      this.passwordsMatch
    );
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  submit(): void {
    this.submitted = true;
    this.error = '';
    if (!this.isFormValid()) {
      this.error = 'Please check the highlighted fields and try again.';
      return;
    }
    this.loading = true;
    this.auth
      .register(this.fullName.trim(), this.email.trim(), this.password, this.departmentId as number)
      .subscribe({
        next: (res) => {
          this.loading = false;
          if (res?.token) {
            this.toast.success('Account created — welcome!', 'Welcome');
            this.router.navigate(['/dashboard']);
          } else {
            this.toast.success('Account created — please sign in', 'Account created');
            this.router.navigate(['/login']);
          }
        },
        error: (err) => {
          this.loading = false;
          const apiMessage = err?.error?.message;
          this.error =
            typeof apiMessage === 'string' && apiMessage.trim()
              ? apiMessage
              : 'Could not create your account. Please try again.';
        },
      });
  }
}
