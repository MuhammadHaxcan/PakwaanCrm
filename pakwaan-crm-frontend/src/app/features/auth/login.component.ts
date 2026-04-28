import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule
  ],
  template: `
    <div class="login-wrap">
      <mat-card class="login-card">
        <div class="brand">
          <mat-icon>restaurant</mat-icon>
          <h1>Pakwaan CRM</h1>
        </div>
        <p class="subtitle">Sign in to continue</p>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline">
            <mat-label>Username</mat-label>
            <input matInput formControlName="username" autocomplete="username" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Password</mat-label>
            <input matInput formControlName="password" type="password" autocomplete="current-password" />
          </mat-form-field>

          <button mat-flat-button color="primary" type="submit" [disabled]="loading || form.invalid">
            {{ loading ? 'Signing in...' : 'Login' }}
          </button>
        </form>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-wrap {
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: linear-gradient(140deg, #e0e7ff 0%, #f8fafc 50%, #dbeafe 100%);
      padding: 16px;
    }

    .login-card {
      width: 100%;
      max-width: 420px;
      padding: 24px;
      border-radius: 16px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #1e3a8a;
    }

    .brand h1 {
      margin: 0;
      font-size: 1.4rem;
      font-weight: 700;
    }

    .subtitle {
      margin: 6px 0 20px;
      color: #64748b;
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    button {
      margin-top: 8px;
      height: 44px;
      font-weight: 600;
    }
  `]
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  loading = false;

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required]
  });

  submit(): void {
    if (this.form.invalid || this.loading) {
      return;
    }

    const returnUrl = this.sanitizeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'));
    this.loading = true;

    this.auth.login(this.form.getRawValue())
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: () => {
          this.router.navigateByUrl(returnUrl);
        },
        error: () => {
          this.toast.error('Invalid username or password.');
        }
      });
  }

  private sanitizeReturnUrl(raw: string | null): string {
    if (!raw) {
      return '/';
    }

    if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('://')) {
      return '/';
    }

    return raw;
  }
}
