import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatNativeDateModule } from '@angular/material/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { NEVER, of } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { MasterDataService } from '../../core/services/master-data.service';
import { ToastService } from '../../core/services/toast.service';
import { VendorPurchaseComponent } from './vendor-purchase.component';

describe('VendorPurchaseComponent', () => {
  let fixture: ComponentFixture<VendorPurchaseComponent>;
  let component: VendorPurchaseComponent;
  let api: jasmine.SpyObj<ApiService>;

  beforeEach(async () => {
    const masterData = jasmine.createSpyObj<MasterDataService>('MasterDataService', [
      'loadVendors', 'loadItems', 'reload'
    ]);
    masterData.loadVendors.and.returnValue(of([]));
    masterData.loadItems.and.returnValue(of([]));
    api = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'post', 'put']);

    await TestBed.configureTestingModule({
      imports: [VendorPurchaseComponent, NoopAnimationsModule, MatNativeDateModule],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } },
        { provide: MasterDataService, useValue: masterData },
        { provide: ApiService, useValue: api },
        { provide: ToastService, useValue: jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error', 'info']) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(VendorPurchaseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('submits only once while a purchase request is pending', () => {
    spyOnProperty(component.form, 'invalid', 'get').and.returnValue(false);
    api.post.and.returnValue(NEVER);

    component.onSubmit();
    component.onSubmit();

    expect(api.post).toHaveBeenCalledTimes(1);
  });
});
