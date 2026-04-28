import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { MasterDataService } from '../../core/services/master-data.service';
import { ReportExportService } from '../../core/services/report-export.service';
import { SoaEntry, SoaResponse } from '../../core/models/models';
import { formatDateForApi, formatDateForDisplay, parseDateInput } from '../../core/date/date-utils';
import { SearchableSelectComponent, SelectOption } from '../../shared/components/searchable-select/searchable-select.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { ACCOUNT_TYPE_OPTIONS } from '../../shared/constants/select-options';

@Component({
  selector: 'app-soa',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule,
    MatTableModule, MatDividerModule, MatTooltipModule, MatDatepickerModule,
    SearchableSelectComponent, LoadingSpinnerComponent
  ],
  template: `
    <div class="page-container">

      <div class="page-header">
        <div class="ph-icon"><mat-icon>account_balance_wallet</mat-icon></div>
        <div class="ph-text">
          <h2>Statement of Account</h2>
          <p>View transaction history and running balance for any customer or vendor</p>
        </div>
      </div>

      <mat-card>
        <mat-card-content style="padding:24px">
          <div class="filter-panel">
            <form [formGroup]="filterForm" (ngSubmit)="generate()">
              <div class="soa-filter-grid">
                <app-searchable-select
                  class="soa-filter-field soa-filter-select-field soa-account-type-field"
                  label="Account Type"
                  [options]="accountTypeOptions"
                  placeholder="Select type..."
                  formControlName="accountType">
                </app-searchable-select>

                <app-searchable-select
                  class="soa-filter-field soa-filter-select-field"
                  label="Account"
                  [options]="accountOptions"
                  placeholder="Select account..."
                  formControlName="accountId">
                </app-searchable-select>

                <mat-form-field appearance="outline" subscriptSizing="dynamic" class="soa-filter-field">
                  <mat-label>From Date</mat-label>
                  <input matInput [matDatepicker]="soaStartDatePicker" formControlName="startDate" placeholder="dd/mm/yyyy" />
                  <mat-datepicker-toggle matIconSuffix [for]="soaStartDatePicker"></mat-datepicker-toggle>
                  <mat-datepicker #soaStartDatePicker></mat-datepicker>
                </mat-form-field>

                <mat-form-field appearance="outline" subscriptSizing="dynamic" class="soa-filter-field">
                  <mat-label>To Date</mat-label>
                  <input matInput [matDatepicker]="soaEndDatePicker" formControlName="endDate" placeholder="dd/mm/yyyy" />
                  <mat-datepicker-toggle matIconSuffix [for]="soaEndDatePicker"></mat-datepicker-toggle>
                  <mat-datepicker #soaEndDatePicker></mat-datepicker>
                </mat-form-field>

                <div class="soa-filter-actions">
                  <button mat-flat-button color="primary" type="submit"
                    [disabled]="generating || !filterForm.get('accountId')?.value"
                    class="soa-filter-action-button">
                    <mat-icon>search</mat-icon>
                    <span>Generate</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div *ngIf="generating" style="padding:24px 0"><app-loading-spinner></app-loading-spinner></div>
          <div *ngIf="error" class="text-red" style="margin:8px 0">{{ error }}</div>

          <ng-container *ngIf="soa && !generating">
            <div class="report-stage">
              <div class="report-toolbar">
                <div class="report-toolbar-copy">
                  <div class="report-toolbar-kicker">Statement Summary</div>
                  <h3>{{ soa.accountName }}</h3>
                </div>

                <div class="report-toolbar-actions">
                  <mat-form-field appearance="outline" subscriptSizing="dynamic" class="report-search-field">
                    <mat-label>Search entries</mat-label>
                    <input matInput [(ngModel)]="searchTerm" [ngModelOptions]="{standalone:true}" placeholder="Voucher, description..." />
                    <mat-icon matSuffix>search</mat-icon>
                  </mat-form-field>

                  <div class="report-export-actions">
                    <button mat-stroked-button class="report-export-button" (click)="exportPdf()" matTooltip="Export PDF">
                      <mat-icon>picture_as_pdf</mat-icon>
                      <span>PDF</span>
                    </button>
                    <button mat-stroked-button class="report-export-button" (click)="exportCsv()" matTooltip="Export CSV">
                      <mat-icon>download</mat-icon>
                      <span>CSV</span>
                    </button>
                  </div>
                </div>
              </div>

              <div class="line-grid">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Voucher No</th>
                      <th>Type</th>
                      <th>Description</th>
                      <th class="text-right">Debit</th>
                      <th class="text-right">Credit</th>
                      <th class="text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr class="opening-row">
                      <td colspan="4"><strong>Opening Balance</strong></td>
                      <td></td>
                      <td></td>
                      <td class="text-right font-bold">{{ soa.openingBalance | number:'1.2-2' }}</td>
                    </tr>
                    <tr *ngFor="let e of filteredEntries">
                      <td>{{ e.date | date:'dd/MM/yyyy' }}</td>
                      <td><strong>{{ e.voucherNo }}</strong></td>
                      <td>
                        <span class="v-badge" [class.v-sales]="e.voucherType==='Sales'">{{ e.voucherType }}</span>
                      </td>
                      <td>{{ e.description }}</td>
                      <td class="text-right text-red">{{ e.debit > 0 ? (e.debit | number:'1.2-2') : '' }}</td>
                      <td class="text-right text-green">{{ e.credit > 0 ? (e.credit | number:'1.2-2') : '' }}</td>
                      <td class="text-right"
                        [class.balance-positive]="e.runningBalance >= 0"
                        [class.balance-negative]="e.runningBalance < 0">
                        {{ e.runningBalance | number:'1.2-2' }}
                      </td>
                    </tr>
                    <tr class="closing-row">
                      <td colspan="3"></td>
                      <td><strong>Closing Balance</strong></td>
                      <td class="text-right font-bold">{{ soa.totalDebit  | number:'1.2-2' }}</td>
                      <td class="text-right font-bold">{{ soa.totalCredit | number:'1.2-2' }}</td>
                      <td class="text-right font-bold"
                        [class.balance-positive]="soa.closingBalance >= 0"
                        [class.balance-negative]="soa.closingBalance < 0">
                        {{ soa.closingBalance | number:'1.2-2' }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p class="report-footnote">{{ filteredEntries.length }} entries</p>
            </div>
          </ng-container>

        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .soa-filter-grid {
      display: grid;
      grid-template-columns:
        minmax(180px, 1.05fr)
        minmax(260px, 1.55fr)
        minmax(180px, 1.25fr)
        minmax(180px, 1.25fr)
        minmax(130px, auto);
      gap: 16px;
      align-items: end;
    }

    .soa-filter-field {
      min-width: 0;
      margin: 0;
    }

    .soa-account-type-field {
      min-width: 180px;
    }

    .soa-filter-select-field {
      --ss-control-height: 46px;
      --ss-label-bg: #f8f9ff;
    }

    .soa-filter-actions {
      display: flex;
      align-items: end;
      min-width: 0;
    }

    .soa-filter-action-button {
      width: 100%;
      min-width: 130px;
      height: 46px;
      padding: 0 20px;
    }

    .soa-filter-action-button mat-icon {
      margin-right: 4px;
    }

    .report-stage {
      margin-top: 18px;
    }

    .report-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 16px;
      flex-wrap: wrap;
      padding: 16px 18px;
      margin-bottom: 16px;
      border: 1px solid #dce5ff;
      border-radius: 18px;
      background:
        linear-gradient(180deg, rgba(247, 249, 255, 0.96) 0%, rgba(255, 255, 255, 0.98) 100%);
    }

    .report-toolbar-copy {
      flex: 1 1 260px;
      min-width: 0;
    }

    .report-toolbar-kicker {
      font-size: 11px;
      line-height: 1;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #5163a8;
      margin-bottom: 8px;
    }

    .report-toolbar-copy h3 {
      margin: 0;
      font-size: 19px;
      font-weight: 700;
      color: #1e293b;
    }

    .report-toolbar-actions {
      display: flex;
      align-items: flex-end;
      justify-content: flex-end;
      gap: 12px;
      flex: 1 1 420px;
      min-width: 0;
      flex-wrap: wrap;
    }

    .report-search-field {
      width: min(100%, 290px);
      min-width: 220px;
      margin: 0;
    }

    .report-export-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .report-export-button {
      height: 46px;
      padding: 0 16px;
      border-radius: 12px;
    }

    .report-footnote {
      margin: 10px 0 0;
      font-size: 12px;
      color: #64748b;
    }

    :host ::ng-deep .filter-panel .mat-mdc-form-field-subscript-wrapper,
    :host ::ng-deep .filter-panel .mat-mdc-form-field-bottom-align::before,
    :host ::ng-deep .report-toolbar .mat-mdc-form-field-subscript-wrapper,
    :host ::ng-deep .report-toolbar .mat-mdc-form-field-bottom-align::before {
      display: none;
    }

    :host ::ng-deep .filter-panel .mat-mdc-form-field-infix,
    :host ::ng-deep .report-toolbar .mat-mdc-form-field-infix {
      min-height: 46px;
    }

    .v-badge {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 10px;
      background: #f3e5f5;
      color: #4a148c;
      font-weight: 500;
    }

    .v-badge.v-sales {
      background: #e3f2fd;
      color: #0d47a1;
    }

    @media (max-width: 1200px) {
      .soa-filter-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .soa-filter-actions {
        grid-column: 1 / -1;
        justify-content: flex-end;
      }

      .soa-filter-action-button {
        width: auto;
      }

      .report-toolbar-actions {
        justify-content: flex-start;
      }
    }

    @media (max-width: 768px) {
      .soa-filter-grid {
        grid-template-columns: 1fr;
      }

      .soa-filter-field,
      .soa-filter-actions {
        grid-column: 1 / -1;
      }

      .soa-filter-action-button {
        width: 100%;
      }

      .report-search-field {
        width: 100%;
        min-width: 0;
      }

      .report-export-actions,
      .report-export-button {
        width: 100%;
      }
    }
  `]
})
export class SoaComponent implements OnInit {
  private fb = inject(FormBuilder);
  private masterData = inject(MasterDataService);
  private api = inject(ApiService);
  private exportService = inject(ReportExportService);

  filterForm!: FormGroup;
  accountOptions: SelectOption[] = [];
  accountTypeOptions: SelectOption[] = ACCOUNT_TYPE_OPTIONS;
  private customers: SelectOption[] = [];
  private vendors: SelectOption[] = [];

  soa: SoaResponse | null = null;
  generating = false;
  error = '';
  searchTerm = '';

  get filteredEntries(): SoaEntry[] {
    if (!this.soa) return [];
    const q = this.searchTerm.toLowerCase();
    if (!q) return this.soa.entries;
    return this.soa.entries.filter(e =>
      e.voucherNo.toLowerCase().includes(q) ||
      (e.description ?? '').toLowerCase().includes(q) ||
      e.voucherType.toLowerCase().includes(q)
    );
  }

  ngOnInit() {
    this.filterForm = this.fb.group({
      accountType: ['Customer', Validators.required],
      accountId: [null, Validators.required],
      startDate: [''],
      endDate: ['']
    });

    this.filterForm.get('accountType')?.valueChanges.subscribe(type => {
      this.accountOptions = type === 'Customer' ? this.customers : this.vendors;
      this.filterForm.patchValue({ accountId: null });
    });

    forkJoin([
      this.masterData.loadCustomers(),
      this.masterData.loadVendors()
    ]).subscribe(([customers, vendors]) => {
      this.customers = customers.map(customer => ({ id: customer.id, name: customer.name }));
      this.vendors = vendors.map(vendor => ({ id: vendor.id, name: vendor.name }));
      this.accountOptions = this.customers;
    });
  }

  generate() {
    const normalizedStartDate = parseDateInput(this.filterForm.get('startDate')?.value);
    const normalizedEndDate = parseDateInput(this.filterForm.get('endDate')?.value);
    this.filterForm.patchValue({
      startDate: normalizedStartDate,
      endDate: normalizedEndDate
    }, { emitEvent: false });

    const value = this.filterForm.value;
    if (!value.accountId) return;

    this.generating = true;
    this.error = '';
    this.soa = null;

    this.api.get<SoaResponse>('/reports/soa', {
      accountType: value.accountType,
      accountId: value.accountId,
      startDate: formatDateForApi(value.startDate),
      endDate: formatDateForApi(value.endDate)
    }).subscribe({
      next: data => {
        this.soa = data;
        this.generating = false;
      },
      error: (err: Error) => {
        this.error = err.message;
        this.generating = false;
      }
    });
  }

  exportPdf() {
    if (!this.soa) return;

    this.exportService.exportSoaPdf({
      soa: this.soa,
      entries: this.filteredEntries,
      filters: {
        startDate: formatDateForDisplay(this.filterForm.get('startDate')?.value),
        endDate: formatDateForDisplay(this.filterForm.get('endDate')?.value)
      }
    });
  }

  exportCsv() {
    if (!this.soa) return;
    const header = 'Date,Voucher No,Type,Description,Debit,Credit,Balance\n';
    const rows = this.filteredEntries.map(entry =>
      `${new Date(entry.date).toLocaleDateString('en-GB')},${entry.voucherNo},${entry.voucherType},"${entry.description ?? ''}",${entry.debit},${entry.credit},${entry.runningBalance}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `SOA_${this.soa.accountName}_${new Date().toISOString().split('T')[0]}.csv`;
    anchor.click();
  }
}
