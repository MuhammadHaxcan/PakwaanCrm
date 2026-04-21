import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SearchableSelectComponent, SelectOption } from '../../shared/components/searchable-select/searchable-select.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { MasterDataService } from '../../core/services/master-data.service';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { SoaEntry, SoaResponse } from '../../core/models/models';
import { forkJoin } from 'rxjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-soa',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatRadioModule,
    MatTableModule, MatDividerModule, MatTooltipModule,
    SearchableSelectComponent, LoadingSpinnerComponent
  ],
  template: `
    <div class="page-container">

      <!-- Page header -->
      <div class="page-header">
        <div class="ph-icon"><mat-icon>account_balance_wallet</mat-icon></div>
        <div class="ph-text">
          <h2>Statement of Account</h2>
          <p>View transaction history and running balance for any customer or vendor</p>
        </div>
      </div>

      <mat-card>
        <mat-card-content style="padding:24px">

          <!-- Filter panel -->
          <div class="filter-panel">
            <form [formGroup]="filterForm" (ngSubmit)="generate()">
              <div class="form-row" style="align-items:flex-end">

                <div style="display:flex;flex-direction:column;gap:6px;min-width:170px">
                  <label style="font-size:12px;font-weight:600;color:#475569;letter-spacing:.3px">ACCOUNT TYPE</label>
                  <mat-radio-group formControlName="accountType" style="display:flex;gap:16px">
                    <mat-radio-button value="Customer">Customer</mat-radio-button>
                    <mat-radio-button value="Vendor">Vendor</mat-radio-button>
                  </mat-radio-group>
                </div>

                <div class="field-stack field-floating" style="min-width:220px">
                  <label class="field-label">Account</label>
                  <app-searchable-select
                    [options]="accountOptions"
                    placeholder="Select account…"
                    formControlName="accountId">
                  </app-searchable-select>
                </div>

                <mat-form-field appearance="outline" style="min-width:155px">
                  <mat-label>From Date</mat-label>
                  <input matInput type="date" formControlName="startDate" />
                </mat-form-field>

                <mat-form-field appearance="outline" style="min-width:155px">
                  <mat-label>To Date</mat-label>
                  <input matInput type="date" formControlName="endDate" />
                </mat-form-field>

                <button mat-flat-button color="primary" type="submit"
                  [disabled]="generating || !filterForm.get('accountId')?.value"
                  style="height:40px;padding:0 20px;align-self:flex-end;margin-bottom:1px">
                  <mat-icon style="margin-right:4px">search</mat-icon> Generate
                </button>

              </div>
            </form>
          </div>

          <div *ngIf="generating" style="padding:24px 0"><app-loading-spinner></app-loading-spinner></div>
          <div *ngIf="error" class="text-red" style="margin:8px 0">{{ error }}</div>

          <ng-container *ngIf="soa && !generating">

            <!-- Result header -->
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:4px">
              <div>
                <h3 style="margin:0;font-size:17px;font-weight:700;color:#1e293b">{{ soa.accountName }}</h3>
                <span class="text-muted" style="font-size:13px">{{ soa.accountType }} Account</span>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
                <mat-form-field appearance="outline" style="width:210px">
                  <mat-label>Search entries</mat-label>
                  <input matInput [(ngModel)]="searchTerm" [ngModelOptions]="{standalone:true}" placeholder="Voucher, description…" />
                  <mat-icon matSuffix>search</mat-icon>
                </mat-form-field>
                <button mat-stroked-button (click)="exportPdf()" matTooltip="Export PDF">
                  <mat-icon>picture_as_pdf</mat-icon> PDF
                </button>
                <button mat-stroked-button (click)="exportCsv()" matTooltip="Export CSV">
                  <mat-icon>download</mat-icon> CSV
                </button>
              </div>
            </div>

            <!-- Table -->
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
                    <td></td><td></td>
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

            <p class="text-muted" style="font-size:12px;margin-top:8px">{{ filteredEntries.length }} entries</p>
          </ng-container>

        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .v-badge {
      font-size: 11px; padding: 2px 8px; border-radius: 10px;
      background: #f3e5f5; color: #4a148c; font-weight: 500;
    }
    .v-badge.v-sales { background: #e3f2fd; color: #0d47a1; }
  `]
})
export class SoaComponent implements OnInit {
  private fb = inject(FormBuilder);
  private masterData = inject(MasterDataService);
  private api = inject(ApiService);
  private toast = inject(ToastService);

  filterForm!: FormGroup;
  accountOptions: SelectOption[] = [];
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

    this.filterForm.get('accountType')?.valueChanges.subscribe(t => {
      this.accountOptions = t === 'Customer' ? this.customers : this.vendors;
      this.filterForm.patchValue({ accountId: null });
    });

    forkJoin([
      this.masterData.loadCustomers(),
      this.masterData.loadVendors()
    ]).subscribe(([c, v]) => {
      this.customers = c.map(x => ({ id: x.id, name: x.name }));
      this.vendors   = v.map(x => ({ id: x.id, name: x.name }));
      this.accountOptions = this.customers;
    });
  }

  generate() {
    const v = this.filterForm.value;
    if (!v.accountId) return;
    this.generating = true; this.error = ''; this.soa = null;

    this.api.get<SoaResponse>('/reports/soa', {
      accountType: v.accountType,
      accountId:   v.accountId,
      startDate:   v.startDate || null,
      endDate:     v.endDate   || null
    }).subscribe({
      next:  data  => { this.soa = data; this.generating = false; },
      error: (err: Error) => { this.error = err.message; this.generating = false; }
    });
  }

  exportPdf() {
    if (!this.soa) return;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Statement of Account — ${this.soa.accountName}`, 14, 18);
    doc.setFontSize(10);
    doc.text(`Account Type: ${this.soa.accountType}  |  Opening Balance: ${this.soa.openingBalance.toFixed(2)}`, 14, 26);

    const rows: any[][] = [
      ['Opening Balance', '', '', '', '', this.soa.openingBalance.toFixed(2)],
      ...this.filteredEntries.map(e => [
        new Date(e.date).toLocaleDateString('en-GB'),
        e.voucherNo, e.voucherType,
        e.description ?? '',
        e.debit  > 0 ? e.debit.toFixed(2)  : '',
        e.credit > 0 ? e.credit.toFixed(2) : '',
        e.runningBalance.toFixed(2)
      ]),
      ['', '', '', 'Closing Balance',
        this.soa.totalDebit.toFixed(2),
        this.soa.totalCredit.toFixed(2),
        this.soa.closingBalance.toFixed(2)]
    ];

    autoTable(doc, {
      startY: 32,
      head: [['Date', 'Voucher No', 'Type', 'Description', 'Debit', 'Credit', 'Balance']],
      body: rows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [57, 73, 171] },
      didParseCell: (data) => {
        if (data.row.index === 0 || data.row.index === rows.length - 1)
          data.cell.styles.fontStyle = 'bold';
      }
    });

    doc.save(`SOA_${this.soa.accountName}_${new Date().toISOString().split('T')[0]}.pdf`);
  }

  exportCsv() {
    if (!this.soa) return;
    const header = 'Date,Voucher No,Type,Description,Debit,Credit,Balance\n';
    const rows = this.filteredEntries.map(e =>
      `${new Date(e.date).toLocaleDateString('en-GB')},${e.voucherNo},${e.voucherType},"${e.description ?? ''}",${e.debit},${e.credit},${e.runningBalance}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `SOA_${this.soa.accountName}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }
}
