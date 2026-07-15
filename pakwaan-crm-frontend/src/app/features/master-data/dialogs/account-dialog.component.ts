import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Account } from '../../../core/models/models';

@Component({
  selector: 'app-account-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Edit' : 'Add' }} Account</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline">
          <mat-label>Account Name *</mat-label>
          <input matInput formControlName="name" placeholder="e.g. Cash in Hand, Bank - HBL" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="save()">Save</button>
    </mat-dialog-actions>
  `,
  styles: [`.dialog-form { display:flex; flex-direction:column; gap:12px; padding-top:8px; min-width:320px; }`]
})
export class AccountDialogComponent {
  readonly form: FormGroup;

  constructor(
    fb: FormBuilder,
    public ref: MatDialogRef<AccountDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Account | null
  ) {
    this.form = fb.group({ name: [data?.name ?? '', Validators.required] });
  }

  save(): void {
    if (this.form.valid) this.ref.close(this.form.value);
  }
}
