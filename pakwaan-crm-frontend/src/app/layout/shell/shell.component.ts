import { BreakpointObserver } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ToastService } from '../../core/services/toast.service';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    MatSidenavModule,
    MatSnackBarModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    SidebarComponent
  ],
  template: `
    <mat-sidenav-container class="shell-container">
      <mat-sidenav
        #drawer
        [mode]="isMobile ? 'over' : 'side'"
        [opened]="!isMobile"
        class="shell-sidenav"
      >
        <app-sidebar></app-sidebar>
      </mat-sidenav>

      <mat-sidenav-content class="shell-content">
        <mat-toolbar *ngIf="isMobile" class="mobile-toolbar">
          <button mat-icon-button type="button" (click)="drawer.toggle()" aria-label="Open navigation">
            <mat-icon>menu</mat-icon>
          </button>
          <span class="mobile-title">Pakwaan CRM</span>
        </mat-toolbar>

        <router-outlet></router-outlet>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .shell-container { height: 100vh; }
    .shell-sidenav { width: 256px; border-right: none; }
    .shell-content { overflow-y: auto; height: 100vh; background: var(--c-bg, #f0f2f8); }
    .mobile-toolbar {
      position: sticky;
      top: 0;
      z-index: 10;
      height: 60px;
      padding: 0 10px;
      background: rgba(255,255,255,.96);
      border-bottom: 1px solid var(--c-border, #e3e8f0);
      backdrop-filter: blur(10px);
      color: var(--c-text, #1e293b);
    }
    .mobile-title {
      margin-left: 6px;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: .2px;
    }
  `]
})
export class ShellComponent implements OnInit {
  @ViewChild('drawer') private drawer?: MatSidenav;

  private toast = inject(ToastService);
  private snack = inject(MatSnackBar);
  private breakpointObserver = inject(BreakpointObserver);
  private router = inject(Router);

  isMobile = false;

  ngOnInit() {
    this.breakpointObserver.observe('(max-width: 900px)').subscribe(result => {
      this.isMobile = result.matches;
      if (!this.isMobile) {
        this.drawer?.open();
      }
    });

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        if (this.isMobile) {
          this.drawer?.close();
        }
      });

    this.toast.toasts$.subscribe(t => {
      this.snack.open(t.message, '×', {
        duration: 4000,
        panelClass: t.type === 'error' ? 'snack-error' : t.type === 'success' ? 'snack-success' : '',
        horizontalPosition: this.isMobile ? 'center' : 'right',
        verticalPosition: 'top'
      });
    });
  }
}
