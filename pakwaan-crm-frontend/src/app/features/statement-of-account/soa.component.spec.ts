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
});
