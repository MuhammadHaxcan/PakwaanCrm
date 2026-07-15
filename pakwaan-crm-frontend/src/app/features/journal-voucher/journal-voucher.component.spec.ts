import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { MatNativeDateModule } from '@angular/material/core';
import { ActivatedRoute } from '@angular/router';
import { NEVER, of } from 'rxjs';
import { EntryType } from '../../core/models/enums';
import { ApiService } from '../../core/services/api.service';
import { MasterDataService } from '../../core/services/master-data.service';
import { ToastService } from '../../core/services/toast.service';
import { SearchableSelectComponent } from '../../shared/components/searchable-select/searchable-select.component';
import { GeneralVoucherComponent } from './journal-voucher.component';

describe('GeneralVoucherComponent', () => {
  let fixture: ComponentFixture<GeneralVoucherComponent>;
  let component: GeneralVoucherComponent;
  let api: jasmine.SpyObj<ApiService>;

  beforeEach(async () => {
    const masterData = jasmine.createSpyObj<MasterDataService>(
      'MasterDataService',
      ['loadCustomers', 'loadVendors', 'loadAccounts']
    );
    masterData.loadCustomers.and.returnValue(of([]));
    masterData.loadVendors.and.returnValue(of([]));
    masterData.loadAccounts.and.returnValue(of([]));

    api = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'post', 'put']);

    await TestBed.configureTestingModule({
      imports: [GeneralVoucherComponent, NoopAnimationsModule, MatNativeDateModule],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } },
        { provide: MasterDataService, useValue: masterData },
        { provide: ApiService, useValue: api },
        { provide: ToastService, useValue: jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error', 'info']) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GeneralVoucherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('keeps the first Cash Debit equal to customer receipts', () => {
    component.linesArray.at(1).get('credit')?.setValue(10000);
    expect(component.linesArray.at(0).get('debit')?.value).toBe(10000);

    component.addLine();
    component.linesArray.at(2).get('credit')?.setValue(5000);
    expect(component.linesArray.at(0).get('debit')?.value).toBe(15000);
    expect(component.getEntryTypeVal(2)).toBe(EntryType.CustomerCredit);
  });

  it('recalculates the first Cash Debit when a receipt row is removed', () => {
    component.linesArray.at(1).get('credit')?.setValue(10000);
    component.addLine();
    component.linesArray.at(2).get('credit')?.setValue(5000);

    component.removeLine(2);

    expect(component.linesArray.at(0).get('debit')?.value).toBe(10000);
  });

  it('clamps the automatic amount to zero when later debits exceed credits', () => {
    component.linesArray.at(0).get('debit')?.setValue(999);
    component.linesArray.at(1).get('entryType')?.setValue(EntryType.Expense);
    component.linesArray.at(1).get('debit')?.setValue(12000);

    expect(component.linesArray.at(0).get('debit')?.value).toBe(0);
    expect(component.balance).toBe(12000);
  });

  it('stops and resumes automatic balancing based on the first entry type', () => {
    component.linesArray.at(0).get('entryType')?.setValue(EntryType.CustomerDebit);
    component.linesArray.at(0).get('debit')?.setValue(123);
    component.linesArray.at(1).get('credit')?.setValue(10000);
    expect(component.linesArray.at(0).get('debit')?.value).toBe(123);

    component.linesArray.at(0).get('entryType')?.setValue(EntryType.CashDebit);
    expect(component.linesArray.at(0).get('debit')?.value).toBe(10000);
  });

  it('adds and focuses a Customer Credit row with Alt + N', fakeAsync(() => {
    const focusSpy = spyOn(SearchableSelectComponent.prototype, 'focus');
    const event = new KeyboardEvent('keydown', {
      altKey: true,
      key: 'n',
      cancelable: true
    });
    const preventDefaultSpy = spyOn(event, 'preventDefault').and.callThrough();

    document.dispatchEvent(event);
    fixture.detectChanges();
    tick();
    flush();

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(component.linesArray.length).toBe(3);
    expect(component.getEntryTypeVal(2)).toBe(EntryType.CustomerCredit);
    expect(focusSpy).toHaveBeenCalled();
  }));

  it('uses the same add-and-focus flow from the visible button', fakeAsync(() => {
    const focusSpy = spyOn(SearchableSelectComponent.prototype, 'focus');
    const addButton = Array.from(
      fixture.nativeElement.querySelectorAll('.grid-actions button') as NodeListOf<HTMLButtonElement>
    ).find(button => button.textContent?.includes('Add New Row (Alt + N)'));

    expect(addButton).toBeTruthy();
    addButton?.click();
    fixture.detectChanges();
    tick();

    expect(component.linesArray.length).toBe(3);
    expect(component.getEntryTypeVal(2)).toBe(EntryType.CustomerCredit);
    expect(focusSpy).toHaveBeenCalled();
  }));

  it('ignores Alt + N while the journal is loading', () => {
    component.loading = true;
    const event = new KeyboardEvent('keydown', {
      altKey: true,
      key: 'n',
      cancelable: true
    });

    document.dispatchEvent(event);

    expect(component.linesArray.length).toBe(2);
    expect(event.defaultPrevented).toBeFalse();
  });

  it('submits only once while a journal request is pending', () => {
    spyOnProperty(component.form, 'invalid', 'get').and.returnValue(false);
    spyOnProperty(component, 'balance', 'get').and.returnValue(0);
    api.post.and.returnValue(NEVER);

    component.onSubmit();
    component.onSubmit();

    expect(api.post).toHaveBeenCalledTimes(1);
  });
});
