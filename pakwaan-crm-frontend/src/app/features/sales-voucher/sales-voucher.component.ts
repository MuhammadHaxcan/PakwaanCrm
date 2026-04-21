import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SearchableSelectComponent, SelectOption } from '../../shared/components/searchable-select/searchable-select.component';
import { MasterDataService } from '../../core/services/master-data.service';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { Item, CreateSalesVoucherRequest } from '../../core/models/models';
import { QuantityType } from '../../core/models/enums';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-sales-voucher',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatRadioModule,
    MatTooltipModule, SearchableSelectComponent
  ],
  template: `
    <div class="page-container">

      <!-- Page header -->
      <div class="page-header">
        <div class="ph-icon"><mat-icon>receipt_long</mat-icon></div>
        <div class="ph-text">
          <h2>Sales Voucher</h2>
          <p>Record catering sales to multiple customers in one voucher</p>
        </div>
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
                <input matInput formControlName="description" placeholder="e.g. Catering for wedding event" />
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
                    <th style="width:210px">Customer</th>
                    <th style="width:190px">Item</th>
                    <th style="width:130px">Unit</th>
                    <th style="width:90px">Qty</th>
                    <th style="width:100px">Rate (PKR)</th>
                    <th style="width:110px">Amount (PKR)</th>
                    <th style="width:44px"></th>
                  </tr>
                </thead>
                <tbody formArrayName="lines">
                  <tr *ngFor="let line of linesArray.controls; let i = index" [formGroupName]="i">
                    <td>
                      <app-searchable-select
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
                      <mat-radio-group formControlName="quantityType" class="unit-group">
                        <mat-radio-button [value]="0">Per Person</mat-radio-button>
                        <mat-radio-button [value]="1">Per Kg</mat-radio-button>
                      </mat-radio-group>
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
                      <span class="amount-display">{{ getAmount(i) | number:'1.2-2' }}</span>
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
                    <td colspan="5" class="text-right font-bold" style="padding-right:16px">Total Amount</td>
                    <td class="font-bold text-green" style="font-size:15px">{{ totalAmount | number:'1.2-2' }}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <!-- Actions -->
            <div class="grid-actions">
              <button mat-stroked-button type="button" color="primary" (click)="addLine()">
                <mat-icon>add</mat-icon> Add Row
              </button>
              <span class="spacer"></span>
              <div *ngIf="error" class="text-red" style="font-size:13px">{{ error }}</div>
              <button mat-flat-button color="primary" type="submit"
                [disabled]="submitting || form.invalid" style="padding:0 24px;height:40px">
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
    .unit-group {
      display: flex;
      flex-direction: column;
      gap: 2px;
      ::ng-deep .mat-mdc-radio-button .mdc-label { font-size: 12.5px; }
    }
  `]
})
export class SalesVoucherComponent implements OnInit {
  private fb = inject(FormBuilder);
  private masterData = inject(MasterDataService);
  private api = inject(ApiService);
  private toast = inject(ToastService);

  form!: FormGroup;
  customerOptions: SelectOption[] = [];
  itemOptions: SelectOption[] = [];
  private items: Item[] = [];
  loading = true;
  submitting = false;
  error = '';

  ngOnInit() {
    this.form = this.fb.group({
      date: [new Date().toISOString().split('T')[0], Validators.required],
      description: [''],
      notes: [''],
      lines: this.fb.array([this.createLineGroup()])
    });

    forkJoin([
      this.masterData.loadCustomers(),
      this.masterData.loadItems()
    ]).subscribe(([customers, items]) => {
      this.customerOptions = customers.map(c => ({ id: c.id, name: c.name }));
      this.items = items;
      this.itemOptions = items.map(i => ({ id: i.id, name: `${i.name} (${i.unitLabel})` }));
      this.loading = false;
    });
  }

  get linesArray() { return this.form.get('lines') as FormArray; }

  get totalAmount() {
    return this.linesArray.controls.reduce((sum, c) => {
      return sum + (+c.get('quantity')?.value || 0) * (+c.get('rate')?.value || 0);
    }, 0);
  }

  getAmount(i: number) {
    const c = this.linesArray.at(i);
    return (+c.get('quantity')?.value || 0) * (+c.get('rate')?.value || 0);
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
      itemId:     [null, Validators.required],
      quantityType: [QuantityType.PerPerson, Validators.required],
      quantity: [null, [Validators.required, Validators.min(0.001)]],
      rate:     [null, [Validators.required, Validators.min(0)]],
      description: ['']
    });

    line.get('itemId')?.valueChanges.subscribe(() => this.onItemSelect(line));

    return line;
  }

  addLine()          { this.linesArray.push(this.createLineGroup()); }
  removeLine(i: number) { if (this.linesArray.length > 1) this.linesArray.removeAt(i); }

  onSubmit() {
    if (this.form.invalid) return;
    this.submitting = true;
    this.error = '';

    const val = this.form.value;

    // Group lines by customerId — each customer gets their own voucher
    const grouped = new Map<number, any[]>();
    for (const l of val.lines) {
      const cid = +l.customerId;
      if (!grouped.has(cid)) grouped.set(cid, []);
      grouped.get(cid)!.push(l);
    }

    const requests = Array.from(grouped.values()).map(lines => {
      const req: CreateSalesVoucherRequest = {
        date:        val.date,
        description: val.description,
        notes:       val.notes,
        lines: lines.map((l: any) => ({
          customerId:   +l.customerId,
          itemId:       +l.itemId,
          quantityType: +l.quantityType,
          quantity:     +l.quantity,
          rate:         +l.rate,
          description:  l.description
        }))
      };
      return this.api.post<any>('/vouchers/sales', req);
    });

    forkJoin(requests).subscribe({
      next: results => {
        const nums = results.map((r: any) => r.voucherNo).join(', ');
        this.toast.success(`Saved! Voucher${results.length > 1 ? 's' : ''}: ${nums}`);
        this.form.reset({ date: new Date().toISOString().split('T')[0] });
        this.linesArray.clear();
        this.linesArray.push(this.createLineGroup());
        this.submitting = false;
      },
      error: (err: Error) => {
        this.error = err.message;
        this.submitting = false;
      }
    });
  }
}
