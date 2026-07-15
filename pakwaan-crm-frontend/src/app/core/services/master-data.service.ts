import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, finalize, shareReplay, take, tap } from 'rxjs';
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
  private customersInFlight: Observable<Customer[]> | null = null;
  private vendorsInFlight: Observable<Vendor[]> | null = null;
  private itemsInFlight: Observable<Item[]> | null = null;
  private accountsInFlight: Observable<Account[]> | null = null;

  loadCustomers(force = false): Observable<Customer[]> {
    if (this.customersInFlight) return this.customersInFlight;
    if (this.loaded.customers && !force) return this.customers$.pipe(take(1));
    this.customersInFlight = this.api.get<Customer[]>('/customers').pipe(
      tap(data => { this.customers$.next(data); this.loaded.customers = true; }),
      finalize(() => { this.customersInFlight = null; }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    return this.customersInFlight;
  }

  loadVendors(force = false): Observable<Vendor[]> {
    if (this.vendorsInFlight) return this.vendorsInFlight;
    if (this.loaded.vendors && !force) return this.vendors$.pipe(take(1));
    this.vendorsInFlight = this.api.get<Vendor[]>('/vendors').pipe(
      tap(data => { this.vendors$.next(data); this.loaded.vendors = true; }),
      finalize(() => { this.vendorsInFlight = null; }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    return this.vendorsInFlight;
  }

  loadItems(force = false): Observable<Item[]> {
    if (this.itemsInFlight) return this.itemsInFlight;
    if (this.loaded.items && !force) return this.items$.pipe(take(1));
    this.itemsInFlight = this.api.get<Item[]>('/items').pipe(
      tap(data => { this.items$.next(data); this.loaded.items = true; }),
      finalize(() => { this.itemsInFlight = null; }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    return this.itemsInFlight;
  }

  loadAccounts(force = false): Observable<Account[]> {
    if (this.accountsInFlight) return this.accountsInFlight;
    if (this.loaded.accounts && !force) return this.accounts$.pipe(take(1));
    this.accountsInFlight = this.api.get<Account[]>('/accounts').pipe(
      tap(data => { this.accounts$.next(data); this.loaded.accounts = true; }),
      finalize(() => { this.accountsInFlight = null; }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    return this.accountsInFlight;
  }

  reload() {
    this.loaded = { customers: false, vendors: false, items: false, accounts: false };
  }
}
