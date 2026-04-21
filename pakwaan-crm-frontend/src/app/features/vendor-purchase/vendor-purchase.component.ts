import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
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
import { CreateVendorPurchaseRequest } from '../../core/models/models';

@Component({
  selector: 'app-vendor-purchase',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
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
          <h2>Vendor Purchase</h2>
          <p>Record supplier bills, packaging purchases, raw material purchases, and vendor payments</p>
        </div>
      </div>

      <mat-card>
        <mat-card-content style="padding:24px">
          <div *ngIf="loading" class="text-center" style="padding:32px;color:#94a3b8">
            <mat-icon style="font-size:36px;width:36px;height:36px;opacity:.4">hourglass_empty</mat-icon>
            <p>Loading vendors…</p>
          </div>

          <form *ngIf="!loading" [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Date</mat-label>
                <input matInput type="date" formControlName="date" />
              </mat-form-field>

              <div class="field-stack field-floating" style="min-width:250px;flex:1.3">
                <label class="field-label">Vendor</label>
                <app-searchable-select
                  [options]="vendorOptions"
                  placeholder="Select vendor"
                  formControlName="vendorId">
                </app-searchable-select>
              </div>

              <mat-form-field appearance="outline" style="flex:1.8">
                <mat-label>Description</mat-label>
                <input matInput formControlName="description" placeholder="e.g. Plastic containers purchase" />
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" style="flex:2">
                <mat-label>Notes</mat-label>
                <input matInput formControlName="notes" placeholder="Optional notes…" />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Amount Paid Now (PKR)</mat-label>
                <input matInput type="number" formControlName="paidAmount" min="0" step="0.01" />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Paid From</mat-label>
                <input matInput formControlName="paymentAccountName" placeholder="Cash / Bank" />
              </mat-form-field>

              <mat-form-field appearance="outline" style="flex:1.5">
                <mat-label>Payment Description</mat-label>
                <input matInput formControlName="paymentDescription" placeholder="Optional payment note…" />
              </mat-form-field>
            </div>

            <div style="font-size:12px;color:#64748b;margin:-6px 0 14px">
              Tip: mention the unit in the item name if needed, like "Plastic containers (box)" or "Rice (kg)".
            </div>

            <div class="line-grid">
              <table>
                <thead>
                  <tr>
                    <th style="width:280px">Item / Service</th>
                    <th style="width:110px">Qty</th>
                    <th style="width:120px">Rate (PKR)</th>
                    <th style="width:130px">Amount (PKR)</th>
                    <th>Line Notes</th>
                    <th style="width:44px"></th>
                  </tr>
                </thead>
                <tbody formArrayName="lines">
                  <tr *ngFor="let line of linesArray.controls; let i = index" [formGroupName]="i">
                    <td>
                      <input class="inline-input w-full" formControlName="itemName" placeholder="Plastic containers (box)" />
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
                      <input class="inline-input w-full" formControlName="description" placeholder="Optional line detail…" />
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
                    <td colspan="3" class="text-right font-bold" style="padding-right:16px">Purchase Total</td>
                    <td class="font-bold text-green">{{ totalAmount | number:'1.2-2' }}</td>
                    <td class="text-right font-bold">Outstanding</td>
                    <td class="font-bold" [class.text-red]="outstandingAmount > 0">{{ outstandingAmount | number:'1.2-2' }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div class="grid-actions">
              <button mat-stroked-button type="button" color="primary" (click)="addLine()">
                <mat-icon>add</mat-icon> Add Row
              </button>
              <span class="spacer"></span>
              <div *ngIf="error" class="text-red" style="font-size:13px">{{ error }}</div>
              <button mat-flat-button color="primary" type="submit"
                [disabled]="submitting || form.invalid || paidAmount > totalAmount"
                style="padding:0 24px;height:40px">
                <mat-icon *ngIf="!submitting" style="margin-right:6px">save</mat-icon>
                {{ submitting ? 'Saving…' : 'Save Purchase' }}
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
  private api = inject(ApiService);
  private masterData = inject(MasterDataService);
  private toast = inject(ToastService);

  form!: FormGroup;
  vendorOptions: SelectOption[] = [];
  loading = true;
  submitting = false;
  error = '';

  ngOnInit() {
    this.form = this.fb.group({
      date: [new Date().toISOString().split('T')[0], Validators.required],
      vendorId: [null, Validators.required],
      description: [''],
      notes: [''],
      paidAmount: [0, [Validators.min(0)]],
      paymentAccountName: ['Cash / Bank'],
      paymentDescription: [''],
      lines: this.fb.array([this.createLineGroup()])
    });

    forkJoin([this.masterData.loadVendors()]).subscribe(([vendors]) => {
      this.vendorOptions = vendors.map(v => ({ id: v.id, name: v.name }));
      this.loading = false;
    });
  }

  get linesArray() {
    return this.form.get('lines') as FormArray;
  }

  get paidAmount() {
    return +(this.form.get('paidAmount')?.value ?? 0);
  }

  get totalAmount() {
    return this.linesArray.controls.reduce((sum, control) => {
      return sum + (+control.get('quantity')?.value || 0) * (+control.get('rate')?.value || 0);
    }, 0);
  }

  get outstandingAmount() {
    return Math.max(this.totalAmount - this.paidAmount, 0);
  }

  getAmount(index: number) {
    const line = this.linesArray.at(index);
    return (+line.get('quantity')?.value || 0) * (+line.get('rate')?.value || 0);
  }

  addLine() {
    this.linesArray.push(this.createLineGroup());
  }

  removeLine(index: number) {
    if (this.linesArray.length > 1) this.linesArray.removeAt(index);
  }

  onSubmit() {
    if (this.form.invalid || this.paidAmount > this.totalAmount) return;

    this.submitting = true;
    this.error = '';

    const value = this.form.value;
    const request: CreateVendorPurchaseRequest = {
      date: value.date,
      vendorId: +value.vendorId,
      description: value.description || null,
      notes: value.notes || null,
      paidAmount: +value.paidAmount || 0,
      paymentAccountName: value.paymentAccountName || null,
      paymentDescription: value.paymentDescription || null,
      lines: value.lines.map((line: any) => ({
        itemName: line.itemName?.trim(),
        quantity: +line.quantity,
        rate: +line.rate,
        description: line.description || null
      }))
    };

    this.api.post<any>('/vouchers/vendor-purchases', request).subscribe({
      next: res => {
        this.toast.success(`Saved! Purchase voucher: ${res.voucherNo}`);
        this.form.reset({
          date: new Date().toISOString().split('T')[0],
          paidAmount: 0,
          paymentAccountName: 'Cash / Bank'
        });
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

  private createLineGroup(): FormGroup {
    return this.fb.group({
      itemName: ['', Validators.required],
      quantity: [null, [Validators.required, Validators.min(0.001)]],
      rate: [null, [Validators.required, Validators.min(0)]],
      description: ['']
    });
  }
}
