import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, MatSidenavModule, MatSnackBarModule, CommonModule, SidebarComponent],
  template: `
    <mat-sidenav-container class="shell-container">
      <mat-sidenav mode="side" opened class="shell-sidenav">
        <app-sidebar></app-sidebar>
      </mat-sidenav>
      <mat-sidenav-content class="shell-content">
        <router-outlet></router-outlet>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .shell-container { height: 100vh; }
    .shell-sidenav   { width: 256px; border-right: none; }
    .shell-content   { overflow-y: auto; height: 100vh; background: var(--c-bg, #f0f2f8); }
  `]
})
export class ShellComponent implements OnInit {
  private toast = inject(ToastService);
  private snack = inject(MatSnackBar);

  ngOnInit() {
    this.toast.toasts$.subscribe(t => {
      this.snack.open(t.message, '✕', {
        duration: 4000,
        panelClass: t.type === 'error' ? 'snack-error' : t.type === 'success' ? 'snack-success' : '',
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    });
  }
}
