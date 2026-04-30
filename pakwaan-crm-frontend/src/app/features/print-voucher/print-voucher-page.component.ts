import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';
import { Subscription, switchMap } from 'rxjs';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { VoucherPrintKind, buildVoucherPrintApiPath } from '../../core/utils/voucher-print.utils';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-print-voucher-page',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, LoadingSpinnerComponent],
  template: `
    <div class="print-voucher-page">
      <div class="topbar">
        <div class="actions">
          <button mat-stroked-button type="button" (click)="retry()" [disabled]="loading">
            <mat-icon>refresh</mat-icon>
            <span>Retry</span>
          </button>
          <button mat-stroked-button type="button" (click)="openInSystemViewer()" [disabled]="!pdfUrl || loading">
            <mat-icon>open_in_new</mat-icon>
            <span>Open</span>
          </button>
          <button mat-flat-button color="primary" type="button" (click)="printDocument()" [disabled]="!pdfUrl || loading">
            <mat-icon>print</mat-icon>
            <span>Print</span>
          </button>
        </div>
      </div>

      <div *ngIf="loading" class="state"><app-loading-spinner></app-loading-spinner></div>
      <div *ngIf="error && !loading" class="state error">{{ error }}</div>

      <iframe
        *ngIf="pdfUrl && !loading"
        [src]="pdfUrl"
        title="Voucher PDF"
        class="pdf-frame">
      </iframe>
    </div>
  `,
  styles: [`
    :host { display:block; min-height: 100vh; background:#f5f7fb; }
    .print-voucher-page { min-height:100vh; display:flex; flex-direction:column; }
    .topbar {
      display:flex; justify-content:flex-end; align-items:center; gap:12px; flex-wrap:wrap;
      padding:14px 18px; background:#fff; border-bottom:1px solid #e5eaf5;
    }
    .actions { display:flex; gap:8px; flex-wrap:wrap; }
    .state {
      min-height:180px; display:flex; align-items:center; justify-content:center; padding:20px;
    }
    .state.error { color:#c62828; font-weight:600; }
    .pdf-frame {
      flex:1; width:100%; border:0; min-height:calc(100vh - 75px); background:#fff;
    }
  `]
})
export class PrintVoucherPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);

  private routeSub?: Subscription;
  private objectUrl: string | null = null;
  private kind: VoucherPrintKind = 'journal';

  loading = true;
  error = '';
  voucherNo = '';
  pdfFileName = '';
  pdfUrl: SafeResourceUrl | null = null;

  ngOnInit(): void {
    this.routeSub = this.route.paramMap
      .pipe(
        switchMap(paramMap => {
          this.loading = true;
          this.error = '';
          this.clearUrl();

          const routePath = this.route.routeConfig?.path ?? '';
          this.kind = routePath.includes('sale') ? 'sale' : routePath.includes('purchase') ? 'purchase' : 'journal';
          this.voucherNo = (paramMap.get('voucherNo') ?? '').trim();
          this.pdfFileName = this.buildPdfFileName(this.voucherNo);
          document.title = this.pdfFileName;
          const apiPath = buildVoucherPrintApiPath(this.kind, this.voucherNo);
          return this.http.get(apiPath, { responseType: 'blob' });
        })
      )
      .subscribe({
        next: blob => {
          this.objectUrl = URL.createObjectURL(this.toNamedPdfFile(blob));
          this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.objectUrl);
          this.loading = false;
        },
        error: err => {
          this.error = err?.error?.error || err?.message || 'Unable to load voucher print.';
          this.loading = false;
        }
      });
  }

  retry(): void {
    this.loading = true;
    this.error = '';
    this.clearUrl();
    document.title = this.pdfFileName || 'Voucher Print';
    const apiPath = buildVoucherPrintApiPath(this.kind, this.voucherNo);
    this.http.get(apiPath, { responseType: 'blob' }).subscribe({
      next: blob => {
        this.objectUrl = URL.createObjectURL(this.toNamedPdfFile(blob));
        this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.objectUrl);
        this.loading = false;
      },
      error: err => {
        this.error = err?.error?.error || err?.message || 'Unable to load voucher print.';
        this.loading = false;
      }
    });
  }

  printDocument(): void {
    const frame = document.querySelector('.pdf-frame') as HTMLIFrameElement | null;
    frame?.contentWindow?.print();
  }

  openInSystemViewer(): void {
    if (this.objectUrl) {
      window.open(this.objectUrl, '_blank', 'noopener');
    }
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.clearUrl();
  }

  private clearUrl(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
    this.pdfUrl = null;
  }

  private toNamedPdfFile(blob: Blob): File {
    return new File([blob], this.pdfFileName || 'voucher.pdf', { type: 'application/pdf' });
  }

  private buildPdfFileName(voucherNo: string): string {
    return `panjatancatering-${voucherNo.trim().toUpperCase()}.pdf`;
  }
}
