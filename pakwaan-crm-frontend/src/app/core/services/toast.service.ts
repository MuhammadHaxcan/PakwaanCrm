import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface Toast { message: string; type: 'success' | 'error' | 'info'; }

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toasts$ = new Subject<Toast>();
  readonly toasts$ = this._toasts$.asObservable();

  success(message: string) { this._toasts$.next({ message, type: 'success' }); }
  error(message: string) { this._toasts$.next({ message, type: 'error' }); }
  info(message: string) { this._toasts$.next({ message, type: 'info' }); }
}
