import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { buildVoucherPrintRoute } from '../../core/utils/voucher-print.utils';

@Injectable({ providedIn: 'root' })
export class PrintWindowService {
  private readonly document = inject(DOCUMENT);

  preOpen(expectedCount: number): Window[] {
    const tabs: Window[] = [];
    for (let index = 0; index < expectedCount; index++) {
      const tab = this.document.defaultView?.open('about:blank', '_blank');
      if (!tab) continue;
      this.renderLoadingState(tab);
      tabs.push(tab);
    }
    return tabs;
  }

  route(tabs: Window[], voucherNos: string[]): void {
    tabs.forEach((tab, index) => {
      const voucherNo = voucherNos[index];
      if (!voucherNo) {
        this.closeTab(tab);
        return;
      }
      tab.location.href = buildVoucherPrintRoute('Sales', voucherNo);
    });
  }

  close(tabs: Window[]): void {
    tabs.forEach(tab => this.closeTab(tab));
  }

  private renderLoadingState(tab: Window): void {
    try {
      tab.document.title = 'Preparing print preview';
      const message = tab.document.createElement('p');
      message.textContent = 'Preparing print preview...';
      message.style.fontFamily = 'sans-serif';
      message.style.padding = '24px';
      tab.document.body.replaceChildren(message);
    } catch {
      // The tab can still be routed if its document is unavailable.
    }
  }

  private closeTab(tab: Window): void {
    if (!tab.closed) tab.close();
  }
}
