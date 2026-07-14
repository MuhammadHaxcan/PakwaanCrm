import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
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
    MatIconModule,
    MatTooltipModule
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
            <input
              matInput
              formControlName="password"
              [type]="hidePassword ? 'password' : 'text'"
              autocomplete="current-password"
            />
            <button
              mat-icon-button
              matSuffix
              type="button"
              data-testid="password-visibility"
              (click)="togglePasswordVisibility()"
              [attr.aria-label]="hidePassword ? 'Show password' : 'Hide password'"
              [matTooltip]="hidePassword ? 'Show password' : 'Hide password'"
            >
              <mat-icon>{{ hidePassword ? 'visibility' : 'visibility_off' }}</mat-icon>
            </button>
          </mat-form-field>

          <div *ngIf="errorMessage" class="login-error" role="alert" aria-live="assertive">
            <mat-icon aria-hidden="true">error_outline</mat-icon>
            <span>{{ errorMessage }}</span>
          </div>

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

    .login-error {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 11px 12px;
      border: 1px solid #fecaca;
      border-radius: 10px;
      background: #fef2f2;
      color: #b91c1c;
      font-size: 0.875rem;
      line-height: 1.4;
    }

    .login-error mat-icon {
      width: 20px;
      height: 20px;
      flex: 0 0 20px;
      font-size: 20px;
    }

    [data-testid="password-visibility"] {
      margin: 0;
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
  hidePassword = true;
  errorMessage: string | null = null;

  readonly fallbackLoginError = 'Unable to sign in. Please check your username and password.';

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required]
  });

  submit(): void {
    if (this.form.invalid || this.loading) {
      return;
    }

    const returnUrl = this.sanitizeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'));
    this.errorMessage = null;
    this.loading = true;

    this.auth.login(this.form.getRawValue())
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: () => {
          this.router.navigateByUrl(returnUrl);
        },
        error: (error: unknown) => {
          const message = this.getLoginErrorMessage(error);
          this.errorMessage = message;
          this.toast.error(message);
        }
      });
  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  private getLoginErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const responseBody = error.error;

      if (typeof responseBody === 'string' && responseBody.trim()) {
        return responseBody.trim();
      }

      if (responseBody && typeof responseBody === 'object' && !Array.isArray(responseBody)) {
        const body = responseBody as Record<string, unknown>;
        for (const key of ['error', 'message']) {
          const value = body[key];
          if (typeof value === 'string' && value.trim()) {
            return value.trim();
          }
        }
      }

      return this.fallbackLoginError;
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message.trim();
    }

    return this.fallbackLoginError;
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
