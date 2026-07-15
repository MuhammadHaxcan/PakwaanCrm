import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Vendor } from '../../../core/models/models';

@Component({
  selector: 'app-vendor-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Edit' : 'Add' }} Vendor</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline"><mat-label>Name *</mat-label><input matInput formControlName="name" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Phone</mat-label><input matInput formControlName="phone" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Address</mat-label><textarea matInput formControlName="address" rows="2"></textarea></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Opening Balance (PKR)</mat-label><input matInput type="number" formControlName="openingBalance" step="0.01" /></mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="save()">Save</button>
    </mat-dialog-actions>
  `,
  styles: [`.dialog-form { display:flex; flex-direction:column; gap:12px; padding-top:8px; min-width:320px; }`]
})
export class VendorDialogComponent {
  readonly form: FormGroup;

  constructor(
    fb: FormBuilder,
    public ref: MatDialogRef<VendorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Vendor | null
  ) {
    this.form = fb.group({
      name: [data?.name ?? '', Validators.required],
      phone: [data?.phone ?? ''],
      address: [data?.address ?? ''],
      openingBalance: [data?.openingBalance ?? 0]
    });
  }

  save(): void {
    if (this.form.valid) this.ref.close(this.form.value);
  }
}
