import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { VoucherDetail, VoucherLine } from '../../core/models/models';
import { QuantityType, VoucherType } from '../../core/models/enums';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-voucher-lookup',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="ph-icon"><mat-icon>manage_search</mat-icon></div>
        <div class="ph-text">
          <h2>Voucher Lookup</h2>
          <p>Find a voucher by full voucher number, then review, edit, or delete it</p>
        </div>
      </div>

      <mat-card>
        <mat-card-content style="padding:24px">
          <form class="form-row" (ngSubmit)="lookupVoucher()">
            <mat-form-field appearance="outline" style="flex:1.5">
              <mat-label>Voucher Number</mat-label>
              <input matInput [(ngModel)]="voucherNo" name="voucherNo" placeholder="e.g. SV-0001" />
            </mat-form-field>

            <button mat-flat-button color="primary" type="submit" [disabled]="loading || !normalizedVoucherNo" style="height:46px;padding:0 22px">
              <mat-icon>search</mat-icon>
              <span>Find Voucher</span>
            </button>
          </form>

          <div *ngIf="loading" style="padding:18px 0;color:#64748b">Looking up voucher...</div>
          <div *ngIf="lookupError" class="text-red" style="margin-top:12px">{{ lookupError }}</div>
          <div *ngIf="notFound && !loading" class="text-muted" style="margin-top:12px">No voucher found for {{ normalizedVoucherNo }}.</div>

          <ng-container *ngIf="voucher && !loading">
            <div class="filter-panel" style="margin-top:18px;margin-bottom:18px">
              <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap">
                <div>
                  <h3 style="margin:0 0 6px;font-size:18px">{{ voucher.voucherNo }}</h3>
                  <div class="text-muted" style="font-size:13px">
                    {{ voucher.voucherTypeLabel }} | {{ voucher.date | date:'dd/MM/yyyy' }}
                  </div>
                  <div *ngIf="voucher.description" style="margin-top:8px;font-size:13px;color:#334155">{{ voucher.description }}</div>
                  <div *ngIf="voucher.notes" style="margin-top:6px;font-size:12px;color:#64748b">Notes: {{ voucher.notes }}</div>
                </div>

                <div style="display:flex;gap:10px;flex-wrap:wrap">
                  <button mat-stroked-button color="primary" type="button" (click)="editVoucher()">
                    <mat-icon>edit</mat-icon>
                    <span>Edit Voucher</span>
                  </button>
                  <button mat-flat-button color="warn" type="button" (click)="deleteVoucher()">
                    <mat-icon>delete</mat-icon>
                    <span>Delete Voucher</span>
                  </button>
                </div>
              </div>

              <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:14px">
                <div class="chip-zero">Debit: {{ totalDebit | number:'1.2-2' }}</div>
                <div class="chip-zero">Credit: {{ totalCredit | number:'1.2-2' }}</div>
              </div>
            </div>

            <div class="line-grid">
              <table>
                <thead>
                  <tr>
                    <th>Entry Type</th>
                    <th>Account / Name</th>
                    <th>Item / Line</th>
                    <th class="text-right">Qty</th>
                    <th>Description</th>
                    <th class="text-right">Debit</th>
                    <th class="text-right">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let line of voucher.lines">
                    <td>{{ line.entryTypeLabel }}</td>
                    <td>{{ getAccountLabel(line) }}</td>
                    <td>{{ line.itemName || line.freeText || '-' }}</td>
                    <td class="text-right">{{ line.quantity ? (line.quantity + ' ' + getUnitLabel(line.quantityType)) : '' }}</td>
                    <td>{{ line.description || '-' }}</td>
                    <td class="text-right">{{ line.debit | number:'1.2-2' }}</td>
                    <td class="text-right">{{ line.credit | number:'1.2-2' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </ng-container>
        </mat-card-content>
      </mat-card>
    </div>
  `
})
export class VoucherLookupComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  voucherNo = '';
  voucher: VoucherDetail | null = null;
  loading = false;
  notFound = false;
  lookupError = '';

  get normalizedVoucherNo() {
    return this.voucherNo.trim().toUpperCase();
  }

  get totalDebit() {
    return this.voucher?.lines.reduce((sum, line) => sum + line.debit, 0) ?? 0;
  }

  get totalCredit() {
    return this.voucher?.lines.reduce((sum, line) => sum + line.credit, 0) ?? 0;
  }

  lookupVoucher() {
    const voucherNo = this.normalizedVoucherNo;
    if (!voucherNo) return;

    this.loading = true;
    this.lookupError = '';
    this.notFound = false;
    this.voucher = null;

    this.api.get<VoucherDetail>(`/vouchers/by-number/${encodeURIComponent(voucherNo)}`).subscribe({
      next: voucher => {
        this.voucher = voucher;
        this.loading = false;
      },
      error: (err: Error) => {
        this.loading = false;
        const message = err.message.toLowerCase();
        if (message.includes('not found')) {
          this.notFound = true;
          return;
        }
        this.lookupError = err.message;
      }
    });
  }

  editVoucher() {
    if (!this.voucher) return;

    switch (this.voucher.voucherType) {
      case VoucherType.Sales:
        this.router.navigate(['/sales-voucher', this.voucher.id, 'edit']);
        break;
      case VoucherType.Purchase:
        this.router.navigate(['/vendor-purchases', this.voucher.id, 'edit']);
        break;
      default:
        this.router.navigate(['/journal-voucher', this.voucher.id, 'edit']);
        break;
    }
  }

  deleteVoucher() {
    if (!this.voucher) return;

    this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Voucher',
        message: `Delete voucher "${this.voucher.voucherNo}"?`
      }
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed || !this.voucher) return;

      this.api.delete(`/vouchers/${this.voucher.id}`).subscribe({
        next: () => {
          this.toast.success(`Deleted voucher ${this.voucher?.voucherNo}`);
          this.voucher = null;
          this.notFound = false;
          this.lookupError = '';
        },
        error: (err: Error) => this.toast.error(err.message)
      });
    });
  }

  getAccountLabel(line: VoucherLine) {
    return line.customerName || line.vendorName || line.accountName || line.freeText || '-';
  }

  getUnitLabel(quantityType?: QuantityType) {
    if (quantityType === QuantityType.PerKg) return 'Per Kg';
    if (quantityType === QuantityType.PerPerson) return 'Per Person';
    return '';
  }
}
