import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { Firebase } from '../../services/firebase';
import { AdminToken } from '../../services/admin-token';

@Component({
  selector: 'app-login-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login-modal.html',
  styleUrl: './login-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginModal {
  private readonly fb = inject(FormBuilder);
  private readonly firebase = inject(Firebase);
  private readonly adminToken = inject(AdminToken);
  private readonly router = inject(Router);

  readonly isOpen = signal(false);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly closed = output<void>();

  readonly loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(9)]],
  });

  open(): void {
    this.isOpen.set(true);
    this.errorMessage.set(null);
    this.loginForm.reset();
  }

  close(): void {
    this.isOpen.set(false);
    this.closed.emit();
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid || this.isLoading()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const { email, password } = this.loginForm.getRawValue();

      const result = await this.firebase.signInWithEmailAndPassword(email!, password!);

      if (result.idToken) {
        this.adminToken.setToken(result.idToken);

        // Закриваємо модалку і редиректимо на адмінку
        this.close();
        await this.router.navigate(['/admin']);
      }
    } catch (error: any) {
      this.errorMessage.set(error.message || 'Помилка входу. Спробуйте ще раз.');
    } finally {
      this.isLoading.set(false);
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.close();
    }
  }
}
