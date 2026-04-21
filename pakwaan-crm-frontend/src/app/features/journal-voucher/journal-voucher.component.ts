import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { SearchableSelectComponent, SelectOption } from '../../shared/components/searchable-select/searchable-select.component';
import { MasterDataService } from '../../core/services/master-data.service';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { CreateJournalVoucherRequest } from '../../core/models/models';
import { EntryType, ENTRY_TYPE_LABELS } from '../../core/models/enums';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-general-voucher',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatTooltipModule,
    RouterModule,
    SearchableSelectComponent
  ],
  template: `
    <div class="page-container">

      <!-- Page header -->
      <div class="page-header">
        <div class="ph-icon"><mat-icon>menu_book</mat-icon></div>
        <div class="ph-text">
          <h2>General Journal</h2>
          <p>Use this for manual adjustments, receipts, payments, and exceptional entries</p>
        </div>
      </div>

      <div class="filter-panel" style="margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <div style="color:#475569;font-size:13px">
          For supplier bills, packaging purchases, and raw material purchases, use Vendor Purchase instead.
        </div>
        <a mat-stroked-button color="primary" routerLink="/vendor-purchases">
          <mat-icon>inventory_2</mat-icon> Open Vendor Purchase
        </a>
      </div>

      <mat-card>
        <mat-card-content style="padding:24px">

          <div *ngIf="loading" class="text-center" style="padding:32px;color:#94a3b8">
            <mat-icon style="font-size:36px;width:36px;height:36px;opacity:.4">hourglass_empty</mat-icon>
            <p>Loading data…</p>
          </div>

          <form *ngIf="!loading" [formGroup]="form" (ngSubmit)="onSubmit()">

            <!-- Header fields -->
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Date</mat-label>
                <input matInput type="date" formControlName="date" />
              </mat-form-field>
              <mat-form-field appearance="outline" style="flex:2">
                <mat-label>Description</mat-label>
                <input matInput formControlName="description" placeholder="Voucher description…" />
              </mat-form-field>
              <mat-form-field appearance="outline" style="flex:2">
                <mat-label>Notes</mat-label>
                <input matInput formControlName="notes" placeholder="Optional notes…" />
              </mat-form-field>
            </div>

            <!-- Lines grid -->
            <div class="line-grid">
              <table>
                <thead>
                  <tr>
                    <th style="width:155px">Entry Type</th>
                    <th style="width:195px">Account / Name</th>
                    <th style="width:210px">Line Description</th>
                    <th style="width:110px">Debit (PKR)</th>
                    <th style="width:110px">Credit (PKR)</th>
                    <th style="width:44px"></th>
                  </tr>
                </thead>
                <tbody formArrayName="lines">
                  <tr *ngFor="let line of linesArray.controls; let i = index" [formGroupName]="i">
                    <td>
                      <select class="inline-select" formControlName="entryType" (change)="onEntryTypeChange(i)">
                        <option *ngFor="let et of entryTypeOptions" [value]="et.value">{{ et.label }}</option>
                      </select>
                    </td>
                    <td>
                      <ng-container [ngSwitch]="getEntryTypeVal(i)">
                        <app-searchable-select *ngSwitchCase="0"
                          [options]="customerOptions" placeholder="Customer" formControlName="customerId">
                        </app-searchable-select>
                        <app-searchable-select *ngSwitchCase="1"
                          [options]="customerOptions" placeholder="Customer" formControlName="customerId">
                        </app-searchable-select>
                        <app-searchable-select *ngSwitchCase="2"
                          [options]="vendorOptions" placeholder="Vendor" formControlName="vendorId">
                        </app-searchable-select>
                        <app-searchable-select *ngSwitchCase="3"
                          [options]="vendorOptions" placeholder="Vendor" formControlName="vendorId">
                        </app-searchable-select>
                        <input *ngSwitchDefault class="inline-input w-full"
                          formControlName="freeText" placeholder="Account / name…" />
                      </ng-container>
                    </td>
                    <td>
                      <input class="inline-input w-full" formControlName="description" placeholder="Description…" />
                    </td>
                    <td>
                      <input type="number" class="inline-input w-fixed" formControlName="debit"
                        placeholder="0.00" min="0" step="0.01"
                        (input)="onAmountChange(i, 'debit')" />
                    </td>
                    <td>
                      <input type="number" class="inline-input w-fixed" formControlName="credit"
                        placeholder="0.00" min="0" step="0.01"
                        (input)="onAmountChange(i, 'credit')" />
                    </td>
                    <td>
                      <button mat-icon-button type="button" color="warn"
                        [disabled]="linesArray.length === 1"
                        (click)="removeLine(i)" matTooltip="Remove">
                        <mat-icon>delete_outline</mat-icon>
                      </button>
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr class="total-row">
                    <td colspan="3" class="text-right font-bold" style="padding-right:16px">Totals</td>
                    <td class="font-bold">{{ totalDebit  | number:'1.2-2' }}</td>
                    <td class="font-bold">{{ totalCredit | number:'1.2-2' }}</td>
                    <td></td>
                  </tr>
                  <tr>
                    <td colspan="3" class="text-right text-muted" style="font-size:12px;padding-right:16px">
                      Balance (must be 0 to save)
                    </td>
                    <td colspan="2">
                      <span [ngClass]="balanceClass">{{ balance | number:'1.2-2' }}</span>
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <!-- Actions -->
            <div class="grid-actions">
              <button mat-stroked-button type="button" color="primary" (click)="addLine()">
                <mat-icon>add</mat-icon> Add Line
              </button>
              <span class="spacer"></span>
              <div *ngIf="error" class="text-red" style="font-size:13px">{{ error }}</div>
              <button mat-flat-button color="primary" type="submit"
                [disabled]="submitting || form.invalid || balance !== 0"
                style="padding:0 24px;height:40px">
                <mat-icon *ngIf="!submitting" style="margin-right:6px">save</mat-icon>
                {{ submitting ? 'Saving…' : 'Save Voucher' }}
              </button>
            </div>

          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    /* No local styles needed — all in global styles.scss */
  `]
})
export class GeneralVoucherComponent implements OnInit {
  private fb = inject(FormBuilder);
  private masterData = inject(MasterDataService);
  private api = inject(ApiService);
  private toast = inject(ToastService);

  form!: FormGroup;
  customerOptions: SelectOption[] = [];
  vendorOptions: SelectOption[] = [];
  loading = true;
  submitting = false;
  error = '';

  entryTypeOptions = Object.entries(ENTRY_TYPE_LABELS)
    .map(([value, label]) => ({ value: +value, label }));

  ngOnInit() {
    this.form = this.fb.group({
      date: [new Date().toISOString().split('T')[0], Validators.required],
      description: [''],
      notes: [''],
      lines: this.fb.array([this.newLine(EntryType.Expense), this.newLine(EntryType.CashCredit)])
    });

    forkJoin([
      this.masterData.loadCustomers(),
      this.masterData.loadVendors()
    ]).subscribe(([customers, vendors]) => {
      this.customerOptions = customers.map(c => ({ id: c.id, name: c.name }));
      this.vendorOptions   = vendors.map(v => ({ id: v.id, name: v.name }));
      this.loading = false;
    });
  }

  get linesArray() { return this.form.get('lines') as FormArray; }

  get totalDebit()  { return this.linesArray.controls.reduce((s, c) => s + (+c.get('debit')?.value  || 0), 0); }
  get totalCredit() { return this.linesArray.controls.reduce((s, c) => s + (+c.get('credit')?.value || 0), 0); }
  get balance()     { return Math.round((this.totalDebit - this.totalCredit) * 100) / 100; }

  get balanceClass() {
    if (this.balance === 0 && (this.totalDebit > 0 || this.totalCredit > 0)) return 'chip-balanced';
    if (this.balance === 0) return 'chip-zero';
    return 'chip-unbalanced';
  }

  getEntryTypeVal(i: number): number { return +this.linesArray.at(i).get('entryType')?.value; }

  onEntryTypeChange(i: number) {
    this.linesArray.at(i).patchValue({ customerId: null, vendorId: null, freeText: '' });
  }

  onAmountChange(i: number, field: 'debit' | 'credit') {
    const val = +this.linesArray.at(i).get(field)?.value || 0;
    if (val > 0) this.linesArray.at(i).patchValue({ [field === 'debit' ? 'credit' : 'debit']: 0 });
  }

  newLine(entryType: EntryType = EntryType.Expense): FormGroup {
    return this.fb.group({
      entryType:   [entryType, Validators.required],
      customerId:  [null],
      vendorId:    [null],
      freeText:    [''],
      description: [''],
      debit:  [0, [Validators.min(0)]],
      credit: [0, [Validators.min(0)]]
    });
  }

  addLine()             { this.linesArray.push(this.newLine()); }
  removeLine(i: number) { if (this.linesArray.length > 1) this.linesArray.removeAt(i); }

  onSubmit() {
    if (this.form.invalid || this.balance !== 0) return;
    this.submitting = true;
    this.error = '';

    const val = this.form.value;
    const request: CreateJournalVoucherRequest = {
      date:        val.date,
      description: val.description,
      notes:       val.notes,
      lines: val.lines.map((l: any) => ({
        entryType:   +l.entryType,
        customerId:  l.customerId ? +l.customerId : null,
        vendorId:    l.vendorId   ? +l.vendorId   : null,
        freeText:    l.freeText   || null,
        description: l.description || null,
        debit:  +l.debit  || 0,
        credit: +l.credit || 0
      }))
    };

    this.api.post<any>('/vouchers/general', request).subscribe({
      next: res => {
        this.toast.success(`Saved! Voucher: ${res.voucherNo}`);
        this.form.reset({ date: new Date().toISOString().split('T')[0] });
        this.linesArray.clear();
        this.linesArray.push(this.newLine(EntryType.Expense));
        this.linesArray.push(this.newLine(EntryType.CashCredit));
        this.submitting = false;
      },
      error: (err: Error) => { this.error = err.message; this.submitting = false; }
    });
  }
}
