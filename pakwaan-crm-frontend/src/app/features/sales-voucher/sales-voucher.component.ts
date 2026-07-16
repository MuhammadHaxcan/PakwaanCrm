import { Component, OnInit, QueryList, ViewChildren, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormArray, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SearchableSelectComponent, SelectOption } from '../../shared/components/searchable-select/searchable-select.component';
import { MasterDataService } from '../../core/services/master-data.service';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { Item, CreateSalesVoucherRequest, SalesOrderDetail, SalesVoucherCreateResult, VoucherDetail } from '../../core/models/models';
import { EntryType, QuantityType, VoucherType } from '../../core/models/enums';
import { formatDateForApi, parseApiDate, todayDate } from '../../core/date/date-utils';
import { forkJoin } from 'rxjs';
import { QUANTITY_TYPE_OPTIONS } from '../../shared/constants/select-options';
import { PrintWindowService } from '../../shared/services/print-window.service';
import { AddLineShortcutDirective } from '../../shared/directives/add-line-shortcut.directive';

type SalesSubmitMode = 'save' | 'saveAndPrint';

@Component({
  selector: 'app-sales-voucher',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatDatepickerModule,
    MatTooltipModule, SearchableSelectComponent, AddLineShortcutDirective
  ],
  template: `
    <div class="page-container" appAddLineShortcut (appAddLineShortcut)="addLineAndFocus()">
      <div class="page-header">
        <div class="ph-icon"><mat-icon>receipt_long</mat-icon></div>
        <div class="ph-text">
          <h2>{{ isOrderEditMode ? 'Edit Sales Order' : isEditMode ? 'Edit Sales Voucher' : 'Sales Voucher' }}</h2>
          <p>Record credit sales with customer-wise rows and credit total sales revenue</p>
          <p *ngIf="isEditMode && voucherNo" style="margin-top:6px;font-weight:600;color:#3949ab">Voucher: {{ voucherNo }}</p>
          <p *ngIf="isOrderEditMode && salesOrderNo" style="margin-top:6px;font-weight:600;color:#3949ab">Sales Order: {{ salesOrderNo }}</p>
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
                <input matInput [matDatepicker]="salesDatePicker" formControlName="date" placeholder="dd/mm/yyyy" />
                <mat-datepicker-toggle matIconSuffix [for]="salesDatePicker"></mat-datepicker-toggle>
                <mat-datepicker #salesDatePicker></mat-datepicker>
              </mat-form-field>
              <mat-form-field appearance="outline" style="flex:2">
                <mat-label>Notes</mat-label>
                <input matInput formControlName="notes" placeholder="Optional notes..." />
              </mat-form-field>
            </div>

            <div style="font-size:12px;color:#64748b;margin:-6px 0 14px">
              Add the customer on each row. This voucher records credit sales by debiting each customer receivable
              row and crediting total sales revenue. Record customer receipts later in Journal.
            </div>

            <div class="line-grid">
              <table>
                <thead>
                  <tr>
                    <th style="width:220px">Customer</th>
                    <th style="width:210px">Item</th>
                    <th style="width:130px">Unit</th>
                    <th style="width:90px">Qty</th>
                    <th style="width:100px">Rate (PKR)</th>
                    <th style="width:110px">Delivery Charges</th>
                    <th style="width:110px">Total Amount</th>
                    <th style="width:170px">Line Description</th>
                    <th style="width:44px"></th>
                  </tr>
                </thead>
                <tbody formArrayName="lines">
                  <tr *ngFor="let line of linesArray.controls; let i = index" [formGroupName]="i">
                    <td>
                      <app-searchable-select
                        #rowCustomerSelect
                        [options]="customerOptions"
                        placeholder="Select customer"
                        formControlName="customerId">
                      </app-searchable-select>
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
                      <input type="number" class="inline-input w-fixed"
                        formControlName="quantity" placeholder="0" min="0"
                        (input)="calcAmount(i)" />
                    </td>
                    <td>
                      <input type="number" class="inline-input w-fixed"
                        formControlName="rate" placeholder="0.00" min="0" step="0.01"
                        (input)="calcAmount(i)" />
                    </td>
                    <td>
                      <input type="number" class="inline-input w-fixed"
                        formControlName="deliveryCharge" placeholder="0.00" min="0" step="0.01" />
                    </td>
                    <td>
                      <span class="amount-display">{{ getLineTotal(i) | number:'1.2-2' }}</span>
                    </td>
                    <td>
                      <input class="inline-input w-full" formControlName="description" placeholder="Optional line note..." />
                    </td>
                    <td>
                      <button mat-icon-button type="button" color="warn"
                        [disabled]="linesArray.length === 1"
                        (click)="removeLine(i)" matTooltip="Remove row">
                        <mat-icon>delete_outline</mat-icon>
                      </button>
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr class="total-row">
                    <td colspan="5" class="text-right font-bold" style="padding-right:16px">Totals</td>
                    <td class="font-bold">{{ deliveryTotal | number:'1.2-2' }}</td>
                    <td class="font-bold text-green" style="font-size:15px">{{ totalAmount | number:'1.2-2' }}</td>
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
              <div *ngIf="error" class="text-red" style="font-size:13px">{{ error }}</div>
              <ng-container *ngIf="!isEditMode; else editSubmitButton">
                <button mat-flat-button color="primary" type="button"
                  (click)="onSubmit('save')"
                  [disabled]="submitting || form.invalid"
                  style="padding:0 24px;height:40px">
                  <mat-icon *ngIf="!submitting || submitMode !== 'save'" style="margin-right:6px">save</mat-icon>
                  {{ submitting && submitMode === 'save' ? 'Saving...' : 'Save Voucher' }}
                </button>
                <button mat-stroked-button color="primary" type="button"
                  (click)="onSubmit('saveAndPrint')"
                  [disabled]="submitting || form.invalid"
                  style="padding:0 24px;height:40px">
                  <mat-icon *ngIf="!submitting || submitMode !== 'saveAndPrint'" style="margin-right:6px">print</mat-icon>
                  {{ submitting && submitMode === 'saveAndPrint' ? 'Saving & Printing...' : 'Save & Print' }}
                </button>
              </ng-container>
              <ng-template #editSubmitButton>
                <button mat-flat-button color="primary" type="submit"
                  [disabled]="submitting || form.invalid || (!isOrderEditMode && hasMixedCustomers)"
                  style="padding:0 24px;height:40px">
                  <mat-icon *ngIf="!submitting" style="margin-right:6px">save</mat-icon>
                  {{ submitting ? 'Saving...' : isOrderEditMode ? 'Update Sales Order' : 'Update Voucher' }}
                </button>
              </ng-template>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
      `]
})
export class SalesVoucherComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private masterData = inject(MasterDataService);
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private printWindows = inject(PrintWindowService);
  @ViewChildren(SearchableSelectComponent) private searchableSelects!: QueryList<SearchableSelectComponent>;
  @ViewChildren('rowCustomerSelect') private rowCustomerSelects!: QueryList<SearchableSelectComponent>;

  form!: FormGroup;
  customerOptions: SelectOption[] = [];
  itemOptions: SelectOption[] = [];
  quantityTypeOptions: SelectOption[] = QUANTITY_TYPE_OPTIONS;
  private items: Item[] = [];
  loading = true;
  submitting = false;
  error = '';
  loadError = '';
  isEditMode = false;
  isOrderEditMode = false;
  submitMode: SalesSubmitMode = 'save';
  private voucherId: number | null = null;
  private salesOrderId: number | null = null;
  voucherNo = '';
  salesOrderNo = '';

  ngOnInit() {
    this.form = this.fb.group({
      date: [todayDate(), Validators.required],
      notes: [''],
      lines: this.fb.array([this.createLineGroup()])
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    const orderIdParam = this.route.snapshot.paramMap.get('orderId');
    this.isOrderEditMode = !!orderIdParam;
    this.isEditMode = !!idParam || this.isOrderEditMode;
    this.voucherId = idParam ? +idParam : null;
    this.salesOrderId = orderIdParam ? +orderIdParam : null;

    if (this.isOrderEditMode && this.salesOrderId) {
      forkJoin({
        customers: this.masterData.loadCustomers(),
        items: this.masterData.loadItems(),
        order: this.api.get<SalesOrderDetail>(`/vouchers/sales-orders/${this.salesOrderId}`)
      }).subscribe({
        next: ({ customers, items, order }) => {
          this.customerOptions = customers.map(c => ({ id: c.id, name: c.name }));
          this.items = items;
          this.itemOptions = items.map(i => ({ id: i.id, name: `${i.name} (${i.unitLabel})` }));
          this.populateSalesOrder(order);
          this.loading = false;
        },
        error: (err: Error) => {
          this.loadError = err.message;
          this.loading = false;
        }
      });
      return;
    }

    if (this.isEditMode && this.voucherId) {
      forkJoin({
        customers: this.masterData.loadCustomers(),
        items: this.masterData.loadItems(),
        voucher: this.api.get<VoucherDetail>(`/vouchers/${this.voucherId}`)
      }).subscribe({
        next: ({ customers, items, voucher }) => {
          this.customerOptions = customers.map(c => ({ id: c.id, name: c.name }));
          this.items = items;
          this.itemOptions = items.map(i => ({ id: i.id, name: `${i.name} (${i.unitLabel})` }));
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
      items: this.masterData.loadItems()
    }).subscribe({
      next: ({ customers, items }) => {
        this.customerOptions = customers.map(c => ({ id: c.id, name: c.name }));
        this.items = items;
        this.itemOptions = items.map(i => ({ id: i.id, name: `${i.name} (${i.unitLabel})` }));
        this.loading = false;
      },
      error: (err: Error) => {
        this.loadError = err.message;
        this.loading = false;
      }
    });
  }

  get linesArray() { return this.form.get('lines') as FormArray; }

  get baseAmount() {
    return this.linesArray.controls.reduce((sum, c) => {
      return sum + (+c.get('quantity')?.value || 0) * (+c.get('rate')?.value || 0);
    }, 0);
  }

  get deliveryTotal() {
    return this.linesArray.controls.reduce((sum, c) => sum + (+c.get('deliveryCharge')?.value || 0), 0);
  }

  get totalAmount() { return this.baseAmount + this.deliveryTotal; }

  getAmount(i: number) {
    const c = this.linesArray.at(i);
    return (+c.get('quantity')?.value || 0) * (+c.get('rate')?.value || 0);
  }

  getLineTotal(i: number) {
    const c = this.linesArray.at(i);
    return this.getAmount(i) + (+c.get('deliveryCharge')?.value || 0);
  }

  get hasMixedCustomers() {
    const customerIds = this.linesArray.controls
      .map(control => control.get('customerId')?.value)
      .filter(value => value !== null && value !== undefined && value !== '');

    return new Set(customerIds).size > 1;
  }

  calcAmount(_i: number) { /* triggers CD */ }

  private onItemSelect(line: FormGroup) {
    const itemId = +line.get('itemId')?.value;
    const item = this.items.find(it => it.id === itemId);
    if (item) line.patchValue({ rate: item.defaultRate, quantityType: item.unit }, { emitEvent: false });
  }

  private createLineGroup(): FormGroup {
    const line = this.fb.group({
      customerId: [null, Validators.required],
      itemId: [null, Validators.required],
      quantityType: [QuantityType.PerPerson, Validators.required],
      quantity: [null, [Validators.required, Validators.min(0.001)]],
      rate: [null, [Validators.required, Validators.min(0)]],
      deliveryCharge: [0, [Validators.required, Validators.min(0)]],
      description: ['']
    });

    line.get('itemId')?.valueChanges.subscribe(() => this.onItemSelect(line));

    return line;
  }

  private populateVoucher(voucher: VoucherDetail) {
    if (voucher.voucherType !== VoucherType.Sales) {
      this.loadError = 'This voucher is not a sales voucher.';
      return;
    }

    const salesLines = voucher.lines.filter(line => line.entryType === EntryType.CustomerDebit);
    if (salesLines.length === 0 || salesLines.some(line => !line.customerId)) {
      this.loadError = 'Sales voucher lines could not be loaded.';
      return;
    }

    this.voucherNo = voucher.voucherNo;
    this.form.patchValue({
      date: parseApiDate(voucher.date),
      notes: voucher.notes ?? ''
    });

    this.linesArray.clear();
    salesLines.forEach(line => {
      const group = this.createLineGroup();
      group.patchValue({
        customerId: line.customerId,
        itemId: line.itemId,
        quantityType: line.quantityType ?? QuantityType.PerPerson,
        quantity: line.quantity,
        rate: line.rate,
        deliveryCharge: line.deliveryCharge ?? 0,
        description: line.description ?? ''
      }, { emitEvent: false });
      this.linesArray.push(group);
    });
  }

  private populateSalesOrder(order: SalesOrderDetail) {
    if (order.mode !== 0) {
      this.loadError = 'This sales order belongs to the customer date-wise editor.';
      return;
    }

    this.salesOrderNo = order.orderNo;
    this.voucherNo = order.voucherNos.join(', ');
    this.form.patchValue({
      date: order.lines.length ? parseApiDate(order.lines[0].date) : todayDate(),
      notes: order.notes ?? ''
    });
    this.linesArray.clear();
    order.lines.forEach(line => {
      const group = this.createLineGroup();
      group.patchValue({
        customerId: line.customerId,
        itemId: line.itemId,
        quantityType: line.quantityType,
        quantity: line.quantity,
        rate: line.rate,
        deliveryCharge: line.deliveryCharge,
        description: line.description ?? ''
      }, { emitEvent: false });
      this.linesArray.push(group);
    });
  }

  addLine() { this.linesArray.push(this.createLineGroup()); }
  addLineAndFocus() {
    this.closeOpenDropdowns();
    this.addLine();
    setTimeout(() => this.rowCustomerSelects.last?.focus());
  }
  removeLine(i: number) { if (this.linesArray.length > 1) this.linesArray.removeAt(i); }

  private closeOpenDropdowns() {
    this.searchableSelects.forEach(select => select.closeDropdown());
  }

  onSubmit(mode: SalesSubmitMode = 'save') {
    if (this.form.invalid || this.submitting) return;
    this.submitting = true;
    this.submitMode = mode;
    this.error = '';

    const val = this.form.value;
    const req: CreateSalesVoucherRequest = {
      date: formatDateForApi(val.date),
      notes: val.notes,
      lines: val.lines.map((l: {
        customerId: number | string;
        itemId: number | string;
        quantityType: number | string;
        quantity: number | string;
        rate: number | string;
        deliveryCharge: number | string;
        description?: string;
      }) => ({
        customerId: +l.customerId,
        itemId: +l.itemId,
        quantityType: +l.quantityType,
        quantity: +l.quantity,
        rate: +l.rate,
        deliveryCharge: +l.deliveryCharge || 0,
        description: l.description
      }))
    };

    if (this.isOrderEditMode && this.salesOrderId) {
      this.api.put<SalesVoucherCreateResult>(`/vouchers/sales-orders/${this.salesOrderId}/customer-wise`, req).subscribe({
        next: updated => {
          this.salesOrderNo = updated.salesOrderNo;
          this.voucherNo = updated.voucherNos.join(', ');
          this.toast.success(`Updated sales order ${updated.salesOrderNo}`);
          this.reloadSalesOrder();
        },
        error: (err: Error) => {
          this.error = err.message;
          this.submitting = false;
          this.submitMode = 'save';
        }
      });
      return;
    }

    if (this.isEditMode && this.voucherId) {
      this.api.put<VoucherDetail>(`/vouchers/${this.voucherId}/sales`, req).subscribe({
        next: updated => {
          this.voucherNo = updated.voucherNo;
          this.toast.success(`Updated voucher ${updated.voucherNo}`);
          this.populateVoucher(updated);
          this.submitting = false;
          this.submitMode = 'save';
        },
        error: (err: Error) => {
          this.error = err.message;
          this.submitting = false;
          this.submitMode = 'save';
        }
      });
      return;
    }

    const expectedPrintCount = mode === 'saveAndPrint' ? this.getDistinctCustomerCount() : 0;
    const printTabs = this.printWindows.preOpen(expectedPrintCount);
    if (printTabs.length < expectedPrintCount) {
      this.toast.info('Allow pop-ups to open every print preview tab.');
    }

    this.api.post<SalesVoucherCreateResult>('/vouchers/sales', req).subscribe({
      next: created => {
          this.voucherNo = created.voucherNos[0] ?? '';
          this.salesOrderNo = created.salesOrderNo;
          this.toast.success(
            created.createdCount === 1
              ? `Saved ${created.salesOrderNo}! Voucher: ${created.voucherNos[0]}`
              : `Saved ${created.salesOrderNo} with ${created.createdCount} vouchers: ${created.voucherNos.join(', ')}`
          );
          if (mode === 'saveAndPrint') {
            this.printWindows.route(printTabs, created.voucherNos);
          }
          this.form.reset({ date: todayDate() });
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

  private getDistinctCustomerCount(): number {
    const customerIds = this.linesArray.controls
      .map(control => control.get('customerId')?.value)
      .filter(value => value !== null && value !== undefined && value !== '');

    return new Set(customerIds).size;
  }

  private reloadSalesOrder() {
    if (!this.salesOrderId) return;
    this.api.get<SalesOrderDetail>(`/vouchers/sales-orders/${this.salesOrderId}`).subscribe({
      next: order => {
        this.populateSalesOrder(order);
        this.submitting = false;
        this.submitMode = 'save';
      },
      error: (err: Error) => {
        this.error = err.message;
        this.submitting = false;
        this.submitMode = 'save';
      }
    });
  }

}
