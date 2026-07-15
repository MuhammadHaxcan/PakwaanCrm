import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { NEVER, Subject } from 'rxjs';
import { VoucherDetail } from '../../core/models/models';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { VoucherLookupComponent } from './voucher-lookup.component';

describe('VoucherLookupComponent request guards', () => {
  let fixture: ComponentFixture<VoucherLookupComponent>;
  let component: VoucherLookupComponent;
  let api: jasmine.SpyObj<ApiService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let confirmed: Subject<boolean>;

  beforeEach(async () => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'delete']);
    confirmed = new Subject<boolean>();
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    dialog.open.and.returnValue({ afterClosed: () => confirmed } as never);

    await TestBed.configureTestingModule({
      imports: [VoucherLookupComponent, NoopAnimationsModule],
      providers: [
        { provide: ApiService, useValue: api },
        { provide: MatDialog, useValue: dialog },
        { provide: Router, useValue: jasmine.createSpyObj<Router>('Router', ['navigate']) },
        { provide: ToastService, useValue: jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error', 'info']) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(VoucherLookupComponent);
    component = fixture.componentInstance;
    component.voucherNo = 'SV-1';
    component.voucher = { id: 1, voucherNo: 'SV-1', lines: [] } as unknown as VoucherDetail;
    api.get.and.returnValue(NEVER);
    api.delete.and.returnValue(NEVER);
    fixture.detectChanges();
  });

  it('starts only one lookup while the first request is pending', () => {
    component.lookupVoucher();
    component.lookupVoucher();

    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('opens only one delete confirmation and starts only one delete request', () => {
    component.deleteVoucher();
    component.deleteVoucher();
    expect(dialog.open).toHaveBeenCalledTimes(1);

    confirmed.next(true);
    component.deleteVoucher();

    expect(api.delete).toHaveBeenCalledTimes(1);
  });
});
