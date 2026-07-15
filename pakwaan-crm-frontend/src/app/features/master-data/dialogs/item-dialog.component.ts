import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ItemUnit } from '../../../core/models/enums';
import { Item } from '../../../core/models/models';

@Component({
  selector: 'app-item-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatRadioModule, MatSlideToggleModule],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Edit' : 'Add' }} Item</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline"><mat-label>Name *</mat-label><input matInput formControlName="name" /></mat-form-field>
        <div>
          <label class="unit-label">Unit</label>
          <mat-radio-group formControlName="unit" class="unit-options">
            <mat-radio-button [value]="0">Per Person</mat-radio-button>
            <mat-radio-button [value]="1">Per Kg</mat-radio-button>
          </mat-radio-group>
        </div>
        <mat-form-field appearance="outline"><mat-label>Default Rate (PKR)</mat-label><input matInput type="number" formControlName="defaultRate" step="0.01" min="0" /></mat-form-field>
        <mat-slide-toggle formControlName="isActive">Active</mat-slide-toggle>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="save()">Save</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-form { display:flex; flex-direction:column; gap:12px; padding-top:8px; min-width:320px; }
    .unit-label { font-size:13px; color:#666; }
    .unit-options { display:flex; gap:16px; margin-top:4px; }
  `]
})
export class ItemDialogComponent {
  readonly form: FormGroup;

  constructor(
    fb: FormBuilder,
    public ref: MatDialogRef<ItemDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Item | null
  ) {
    this.form = fb.group({
      name: [data?.name ?? '', Validators.required],
      unit: [data?.unit ?? ItemUnit.PerPerson],
      defaultRate: [data?.defaultRate ?? 0, [Validators.min(0)]],
      isActive: [data?.isActive ?? true]
    });
  }

  save(): void {
    if (this.form.valid) this.ref.close(this.form.value);
  }
}
