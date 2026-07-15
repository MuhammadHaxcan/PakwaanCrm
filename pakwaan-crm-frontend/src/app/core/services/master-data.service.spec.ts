import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { Customer } from '../models/models';
import { ApiService } from './api.service';
import { MasterDataService } from './master-data.service';

describe('MasterDataService', () => {
  let service: MasterDataService;
  let api: jasmine.SpyObj<ApiService>;
  const customers: Customer[] = [{
    id: 1,
    name: 'NASIR',
    openingBalance: 0,
    createdAt: '2026-07-15T00:00:00Z'
  }];

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['get']);
    TestBed.configureTestingModule({
      providers: [MasterDataService, { provide: ApiService, useValue: api }]
    });
    service = TestBed.inject(MasterDataService);
  });

  it('shares one in-flight customer request between concurrent callers', () => {
    const response = new Subject<Customer[]>();
    api.get.and.returnValue(response);

    service.loadCustomers().subscribe();
    service.loadCustomers().subscribe();

    expect(api.get).toHaveBeenCalledOnceWith('/customers');
    response.next(customers);
    response.complete();
  });

  it('returns cached customers until a forced reload', () => {
    api.get.and.returnValues(of(customers), of(customers));

    service.loadCustomers().subscribe();
    service.loadCustomers().subscribe();
    expect(api.get).toHaveBeenCalledTimes(1);

    service.loadCustomers(true).subscribe();
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('allows retrying after a failed request', () => {
    api.get.and.returnValues(
      throwError(() => new Error('network')),
      of(customers)
    );

    service.loadCustomers().subscribe({ error: () => undefined });
    service.loadCustomers().subscribe();

    expect(api.get).toHaveBeenCalledTimes(2);
    expect(service.customers$.value).toEqual(customers);
  });
});
