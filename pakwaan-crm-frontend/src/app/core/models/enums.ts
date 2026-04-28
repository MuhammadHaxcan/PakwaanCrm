export enum VoucherType { Sales = 0, General = 1, Purchase = 2 }

export enum EntryType {
  CustomerDebit  = 0,  // Dr. Customer  — sale on credit
  CustomerCredit = 1,  // Cr. Customer  — payment received from customer
  VendorDebit    = 2,  // Dr. Vendor    — pay vendor / clear payable
  VendorCredit   = 3,  // Cr. Vendor    — purchase on credit
  Revenue        = 4,  // Cr. Revenue   — income earned
  Expense        = 5,  // Dr. Expense   — cost incurred
  CashDebit      = 6,  // Dr. Bank/Cash — money received into bank
  CashCredit     = 7   // Cr. Bank/Cash — money paid out of bank
}

export enum ItemUnit    { PerPerson = 0, PerKg = 1 }
export enum QuantityType{ PerPerson = 0, PerKg = 1 }

export const ENTRY_TYPE_LABELS: Record<EntryType, string> = {
  [EntryType.CustomerDebit]:  'Customer Debit  (Dr)',
  [EntryType.CustomerCredit]: 'Customer Credit (Cr)',
  [EntryType.VendorDebit]:    'Vendor Debit    (Dr)',
  [EntryType.VendorCredit]:   'Vendor Credit   (Cr)',
  [EntryType.Revenue]:        'Revenue         (Cr)',
  [EntryType.Expense]:        'Expense         (Dr)',
  [EntryType.CashDebit]:      'Account Debit   (Dr)',
  [EntryType.CashCredit]:     'Account Credit  (Cr)',
};
