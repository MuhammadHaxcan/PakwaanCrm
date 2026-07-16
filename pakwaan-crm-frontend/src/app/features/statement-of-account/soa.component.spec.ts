import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatNativeDateModule } from '@angular/material/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NEVER, of } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { MasterDataService } from '../../core/services/master-data.service';
import { SoaComponent } from './soa.component';

describe('SoaComponent request guards', () => {
  let fixture: ComponentFixture<SoaComponent>;
  let component: SoaComponent;
  let api: jasmine.SpyObj<ApiService>;

  beforeEach(async () => {
    const masterData = jasmine.createSpyObj<MasterDataService>('MasterDataService', ['loadCustomers', 'loadVendors']);
    masterData.loadCustomers.and.returnValue(of([]));
    masterData.loadVendors.and.returnValue(of([]));
    api = jasmine.createSpyObj<ApiService>('ApiService', ['get']);
    api.get.and.returnValue(NEVER);

    await TestBed.configureTestingModule({
      imports: [SoaComponent, NoopAnimationsModule, MatNativeDateModule],
      providers: [
        { provide: MasterDataService, useValue: masterData },
        { provide: ApiService, useValue: api }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SoaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.filterForm.get('accountType')?.setValue('Customer');
    component.filterForm.get('accountId')?.setValue(1);
  });

  it('starts only one SOA request while generation is pending', () => {
    component.generate();
    component.generate();

    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('shows and searches the item, quantity type, quantity, and rate details', () => {
    component.soa = {
      accountName: 'Customer 1',
      accountType: 'Customer',
      openingBalance: 0,
      closingBalance: 225,
      totalDebit: 225,
      totalCredit: 0,
      entries: [{
        date: '2026-07-16',
        voucherNo: 'SV-0001',
        salesOrderNo: 'SO-0001',
        voucherType: 'Sales',
        itemName: 'Meal',
        quantity: 2,
        quantityTypeLabel: 'Per Person',
        rate: 100,
        description: 'Lunch',
        deliveryCharge: 25,
        debit: 225,
        credit: 0,
        runningBalance: 225
      }]
    };
    component.searchTerm = 'meal';
    fixture.detectChanges();

    expect(component.filteredEntries).toHaveSize(1);
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Qty Type');
    expect(text).toContain('Meal');
    expect(text).toContain('Per Person');
    expect(text).toContain('100.00');
  });
});
