import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatNativeDateModule } from '@angular/material/core';
import { ActivatedRoute } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { MasterDataService } from '../../core/services/master-data.service';
import { ToastService } from '../../core/services/toast.service';
import { CustomerDateSalesVoucherComponent } from './customer-date-sales-voucher.component';

describe('CustomerDateSalesVoucherComponent', () => {
  let fixture: ComponentFixture<CustomerDateSalesVoucherComponent>;

  beforeEach(async () => {
    const masterData = jasmine.createSpyObj<MasterDataService>('MasterDataService', ['loadCustomers', 'loadItems']);
    masterData.loadCustomers.and.returnValue(of([]));
    masterData.loadItems.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [CustomerDateSalesVoucherComponent, NoopAnimationsModule, MatNativeDateModule],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } },
        { provide: MasterDataService, useValue: masterData },
        { provide: ApiService, useValue: jasmine.createSpyObj<ApiService>('ApiService', ['get', 'post', 'put']) },
        { provide: ToastService, useValue: jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error', 'info']) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CustomerDateSalesVoucherComponent);
    fixture.detectChanges();
  });

  it('calculates delivery-inclusive totals', () => {
    const component = fixture.componentInstance;
    component.linesArray.at(0).patchValue({ quantity: 3, rate: 50, deliveryCharge: 15 });

    expect(component.getAmount(0)).toBe(150);
    expect(component.getLineTotal(0)).toBe(165);
    expect(component.baseAmount).toBe(150);
    expect(component.deliveryTotal).toBe(15);
    expect(component.totalAmount).toBe(165);
  });
});
