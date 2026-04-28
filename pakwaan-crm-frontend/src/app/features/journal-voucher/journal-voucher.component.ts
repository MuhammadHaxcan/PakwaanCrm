import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { MasterDataService } from '../../core/services/master-data.service';
import { ToastService } from '../../core/services/toast.service';
import { CreateJournalVoucherRequest, VoucherDetail } from '../../core/models/models';
import { EntryType, VoucherType } from '../../core/models/enums';
import { SearchableSelectComponent, SelectOption } from '../../shared/components/searchable-select/searchable-select.component';
import { formatDateForApi, parseApiDate, todayDate } from '../../core/date/date-utils';
import { JOURNAL_ENTRY_TYPE_OPTIONS, JOURNAL_ENTRY_TYPE_SELECT_OPTIONS } from '../../shared/constants/select-options';

@Component({
  selector: 'app-general-voucher',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
    SearchableSelectComponent
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="ph-icon"><mat-icon>menu_book</mat-icon></div>
        <div class="ph-text">
          <h2>{{ isEditMode ? 'Edit Journal Voucher' : 'Journal Voucher' }}</h2>
          <p>Use this mainly for vendor payments, customer receipts, cash movements, and exceptional adjustments</p>
          <p *ngIf="isEditMode && voucherNo" style="margin-top:6px;font-weight:600;color:#3949ab">Voucher: {{ voucherNo }}</p>
        </div>
      </div>

      
      <mat-card>
        <mat-card-content style="padding:24px">
          <div *ngIf="loading" class="text-center" style="padding:32px;color:#94a3b8">
            <mat-icon style="font-size:36px;width:36px;height:36px;opacity:.4">hourglass_empty</mat-icon>
            <p>Loading data...</p>
          </div>

          <div *ngIf="!loading && loadError" class="text-red" style="padding:12px 0">{{ loadError }}</div>

          <form *ngIf="!loading && !loadError" [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Date</mat-label>
                <input matInput [matDatepicker]="journalDatePicker" formControlName="date" placeholder="dd/mm/yyyy" />
                <mat-datepicker-toggle matIconSuffix [for]="journalDatePicker"></mat-datepicker-toggle>
                <mat-datepicker #journalDatePicker></mat-datepicker>
              </mat-form-field>
              <mat-form-field appearance="outline" style="flex:2">
                <mat-label>Notes</mat-label>
                <input matInput formControlName="notes" placeholder="Optional notes..." />
              </mat-form-field>
            </div>

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
                      <app-searchable-select
                        [options]="entryTypeSelectOptions"
                        placeholder="Entry Type"
                        formControlName="entryType">
                      </app-searchable-select>
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
                        <app-searchable-select *ngSwitchCase="6"
                          [options]="accountOptions" placeholder="Account" formControlName="accountId">
                        </app-searchable-select>
                        <app-searchable-select *ngSwitchCase="7"
                          [options]="accountOptions" placeholder="Account" formControlName="accountId">
                        </app-searchable-select>
                        <input *ngSwitchDefault class="inline-input w-full"
                          formControlName="freeText" placeholder="Account / name..." />
                      </ng-container>
                    </td>
                    <td>
                      <input class="inline-input w-full" formControlName="description" placeholder="Description..." />
                    </td>
                    <td>
                      <input type="number" class="inline-input w-fixed" formControlName="debit"
                        placeholder="0.00" min="0" step="0.01"
                        [disabled]="isDebitLocked(i)"
                        (input)="onAmountChange(i, 'debit')" />
                    </td>
                    <td>
                      <input type="number" class="inline-input w-fixed" formControlName="credit"
                        placeholder="0.00" min="0" step="0.01"
                        [disabled]="isCreditLocked(i)"
                        (input)="onAmountChange(i, 'credit')" />
                    </td>
                    <td>
                      <button mat-icon-button type="button" color="warn"
                        [disabled]="linesArray.length <= 2"
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
                {{ submitting ? 'Saving...' : (isEditMode ? 'Update Voucher' : 'Save Voucher') }}
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    /* Shared page styling lives in global styles.scss */
  `]
})
export class GeneralVoucherComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private masterData = inject(MasterDataService);
  private api = inject(ApiService);
  private toast = inject(ToastService);

  form!: FormGroup;
  customerOptions: SelectOption[] = [];
  vendorOptions: SelectOption[] = [];
  accountOptions: SelectOption[] = [];
  loading = true;
  submitting = false;
  error = '';
  loadError = '';
  isEditMode = false;
  private voucherId: number | null = null;
  voucherNo = '';

  entryTypeOptions = JOURNAL_ENTRY_TYPE_OPTIONS;
  entryTypeSelectOptions: SelectOption[] = JOURNAL_ENTRY_TYPE_SELECT_OPTIONS;

  ngOnInit() {
    this.form = this.fb.group({
      date: [todayDate(), Validators.required],
      notes: [''],
      lines: this.fb.array([
        this.createLineGroup(EntryType.CashDebit),
        this.createLineGroup(EntryType.CustomerCredit)
      ])
    });
    this.applyAmountLock(0);
    this.applyAmountLock(1);

    const idParam = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!idParam;
    this.voucherId = idParam ? +idParam : null;

    if (this.isEditMode && this.voucherId) {
      forkJoin({
        customers: this.masterData.loadCustomers(),
        vendors: this.masterData.loadVendors(),
        accounts: this.masterData.loadAccounts(),
        voucher: this.api.get<VoucherDetail>(`/vouchers/${this.voucherId}`)
      }).subscribe({
        next: ({ customers, vendors, accounts, voucher }) => {
          this.customerOptions = customers.map(c => ({ id: c.id, name: c.name }));
          this.vendorOptions = vendors.map(v => ({ id: v.id, name: v.name }));
          this.accountOptions = accounts.map(a => ({ id: a.id, name: a.name }));
          this.populateVoucher(voucher);
          this.loading = false;
        },
        error: (err: Error) => {
          this.loadError = err.message;
          this.loading = false;
        }
      });
      return;
    }

    forkJoin({
      customers: this.masterData.loadCustomers(),
      vendors: this.masterData.loadVendors(),
      accounts: this.masterData.loadAccounts()
    }).subscribe({
      next: ({ customers, vendors, accounts }) => {
        this.customerOptions = customers.map(c => ({ id: c.id, name: c.name }));
        this.vendorOptions = vendors.map(v => ({ id: v.id, name: v.name }));
        this.accountOptions = accounts.map(a => ({ id: a.id, name: a.name }));
        this.loading = false;
      },
      error: (err: Error) => {
        this.loadError = err.message;
        this.loading = false;
      }
    });
  }

  get linesArray() {
    return this.form.get('lines') as FormArray;
  }

  get totalDebit() {
    return this.linesArray.controls.reduce((sum, control) => sum + (+control.get('debit')?.value || 0), 0);
  }

  get totalCredit() {
    return this.linesArray.controls.reduce((sum, control) => sum + (+control.get('credit')?.value || 0), 0);
  }

  get balance() {
    return Math.round((this.totalDebit - this.totalCredit) * 100) / 100;
  }

  get balanceClass() {
    if (this.balance === 0 && (this.totalDebit > 0 || this.totalCredit > 0)) return 'chip-balanced';
    if (this.balance === 0) return 'chip-zero';
    return 'chip-unbalanced';
  }

  getEntryTypeVal(index: number) {
    return +this.linesArray.at(index).get('entryType')?.value;
  }

  onEntryTypeChange(index: number) {
    const entryType = this.getEntryTypeVal(index) as EntryType;
    const patch: Record<string, unknown> = {
      customerId: null,
      vendorId: null,
      accountId: null,
      freeText: ''
    };

    if (this.isDebitOnlyEntry(entryType)) {
      patch['credit'] = 0;
    } else if (this.isCreditOnlyEntry(entryType)) {
      patch['debit'] = 0;
    }

    this.linesArray.at(index).patchValue(patch);
    this.applyAmountLock(index);
  }

  private onEntryTypeChangeForLine(line: FormGroup) {
    const index = this.linesArray.controls.indexOf(line);
    if (index >= 0) {
      this.onEntryTypeChange(index);
    }
  }

  onAmountChange(index: number, field: 'debit' | 'credit') {
    if ((field === 'debit' && this.isDebitLocked(index)) || (field === 'credit' && this.isCreditLocked(index))) {
      this.linesArray.at(index).patchValue({ [field]: 0 }, { emitEvent: false });
      return;
    }

    const value = +this.linesArray.at(index).get(field)?.value || 0;
    if (value > 0) {
      this.linesArray.at(index).patchValue({
        [field === 'debit' ? 'credit' : 'debit']: 0
      });
    }
  }

  addLine() {
    this.linesArray.push(this.createLineGroup());
    this.applyAmountLock(this.linesArray.length - 1);
  }

  removeLine(index: number) {
    if (this.linesArray.length > 2) this.linesArray.removeAt(index);
  }

  onSubmit() {
    if (this.form.invalid || this.balance !== 0) return;

    this.submitting = true;
    this.error = '';

    const value = this.form.value;
    const request: CreateJournalVoucherRequest = {
      date: formatDateForApi(value.date),
      notes: value.notes || null,
      lines: value.lines.map((line: any) => ({
        entryType: +line.entryType,
        customerId: line.customerId ? +line.customerId : null,
        vendorId: line.vendorId ? +line.vendorId : null,
        accountId: line.accountId ? +line.accountId : null,
        freeText: line.freeText || null,
        description: line.description || null,
        debit: +line.debit || 0,
        credit: +line.credit || 0
      }))
    };

    const request$ = this.isEditMode && this.voucherId
      ? this.api.put<VoucherDetail>(`/vouchers/${this.voucherId}/general`, request)
      : this.api.post<VoucherDetail>('/vouchers/general', request);

    request$.subscribe({
      next: result => {
        this.voucherNo = result.voucherNo;
        if (this.isEditMode) {
          this.toast.success(`Updated voucher ${result.voucherNo}`);
          this.populateVoucher(result);
        } else {
          this.toast.success(`Saved! Voucher: ${result.voucherNo}`);
          this.form.reset({
            date: todayDate(),
            notes: ''
          });
          this.linesArray.clear();
          this.linesArray.push(this.createLineGroup(EntryType.CashDebit));
          this.linesArray.push(this.createLineGroup(EntryType.CustomerCredit));
        }
        this.submitting = false;
      },
      error: (err: Error) => {
        this.error = err.message;
        this.submitting = false;
      }
    });
  }

  private populateVoucher(voucher: VoucherDetail) {
    if (voucher.voucherType !== VoucherType.General) {
      this.loadError = 'This voucher is not a journal voucher.';
      return;
    }

    if (!voucher.lines || voucher.lines.length < 2) {
      this.loadError = 'Journal voucher lines could not be loaded.';
      return;
    }

    this.voucherNo = voucher.voucherNo;
    this.form.patchValue({
      date: parseApiDate(voucher.date),
      notes: voucher.notes ?? ''
    });

    this.linesArray.clear();
    voucher.lines.forEach(line => {
      const group = this.createLineGroup(line.entryType);
      group.patchValue({
        entryType: line.entryType,
        customerId: line.customerId ?? null,
        vendorId: line.vendorId ?? null,
        accountId: line.accountId ?? null,
        freeText: line.freeText ?? '',
        description: line.description ?? '',
        debit: line.debit,
        credit: line.credit
      });
      this.linesArray.push(group);
      this.applyAmountLock(this.linesArray.length - 1);
    });
  }

  private createLineGroup(entryType: EntryType = EntryType.Expense): FormGroup {
    const group = this.fb.group({
      entryType: [entryType, Validators.required],
      customerId: [null],
      vendorId: [null],
      accountId: [null],
      freeText: [''],
      description: [''],
      debit: [0, [Validators.min(0)]],
      credit: [0, [Validators.min(0)]]
    });
    group.get('entryType')?.valueChanges.subscribe(() => this.onEntryTypeChangeForLine(group));

    return group;
  }

  isDebitLocked(index: number): boolean {
    return this.isCreditOnlyEntry(this.getEntryTypeVal(index) as EntryType);
  }

  isCreditLocked(index: number): boolean {
    return this.isDebitOnlyEntry(this.getEntryTypeVal(index) as EntryType);
  }

  private isDebitOnlyEntry(entryType: EntryType): boolean {
    return entryType === EntryType.CustomerDebit
      || entryType === EntryType.VendorDebit
      || entryType === EntryType.Expense
      || entryType === EntryType.CashDebit;
  }

  private isCreditOnlyEntry(entryType: EntryType): boolean {
    return entryType === EntryType.CustomerCredit
      || entryType === EntryType.VendorCredit
      || entryType === EntryType.Revenue
      || entryType === EntryType.CashCredit;
  }

  private applyAmountLock(index: number): void {
    const line = this.linesArray.at(index);
    const entryType = this.getEntryTypeVal(index) as EntryType;
    const debitCtrl = line.get('debit');
    const creditCtrl = line.get('credit');
    if (!debitCtrl || !creditCtrl) return;

    if (this.isDebitOnlyEntry(entryType)) {
      creditCtrl.setValue(0, { emitEvent: false });
      creditCtrl.disable({ emitEvent: false });
      debitCtrl.enable({ emitEvent: false });
      return;
    }

    if (this.isCreditOnlyEntry(entryType)) {
      debitCtrl.setValue(0, { emitEvent: false });
      debitCtrl.disable({ emitEvent: false });
      creditCtrl.enable({ emitEvent: false });
      return;
    }

    debitCtrl.enable({ emitEvent: false });
    creditCtrl.enable({ emitEvent: false });
  }
}
