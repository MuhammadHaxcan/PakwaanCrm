import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell/shell.component';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', redirectTo: 'sales-voucher', pathMatch: 'full' },
      {
        path: 'sales-voucher',
        title: 'Sales Voucher',
        loadComponent: () => import('./features/sales-voucher/sales-voucher.component').then(m => m.SalesVoucherComponent)
      },
      {
        path: 'sales-voucher/:id/edit',
        title: 'Edit Sales Voucher',
        loadComponent: () => import('./features/sales-voucher/sales-voucher.component').then(m => m.SalesVoucherComponent)
      },
      {
        path: 'vendor-purchases',
        title: 'Vendor Purchase',
        loadComponent: () => import('./features/vendor-purchase/vendor-purchase.component').then(m => m.VendorPurchaseComponent)
      },
      {
        path: 'vendor-purchases/:id/edit',
        title: 'Edit Vendor Purchase',
        loadComponent: () => import('./features/vendor-purchase/vendor-purchase.component').then(m => m.VendorPurchaseComponent)
      },
      {
        path: 'journal-voucher',
        title: 'Journal Voucher',
        loadComponent: () => import('./features/journal-voucher/journal-voucher.component').then(m => m.GeneralVoucherComponent)
      },
      {
        path: 'journal-voucher/:id/edit',
        title: 'Edit Journal Voucher',
        loadComponent: () => import('./features/journal-voucher/journal-voucher.component').then(m => m.GeneralVoucherComponent)
      },
      {
        path: 'voucher-lookup',
        title: 'Voucher Lookup',
        loadComponent: () => import('./features/voucher-lookup/voucher-lookup.component').then(m => m.VoucherLookupComponent)
      },
      {
        path: 'soa',
        title: 'SOA',
        loadComponent: () => import('./features/statement-of-account/soa.component').then(m => m.SoaComponent)
      },
      {
        path: 'master-report',
        title: 'Master Report',
        loadComponent: () => import('./features/master-report/master-report.component').then(m => m.MasterReportComponent)
      },
      {
        path: 'master-data',
        title: 'Master Data',
        loadComponent: () => import('./features/master-data/master-data.component').then(m => m.MasterDataComponent)
      },
    ]
  },
  { path: '**', redirectTo: '' }
];
