import { OverlayContainer } from '@angular/cdk/overlay';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatNativeDateModule } from '@angular/material/core';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NEVER, of } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { MasterDataService } from '../../core/services/master-data.service';
import { MasterReportComponent } from './master-report.component';

describe('MasterReportComponent request guards', () => {
  let fixture: ComponentFixture<MasterReportComponent>;
  let component: MasterReportComponent;
  let api: jasmine.SpyObj<ApiService>;
  let overlayElement: HTMLElement;

  beforeEach(async () => {
    const masterData = jasmine.createSpyObj<MasterDataService>('MasterDataService', ['loadCustomers', 'loadVendors']);
    masterData.loadCustomers.and.returnValue(of([]));
    masterData.loadVendors.and.returnValue(of([]));
    api = jasmine.createSpyObj<ApiService>('ApiService', ['get']);
    api.get.and.returnValue(NEVER);

    await TestBed.configureTestingModule({
      imports: [MasterReportComponent, NoopAnimationsModule, MatNativeDateModule],
      providers: [
        { provide: MasterDataService, useValue: masterData },
        { provide: ApiService, useValue: api }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MasterReportComponent);
    component = fixture.componentInstance;
    overlayElement = TestBed.inject(OverlayContainer).getContainerElement();
    fixture.detectChanges();
  });

  it('starts only one report generation while requests are pending', () => {
    component.generate();
    component.generate();

    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('starts only one load-more request while it is pending', () => {
    component.hasMore = true;

    component.loadMore();
    component.loadMore();

    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('hides column options in a menu that stays open while toggling', () => {
    component.entries = [{
      date: '2026-07-15',
      voucherNo: 'JV-1',
      voucherType: 'Journal',
      accountName: 'Cash',
      accountCategory: 'CashDebit',
      debit: 0,
      credit: 0,
      runningBalance: 0
    }];
    fixture.detectChanges();

    expect(overlayElement.querySelectorAll('[data-testid="column-option"]')).toHaveSize(0);

    const trigger = fixture.debugElement.query(By.css('[data-testid="columns-menu-trigger"]'));
    expect(trigger).not.toBeNull();
    if (!trigger) return;
    trigger.nativeElement.click();
    fixture.detectChanges();

    expect(overlayElement.querySelectorAll('[data-testid="column-option"]'))
      .toHaveSize(component.columnKeys.length);

    const firstCheckbox = overlayElement.querySelector<HTMLInputElement>(
      '[data-testid="column-option"] input'
    );
    expect(firstCheckbox).not.toBeNull();
    firstCheckbox!.click();
    fixture.detectChanges();

    expect(overlayElement.querySelectorAll('[data-testid="column-option"]'))
      .toHaveSize(component.columnKeys.length);
  });

  it('renders account totals without a separate heading bar', () => {
    component.balances = [{
      id: 1,
      name: 'Cash',
      accountType: 'Account',
      openingBalance: 0,
      totalDebit: 100,
      totalCredit: 0,
      balance: 100
    }];
    fixture.detectChanges();

    const totalsStage = fixture.nativeElement.querySelector('.account-totals-stage');
    expect(totalsStage).not.toBeNull();
    expect(totalsStage.querySelector('.line-grid')).not.toBeNull();
    expect(totalsStage.querySelector('.account-totals-header')).toBeNull();
    expect(totalsStage.querySelector('.account-count')).toBeNull();
  });
});
