import { Component, OnInit, inject, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ApiService } from '../../core/services/api.service';
import { MasterDataService } from '../../core/services/master-data.service';
import { ToastService } from '../../core/services/toast.service';
import { Account, Customer, Item, Vendor } from '../../core/models/models';
import { ItemUnit } from '../../core/models/enums';

// ─── Customer Dialog ───────────────────────────────────────────────────────
@Component({
  selector: 'app-customer-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Edit' : 'Add' }} Customer</h2>
    <mat-dialog-content>
      <form [formGroup]="form" style="display:flex;flex-direction:column;gap:12px;padding-top:8px;min-width:320px">
        <mat-form-field appearance="outline">
          <mat-label>Name *</mat-label>
          <input matInput formControlName="name" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Phone</mat-label>
          <input matInput formControlName="phone" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Address</mat-label>
          <textarea matInput formControlName="address" rows="2"></textarea>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Opening Balance (PKR)</mat-label>
          <input matInput type="number" formControlName="openingBalance" step="0.01" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="save()">Save</button>
    </mat-dialog-actions>
  `
})
export class CustomerDialogComponent {
  form: FormGroup;
  constructor(
    private fb: FormBuilder,
    public ref: MatDialogRef<CustomerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Customer | null
  ) {
    this.form = fb.group({
      name: [data?.name ?? '', Validators.required],
      phone: [data?.phone ?? ''],
      address: [data?.address ?? ''],
      openingBalance: [data?.openingBalance ?? 0]
    });
  }
  save() { if (this.form.valid) this.ref.close(this.form.value); }
}

// ─── Vendor Dialog ─────────────────────────────────────────────────────────
@Component({
  selector: 'app-vendor-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Edit' : 'Add' }} Vendor</h2>
    <mat-dialog-content>
      <form [formGroup]="form" style="display:flex;flex-direction:column;gap:12px;padding-top:8px;min-width:320px">
        <mat-form-field appearance="outline"><mat-label>Name *</mat-label><input matInput formControlName="name" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Phone</mat-label><input matInput formControlName="phone" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Address</mat-label><textarea matInput formControlName="address" rows="2"></textarea></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Opening Balance (PKR)</mat-label><input matInput type="number" formControlName="openingBalance" step="0.01" /></mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="save()">Save</button>
    </mat-dialog-actions>
  `
})
export class VendorDialogComponent {
  form: FormGroup;
  constructor(private fb: FormBuilder, public ref: MatDialogRef<VendorDialogComponent>, @Inject(MAT_DIALOG_DATA) public data: Vendor | null) {
    this.form = fb.group({ name: [data?.name ?? '', Validators.required], phone: [data?.phone ?? ''], address: [data?.address ?? ''], openingBalance: [data?.openingBalance ?? 0] });
  }
  save() { if (this.form.valid) this.ref.close(this.form.value); }
}

// ─── Item Dialog ───────────────────────────────────────────────────────────
@Component({
  selector: 'app-item-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatRadioModule, MatSlideToggleModule],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Edit' : 'Add' }} Item</h2>
    <mat-dialog-content>
      <form [formGroup]="form" style="display:flex;flex-direction:column;gap:12px;padding-top:8px;min-width:320px">
        <mat-form-field appearance="outline"><mat-label>Name *</mat-label><input matInput formControlName="name" /></mat-form-field>
        <div>
          <label style="font-size:13px;color:#666">Unit</label>
          <mat-radio-group formControlName="unit" style="display:flex;gap:16px;margin-top:4px">
            <mat-radio-button [value]="0">Per Person</mat-radio-button>
            <mat-radio-button [value]="1">Per Kg</mat-radio-button>
          </mat-radio-group>
        </div>
        <mat-form-field appearance="outline"><mat-label>Default Rate (PKR)</mat-label><input matInput type="number" formControlName="defaultRate" step="0.01" min="0" /></mat-form-field>
        <mat-slide-toggle formControlName="isActive">Active</mat-slide-toggle>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="save()">Save</button>
    </mat-dialog-actions>
  `
})
export class ItemDialogComponent {
  form: FormGroup;
  constructor(private fb: FormBuilder, public ref: MatDialogRef<ItemDialogComponent>, @Inject(MAT_DIALOG_DATA) public data: Item | null) {
    this.form = fb.group({ name: [data?.name ?? '', Validators.required], unit: [data?.unit ?? ItemUnit.PerPerson], defaultRate: [data?.defaultRate ?? 0, [Validators.min(0)]], isActive: [data?.isActive ?? true] });
  }
  save() { if (this.form.valid) this.ref.close(this.form.value); }
}

// ─── Account Dialog ─────────────────────────────────────────────────────────
@Component({
  selector: 'app-account-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Edit' : 'Add' }} Account</h2>
    <mat-dialog-content>
      <form [formGroup]="form" style="display:flex;flex-direction:column;gap:12px;padding-top:8px;min-width:320px">
        <mat-form-field appearance="outline">
          <mat-label>Account Name *</mat-label>
          <input matInput formControlName="name" placeholder="e.g. Cash in Hand, Bank - HBL" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="save()">Save</button>
    </mat-dialog-actions>
  `
})
export class AccountDialogComponent {
  form: FormGroup;
  constructor(private fb: FormBuilder, public ref: MatDialogRef<AccountDialogComponent>, @Inject(MAT_DIALOG_DATA) public data: Account | null) {
    this.form = fb.group({ name: [data?.name ?? '', Validators.required] });
  }
  save() { if (this.form.valid) this.ref.close(this.form.value); }
}

// ─── Master Data Page ──────────────────────────────────────────────────────
@Component({
  selector: 'app-master-data',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatTabsModule, MatTableModule,
    MatButtonModule, MatIconModule, MatDialogModule,
    MatTooltipModule, LoadingSpinnerComponent
  ],
  template: `
    <div class="page-container">

      <!-- Page header -->
      <div class="page-header">
        <div class="ph-icon"><mat-icon>manage_accounts</mat-icon></div>
        <div class="ph-text">
          <h2>Master Data</h2>
          <p>Manage customers, vendors, items, and accounts</p>
        </div>
      </div>

      <mat-card>
        <mat-card-content style="padding:24px">
          <mat-tab-group>
            <!-- Customers -->
            <mat-tab label="Customers ({{ customers.length }})">
              <div style="display:flex;justify-content:space-between;align-items:center;margin:12px 0">
                <input class="search-input master-search" [(ngModel)]="custSearch" placeholder="Search customers..." />
                <button mat-flat-button color="primary" (click)="openCustomerDialog()">
                  <mat-icon>add</mat-icon> Add Customer
                </button>
              </div>
              <div *ngIf="loadingCustomers"><app-loading-spinner></app-loading-spinner></div>
              <div class="line-grid" *ngIf="!loadingCustomers">
                <table>
                  <thead><tr><th>#</th><th>Name</th><th>Phone</th><th>Address</th><th class="text-right">Opening Balance</th><th>Actions</th></tr></thead>
                  <tbody>
                    <tr *ngFor="let c of filteredCustomers">
                      <td class="text-muted">{{ c.id }}</td>
                      <td class="font-bold">{{ c.name }}</td>
                      <td>{{ c.phone }}</td>
                      <td class="text-muted">{{ c.address }}</td>
                      <td class="text-right">{{ c.openingBalance | number:'1.2-2' }}</td>
                      <td>
                        <button mat-icon-button color="primary" (click)="openCustomerDialog(c)" matTooltip="Edit"><mat-icon>edit</mat-icon></button>
                        <button mat-icon-button color="warn" (click)="deleteCustomer(c)" matTooltip="Delete"><mat-icon>delete</mat-icon></button>
                      </td>
                    </tr>
                    <tr *ngIf="filteredCustomers.length===0"><td colspan="6" class="text-center text-muted" style="padding:20px">No customers found.</td></tr>
                  </tbody>
                </table>
              </div>
            </mat-tab>

            <!-- Vendors -->
            <mat-tab label="Vendors ({{ vendors.length }})">
              <div style="display:flex;justify-content:space-between;align-items:center;margin:12px 0">
                <input class="search-input master-search" [(ngModel)]="vendSearch" placeholder="Search vendors..." />
                <button mat-flat-button color="primary" (click)="openVendorDialog()">
                  <mat-icon>add</mat-icon> Add Vendor
                </button>
              </div>
              <div *ngIf="loadingVendors"><app-loading-spinner></app-loading-spinner></div>
              <div class="line-grid" *ngIf="!loadingVendors">
                <table>
                  <thead><tr><th>#</th><th>Name</th><th>Phone</th><th>Address</th><th class="text-right">Opening Balance</th><th>Actions</th></tr></thead>
                  <tbody>
                    <tr *ngFor="let v of filteredVendors">
                      <td class="text-muted">{{ v.id }}</td>
                      <td class="font-bold">{{ v.name }}</td>
                      <td>{{ v.phone }}</td>
                      <td class="text-muted">{{ v.address }}</td>
                      <td class="text-right">{{ v.openingBalance | number:'1.2-2' }}</td>
                      <td>
                        <button mat-icon-button color="primary" (click)="openVendorDialog(v)" matTooltip="Edit"><mat-icon>edit</mat-icon></button>
                        <button mat-icon-button color="warn" (click)="deleteVendor(v)" matTooltip="Delete"><mat-icon>delete</mat-icon></button>
                      </td>
                    </tr>
                    <tr *ngIf="filteredVendors.length===0"><td colspan="6" class="text-center text-muted" style="padding:20px">No vendors found.</td></tr>
                  </tbody>
                </table>
              </div>
            </mat-tab>

            <!-- Items -->
            <mat-tab label="Items ({{ items.length }})">
              <div style="display:flex;justify-content:space-between;align-items:center;margin:12px 0">
                <input class="search-input master-search" [(ngModel)]="itemSearch" placeholder="Search items..." />
                <button mat-flat-button color="primary" (click)="openItemDialog()">
                  <mat-icon>add</mat-icon> Add Item
                </button>
              </div>
              <div *ngIf="loadingItems"><app-loading-spinner></app-loading-spinner></div>
              <div class="line-grid" *ngIf="!loadingItems">
                <table>
                  <thead><tr><th>#</th><th>Name</th><th>Unit</th><th class="text-right">Default Rate</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    <tr *ngFor="let item of filteredItems">
                      <td class="text-muted">{{ item.id }}</td>
                      <td class="font-bold">{{ item.name }}</td>
                      <td><span style="font-size:12px;background:#dbeafe;color:#1e40af;padding:2px 9px;border-radius:10px;font-weight:500">{{ item.unitLabel }}</span></td>
                      <td class="text-right">{{ item.defaultRate | number:'1.2-2' }}</td>
                      <td>
                        <span [style.background]="item.isActive?'#d1fae5':'#fee2e2'"
                          [style.color]="item.isActive?'#065f46':'#991b1b'"
                          style="font-size:11px;padding:2px 9px;border-radius:10px;font-weight:600">
                          {{ item.isActive ? 'Active' : 'Inactive' }}
                        </span>
                      </td>
                      <td>
                        <button mat-icon-button color="primary" (click)="openItemDialog(item)" matTooltip="Edit"><mat-icon>edit</mat-icon></button>
                        <button mat-icon-button color="warn" (click)="deleteItem(item)" matTooltip="Delete"><mat-icon>delete</mat-icon></button>
                      </td>
                    </tr>
                    <tr *ngIf="filteredItems.length===0"><td colspan="6" class="text-center text-muted" style="padding:20px">No items found.</td></tr>
                  </tbody>
                </table>
              </div>
            </mat-tab>

            <!-- Accounts -->
            <mat-tab label="Accounts ({{ accounts.length }})">
              <div style="display:flex;justify-content:space-between;align-items:center;margin:12px 0">
                <input class="search-input master-search" [(ngModel)]="accSearch" placeholder="Search accounts..." />
                <button mat-flat-button color="primary" (click)="openAccountDialog()">
                  <mat-icon>add</mat-icon> Add Account
                </button>
              </div>
              <div *ngIf="loadingAccounts"><app-loading-spinner></app-loading-spinner></div>
              <div class="line-grid" *ngIf="!loadingAccounts">
                <table>
                  <thead><tr><th>#</th><th>Name</th><th>Actions</th></tr></thead>
                  <tbody>
                    <tr *ngFor="let a of filteredAccounts">
                      <td class="text-muted">{{ a.id }}</td>
                      <td class="font-bold">{{ a.name }}</td>
                      <td>
                        <button mat-icon-button color="primary" (click)="openAccountDialog(a)" matTooltip="Edit"><mat-icon>edit</mat-icon></button>
                        <button mat-icon-button color="warn" (click)="deleteAccount(a)" matTooltip="Delete"><mat-icon>delete</mat-icon></button>
                      </td>
                    </tr>
                    <tr *ngIf="filteredAccounts.length===0"><td colspan="3" class="text-center text-muted" style="padding:20px">No accounts found.</td></tr>
                  </tbody>
                </table>
              </div>
            </mat-tab>
          </mat-tab-group>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .master-search {
      width: 260px;
    }
  `]
})
export class MasterDataComponent implements OnInit {
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private masterData = inject(MasterDataService);
  private toast = inject(ToastService);

  customers: Customer[] = []; vendors: Vendor[] = []; items: Item[] = []; accounts: Account[] = [];
  loadingCustomers = true; loadingVendors = true; loadingItems = true; loadingAccounts = true;
  custSearch = ''; vendSearch = ''; itemSearch = ''; accSearch = '';

  get filteredCustomers() { return this.customers.filter(c => c.name.toLowerCase().includes(this.custSearch.toLowerCase())); }
  get filteredVendors() { return this.vendors.filter(v => v.name.toLowerCase().includes(this.vendSearch.toLowerCase())); }
  get filteredItems() { return this.items.filter(i => i.name.toLowerCase().includes(this.itemSearch.toLowerCase())); }
  get filteredAccounts() { return this.accounts.filter(a => a.name.toLowerCase().includes(this.accSearch.toLowerCase())); }

  ngOnInit() {
    this.loadCustomers(); this.loadVendors(); this.loadItems(); this.loadAccounts();
  }

  loadCustomers() {
    this.loadingCustomers = true;
    this.api.get<Customer[]>('/customers').subscribe({ next: d => { this.customers = d; this.loadingCustomers = false; }, error: () => this.loadingCustomers = false });
  }
  loadVendors() {
    this.loadingVendors = true;
    this.api.get<Vendor[]>('/vendors').subscribe({ next: d => { this.vendors = d; this.loadingVendors = false; }, error: () => this.loadingVendors = false });
  }
  loadItems() {
    this.loadingItems = true;
    this.api.get<Item[]>('/items').subscribe({ next: d => { this.items = d; this.loadingItems = false; }, error: () => this.loadingItems = false });
  }
  loadAccounts() {
    this.loadingAccounts = true;
    this.api.get<Account[]>('/accounts').subscribe({ next: d => { this.accounts = d; this.loadingAccounts = false; }, error: () => this.loadingAccounts = false });
  }

  openCustomerDialog(customer?: Customer) {
    this.dialog.open(CustomerDialogComponent, { data: customer ?? null, width: '400px' })
      .afterClosed().subscribe(result => {
        if (!result) return;
        const obs = customer ? this.api.put(`/customers/${customer.id}`, result) : this.api.post('/customers', result);
        obs.subscribe({ next: () => { this.toast.success(customer ? 'Customer updated' : 'Customer added'); this.loadCustomers(); this.masterData.reload(); }, error: (e: Error) => this.toast.error(e.message) });
      });
  }
  deleteCustomer(c: Customer) {
    this.dialog.open(ConfirmDialogComponent, { data: { title: 'Delete Customer', message: `Delete "${c.name}"?` } })
      .afterClosed().subscribe(ok => {
        if (!ok) return;
        this.api.delete(`/customers/${c.id}`).subscribe({ next: () => { this.toast.success('Deleted'); this.loadCustomers(); this.masterData.reload(); }, error: (e: Error) => this.toast.error(e.message) });
      });
  }

  openVendorDialog(vendor?: Vendor) {
    this.dialog.open(VendorDialogComponent, { data: vendor ?? null, width: '400px' })
      .afterClosed().subscribe(result => {
        if (!result) return;
        const obs = vendor ? this.api.put(`/vendors/${vendor.id}`, result) : this.api.post('/vendors', result);
        obs.subscribe({ next: () => { this.toast.success(vendor ? 'Vendor updated' : 'Vendor added'); this.loadVendors(); this.masterData.reload(); }, error: (e: Error) => this.toast.error(e.message) });
      });
  }
  deleteVendor(v: Vendor) {
    this.dialog.open(ConfirmDialogComponent, { data: { title: 'Delete Vendor', message: `Delete "${v.name}"?` } })
      .afterClosed().subscribe(ok => {
        if (!ok) return;
        this.api.delete(`/vendors/${v.id}`).subscribe({ next: () => { this.toast.success('Deleted'); this.loadVendors(); this.masterData.reload(); }, error: (e: Error) => this.toast.error(e.message) });
      });
  }

  openItemDialog(item?: Item) {
    this.dialog.open(ItemDialogComponent, { data: item ?? null, width: '400px' })
      .afterClosed().subscribe(result => {
        if (!result) return;
        const obs = item ? this.api.put(`/items/${item.id}`, result) : this.api.post('/items', result);
        obs.subscribe({ next: () => { this.toast.success(item ? 'Item updated' : 'Item added'); this.loadItems(); this.masterData.reload(); }, error: (e: Error) => this.toast.error(e.message) });
      });
  }
  deleteItem(i: Item) {
    this.dialog.open(ConfirmDialogComponent, { data: { title: 'Delete Item', message: `Delete "${i.name}"?` } })
      .afterClosed().subscribe(ok => {
        if (!ok) return;
        this.api.delete(`/items/${i.id}`).subscribe({ next: () => { this.toast.success('Deleted'); this.loadItems(); this.masterData.reload(); }, error: (e: Error) => this.toast.error(e.message) });
      });
  }

  openAccountDialog(account?: Account) {
    this.dialog.open(AccountDialogComponent, { data: account ?? null, width: '400px' })
      .afterClosed().subscribe(result => {
        if (!result) return;
        const obs = account ? this.api.put(`/accounts/${account.id}`, result) : this.api.post('/accounts', result);
        obs.subscribe({ next: () => { this.toast.success(account ? 'Account updated' : 'Account added'); this.loadAccounts(); this.masterData.reload(); }, error: (e: Error) => this.toast.error(e.message) });
      });
  }
  deleteAccount(a: Account) {
    this.dialog.open(ConfirmDialogComponent, { data: { title: 'Delete Account', message: `Delete "${a.name}"?` } })
      .afterClosed().subscribe(ok => {
        if (!ok) return;
        this.api.delete(`/accounts/${a.id}`).subscribe({ next: () => { this.toast.success('Deleted'); this.loadAccounts(); this.masterData.reload(); }, error: (e: Error) => this.toast.error(e.message) });
      });
  }
}