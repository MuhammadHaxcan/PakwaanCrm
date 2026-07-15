import { FormBuilder } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { ItemUnit } from '../../../core/models/enums';
import { AccountDialogComponent } from './account-dialog.component';
import { CustomerDialogComponent } from './customer-dialog.component';
import { ItemDialogComponent } from './item-dialog.component';
import { VendorDialogComponent } from './vendor-dialog.component';

describe('master data dialogs', () => {
  const formBuilder = new FormBuilder();

  function dialogRef<T>(): jasmine.SpyObj<MatDialogRef<T>> {
    return jasmine.createSpyObj<MatDialogRef<T>>('MatDialogRef', ['close']);
  }

  it('returns the customer form value', () => {
    const ref = dialogRef<CustomerDialogComponent>();
    const component = new CustomerDialogComponent(formBuilder, ref, null);
    component.form.setValue({ name: 'Customer', phone: '', address: '', openingBalance: 10 });

    component.save();

    expect(ref.close).toHaveBeenCalledOnceWith({ name: 'Customer', phone: '', address: '', openingBalance: 10 });
  });

  it('returns the vendor form value', () => {
    const ref = dialogRef<VendorDialogComponent>();
    const component = new VendorDialogComponent(formBuilder, ref, null);
    component.form.setValue({ name: 'Vendor', phone: '', address: '', openingBalance: 20 });
    component.save();
    expect(ref.close).toHaveBeenCalledOnceWith({ name: 'Vendor', phone: '', address: '', openingBalance: 20 });
  });

  it('returns the item form value', () => {
    const ref = dialogRef<ItemDialogComponent>();
    const component = new ItemDialogComponent(formBuilder, ref, null);
    component.form.setValue({ name: 'Item', unit: ItemUnit.PerKg, defaultRate: 30, isActive: true });
    component.save();
    expect(ref.close).toHaveBeenCalledOnceWith({ name: 'Item', unit: ItemUnit.PerKg, defaultRate: 30, isActive: true });
  });

  it('returns the account form value', () => {
    const ref = dialogRef<AccountDialogComponent>();
    const component = new AccountDialogComponent(formBuilder, ref, null);
    component.form.setValue({ name: 'Cash' });
    component.save();
    expect(ref.close).toHaveBeenCalledOnceWith({ name: 'Cash' });
  });
});
