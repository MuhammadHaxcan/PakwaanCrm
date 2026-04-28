import { Component, HostListener, OnInit, QueryList, ViewChildren, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';
import { SearchableSelectComponent, SelectOption } from '../../shared/components/searchable-select/searchable-select.component';
import { ApiService } from '../../core/services/api.service';
import { MasterDataService } from '../../core/services/master-data.service';
import { ToastService } from '../../core/services/toast.service';
import { CreateVendorPurchaseRequest, Item, VoucherDetail } from '../../core/models/models';
import { EntryType, QuantityType, VoucherType } from '../../core/models/enums';
import { formatDateForApi, parseApiDate, todayDate } from '../../core/date/date-utils';
import { QUANTITY_TYPE_OPTIONS } from '../../shared/constants/select-options';

@Component({
  selector: 'app-vendor-purchase',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    SearchableSelectComponent
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="ph-icon"><mat-icon>inventory_2</mat-icon></div>
        <div class="ph-text">
          <h2>{{ isEditMode ? 'Edit Vendor Bill' : 'Vendor Purchase' }}</h2>
          <p>Record vendor bills on credit for supplies, services, utilities, packaging, and other charges</p>
          <p *ngIf="isEditMode && voucherNo" style="margin-top:6px;font-weight:600;color:#3949ab">Voucher: {{ voucherNo }}</p>
        </div>
      </div>

      <mat-card>
        <mat-card-content style="padding:24px">
          <div *ngIf="loading" class="text-center" style="padding:32px;color:#94a3b8">
            <mat-icon style="font-size:36px;width:36px;height:36px;opacity:.4">hourglass_empty</mat-icon>
            <p>Loading vendors...</p>
          </div>

          <div *ngIf="!loading && loadError" class="text-red" style="padding:12px 0">{{ loadError }}</div>

          <form *ngIf="!loading && !loadError" [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Date</mat-label>
                <input matInput [matDatepicker]="purchaseDatePicker" formControlName="date" placeholder="dd/mm/yyyy" />
                <mat-datepicker-toggle matIconSuffix [for]="purchaseDatePicker"></mat-datepicker-toggle>
                <mat-datepicker #purchaseDatePicker></mat-datepicker>
              </mat-form-field>

              <app-searchable-select
                style="min-width:250px;flex:1.3"
                label="Vendor"
                [options]="vendorOptions"
                placeholder="Select vendor"
                formControlName="vendorId">
              </app-searchable-select>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" style="flex:2">
                <mat-label>Notes</mat-label>
                <input matInput formControlName="notes" placeholder="Optional notes..." />
              </mat-form-field>
            </div>

            <div style="font-size:12px;color:#64748b;margin:-6px 0 10px">
              This screen records vendor billing only. It does not track stock, inventory, or later consumption.
              It debits the bill expense/value and credits the vendor payable. Record the actual vendor payment later in Journal.
            </div>

            <div style="font-size:12px;color:#64748b;margin:-6px 0 14px">
              Tip: select an existing item/service or type a new one. New vendor bill items are saved into master items automatically.
            </div>

            <div class="line-grid">
              <table>
                <thead>
                  <tr>
                    <th style="width:260px">Bill Line / Service</th>
                    <th style="width:110px">Unit</th>
                    <th style="width:90px">Qty</th>
                    <th style="width:110px">Rate (PKR)</th>
                    <th style="width:120px">Amount (PKR)</th>
                    <th>Line Notes</th>
                    <th style="width:44px"></th>
                  </tr>
                </thead>
                <tbody formArrayName="lines">
                  <tr *ngFor="let line of linesArray.controls; let i = index" [formGroupName]="i">
                    <td>
                      <app-searchable-select
                        #rowItemSelect
                        [options]="itemSelectOptions"
                        placeholder="Select item/service"
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
                      <input type="number" class="inline-input w-fixed" formControlName="quantity" min="0.001" step="0.001" />
                    </td>
                    <td>
                      <input type="number" class="inline-input w-fixed" formControlName="rate" min="0" step="0.01" />
                    </td>
                    <td>
                      <span class="amount-display">{{ getAmount(i) | number:'1.2-2' }}</span>
                    </td>
                    <td>
                      <input class="inline-input w-full" formControlName="description" placeholder="Optional line detail..." />
                    </td>
                    <td>
                      <button mat-icon-button type="button" color="warn"
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
                    <td colspan="4" class="text-right font-bold" style="padding-right:16px">Purchase Total</td>
                    <td class="font-bold text-green">{{ totalAmount | number:'1.2-2' }}</td>
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
              <button mat-flat-button color="primary" type="submit"
                [disabled]="submitting || form.invalid"
                style="padding:0 24px;height:40px">
                <mat-icon *ngIf="!submitting" style="margin-right:6px">save</mat-icon>
                {{ submitting ? 'Saving...' : (isEditMode ? 'Update Voucher' : 'Save Purchase') }}
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `
})
export class VendorPurchaseComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private masterData = inject(MasterDataService);
  private toast = inject(ToastService);
  @ViewChildren(SearchableSelectComponent) private searchableSelects!: QueryList<SearchableSelectComponent>;
  @ViewChildren('rowItemSelect') private rowItemSelects!: QueryList<SearchableSelectComponent>;

  form!: FormGroup;
  vendorOptions: SelectOption[] = [];
  itemOptions: Item[] = [];
  itemSelectOptions: SelectOption[] = [];
  quantityTypeOptions: SelectOption[] = QUANTITY_TYPE_OPTIONS;
  loading = true;
  submitting = false;
  error = '';
  loadError = '';
  isEditMode = false;
  private voucherId: number | null = null;
  voucherNo = '';

  ngOnInit() {
    this.form = this.fb.group({
      date: [todayDate(), Validators.required],
      vendorId: [null, Validators.required],
      notes: [''],
      lines: this.fb.array([this.createLineGroup()])
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!idParam;
    this.voucherId = idParam ? +idParam : null;

    if (this.isEditMode && this.voucherId) {
      forkJoin({
        vendors: this.masterData.loadVendors(),
        items: this.masterData.loadItems(),
        voucher: this.api.get<VoucherDetail>(`/vouchers/${this.voucherId}`)
      }).subscribe({
        next: ({ vendors, items, voucher }) => {
          this.vendorOptions = vendors.map(v => ({ id: v.id, name: v.name }));
          this.itemOptions = items;
          this.itemSelectOptions = items.map(i => ({ id: i.id, name: `${i.name} (${i.unitLabel})` }));
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
      vendors: this.masterData.loadVendors(),
      items: this.masterData.loadItems()
    }).subscribe({
      next: ({ vendors, items }) => {
        this.vendorOptions = vendors.map(v => ({ id: v.id, name: v.name }));
        this.itemOptions = items;
        this.itemSelectOptions = items.map(i => ({ id: i.id, name: `${i.name} (${i.unitLabel})` }));
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

  get totalAmount() {
    return this.linesArray.controls.reduce((sum, control) => {
      return sum + (+control.get('quantity')?.value || 0) * (+control.get('rate')?.value || 0);
    }, 0);
  }

  getAmount(index: number) {
    const line = this.linesArray.at(index);
    return (+line.get('quantity')?.value || 0) * (+line.get('rate')?.value || 0);
  }

  addLine() {
    this.linesArray.push(this.createLineGroup());
  }

  addLineAndFocus() {
    this.closeOpenDropdowns();
    this.addLine();
    setTimeout(() => this.rowItemSelects.last?.focus());
  }

  removeLine(index: number) {
    if (this.linesArray.length > 1) this.linesArray.removeAt(index);
  }

  @HostListener('document:keydown', ['$event'])
  onShortcut(event: KeyboardEvent) {
    if (event.altKey && event.key.toLowerCase() === 'n') {
      event.preventDefault();
      this.addLineAndFocus();
    }
  }

  private closeOpenDropdowns() {
    this.searchableSelects.forEach(select => select.closeDropdown());
  }

  private populateVoucher(voucher: VoucherDetail) {
    if (voucher.voucherType !== VoucherType.Purchase) {
      this.loadError = 'This voucher is not a vendor purchase voucher.';
      return;
    }

    const vendorLine = voucher.lines.find(line => line.entryType === EntryType.VendorCredit);
    const expenseLines = voucher.lines.filter(line => line.entryType === EntryType.Expense);
    if (!vendorLine?.vendorId || expenseLines.length === 0) {
      this.loadError = 'Vendor purchase lines could not be loaded.';
      return;
    }

    this.voucherNo = voucher.voucherNo;
    this.form.patchValue({
      date: parseApiDate(voucher.date),
      vendorId: vendorLine.vendorId,
      notes: voucher.notes ?? ''
    });

    this.linesArray.clear();
    expenseLines.forEach(line => {
      const group = this.createLineGroup();
      const matchedItem = this.itemOptions.find(item =>
        item.name.trim().toLowerCase() === (line.itemName || line.freeText || '').trim().toLowerCase()
      );
      group.patchValue({
        itemId: matchedItem?.id ?? null,
        quantityType: line.quantityType ?? QuantityType.PerPerson,
        quantity: line.quantity,
        rate: line.rate,
        description: line.description ?? ''
      });
      this.linesArray.push(group);
    });
  }

  onSubmit() {
    if (this.form.invalid) return;

    this.submitting = true;
    this.error = '';

    const value = this.form.value;
    const request: CreateVendorPurchaseRequest = {
      date: formatDateForApi(value.date),
      vendorId: +value.vendorId,
      notes: value.notes || null,
      lines: value.lines.map((line: any) => ({
        itemName: this.resolveItemName(line.itemId),
        quantityType: +line.quantityType,
        quantity: +line.quantity,
        rate: +line.rate,
        description: line.description || null
      }))
    };

    const request$ = this.isEditMode && this.voucherId
      ? this.api.put<any>(`/vouchers/${this.voucherId}/vendor-purchases`, request)
      : this.api.post<any>('/vouchers/vendor-purchases', request);

    request$.subscribe({
      next: res => {
        this.voucherNo = res.voucherNo;
        this.masterData.reload();
        this.masterData.loadItems(true).subscribe(items => {
          this.itemOptions = items;
          this.itemSelectOptions = items.map(i => ({ id: i.id, name: `${i.name} (${i.unitLabel})` }));
        });
        if (this.isEditMode) {
          this.toast.success(`Updated voucher ${res.voucherNo}`);
          this.populateVoucher(res);
        } else {
          this.toast.success(`Saved! Purchase voucher: ${res.voucherNo}`);
          this.form.reset({
            date: todayDate()
          });
          this.linesArray.clear();
          this.linesArray.push(this.createLineGroup());
        }
        this.submitting = false;
      },
      error: (err: Error) => {
        this.error = err.message;
        this.submitting = false;
      }
    });
  }

  private createLineGroup(): FormGroup {
    return this.fb.group({
      itemId: [null, Validators.required],
      quantityType: [QuantityType.PerPerson],
      quantity: [null, [Validators.required, Validators.min(0.001)]],
      rate: [null, [Validators.required, Validators.min(0)]],
      description: ['']
    });
  }

  private resolveItemName(itemId: number | string | null | undefined): string {
    const numericId = Number(itemId);
    const item = this.itemOptions.find(i => i.id === numericId);
    return item?.name?.trim() ?? '';
  }
}
