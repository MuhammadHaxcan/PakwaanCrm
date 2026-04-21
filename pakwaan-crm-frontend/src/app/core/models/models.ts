import { EntryType, ItemUnit, QuantityType, VoucherType } from './enums';

export interface Customer {
  id: number; name: string; phone?: string; address?: string;
  openingBalance: number; createdAt: string;
}
export interface Vendor {
  id: number; name: string; phone?: string; address?: string;
  openingBalance: number; createdAt: string;
}
export interface Item {
  id: number; name: string; unit: ItemUnit; unitLabel: string;
  defaultRate: number; isActive: boolean;
}

export interface VoucherListItem {
  id: number; voucherNo: string; date: string;
  voucherType: VoucherType; voucherTypeLabel: string;
  description?: string; totalDebit: number; totalCredit: number; createdAt: string;
}
export interface VoucherLine {
  id: number; entryType: EntryType; entryTypeLabel: string;
  customerId?: number; customerName?: string;
  vendorId?: number; vendorName?: string;
  freeText?: string; itemId?: number; itemName?: string;
  quantityType?: QuantityType; quantity?: number; rate?: number;
  description?: string; debit: number; credit: number;
}
export interface VoucherDetail {
  id: number; voucherNo: string; date: string;
  voucherType: VoucherType; description?: string; notes?: string;
  createdAt: string; lines: VoucherLine[];
}

// Report models
export interface SoaEntry {
  date: string; voucherNo: string; voucherType: string;
  description?: string; debit: number; credit: number; runningBalance: number;
}
export interface SoaResponse {
  accountName: string; accountType: string; openingBalance: number;
  entries: SoaEntry[]; closingBalance: number; totalDebit: number; totalCredit: number;
}
export interface MasterReportEntry {
  date: string; voucherNo: string; voucherType: string; description?: string;
  accountName: string; accountCategory: string;
  itemName?: string; quantity?: number; quantityTypeLabel?: string; rate?: number;
  debit: number; credit: number;
}
export interface MasterReportResponse {
  entries: MasterReportEntry[]; totalRecords: number;
  hasMoreData: boolean; totalDebit: number; totalCredit: number;
}
export interface AccountBalance {
  id: number; name: string; accountType: string;
  openingBalance: number; totalDebit: number; totalCredit: number; balance: number;
}

// Request models
export interface CreateCustomerRequest { name: string; phone?: string; address?: string; openingBalance: number; }
export interface CreateVendorRequest { name: string; phone?: string; address?: string; openingBalance: number; }
export interface CreateItemRequest { name: string; unit: ItemUnit; defaultRate: number; isActive: boolean; }

export interface SalesLineRequest {
  customerId: number; itemId: number; quantityType: QuantityType;
  quantity: number; rate: number; description?: string;
}
export interface CreateSalesVoucherRequest {
  date: string; description?: string; notes?: string; lines: SalesLineRequest[];
}

export interface GeneralLineRequest {
  entryType: EntryType; customerId?: number; vendorId?: number;
  freeText?: string; description?: string; debit: number; credit: number;
}
export interface CreateJournalVoucherRequest {
  date: string; description?: string; notes?: string; lines: GeneralLineRequest[];
}

export interface VendorPurchaseLineRequest {
  itemName?: string;
  quantity: number;
  rate: number;
  description?: string;
}

export interface CreateVendorPurchaseRequest {
  date: string;
  vendorId: number;
  description?: string;
  notes?: string;
  paidAmount: number;
  paymentAccountName?: string;
  paymentDescription?: string;
  lines: VendorPurchaseLineRequest[];
}
