import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { SearchableSelectComponent, SelectOption } from '../../shared/components/searchable-select/searchable-select.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { MasterDataService } from '../../core/services/master-data.service';
import { ApiService } from '../../core/services/api.service';
import { AccountBalance, MasterReportEntry, MasterReportResponse } from '../../core/models/models';
import { forkJoin } from 'rxjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-master-report',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatTableModule, MatCheckboxModule,
    MatTooltipModule, MatTabsModule,
    SearchableSelectComponent, LoadingSpinnerComponent
  ],
  template: `
    <div class="page-container">

      <!-- Page header -->
      <div class="page-header">
        <div class="ph-icon"><mat-icon>bar_chart</mat-icon></div>
        <div class="ph-text">
          <h2>Master Report</h2>
          <p>All transactions across every account with filters and export</p>
        </div>
      </div>

      <mat-card>
        <mat-card-content style="padding:24px">

          <!-- Filter panel -->
          <div class="filter-panel">
            <div class="form-row" style="align-items:flex-end">
              <mat-form-field appearance="outline" style="min-width:150px">
                <mat-label>From Date</mat-label>
                <input matInput type="date" [(ngModel)]="filters.startDate" [ngModelOptions]="{standalone:true}" />
              </mat-form-field>
              <mat-form-field appearance="outline" style="min-width:150px">
                <mat-label>To Date</mat-label>
                <input matInput type="date" [(ngModel)]="filters.endDate" [ngModelOptions]="{standalone:true}" />
              </mat-form-field>

              <div class="field-stack field-floating" style="min-width:180px">
                <label class="field-label">Customer</label>
                <app-searchable-select [options]="customerOptions" placeholder="All customers"
                  [(ngModel)]="filters.customerId" [ngModelOptions]="{standalone:true}">
                </app-searchable-select>
              </div>

              <div class="field-stack field-floating" style="min-width:180px">
                <label class="field-label">Vendor</label>
                <app-searchable-select [options]="vendorOptions" placeholder="All vendors"
                  [(ngModel)]="filters.vendorId" [ngModelOptions]="{standalone:true}">
                </app-searchable-select>
              </div>

              <mat-form-field appearance="outline" style="min-width:140px">
                <mat-label>Voucher Type</mat-label>
                <select matNativeControl [(ngModel)]="filters.voucherTypeStr" [ngModelOptions]="{standalone:true}">
                  <option value="">All</option>
                  <option value="0">Sales</option>
                  <option value="1">General</option>
                  <option value="2">Purchase</option>
                </select>
              </mat-form-field>

              <button mat-flat-button color="primary" (click)="generate()" [disabled]="generating"
                style="height:40px;padding:0 20px">
                <mat-icon style="margin-right:4px">search</mat-icon> Generate
              </button>
              <button mat-stroked-button (click)="loadMore()"
                *ngIf="hasMore && !generating" [disabled]="loadingMore"
                style="height:40px">
                Load More
              </button>
            </div>
          </div>

          <div *ngIf="generating" style="padding:24px 0"><app-loading-spinner></app-loading-spinner></div>
          <div *ngIf="error" class="text-red" style="margin:8px 0">{{ error }}</div>

          <ng-container *ngIf="entries.length > 0 && !generating">
            <mat-tab-group style="margin-top:8px">

              <!-- Transactions tab -->
              <mat-tab label="Transactions ({{ totalRecords }})">
                <div style="display:flex;justify-content:space-between;align-items:center;margin:14px 0 8px;flex-wrap:wrap;gap:12px">

                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                    <span style="font-size:12px;color:#475569;font-weight:600">COLUMNS:</span>
                    <mat-checkbox *ngFor="let col of columnKeys" [(ngModel)]="visibleCols[col]"
                      [ngModelOptions]="{standalone:true}" style="font-size:13px">
                      {{ colLabels[col] }}
                    </mat-checkbox>
                  </div>

                  <div style="display:flex;gap:8px;align-items:center">
                    <mat-form-field appearance="outline" style="width:200px">
                      <mat-label>Search</mat-label>
                      <input matInput [(ngModel)]="searchTerm" [ngModelOptions]="{standalone:true}" />
                      <mat-icon matSuffix>search</mat-icon>
                    </mat-form-field>
                    <button mat-stroked-button (click)="exportPdf()">
                      <mat-icon>picture_as_pdf</mat-icon> PDF
                    </button>
                    <button mat-stroked-button (click)="exportCsv()">
                      <mat-icon>download</mat-icon> CSV
                    </button>
                  </div>
                </div>

                <div class="line-grid">
                  <table>
                    <thead>
                      <tr>
                        <th *ngIf="visibleCols['date']">Date</th>
                        <th *ngIf="visibleCols['voucherNo']">Voucher No</th>
                        <th *ngIf="visibleCols['voucherType']">Type</th>
                        <th *ngIf="visibleCols['account']">Account</th>
                        <th *ngIf="visibleCols['category']">Category</th>
                        <th *ngIf="visibleCols['item']">Item</th>
                        <th *ngIf="visibleCols['qty']" class="text-right">Qty</th>
                        <th *ngIf="visibleCols['description']">Description</th>
                        <th *ngIf="visibleCols['debit']" class="text-right">Debit</th>
                        <th *ngIf="visibleCols['credit']" class="text-right">Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let e of filteredEntries">
                        <td *ngIf="visibleCols['date']">{{ e.date | date:'dd/MM/yyyy' }}</td>
                        <td *ngIf="visibleCols['voucherNo']"><strong>{{ e.voucherNo }}</strong></td>
                        <td *ngIf="visibleCols['voucherType']">
                          <span class="v-badge" [class.v-sales]="e.voucherType==='Sales'">{{ e.voucherType }}</span>
                        </td>
                        <td *ngIf="visibleCols['account']">{{ e.accountName }}</td>
                        <td *ngIf="visibleCols['category']" class="text-muted" style="font-size:12px">{{ e.accountCategory }}</td>
                        <td *ngIf="visibleCols['item']">{{ e.itemName }}</td>
                        <td *ngIf="visibleCols['qty']" class="text-right">
                          {{ e.quantity ? (e.quantity + ' ' + (e.quantityTypeLabel ?? '')) : '' }}
                        </td>
                        <td *ngIf="visibleCols['description']" class="text-muted" style="font-size:12px">{{ e.description }}</td>
                        <td *ngIf="visibleCols['debit']" class="text-right text-red font-bold">
                          {{ e.debit > 0 ? (e.debit | number:'1.2-2') : '' }}
                        </td>
                        <td *ngIf="visibleCols['credit']" class="text-right text-green font-bold">
                          {{ e.credit > 0 ? (e.credit | number:'1.2-2') : '' }}
                        </td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr class="total-row">
                        <td [attr.colspan]="visibleColCount - 2" class="text-right">Totals</td>
                        <td *ngIf="visibleCols['debit']"  class="text-right">{{ totalDebit  | number:'1.2-2' }}</td>
                        <td *ngIf="visibleCols['credit']" class="text-right">{{ totalCredit | number:'1.2-2' }}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <p class="text-muted" style="font-size:12px;margin-top:8px">
                  Showing {{ filteredEntries.length }} of {{ totalRecords }} records
                </p>
              </mat-tab>

              <!-- Account Balances tab -->
              <mat-tab label="Account Balances">
                <div style="margin-top:16px">
                  <div *ngIf="loadingBalances" style="padding:16px 0"><app-loading-spinner></app-loading-spinner></div>
                  <div class="line-grid" *ngIf="!loadingBalances && balances.length > 0">
                    <table>
                      <thead>
                        <tr>
                          <th>Account</th>
                          <th>Type</th>
                          <th class="text-right">Opening</th>
                          <th class="text-right">Total Debit</th>
                          <th class="text-right">Total Credit</th>
                          <th class="text-right">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr *ngFor="let b of balances" class="summary-row">
                          <td class="font-bold">{{ b.name }}</td>
                          <td>
                            <span class="v-badge" [class.v-sales]="b.accountType==='Customer'">{{ b.accountType }}</span>
                          </td>
                          <td class="text-right">{{ b.openingBalance | number:'1.2-2' }}</td>
                          <td class="text-right text-red">{{ b.totalDebit | number:'1.2-2' }}</td>
                          <td class="text-right text-green">{{ b.totalCredit | number:'1.2-2' }}</td>
                          <td class="text-right"
                            [class.balance-positive]="b.balance >= 0"
                            [class.balance-negative]="b.balance <  0">
                            {{ b.balance | number:'1.2-2' }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </mat-tab>

            </mat-tab-group>
          </ng-container>

        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .v-badge {
      font-size: 11px; padding: 2px 9px; border-radius: 10px;
      background: #f3e5f5; color: #4a148c; font-weight: 500;
    }
    .v-badge.v-sales { background: #e3f2fd; color: #0d47a1; }
  `]
})
export class MasterReportComponent implements OnInit {
  private masterData = inject(MasterDataService);
  private api = inject(ApiService);

  customerOptions: SelectOption[] = [];
  vendorOptions: SelectOption[] = [];

  filters = {
    startDate: '', endDate: '',
    customerId: null as number | null,
    vendorId: null as number | null,
    voucherTypeStr: '' // '' = All, '0' = Sales, '1' = General
  };

  get voucherTypeFilter(): number | null {
    return this.filters.voucherTypeStr === '' ? null : +this.filters.voucherTypeStr;
  }
  entries: MasterReportEntry[] = [];
  balances: AccountBalance[] = [];
  totalRecords = 0;
  hasMore = false;
  generating = false;
  loadingMore = false;
  loadingBalances = false;
  error = '';
  searchTerm = '';
  private currentPage = 0;
  private readonly pageSize = 500;

  columnKeys = ['date','voucherNo','voucherType','account','category','item','qty','description','debit','credit'];
  colLabels: Record<string,string> = {
    date:'Date', voucherNo:'Voucher', voucherType:'Type', account:'Account',
    category:'Category', item:'Item', qty:'Qty', description:'Description', debit:'Debit', credit:'Credit'
  };
  visibleCols: Record<string, boolean> = {
    date:true, voucherNo:true, voucherType:true, account:true, category:true,
    item:true, qty:true, description:true, debit:true, credit:true
  };

  get visibleColCount() { return this.columnKeys.filter(k => this.visibleCols[k]).length; }
  get totalDebit()  { return this.filteredEntries.reduce((s, e) => s + e.debit,  0); }
  get totalCredit() { return this.filteredEntries.reduce((s, e) => s + e.credit, 0); }

  get filteredEntries(): MasterReportEntry[] {
    const q = this.searchTerm.toLowerCase();
    if (!q) return this.entries;
    return this.entries.filter(e =>
      e.voucherNo.toLowerCase().includes(q) ||
      e.accountName.toLowerCase().includes(q) ||
      (e.description ?? '').toLowerCase().includes(q) ||
      (e.itemName ?? '').toLowerCase().includes(q)
    );
  }

  ngOnInit() {
    forkJoin([this.masterData.loadCustomers(), this.masterData.loadVendors()])
      .subscribe(([c, v]) => {
        this.customerOptions = c.map(x => ({ id: x.id, name: x.name }));
        this.vendorOptions   = v.map(x => ({ id: x.id, name: x.name }));
      });
  }

  generate() {
    this.generating = true;
    this.error = '';
    this.entries = [];
    this.currentPage = 0;
    this.hasMore = false;
    this.totalRecords = 0;
    this.fetchPage(0, false);
    this.fetchBalances();
  }

  loadMore() {
    if (!this.hasMore) return;
    this.loadingMore = true;
    this.fetchPage(this.currentPage, true);
  }

  private fetchPage(page: number, append: boolean) {
    this.api.get<MasterReportResponse>('/reports/master', {
      startDate:   this.filters.startDate || null,
      endDate:     this.filters.endDate   || null,
      customerId:  this.filters.customerId,
      vendorId:    this.filters.vendorId,
      voucherType: this.voucherTypeFilter,
      page, pageSize: this.pageSize
    }).subscribe({
      next: res => {
        this.entries      = append ? [...this.entries, ...res.entries] : res.entries;
        this.totalRecords = res.totalRecords;
        this.hasMore      = res.hasMoreData;
        this.currentPage  = page + 1;
        this.generating   = false;
        this.loadingMore  = false;
      },
      error: (err: Error) => { this.error = err.message; this.generating = false; this.loadingMore = false; }
    });
  }

  private fetchBalances() {
    this.loadingBalances = true;
    this.api.get<AccountBalance[]>('/reports/balances').subscribe({
      next:  b  => { this.balances = b; this.loadingBalances = false; },
      error: () => this.loadingBalances = false
    });
  }

  exportPdf() {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Master Report', 14, 16);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}  |  Records: ${this.filteredEntries.length}`, 14, 22);

    autoTable(doc, {
      startY: 26,
      head: [['Date','Voucher','Type','Account','Category','Item','Qty','Description','Debit','Credit']],
      body: this.filteredEntries.map(e => [
        new Date(e.date).toLocaleDateString('en-GB'),
        e.voucherNo, e.voucherType, e.accountName, e.accountCategory,
        e.itemName ?? '',
        e.quantity ? `${e.quantity} ${e.quantityTypeLabel ?? ''}` : '',
        e.description ?? '',
        e.debit  > 0 ? e.debit.toFixed(2)  : '',
        e.credit > 0 ? e.credit.toFixed(2) : ''
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [57, 73, 171] }
    });
    doc.save(`MasterReport_${new Date().toISOString().split('T')[0]}.pdf`);
  }

  exportCsv() {
    const header = 'Date,Voucher No,Type,Account,Category,Item,Qty,Description,Debit,Credit\n';
    const rows = this.filteredEntries.map(e =>
      `${new Date(e.date).toLocaleDateString('en-GB')},${e.voucherNo},${e.voucherType},` +
      `${e.accountName},${e.accountCategory},${e.itemName ?? ''},` +
      `"${e.quantity ? e.quantity + ' ' + (e.quantityTypeLabel ?? '') : ''}",` +
      `"${e.description ?? ''}",${e.debit},${e.credit}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `MasterReport_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }
}
