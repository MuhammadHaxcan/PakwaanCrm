import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { buildReportPrintApiPath } from '../../core/utils/report-print.utils';

@Component({
  selector: 'app-print-report-page',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, LoadingSpinnerComponent],
  template: `
    <div class="print-page">
      <div class="topbar">
        <div class="title-wrap">
          <h2>{{ title }}</h2>
          <p>Backend PDF print preview</p>
        </div>
        <div class="actions">
          <button mat-stroked-button type="button" (click)="retry()" [disabled]="loading"><mat-icon>refresh</mat-icon>Retry</button>
          <button mat-stroked-button type="button" (click)="open()" [disabled]="!objectUrl || loading"><mat-icon>open_in_new</mat-icon>Open</button>
          <button mat-flat-button color="primary" type="button" (click)="print()" [disabled]="!objectUrl || loading"><mat-icon>print</mat-icon>Print</button>
        </div>
      </div>

      <div *ngIf="loading" class="state"><app-loading-spinner></app-loading-spinner></div>
      <div *ngIf="!loading && error" class="state error">{{ error }}</div>
      <iframe *ngIf="!loading && pdfUrl" class="frame" [src]="pdfUrl" title="Report PDF"></iframe>
    </div>
  `,
  styles: [`
    :host { display:block; min-height:100vh; background:#f5f7fb; }
    .print-page { min-height:100vh; display:flex; flex-direction:column; }
    .topbar { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; padding:14px 18px; background:#fff; border-bottom:1px solid #e5eaf5; }
    .title-wrap h2 { margin:0; font-size:18px; color:#1f2a44; }
    .title-wrap p { margin:3px 0 0; color:#60708f; font-size:12px; }
    .actions { display:flex; gap:8px; flex-wrap:wrap; }
    .state { min-height:180px; display:flex; align-items:center; justify-content:center; padding:20px; }
    .state.error { color:#c62828; font-weight:600; }
    .frame { flex:1; width:100%; min-height:calc(100vh - 75px); border:0; background:#fff; }
  `]
})
export class PrintReportPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);
  private querySub?: Subscription;

  title = 'Report Preview';
  loading = true;
  error = '';
  objectUrl: string | null = null;
  pdfUrl: SafeResourceUrl | null = null;
  private apiPath = '';

  ngOnInit(): void {
    this.querySub = this.route.queryParamMap.subscribe(() => {
      const path = this.route.routeConfig?.path ?? '';
      const reportType = path.includes('master') ? 'master' : 'soa';
      this.title = reportType === 'master' ? 'Master Report PDF' : 'Statement of Account PDF';
      this.apiPath = buildReportPrintApiPath(reportType, window.location.search);
      this.load();
    });
  }

  retry(): void {
    this.load();
  }

  print(): void {
    const frame = document.querySelector('.frame') as HTMLIFrameElement | null;
    frame?.contentWindow?.print();
  }

  open(): void {
    if (this.objectUrl) window.open(this.objectUrl, '_blank', 'noopener');
  }

  ngOnDestroy(): void {
    this.querySub?.unsubscribe();
    this.cleanup();
  }

  private load(): void {
    this.loading = true;
    this.error = '';
    this.cleanup();
    this.http.get(this.apiPath, { responseType: 'blob' }).subscribe({
      next: blob => {
        this.objectUrl = URL.createObjectURL(blob);
        this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.objectUrl);
        this.loading = false;
      },
      error: err => {
        this.error = err?.error?.error || err?.message || 'Unable to load report PDF.';
        this.loading = false;
      }
    });
  }

  private cleanup(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
    this.pdfUrl = null;
  }
}

