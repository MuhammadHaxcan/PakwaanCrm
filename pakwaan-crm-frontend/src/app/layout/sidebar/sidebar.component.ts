import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterModule, MatListModule, MatIconModule],
  template: `
    <div class="sidebar-wrap">
      <!-- Logo -->
      <div class="sidebar-brand">
        <div class="brand-icon">
          <mat-icon>restaurant</mat-icon>
        </div>
        <div class="brand-text">
          <span class="brand-name">Pakwaan</span>
          <span class="brand-sub">CRM</span>
        </div>
      </div>

      <div class="nav-section-label">ACCOUNTING</div>

      <nav>
        <a class="nav-item" routerLink="/sales-voucher" routerLinkActive="nav-active">
          <div class="nav-icon-wrap"><mat-icon>receipt_long</mat-icon></div>
          <span>Sales Voucher</span>
        </a>
        <a class="nav-item" routerLink="/vendor-purchases" routerLinkActive="nav-active">
          <div class="nav-icon-wrap"><mat-icon>inventory_2</mat-icon></div>
          <span>Vendor Purchase</span>
        </a>
        <a class="nav-item" routerLink="/journal-voucher" routerLinkActive="nav-active">
          <div class="nav-icon-wrap"><mat-icon>menu_book</mat-icon></div>
          <span>Journal Voucher</span>
        </a>
        <a class="nav-item" routerLink="/voucher-lookup" routerLinkActive="nav-active">
          <div class="nav-icon-wrap"><mat-icon>manage_search</mat-icon></div>
          <span>Voucher Lookup</span>
        </a>
        <a class="nav-item" routerLink="/soa" routerLinkActive="nav-active">
          <div class="nav-icon-wrap"><mat-icon>account_balance_wallet</mat-icon></div>
          <span>Statement of Account</span>
        </a>
        <a class="nav-item" routerLink="/master-report" routerLinkActive="nav-active">
          <div class="nav-icon-wrap"><mat-icon>bar_chart</mat-icon></div>
          <span>Master Report</span>
        </a>

        <div class="nav-divider"></div>
        <div class="nav-section-label" style="padding-left:20px">SETUP</div>

        <a class="nav-item" routerLink="/master-data" routerLinkActive="nav-active">
          <div class="nav-icon-wrap"><mat-icon>manage_accounts</mat-icon></div>
          <span>Master Data</span>
        </a>
      </nav>

      <div class="sidebar-footer">
        <mat-icon style="font-size:16px;width:16px;height:16px;opacity:.5">copyright</mat-icon>
        <span>2025 Pakwaan CRM</span>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }

    .sidebar-wrap {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: linear-gradient(175deg, #1a237e 0%, #283593 45%, #3949ab 100%);
      overflow: hidden;
    }

    /* Brand */
    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 22px 20px 18px;
      border-bottom: 1px solid rgba(255,255,255,.1);
    }
    .brand-icon {
      width: 40px; height: 40px;
      border-radius: 12px;
      background: rgba(255,255,255,.18);
      display: flex; align-items: center; justify-content: center;
      backdrop-filter: blur(4px);
      flex-shrink: 0;
    }
    .brand-icon mat-icon { color: #fff; font-size: 22px; width: 22px; height: 22px; }
    .brand-text { display: flex; align-items: baseline; gap: 4px; }
    .brand-name { color: #fff; font-size: 17px; font-weight: 700; letter-spacing: -.2px; }
    .brand-sub  { color: rgba(255,255,255,.6); font-size: 11px; font-weight: 500; letter-spacing: 1px; text-transform: uppercase; }

    /* Section label */
    .nav-section-label {
      padding: 14px 20px 4px;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 1.2px;
      color: rgba(255,255,255,.4);
      text-transform: uppercase;
    }

    /* Nav items */
    nav { padding: 4px 12px; flex: 1; }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 10px;
      color: rgba(255,255,255,.75);
      text-decoration: none;
      font-size: 13.5px;
      font-weight: 500;
      margin-bottom: 2px;
      transition: background .15s, color .15s;
      cursor: pointer;
    }
    .nav-item:hover {
      background: rgba(255,255,255,.1);
      color: #fff;
    }
    .nav-item.nav-active {
      background: rgba(255,255,255,.18);
      color: #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,.18);
    }

    .nav-icon-wrap {
      width: 32px; height: 32px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 8px;
      background: rgba(255,255,255,.08);
      flex-shrink: 0;
      transition: background .15s;
    }
    .nav-item:hover .nav-icon-wrap,
    .nav-item.nav-active .nav-icon-wrap {
      background: rgba(255,255,255,.2);
    }
    .nav-icon-wrap mat-icon { color: rgba(255,255,255,.9); font-size: 18px; width: 18px; height: 18px; }

    /* Divider */
    .nav-divider {
      border-top: 1px solid rgba(255,255,255,.1);
      margin: 10px 0 4px;
    }

    /* Footer */
    .sidebar-footer {
      padding: 14px 20px;
      display: flex;
      align-items: center;
      gap: 6px;
      border-top: 1px solid rgba(255,255,255,.1);
      color: rgba(255,255,255,.35);
      font-size: 11px;
    }
  `]
})
export class SidebarComponent {}
