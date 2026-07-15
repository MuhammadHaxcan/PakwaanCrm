import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NEVER, Subject, of } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { MasterDataService } from '../../core/services/master-data.service';
import { ToastService } from '../../core/services/toast.service';
import { MasterDataComponent } from './master-data.component';

describe('MasterDataComponent action guards', () => {
  let fixture: ComponentFixture<MasterDataComponent>;
  let component: MasterDataComponent;
  let api: jasmine.SpyObj<ApiService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let dialogResult: Subject<unknown>;

  beforeEach(async () => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'post', 'put', 'delete']);
    api.get.and.returnValue(of([]));
    api.post.and.returnValue(NEVER);
    api.put.and.returnValue(NEVER);
    api.delete.and.returnValue(NEVER);
    dialogResult = new Subject<unknown>();
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    dialog.open.and.returnValue({ afterClosed: () => dialogResult } as never);

    await TestBed.configureTestingModule({
      imports: [MasterDataComponent, NoopAnimationsModule],
      providers: [
        { provide: ApiService, useValue: api },
        { provide: MatDialog, useValue: dialog },
        { provide: MasterDataService, useValue: jasmine.createSpyObj<MasterDataService>('MasterDataService', ['reload']) },
        { provide: ToastService, useValue: jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error', 'info']) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MasterDataComponent);
    component = fixture.componentInstance;
    (component as unknown as { dialog: MatDialog }).dialog = dialog;
    fixture.detectChanges();
  });

  it('opens only one action dialog and blocks other actions during its mutation', () => {
    component.openCustomerDialog();
    component.openCustomerDialog();
    expect(dialog.open).toHaveBeenCalledTimes(1);

    dialogResult.next({ name: 'Customer', openingBalance: 0 });
    component.openVendorDialog();

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(dialog.open).toHaveBeenCalledTimes(1);
  });

  it('opens only one delete confirmation', () => {
    component.deleteCustomer({ id: 1, name: 'Customer', openingBalance: 0, createdAt: '' });
    component.deleteCustomer({ id: 1, name: 'Customer', openingBalance: 0, createdAt: '' });

    expect(dialog.open).toHaveBeenCalledTimes(1);
  });
});
