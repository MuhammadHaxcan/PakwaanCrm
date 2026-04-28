import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, firstValueFrom, map, of, tap } from 'rxjs';
import { AuthResponse, AuthUser, LoginRequest } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly userSubject = new BehaviorSubject<AuthUser | null>(null);
  readonly user$ = this.userSubject.asObservable();

  private accessToken: string | null = null;
  private initialized = false;

  get currentUser(): AuthUser | null {
    return this.userSubject.value;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  isAuthenticated(): boolean {
    return this.accessToken !== null && this.userSubject.value !== null;
  }

  isAdmin(): boolean {
    return this.userSubject.value?.role === 'Admin';
  }

  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http.post<unknown>('/api/auth/login', payload, { withCredentials: true }).pipe(
      map(response => this.extractAuthResponse(response)),
      tap(response => this.setSession(response))
    );
  }

  refresh(): Observable<AuthResponse> {
    return this.http.post<unknown>('/api/auth/refresh', {}, { withCredentials: true }).pipe(
      map(response => this.extractAuthResponse(response)),
      tap(response => this.setSession(response))
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>('/api/auth/logout', {}, { withCredentials: true }).pipe(
      catchError(() => of(void 0)),
      tap(() => this.clearSession())
    );
  }

  async initializeSession(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await firstValueFrom(
      this.refresh().pipe(
        map(() => void 0),
        catchError(() => {
          this.clearSession();
          return of(void 0);
        })
      )
    );

    this.initialized = true;
  }

  forceLogoutToLogin(returnUrl?: string): void {
    this.clearSession();
    const currentUrl = returnUrl ?? this.router.url ?? '/';
    this.router.navigate(['/login'], { queryParams: { returnUrl: currentUrl } });
  }

  private setSession(response: AuthResponse): void {
    this.accessToken = response.accessToken;
    this.userSubject.next(response.user);
  }

  private clearSession(): void {
    this.accessToken = null;
    this.userSubject.next(null);
  }

  private extractAuthResponse(response: unknown): AuthResponse {
    const payload = this.unwrapEnvelope(response);
    if (this.isAuthResponse(payload)) {
      return payload;
    }

    throw new Error('Invalid auth response payload.');
  }

  private isAuthResponse(value: unknown): value is AuthResponse {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }

    const record = value as Record<string, unknown>;
    const accessToken = this.pickString(record, ['accessToken', 'AccessToken']);
    const accessTokenExpiresAt = this.pickString(record, ['accessTokenExpiresAt', 'AccessTokenExpiresAt']);
    const userRaw = this.pickObject(record, ['user', 'User']);
    if (!accessToken || !accessTokenExpiresAt || !userRaw) {
      return false;
    }

    const idValue = userRaw['id'] ?? userRaw['Id'];
    const id = typeof idValue === 'number' ? idValue : Number(idValue);
    const username = this.pickString(userRaw, ['username', 'Username']);
    const displayName = this.pickString(userRaw, ['displayName', 'DisplayName']);
    const role = this.pickString(userRaw, ['role', 'Role']);
    const isActiveRaw = userRaw['isActive'] ?? userRaw['IsActive'];
    const isActive = typeof isActiveRaw === 'boolean' ? isActiveRaw : `${isActiveRaw}`.toLowerCase() === 'true';

    if (!Number.isFinite(id) || !username || !displayName || !role) {
      return false;
    }

    (value as AuthResponse).accessToken = accessToken;
    (value as AuthResponse).accessTokenExpiresAt = accessTokenExpiresAt;
    (value as AuthResponse).user = {
      id,
      username,
      displayName,
      role: role as AuthUser['role'],
      isActive
    };

    return true;
  }

  private unwrapEnvelope(response: unknown): unknown {
    if (!response || typeof response !== 'object' || Array.isArray(response)) {
      return response;
    }

    let current: unknown = response;
    for (let i = 0; i < 4; i += 1) {
      if (!current || typeof current !== 'object' || Array.isArray(current)) {
        break;
      }

      const record = current as Record<string, unknown>;
      const next = this.pickObject(record, ['response', 'Response', 'data', 'Data', 'value', 'Value', 'result', 'Result', 'payload', 'Payload']);
      if (!next) {
        break;
      }

      current = next;
    }

    return current;
  }

  private pickString(source: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
    }

    return null;
  }

  private pickObject(source: Record<string, unknown>, keys: string[]): Record<string, unknown> | null {
    for (const key of keys) {
      const value = source[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, unknown>;
      }
    }

    return null;
  }
}
