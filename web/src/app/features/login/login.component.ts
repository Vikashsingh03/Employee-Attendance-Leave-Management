import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { DataService } from '../../core/data.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  email = '';
  password = '';
  error = '';
  loading = false;
  submitted = false;
  showPassword = false;
  rememberMe = false;

  employeeCount: number | null = null;

  private readonly rememberKey = 'alm_remember_email';
  private readonly emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  constructor(
    private auth: AuthService,
    private data: DataService,
    private router: Router,
    private toast: ToastService,
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
    const remembered = localStorage.getItem(this.rememberKey);
    if (remembered) {
      this.email = remembered;
      this.rememberMe = true;
    }
  }

  get emailValid(): boolean {
    return this.emailPattern.test(this.email.trim());
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  forgotPassword(): void {
    this.toast.info(
      'Password reset is not self-service yet. Please contact your HR admin to reset your password.',
      'Forgot password'
    );
  }

  submit(): void {
    this.submitted = true;
    this.error = '';
    if (!this.email || !this.emailValid || !this.password) {
      this.error = 'Please enter a valid email and your password.';
      return;
    }
    this.loading = true;
    this.auth.login(this.email.trim(), this.password).subscribe({
      next: () => {
        this.loading = false;
        if (this.rememberMe) {
          localStorage.setItem(this.rememberKey, this.email.trim());
        } else {
          localStorage.removeItem(this.rememberKey);
        }
        this.toast.success('Welcome back', 'Signed in');
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.error =
          err?.status === 401
            ? 'Invalid email or password. Please try again.'
            : 'Could not reach the server. Please check the API is running and try again.';
      },
    });
  }
}
