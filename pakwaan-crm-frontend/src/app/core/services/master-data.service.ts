import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, take, tap } from 'rxjs';
import { Account, Customer, Item, Vendor } from '../models/models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class MasterDataService {
  private api = inject(ApiService);

  readonly customers$ = new BehaviorSubject<Customer[]>([]);
  readonly vendors$ = new BehaviorSubject<Vendor[]>([]);
  readonly items$ = new BehaviorSubject<Item[]>([]);
  readonly accounts$ = new BehaviorSubject<Account[]>([]);

  private loaded = { customers: false, vendors: false, items: false, accounts: false };

  loadCustomers(force = false): Observable<Customer[]> {
    if (this.loaded.customers && !force) return this.customers$.pipe(take(1));
    return this.api.get<Customer[]>('/customers').pipe(
      tap(data => { this.customers$.next(data); this.loaded.customers = true; })
    );
  }

  loadVendors(force = false): Observable<Vendor[]> {
    if (this.loaded.vendors && !force) return this.vendors$.pipe(take(1));
    return this.api.get<Vendor[]>('/vendors').pipe(
      tap(data => { this.vendors$.next(data); this.loaded.vendors = true; })
    );
  }

  loadItems(force = false): Observable<Item[]> {
    if (this.loaded.items && !force) return this.items$.pipe(take(1));
    return this.api.get<Item[]>('/items').pipe(
      tap(data => { this.items$.next(data); this.loaded.items = true; })
    );
  }

  loadAccounts(force = false): Observable<Account[]> {
    if (this.loaded.accounts && !force) return this.accounts$.pipe(take(1));
    return this.api.get<Account[]>('/accounts').pipe(
      tap(data => { this.accounts$.next(data); this.loaded.accounts = true; })
    );
  }

  reload() {
    this.loaded = { customers: false, vendors: false, items: false, accounts: false };
  }
}
