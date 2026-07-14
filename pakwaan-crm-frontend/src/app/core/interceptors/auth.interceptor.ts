import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, finalize, shareReplay, switchMap, throwError } from 'rxjs';
import { AuthResponse } from '../models/auth.models';
import { AuthService } from '../services/auth.service';

const ALREADY_RETRIED = new HttpContextToken<boolean>(() => false);
let refreshInFlight$: Observable<AuthResponse> | null = null;

function shouldOmitAccessToken(url: string): boolean {
  return url.includes('/api/auth/login') || url.includes('/api/auth/refresh');
}

function shouldSkipAutomaticRefresh(url: string): boolean {
  return shouldOmitAccessToken(url) || url.includes('/api/auth/logout');
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getAccessToken();
  const omitAccessToken = shouldOmitAccessToken(req.url);
  const skipAutomaticRefresh = shouldSkipAutomaticRefresh(req.url);

  let request = req;
  if (token && !omitAccessToken) {
    request = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(request).pipe(
    catchError(err => {
      if (skipAutomaticRefresh || err.status !== 401) {
        return throwError(() => err);
      }

      if (req.context.get(ALREADY_RETRIED)) {
        auth.forceLogoutToLogin();
        return throwError(() => err);
      }

      if (!refreshInFlight$) {
        refreshInFlight$ = auth.refresh().pipe(
          shareReplay(1),
          finalize(() => {
            refreshInFlight$ = null;
          })
        );
      }

      return refreshInFlight$.pipe(
        switchMap(() => {
          const newToken = auth.getAccessToken();
          if (!newToken) {
            auth.forceLogoutToLogin();
            return throwError(() => err);
          }

          return next(req.clone({
            context: req.context.set(ALREADY_RETRIED, true),
            setHeaders: {
              Authorization: `Bearer ${newToken}`
            }
          }));
        }),
        catchError(refreshErr => {
          auth.forceLogoutToLogin();
          return throwError(() => refreshErr);
        })
      );
    })
  );
};
