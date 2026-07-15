import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatNativeDateModule } from '@angular/material/core';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { MasterDataService } from '../../core/services/master-data.service';
import { ToastService } from '../../core/services/toast.service';
import { SalesVoucherComponent } from './sales-voucher.component';

describe('SalesVoucherComponent', () => {
  let fixture: ComponentFixture<SalesVoucherComponent>;

  beforeEach(async () => {
    const masterData = jasmine.createSpyObj<MasterDataService>(
      'MasterDataService',
      ['loadCustomers', 'loadItems']
    );
    masterData.loadCustomers.and.returnValue(of([]));
    masterData.loadItems.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [SalesVoucherComponent, NoopAnimationsModule, MatNativeDateModule],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } },
        { provide: MasterDataService, useValue: masterData },
        { provide: ApiService, useValue: jasmine.createSpyObj<ApiService>('ApiService', ['get', 'post', 'put']) },
        { provide: ToastService, useValue: jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error']) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SalesVoucherComponent);
    fixture.detectChanges();
  });

  it('places Date and Notes in the same form row', () => {
    const dateInput = fixture.nativeElement.querySelector(
      'input[formControlName="date"]'
    ) as HTMLInputElement;
    const notesInput = fixture.nativeElement.querySelector(
      'input[formControlName="notes"]'
    ) as HTMLInputElement;
    const dateRow = dateInput.closest('.form-row');

    expect(dateRow).toBeTruthy();
    expect(notesInput.closest('.form-row')).toBe(dateRow);
    expect(dateRow?.querySelectorAll('mat-form-field').length).toBe(2);
  });
});
