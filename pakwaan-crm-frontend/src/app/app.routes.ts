import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell/shell.component';
import { authGuard, guestGuard } from './core/routing/auth.guards';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
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
  {
    path: 'print-sale-voucher/:voucherNo',
    title: 'Print Sales Voucher',
    canActivate: [authGuard],
    loadComponent: () => import('./features/print-voucher/print-voucher-page.component').then(m => m.PrintVoucherPageComponent)
  },
  {
    path: 'print-purchase-voucher/:voucherNo',
    title: 'Print Purchase Voucher',
    canActivate: [authGuard],
    loadComponent: () => import('./features/print-voucher/print-voucher-page.component').then(m => m.PrintVoucherPageComponent)
  },
  {
    path: 'print-journal-voucher/:voucherNo',
    title: 'Print Journal Voucher',
    canActivate: [authGuard],
    loadComponent: () => import('./features/print-voucher/print-voucher-page.component').then(m => m.PrintVoucherPageComponent)
  },
  {
    path: 'print-soa',
    title: 'Print SOA',
    canActivate: [authGuard],
    loadComponent: () => import('./features/print-report/print-report-page.component').then(m => m.PrintReportPageComponent)
  },
  {
    path: 'print-master-report',
    title: 'Print Master Report',
    canActivate: [authGuard],
    loadComponent: () => import('./features/print-report/print-report-page.component').then(m => m.PrintReportPageComponent)
  },
  { path: '**', redirectTo: 'login' }
];
