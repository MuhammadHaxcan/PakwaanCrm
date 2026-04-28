import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError(err => {
      // Preserve HttpErrorResponse so upstream interceptors (e.g. auth refresh on 401)
      // can still read status and other response metadata.
      return throwError(() => err);
    })
  );
};
