import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, QueryList, ViewChildren, inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';
import { formatDateForApi, todayDate } from '../../core/date/date-utils';
import { CreateCustomerDateSalesVoucherRequest, Item, SalesVoucherCreateResult } from '../../core/models/models';
import { QuantityType } from '../../core/models/enums';
import { ApiService } from '../../core/services/api.service';
import { MasterDataService } from '../../core/services/master-data.service';
import { ToastService } from '../../core/services/toast.service';
import { SearchableSelectComponent, SelectOption } from '../../shared/components/searchable-select/searchable-select.component';
import { QUANTITY_TYPE_OPTIONS } from '../../shared/constants/select-options';
import { PrintWindowService } from '../../shared/services/print-window.service';
import { AddLineShortcutDirective } from '../../shared/directives/add-line-shortcut.directive';

type SalesSubmitMode = 'save' | 'saveAndPrint';

@Component({
  selector: 'app-customer-date-sales-voucher',
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
    SearchableSelectComponent,
    AddLineShortcutDirective
  ],
  template: `
    <div class="page-container" appAddLineShortcut (appAddLineShortcut)="addLineAndFocus()">
      <div class="page-header">
        <div class="ph-icon"><mat-icon>event_note</mat-icon></div>
        <div class="ph-text">
          <h2>Customer Date-wise Sales</h2>
          <p>Create separate sales vouchers for one customer across different order dates in one submit</p>
        </div>
      </div>

      <mat-card>
        <mat-card-content class="page-card-content">
          <div *ngIf="loading" class="text-center page-state">
            <mat-icon class="state-icon">hourglass_empty</mat-icon>
            <p>Loading data...</p>
          </div>

          <div *ngIf="!loading && loadError" class="text-red page-error">{{ loadError }}</div>

          <form *ngIf="!loading && !loadError" [formGroup]="form">
            <div class="top-grid">
              <app-searchable-select
                [options]="customerOptions"
                label="Customer"
                placeholder="Select customer"
                formControlName="customerId">
              </app-searchable-select>

              <mat-form-field appearance="outline" class="notes-field">
                <mat-label>Notes</mat-label>
                <input matInput formControlName="notes" placeholder="Optional notes for every generated voucher..." />
              </mat-form-field>
            </div>

            <div class="helper-copy">
              Select one customer once, then add dated rows below. Rows with the same date will be merged into one
              sales voucher, and different dates will create separate vouchers for that same customer.
            </div>

            <div class="line-grid">
              <table>
                <thead>
                  <tr>
                    <th style="width:170px">Date</th>
                    <th style="width:220px">Item</th>
                    <th style="width:130px">Unit</th>
                    <th style="width:90px">Qty</th>
                    <th style="width:100px">Rate (PKR)</th>
                    <th style="width:110px">Amount (PKR)</th>
                    <th style="width:180px">Line Description</th>
                    <th style="width:44px"></th>
                  </tr>
                </thead>
                <tbody formArrayName="lines">
                  <tr *ngFor="let line of linesArray.controls; let i = index" [formGroupName]="i">
                    <td>
                      <mat-form-field appearance="outline" class="table-date-field">
                        <input
                          #rowDateInput
                          matInput
                          [matDatepicker]="rowDatePicker"
                          formControlName="date"
                          placeholder="dd/mm/yyyy" />
                        <mat-datepicker-toggle matIconSuffix [for]="rowDatePicker"></mat-datepicker-toggle>
                        <mat-datepicker #rowDatePicker></mat-datepicker>
                      </mat-form-field>
                    </td>
                    <td>
                      <app-searchable-select
                        [options]="itemOptions"
                        placeholder="Select item"
                        formControlName="itemId">
                      </app-searchable-select>
                    </td>
                    <td>
                      <app-searchable-select
                        [options]="quantityTypeOptions"
                        placeholder="Unit"
                        formControlName="quantityType">
                      </app-searchable-select>
                    </td>
                    <td>
                      <input
                        type="number"
                        class="inline-input w-fixed"
                        formControlName="quantity"
                        placeholder="0"
                        min="0"
                        (input)="calcAmount(i)" />
                    </td>
                    <td>
                      <input
                        type="number"
                        class="inline-input w-fixed"
                        formControlName="rate"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        (input)="calcAmount(i)" />
                    </td>
                    <td>
                      <span class="amount-display">{{ getAmount(i) | number:'1.2-2' }}</span>
                    </td>
                    <td>
                      <input class="inline-input w-full" formControlName="description" placeholder="Optional line note..." />
                    </td>
                    <td>
                      <button
                        mat-icon-button
                        type="button"
                        color="warn"
                        [disabled]="linesArray.length === 1"
                        (click)="removeLine(i)"
                        matTooltip="Remove row">
                        <mat-icon>delete_outline</mat-icon>
                      </button>
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr class="total-row">
                    <td colspan="5" class="text-right font-bold total-label">Total Amount</td>
                    <td class="font-bold text-green total-value">{{ totalAmount | number:'1.2-2' }}</td>
                    <td colspan="2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div class="grid-actions">
              <button mat-stroked-button type="button" color="primary" (click)="addLineAndFocus()">
                <mat-icon>add</mat-icon> Add New Row (Alt + N)
              </button>
              <span class="spacer"></span>
              <div *ngIf="error" class="text-red action-error">{{ error }}</div>
              <button
                mat-flat-button
                color="primary"
                type="button"
                (click)="onSubmit('save')"
                [disabled]="submitting || form.invalid"
                class="submit-btn">
                <mat-icon *ngIf="!submitting || submitMode !== 'save'">save</mat-icon>
                {{ submitting && submitMode === 'save' ? 'Saving...' : 'Save Voucher' }}
              </button>
              <button
                mat-stroked-button
                color="primary"
                type="button"
                (click)="onSubmit('saveAndPrint')"
                [disabled]="submitting || form.invalid"
                class="submit-btn">
                <mat-icon *ngIf="!submitting || submitMode !== 'saveAndPrint'">print</mat-icon>
                {{ submitting && submitMode === 'saveAndPrint' ? 'Saving & Printing...' : 'Save & Print' }}
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .page-card-content {
      padding: 24px;
    }

    .page-state {
      padding: 32px;
      color: #94a3b8;
    }

    .state-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      opacity: .4;
    }

    .page-error {
      padding: 12px 0;
    }

    .top-grid {
      display: grid;
      grid-template-columns: minmax(280px, 380px) minmax(280px, 1fr);
      gap: 16px;
      align-items: start;
    }

    .notes-field {
      width: 100%;
    }

    .helper-copy {
      font-size: 12px;
      color: #64748b;
      margin: 6px 0 14px;
    }

    .table-date-field {
      width: 100%;
      min-width: 150px;
    }

    :host ::ng-deep .table-date-field .mat-mdc-form-field-subscript-wrapper,
    :host ::ng-deep .table-date-field .mat-mdc-form-field-bottom-align::before {
      display: none;
    }

    :host ::ng-deep .table-date-field .mat-mdc-form-field-infix {
      min-height: 46px;
      padding-top: 10px;
      padding-bottom: 10px;
    }

    .total-label {
      padding-right: 16px;
    }

    .total-value {
      font-size: 15px;
    }

    .action-error {
      font-size: 13px;
    }

    .submit-btn {
      padding: 0 24px;
      height: 40px;
    }

    @media (max-width: 960px) {
      .top-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class CustomerDateSalesVoucherComponent implements OnInit {
  private fb = inject(FormBuilder);
  private masterData = inject(MasterDataService);
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private printWindows = inject(PrintWindowService);

  @ViewChildren(SearchableSelectComponent) private searchableSelects!: QueryList<SearchableSelectComponent>;
  @ViewChildren('rowDateInput') private rowDateInputs!: QueryList<ElementRef<HTMLInputElement>>;

  form!: FormGroup;
  customerOptions: SelectOption[] = [];
  itemOptions: SelectOption[] = [];
  quantityTypeOptions: SelectOption[] = QUANTITY_TYPE_OPTIONS;
  private items: Item[] = [];
  loading = true;
  submitting = false;
  error = '';
  loadError = '';
  submitMode: SalesSubmitMode = 'save';

  ngOnInit(): void {
    this.form = this.fb.group({
      customerId: [null, Validators.required],
      notes: [''],
      lines: this.fb.array([this.createLineGroup()])
    });

    forkJoin({
      customers: this.masterData.loadCustomers(),
      items: this.masterData.loadItems()
    }).subscribe({
      next: ({ customers, items }) => {
        this.customerOptions = customers.map(customer => ({ id: customer.id, name: customer.name }));
        this.items = items;
        this.itemOptions = items.map(item => ({ id: item.id, name: `${item.name} (${item.unitLabel})` }));
        this.loading = false;
      },
      error: (err: Error) => {
        this.loadError = err.message;
        this.loading = false;
      }
    });
  }

  get linesArray(): FormArray {
    return this.form.get('lines') as FormArray;
  }

  get totalAmount(): number {
    return this.linesArray.controls.reduce((sum, control) => {
      return sum + (+control.get('quantity')?.value || 0) * (+control.get('rate')?.value || 0);
    }, 0);
  }

  getAmount(index: number): number {
    const control = this.linesArray.at(index);
    return (+control.get('quantity')?.value || 0) * (+control.get('rate')?.value || 0);
  }

  calcAmount(_index: number): void {
    // Change detection handles the rendered amount.
  }

  private createLineGroup(): FormGroup {
    const line = this.fb.group({
      date: [todayDate(), Validators.required],
      itemId: [null, Validators.required],
      quantityType: [QuantityType.PerPerson, Validators.required],
      quantity: [null, [Validators.required, Validators.min(0.001)]],
      rate: [null, [Validators.required, Validators.min(0)]],
      description: ['']
    });

    line.get('itemId')?.valueChanges.subscribe(() => this.onItemSelect(line));

    return line;
  }

  private onItemSelect(line: FormGroup): void {
    const itemId = +line.get('itemId')?.value;
    const item = this.items.find(entry => entry.id === itemId);
    if (item) {
      line.patchValue({ rate: item.defaultRate, quantityType: item.unit }, { emitEvent: false });
    }
  }

  addLine(): void {
    this.linesArray.push(this.createLineGroup());
  }

  addLineAndFocus(): void {
    this.closeOpenDropdowns();
    this.addLine();
    setTimeout(() => this.rowDateInputs.last?.nativeElement.focus());
  }

  removeLine(index: number): void {
    if (this.linesArray.length > 1) this.linesArray.removeAt(index);
  }

  private closeOpenDropdowns(): void {
    this.searchableSelects.forEach(select => select.closeDropdown());
  }

  onSubmit(mode: SalesSubmitMode = 'save'): void {
    if (this.form.invalid || this.submitting) return;

    this.submitting = true;
    this.submitMode = mode;
    this.error = '';

    const value = this.form.value;
    const request: CreateCustomerDateSalesVoucherRequest = {
      customerId: +value.customerId,
      notes: value.notes,
      lines: value.lines.map((line: {
        date: Date | string;
        itemId: number | string;
        quantityType: number | string;
        quantity: number | string;
        rate: number | string;
        description?: string;
      }) => ({
        date: formatDateForApi(line.date),
        itemId: +line.itemId,
        quantityType: +line.quantityType,
        quantity: +line.quantity,
        rate: +line.rate,
        description: line.description
      }))
    };

    const expectedPrintCount = mode === 'saveAndPrint' ? this.getDistinctDateCount() : 0;
    const printTabs = this.printWindows.preOpen(expectedPrintCount);
    if (printTabs.length < expectedPrintCount) {
      this.toast.info('Allow pop-ups to open every print preview tab.');
    }

    this.api.post<SalesVoucherCreateResult>('/vouchers/sales/customer-dates', request).subscribe({
      next: created => {
        this.toast.success(
          created.createdCount === 1
            ? `Saved! Voucher: ${created.voucherNos[0]}`
            : `Saved ${created.createdCount} vouchers: ${created.voucherNos.join(', ')}`
        );

        if (mode === 'saveAndPrint') {
          this.printWindows.route(printTabs, created.voucherNos);
        }

        this.form.reset({ customerId: null, notes: '' });
        this.linesArray.clear();
        this.linesArray.push(this.createLineGroup());
        this.submitting = false;
        this.submitMode = 'save';
      },
      error: (err: Error) => {
        this.printWindows.close(printTabs);
        this.error = err.message;
        this.submitting = false;
        this.submitMode = 'save';
      }
    });
  }

  private getDistinctDateCount(): number {
    const dates = this.linesArray.controls
      .map(control => formatDateForApi(control.get('date')?.value))
      .filter(value => !!value);

    return new Set(dates).size;
  }

}
