import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterOutlet } from '@angular/router';
import { ToastService } from './core/services/toast.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MatSnackBarModule],
  template: `<router-outlet></router-outlet>`
})
export class AppComponent implements OnInit {
  private readonly toast = inject(ToastService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);

  private isMobile = false;

  ngOnInit(): void {
    this.breakpointObserver.observe('(max-width: 900px)')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(result => {
        this.isMobile = result.matches;
      });

    this.toast.toasts$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(toast => {
        this.snackBar.open(toast.message, '×', {
          duration: 4000,
          panelClass: toast.type === 'error'
            ? 'snack-error'
            : toast.type === 'success'
              ? 'snack-success'
              : '',
          horizontalPosition: this.isMobile ? 'center' : 'right',
          verticalPosition: 'top'
        });
      });
  }
}
