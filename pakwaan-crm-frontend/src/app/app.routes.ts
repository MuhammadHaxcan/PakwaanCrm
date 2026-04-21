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
        loadComponent: () => import('./features/sales-voucher/sales-voucher.component').then(m => m.SalesVoucherComponent)
      },
      {
        path: 'vendor-purchases',
        loadComponent: () => import('./features/vendor-purchase/vendor-purchase.component').then(m => m.VendorPurchaseComponent)
      },
      {
        path: 'journal-voucher',
        loadComponent: () => import('./features/journal-voucher/journal-voucher.component').then(m => m.GeneralVoucherComponent)
      },
      {
        path: 'soa',
        loadComponent: () => import('./features/statement-of-account/soa.component').then(m => m.SoaComponent)
      },
      {
        path: 'master-report',
        loadComponent: () => import('./features/master-report/master-report.component').then(m => m.MasterReportComponent)
      },
      {
        path: 'master-data',
        loadComponent: () => import('./features/master-data/master-data.component').then(m => m.MasterDataComponent)
      },
    ]
  },
  { path: '**', redirectTo: '' }
];
