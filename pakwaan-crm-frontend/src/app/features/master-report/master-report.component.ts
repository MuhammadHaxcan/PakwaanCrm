import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
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
import { formatDateForApi, parseDateInput } from '../../core/date/date-utils';
import { forkJoin } from 'rxjs';
import { VOUCHER_TYPE_FILTER_OPTIONS } from '../../shared/constants/select-options';
import { buildVoucherPrintRoute } from '../../core/utils/voucher-print.utils';
import { buildMasterReportPrintUrl } from '../../core/utils/report-print.utils';

@Component({
  selector: 'app-master-report',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatTableModule, MatCheckboxModule,
    MatTooltipModule, MatTabsModule, MatDatepickerModule,
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
            <div class="master-filter-grid">
              <mat-form-field appearance="outline" subscriptSizing="dynamic" class="filter-field">
                <mat-label>From Date</mat-label>
                <input matInput [matDatepicker]="masterStartDatePicker" [(ngModel)]="filters.startDate" [ngModelOptions]="{standalone:true}" placeholder="dd/mm/yyyy" />
                <mat-datepicker-toggle matIconSuffix [for]="masterStartDatePicker"></mat-datepicker-toggle>
                <mat-datepicker #masterStartDatePicker></mat-datepicker>
              </mat-form-field>

              <mat-form-field appearance="outline" subscriptSizing="dynamic" class="filter-field">
                <mat-label>To Date</mat-label>
                <input matInput [matDatepicker]="masterEndDatePicker" [(ngModel)]="filters.endDate" [ngModelOptions]="{standalone:true}" placeholder="dd/mm/yyyy" />
                <mat-datepicker-toggle matIconSuffix [for]="masterEndDatePicker"></mat-datepicker-toggle>
                <mat-datepicker #masterEndDatePicker></mat-datepicker>
              </mat-form-field>

              <app-searchable-select class="filter-field filter-select-field" label="Customer"
                [options]="customerOptions" placeholder="All customers"
                [(ngModel)]="filters.customerId" [ngModelOptions]="{standalone:true}">
              </app-searchable-select>

              <app-searchable-select class="filter-field filter-select-field" label="Vendor"
                [options]="vendorOptions" placeholder="All vendors"
                [(ngModel)]="filters.vendorId" [ngModelOptions]="{standalone:true}">
              </app-searchable-select>

              <app-searchable-select class="filter-field filter-select-field" label="Voucher Type"
                [options]="voucherTypeOptions" placeholder="All types"
                [(ngModel)]="filters.voucherTypeStr" [ngModelOptions]="{standalone:true}">
              </app-searchable-select>

              <div class="filter-actions">
                <button mat-flat-button color="primary" (click)="generate()" [disabled]="generating" class="filter-action-button">
                  <mat-icon>search</mat-icon>
                  <span>Generate</span>
                </button>

                <button mat-stroked-button (click)="loadMore()"
                  *ngIf="hasMore && !generating" [disabled]="loadingMore"
                  class="filter-action-button">
                  Load More
                </button>
              </div>
            </div>
          </div>

          <div *ngIf="generating" style="padding:24px 0"><app-loading-spinner></app-loading-spinner></div>
          <div *ngIf="error" class="text-red" style="margin:8px 0">{{ error }}</div>

          <ng-container *ngIf="entries.length > 0 && !generating">
            <mat-tab-group style="margin-top:8px">

              <!-- Transactions tab -->
              <mat-tab label="Transactions ({{ totalRecords }})">
                <div class="transactions-stage">
                  <div class="transactions-toolbar">
                    <div class="transactions-toolbar-copy">
                      <div class="transactions-toolbar-kicker">Transaction View</div>
                      <h3>Filtered transaction register</h3>
                      <p>{{ filteredEntries.length }} visible rows from {{ totalRecords }} total records</p>
                    </div>

                    <div class="transactions-toolbar-actions">
                      <mat-form-field appearance="outline" subscriptSizing="dynamic" class="transactions-search-field">
                        <mat-label>Search entries</mat-label>
                        <input matInput [(ngModel)]="searchTerm" [ngModelOptions]="{standalone:true}" placeholder="Voucher, account, item..." />
                        <mat-icon matSuffix>search</mat-icon>
                      </mat-form-field>

                      <div class="transactions-export-actions">
                        <button mat-stroked-button class="transactions-export-button" (click)="exportPdf()">
                          <mat-icon>picture_as_pdf</mat-icon>
                          <span>PDF</span>
                        </button>
                        <button mat-stroked-button class="transactions-export-button" (click)="exportCsv()">
                          <mat-icon>download</mat-icon>
                          <span>CSV</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div class="column-toolbar">
                    <span class="column-toolbar-label">Columns</span>
                    <mat-checkbox *ngFor="let col of columnKeys" [(ngModel)]="visibleCols[col]"
                      [ngModelOptions]="{standalone:true}" class="column-toggle">
                      {{ colLabels[col] }}
                    </mat-checkbox>
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
                          <th *ngIf="visibleCols['balance']" class="text-right">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr *ngIf="hasOpeningBalance" class="opening-row">
                          <td *ngIf="visibleCols['date']"></td>
                          <td *ngIf="visibleCols['voucherNo']"></td>
                          <td *ngIf="visibleCols['voucherType']"></td>
                          <td *ngIf="visibleCols['account']" style="font-weight:700">Opening Balance</td>
                          <td *ngIf="visibleCols['category']"></td>
                          <td *ngIf="visibleCols['item']"></td>
                          <td *ngIf="visibleCols['qty']"></td>
                          <td *ngIf="visibleCols['description']"></td>
                          <td *ngIf="visibleCols['debit']" class="text-right font-bold">{{ openingDebit > 0 ? (openingDebit | number:'1.2-2') : '' }}</td>
                          <td *ngIf="visibleCols['credit']" class="text-right font-bold">{{ openingCredit > 0 ? (openingCredit | number:'1.2-2') : '' }}</td>
                          <td *ngIf="visibleCols['balance']" class="text-right font-bold">{{ openingBalance | number:'1.2-2' }}</td>
                        </tr>
                        <tr *ngFor="let e of filteredEntries">
                          <td *ngIf="visibleCols['date']">{{ e.date | date:'dd/MM/yyyy' }}</td>
                          <td *ngIf="visibleCols['voucherNo']">
                            <a class="voucher-link" [href]="getVoucherPrintRoute(e.voucherType, e.voucherNo)" target="_blank" rel="noopener">
                              <strong>{{ e.voucherNo }}</strong>
                            </a>
                          </td>
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
                          <td *ngIf="visibleCols['balance']" class="text-right font-bold"
                            [class.balance-positive]="e.runningBalance >= 0"
                            [class.balance-negative]="e.runningBalance < 0">
                            {{ e.runningBalance | number:'1.2-2' }}
                          </td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr class="total-row">
                          <td [attr.colspan]="visibleColCount - (visibleCols['debit'] ? 1 : 0) - (visibleCols['credit'] ? 1 : 0) - (visibleCols['balance'] ? 1 : 0)" class="text-right">Totals</td>
                          <td *ngIf="visibleCols['debit']"  class="text-right">{{ totalDebit  | number:'1.2-2' }}</td>
                          <td *ngIf="visibleCols['credit']" class="text-right">{{ totalCredit | number:'1.2-2' }}</td>
                          <td *ngIf="visibleCols['balance']" class="text-right">{{ closingBalance | number:'1.2-2' }}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
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
    :host {
      display: block;
    }

    .master-filter-grid {
      display: grid;
      grid-template-columns:
        minmax(180px, 1fr)
        minmax(180px, 1fr)
        minmax(210px, 1.15fr)
        minmax(210px, 1.15fr)
        minmax(190px, 1fr)
        minmax(150px, auto);
      gap: 16px;
      align-items: end;
    }

    .filter-field {
      min-width: 0;
      margin: 0;
    }

    .filter-select-field {
      --ss-control-height: 46px;
      --ss-label-bg: #f8f9ff;
    }

    .filter-actions {
      display: flex;
      align-items: end;
      gap: 12px;
      min-width: 0;
      flex-wrap: wrap;
    }

    .filter-action-button {
      min-width: 128px;
      height: 46px;
      padding: 0 20px;
    }

    .filter-action-button mat-icon {
      margin-right: 4px;
    }

    .transactions-stage {
      margin-top: 16px;
    }

    .transactions-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 16px;
      flex-wrap: wrap;
      padding: 16px 18px;
      margin-bottom: 14px;
      border: 1px solid #dce5ff;
      border-radius: 18px;
      background:
        linear-gradient(180deg, rgba(247, 249, 255, 0.96) 0%, rgba(255, 255, 255, 0.98) 100%);
    }

    .transactions-toolbar-copy {
      flex: 1 1 270px;
      min-width: 0;
    }

    .transactions-toolbar-kicker {
      font-size: 11px;
      line-height: 1;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #5163a8;
      margin-bottom: 8px;
    }

    .transactions-toolbar-copy h3 {
      margin: 0;
      font-size: 19px;
      font-weight: 700;
      color: #1e293b;
    }

    .transactions-toolbar-copy p {
      margin: 4px 0 0;
      font-size: 13px;
      color: #64748b;
    }

    .transactions-toolbar-actions {
      display: flex;
      align-items: flex-end;
      justify-content: flex-end;
      gap: 12px;
      flex: 1 1 430px;
      min-width: 0;
      flex-wrap: wrap;
    }

    .transactions-search-field {
      width: min(100%, 290px);
      min-width: 220px;
      margin: 0;
    }

    .transactions-export-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .transactions-export-button {
      height: 46px;
      padding: 0 16px;
      border-radius: 12px;
    }

    .column-toolbar {
      display: flex;
      align-items: center;
      gap: 10px 14px;
      flex-wrap: wrap;
      padding: 12px 16px;
      margin-bottom: 16px;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      background: #f8fafc;
    }

    .column-toolbar-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #475569;
    }

    .column-toggle {
      font-size: 13px;
    }

    :host ::ng-deep .filter-panel .mat-mdc-form-field-subscript-wrapper,
    :host ::ng-deep .filter-panel .mat-mdc-form-field-bottom-align::before,
    :host ::ng-deep .transactions-toolbar .mat-mdc-form-field-subscript-wrapper,
    :host ::ng-deep .transactions-toolbar .mat-mdc-form-field-bottom-align::before {
      display: none;
    }

    :host ::ng-deep .filter-panel .mat-mdc-form-field-infix,
    :host ::ng-deep .transactions-toolbar .mat-mdc-form-field-infix {
      min-height: 46px;
    }

    .v-badge {
      font-size: 11px; padding: 2px 9px; border-radius: 10px;
      background: #f3e5f5; color: #4a148c; font-weight: 500;
    }
    .v-badge.v-sales { background: #e3f2fd; color: #0d47a1; }

    .voucher-link {
      color: #1b3f8b;
      text-decoration: none;
      border-bottom: 1px solid rgba(27, 63, 139, 0.2);
      transition: border-color .2s ease;
    }

    .voucher-link:hover {
      border-color: rgba(27, 63, 139, 0.6);
    }

    @media (max-width: 1280px) {
      .master-filter-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .filter-actions {
        grid-column: 1 / -1;
      }

      .transactions-toolbar-actions {
        justify-content: flex-start;
      }
    }

    @media (max-width: 768px) {
      .master-filter-grid {
        grid-template-columns: 1fr;
      }

      .filter-field,
      .filter-actions {
        grid-column: 1 / -1;
      }

      .filter-actions {
        flex-wrap: wrap;
      }

      .filter-action-button {
        flex: 1 1 180px;
      }

      .transactions-search-field {
        width: 100%;
        min-width: 0;
      }

      .transactions-export-actions,
      .transactions-export-button {
        width: 100%;
      }
    }
  `]
})
export class MasterReportComponent implements OnInit {
  private masterData = inject(MasterDataService);
  private api = inject(ApiService);

  customerOptions: SelectOption[] = [];
  vendorOptions: SelectOption[] = [];
  voucherTypeOptions: SelectOption[] = VOUCHER_TYPE_FILTER_OPTIONS;

  filters = {
    startDate: null as Date | null, endDate: null as Date | null,
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
  hasOpeningBalance = false;
  openingDebit = 0;
  openingCredit = 0;
  openingBalance = 0;
  private currentPage = 0;
  private readonly pageSize = 500;

  columnKeys = ['date','voucherNo','voucherType','account','category','item','qty','description','debit','credit','balance'];
  colLabels: Record<string,string> = {
    date:'Date', voucherNo:'Voucher', voucherType:'Type', account:'Account',
    category:'Category', item:'Item', qty:'Qty', description:'Description', debit:'Debit', credit:'Credit', balance:'Balance'
  };
  visibleCols: Record<string, boolean> = {
    date:true, voucherNo:true, voucherType:true, account:true, category:true,
    item:true, qty:true, description:true, debit:true, credit:true, balance:true
  };

  get visibleColCount() { return this.columnKeys.filter(k => this.visibleCols[k]).length; }
  get totalDebit()  { return this.filteredEntries.reduce((s, e) => s + e.debit,  0); }
  get totalCredit() { return this.filteredEntries.reduce((s, e) => s + e.credit, 0); }
  get closingBalance() {
    return this.filteredEntries.length
      ? this.filteredEntries[this.filteredEntries.length - 1].runningBalance
      : this.openingBalance;
  }

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
    this.filters.startDate = parseDateInput(this.filters.startDate);
    this.filters.endDate = parseDateInput(this.filters.endDate);
    this.generating = true;
    this.error = '';
    this.entries = [];
    this.currentPage = 0;
    this.hasMore = false;
    this.totalRecords = 0;
    this.hasOpeningBalance = false;
    this.openingDebit = 0;
    this.openingCredit = 0;
    this.openingBalance = 0;
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
      startDate:   formatDateForApi(this.filters.startDate),
      endDate:     formatDateForApi(this.filters.endDate),
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
        if (!append) {
          this.hasOpeningBalance = res.hasOpeningBalance;
          this.openingDebit      = res.openingDebit;
          this.openingCredit     = res.openingCredit;
          this.openingBalance    = res.openingBalance;
        }
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
    const url = buildMasterReportPrintUrl({
      startDate: formatDateForApi(this.filters.startDate),
      endDate: formatDateForApi(this.filters.endDate),
      customerId: this.filters.customerId,
      vendorId: this.filters.vendorId,
      voucherType: this.voucherTypeFilter
    });
    window.open(url, '_blank', 'noopener');
  }

  exportCsv() {
    const header = 'Date,Voucher No,Type,Account,Category,Item,Qty,Description,Debit,Credit,Balance\n';
    const openingRow = this.hasOpeningBalance
      ? `,,,"Opening Balance",,,,,${this.openingDebit},${this.openingCredit},${this.openingBalance}\n`
      : '';
    const rows = this.filteredEntries.map(e =>
      `${new Date(e.date).toLocaleDateString('en-GB')},${e.voucherNo},${e.voucherType},` +
      `${e.accountName},${e.accountCategory},${e.itemName ?? ''},` +
      `"${e.quantity ? e.quantity + ' ' + (e.quantityTypeLabel ?? '') : ''}",` +
      `"${e.description ?? ''}",${e.debit},${e.credit},${e.runningBalance}`
    ).join('\n');
    const blob = new Blob([header + openingRow + rows], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `MasterReport_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  private getSelectedOptionName(options: SelectOption[], id: number | null) {
    if (!id) return '';
    return options.find(option => option.id === id)?.name ?? '';
  }

  private getVoucherTypeLabel(type: number | null) {
    if (type === null) return '';
    if (type === 0) return 'Sales';
    if (type === 1) return 'Journal';
    if (type === 2) return 'Purchase';
    return '';
  }

  getVoucherPrintRoute(voucherType: string, voucherNo: string): string {
    return buildVoucherPrintRoute(voucherType, voucherNo);
  }
}
