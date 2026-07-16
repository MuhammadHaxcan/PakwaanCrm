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
import { SalesOrderDetail, SalesOrderLine, VoucherDetail, VoucherLine } from '../../core/models/models';
import { QuantityType, SalesOrderMode, VoucherType } from '../../core/models/enums';
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
          <p>Find a sales order or voucher by its full SO or SV/JV/PV number</p>
        </div>
      </div>

      <mat-card>
        <mat-card-content style="padding:24px">
          <form class="form-row" (ngSubmit)="lookupVoucher()">
            <mat-form-field appearance="outline" style="flex:1.5">
              <mat-label>Voucher Number</mat-label>
              <input matInput [(ngModel)]="voucherNo" name="voucherNo" placeholder="e.g. SO-0001 or SV-0001" />
            </mat-form-field>

            <button mat-flat-button color="primary" type="submit" [disabled]="loading || !normalizedVoucherNo" class="lookup-button">
              <mat-icon>search</mat-icon>
              <span>Find Voucher</span>
            </button>
          </form>

          <div *ngIf="loading" style="padding:18px 0;color:#64748b">Looking up voucher...</div>
          <div *ngIf="lookupError" class="text-red" style="margin-top:12px">{{ lookupError }}</div>
          <div *ngIf="notFound && !loading" class="text-muted" style="margin-top:12px">No voucher found for {{ normalizedVoucherNo }}.</div>

          <ng-container *ngIf="voucher && !loading">
            <div class="filter-panel" style="margin-top:18px;margin-bottom:18px">
              <div class="voucher-summary">
                <div>
                  <h3 style="margin:0 0 6px;font-size:18px">{{ voucher.voucherNo }}</h3>
                  <div class="text-muted" style="font-size:13px">
                    {{ voucher.voucherTypeLabel }} | {{ voucher.date | date:'dd/MM/yyyy' }}
                  </div>
                  <div *ngIf="voucher.description" style="margin-top:8px;font-size:13px;color:#334155">{{ voucher.description }}</div>
                  <div *ngIf="voucher.notes" style="margin-top:6px;font-size:12px;color:#64748b">Notes: {{ voucher.notes }}</div>
                  <div *ngIf="voucher.salesOrderNo" style="margin-top:6px;font-size:12px;color:#3949ab">Parent: {{ voucher.salesOrderNo }}</div>
                </div>

                <div class="voucher-actions">
                  <button mat-stroked-button color="primary" type="button" (click)="editVoucher()">
                    <mat-icon>edit</mat-icon>
                    <span>Edit Voucher</span>
                  </button>
                  <button mat-flat-button color="warn" type="button" (click)="deleteVoucher()"
                    [disabled]="deleteDialogOpen || deleting">
                    <mat-icon>delete</mat-icon>
                    <span>Delete Voucher</span>
                  </button>
                </div>
              </div>

              <div class="voucher-totals">
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
                    <th class="text-right">Base Amount</th>
                    <th class="text-right">Delivery</th>
                    <th class="text-right">Total</th>
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
                    <td class="text-right">{{ getBaseAmount(line) | number:'1.2-2' }}</td>
                    <td class="text-right">{{ line.deliveryCharge | number:'1.2-2' }}</td>
                    <td class="text-right">{{ getLineTotal(line) | number:'1.2-2' }}</td>
                    <td>{{ line.description || '-' }}</td>
                    <td class="text-right">{{ line.debit | number:'1.2-2' }}</td>
                    <td class="text-right">{{ line.credit | number:'1.2-2' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </ng-container>

          <ng-container *ngIf="salesOrder && !loading">
            <div class="filter-panel" style="margin-top:18px;margin-bottom:18px">
              <div class="voucher-summary">
                <div>
                  <h3 style="margin:0 0 6px;font-size:18px">{{ salesOrder.orderNo }}</h3>
                  <div class="text-muted" style="font-size:13px">{{ salesOrder.modeLabel }} · {{ salesOrder.voucherNos.join(', ') }}</div>
                  <div *ngIf="salesOrder.notes" style="margin-top:6px;font-size:12px;color:#64748b">Notes: {{ salesOrder.notes }}</div>
                </div>
                <div class="voucher-actions">
                  <button mat-stroked-button color="primary" type="button" (click)="editSalesOrder()"><mat-icon>edit</mat-icon> Edit Sales Order</button>
                  <button mat-flat-button color="warn" type="button" (click)="deleteSalesOrder()" [disabled]="deleteDialogOpen || deleting"><mat-icon>delete</mat-icon> Delete Sales Order</button>
                </div>
              </div>
            </div>
            <div class="line-grid">
              <table>
                <thead><tr><th>Voucher</th><th>Date</th><th>Customer</th><th>Item</th><th class="text-right">Qty</th><th class="text-right">Base</th><th class="text-right">Delivery</th><th class="text-right">Total</th><th>Description</th></tr></thead>
                <tbody><tr *ngFor="let line of salesOrder.lines">
                  <td>{{ line.voucherNo }}</td><td>{{ line.date | date:'dd/MM/yyyy' }}</td><td>{{ line.customerName }}</td><td>{{ line.itemName }}</td>
                  <td class="text-right">{{ line.quantity }} {{ getUnitLabel(line.quantityType) }}</td>
                  <td class="text-right">{{ getOrderBaseAmount(line) | number:'1.2-2' }}</td>
                  <td class="text-right">{{ line.deliveryCharge | number:'1.2-2' }}</td>
                  <td class="text-right">{{ getOrderLineTotal(line) | number:'1.2-2' }}</td><td>{{ line.description || '-' }}</td>
                </tr></tbody>
              </table>
            </div>
          </ng-container>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .lookup-button {
      height: 46px;
      padding: 0 22px;
    }

    .voucher-summary {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
      flex-wrap: wrap;
    }

    .voucher-actions,
    .voucher-totals {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .voucher-totals {
      gap: 16px;
      margin-top: 14px;
    }

    @media (max-width: 640px) {
      .lookup-button,
      .voucher-actions button {
        width: 100%;
        justify-content: center;
      }

      .voucher-actions,
      .voucher-totals {
        width: 100%;
      }
    }
  `]
})
export class VoucherLookupComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  voucherNo = '';
  voucher: VoucherDetail | null = null;
  salesOrder: SalesOrderDetail | null = null;
  loading = false;
  notFound = false;
  lookupError = '';
  deleteDialogOpen = false;
  deleting = false;

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
    if (!voucherNo || this.loading) return;

    this.loading = true;
    this.lookupError = '';
    this.notFound = false;
    this.voucher = null;
    this.salesOrder = null;

    const isSalesOrder = voucherNo.startsWith('SO-');
    const path = isSalesOrder
      ? `/vouchers/sales-orders/by-number/${encodeURIComponent(voucherNo)}`
      : `/vouchers/by-number/${encodeURIComponent(voucherNo)}`;
    this.api.get<VoucherDetail | SalesOrderDetail>(path).subscribe({
      next: result => {
        if (isSalesOrder) this.salesOrder = result as SalesOrderDetail;
        else this.voucher = result as VoucherDetail;
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

    if (this.voucher.salesOrderId && this.voucher.salesOrderMode !== undefined) {
      this.navigateToSalesOrder(this.voucher.salesOrderId, this.voucher.salesOrderMode);
      return;
    }

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

  editSalesOrder() {
    if (!this.salesOrder) return;
    this.navigateToSalesOrder(this.salesOrder.id, this.salesOrder.mode);
  }

  private navigateToSalesOrder(id: number, mode: SalesOrderMode) {
    if (mode === SalesOrderMode.CustomerDateWise) {
      this.router.navigate(['/sales-voucher/customer-dates/order', id, 'edit']);
      return;
    }
    this.router.navigate(['/sales-voucher/order', id, 'edit']);
  }

  deleteVoucher() {
    if (!this.voucher || this.deleteDialogOpen || this.deleting) return;

    const voucher = this.voucher;
    this.deleteDialogOpen = true;

    this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Voucher',
        message: `Delete voucher "${voucher.voucherNo}"?`
      }
    }).afterClosed().subscribe(confirmed => {
      this.deleteDialogOpen = false;
      if (!confirmed || this.deleting) return;
      this.deleting = true;

      this.api.delete(`/vouchers/${voucher.id}`).subscribe({
        next: () => {
          this.deleting = false;
          this.toast.success(`Deleted voucher ${voucher.voucherNo}`);
          this.voucher = null;
          this.notFound = false;
          this.lookupError = '';
        },
        error: (err: Error) => {
          this.deleting = false;
          this.toast.error(err.message);
        }
      });
    });
  }

  deleteSalesOrder() {
    if (!this.salesOrder || this.deleteDialogOpen || this.deleting) return;
    const order = this.salesOrder;
    this.deleteDialogOpen = true;
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete Sales Order', message: `Delete sales order "${order.orderNo}" and all child vouchers?` }
    }).afterClosed().subscribe(confirmed => {
      this.deleteDialogOpen = false;
      if (!confirmed || this.deleting) return;
      this.deleting = true;
      this.api.delete(`/vouchers/sales-orders/${order.id}`).subscribe({
        next: () => {
          this.deleting = false;
          this.toast.success(`Deleted sales order ${order.orderNo}`);
          this.salesOrder = null;
        },
        error: (err: Error) => {
          this.deleting = false;
          this.toast.error(err.message);
        }
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

  getBaseAmount(line: VoucherLine) { return (line.quantity ?? 0) * (line.rate ?? 0); }
  getLineTotal(line: VoucherLine) { return this.getBaseAmount(line) + (line.deliveryCharge ?? 0); }
  getOrderBaseAmount(line: SalesOrderLine) { return line.quantity * line.rate; }
  getOrderLineTotal(line: SalesOrderLine) { return this.getOrderBaseAmount(line) + line.deliveryCharge; }
}
