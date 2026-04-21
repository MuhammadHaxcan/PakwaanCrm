import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError(err => {
      const message = err?.error?.error ?? err?.message ?? 'An unexpected error occurred.';
      return throwError(() => new Error(message));
    })
  );
};
