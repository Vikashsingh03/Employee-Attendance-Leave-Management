import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  variant: ToastVariant;
  title: string;
  message: string;
  leaving?: boolean;
}

const AUTO_DISMISS_MS = 4000;
const ERROR_AUTO_DISMISS_MS = 6000;
const FADE_OUT_MS = 200;
const MAX_VISIBLE = 3;

const DEFAULT_TITLES: Record<ToastVariant, string> = {
  success: 'Success',
  error: 'Error',
  info: 'Information',
  warning: 'Warning',
};

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private readonly toastsSubject = new BehaviorSubject<Toast[]>([]);

  readonly toasts$: Observable<Toast[]> = this.toastsSubject.asObservable();

  get toasts(): Toast[] {
    return this.toastsSubject.value;
  }

  success(message: string, title?: string): void {
    this.push('success', message, title ?? DEFAULT_TITLES.success);
  }

  error(message: string, title?: string): void {
    this.push('error', message, title ?? DEFAULT_TITLES.error);
  }

  info(message: string, title?: string): void {
    this.push('info', message, title ?? DEFAULT_TITLES.info);
  }

  warning(message: string, title?: string): void {
    this.push('warning', message, title ?? DEFAULT_TITLES.warning);
  }

  remove(id: number): void {
    const current = this.toastsSubject.value;
    const toast = current.find((t) => t.id === id);
    if (!toast || toast.leaving) return;
    this.toastsSubject.next(
      current.map((t) => (t.id === id ? { ...t, leaving: true } : t)),
    );
    window.setTimeout(() => {
      this.toastsSubject.next(this.toastsSubject.value.filter((t) => t.id !== id));
    }, FADE_OUT_MS);
  }

  private push(variant: ToastVariant, message: string, title: string): void {
    const toast: Toast = { id: this.nextId++, variant, title, message };
    const next = [...this.toastsSubject.value, toast];
    while (next.length > MAX_VISIBLE) next.shift();
    this.toastsSubject.next(next);
    const dismissMs = variant === 'error' ? ERROR_AUTO_DISMISS_MS : AUTO_DISMISS_MS;
    window.setTimeout(() => this.remove(toast.id), dismissMs);
  }
}
