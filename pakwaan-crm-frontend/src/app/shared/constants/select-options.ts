import { ENTRY_TYPE_LABELS, EntryType, QuantityType } from '../../core/models/enums';
import { SelectOption } from '../components/searchable-select/searchable-select.component';

export const QUANTITY_TYPE_OPTIONS: SelectOption[] = [
  { id: QuantityType.PerPerson, name: 'Per Person' },
  { id: QuantityType.PerKg, name: 'Per Kg' }
];

export const ACCOUNT_TYPE_OPTIONS: SelectOption[] = [
  { id: 'Customer', name: 'Customer' },
  { id: 'Vendor', name: 'Vendor' }
];

export const VOUCHER_TYPE_FILTER_OPTIONS: SelectOption[] = [
  { id: '', name: 'All' },
  { id: '0', name: 'Sales' },
  { id: '1', name: 'General' },
  { id: '2', name: 'Purchase' }
];

export const JOURNAL_ENTRY_TYPE_OPTIONS: { value: EntryType; label: string }[] = [
  { value: EntryType.CustomerDebit, label: ENTRY_TYPE_LABELS[EntryType.CustomerDebit] },
  { value: EntryType.CustomerCredit, label: ENTRY_TYPE_LABELS[EntryType.CustomerCredit] },
  { value: EntryType.VendorDebit, label: ENTRY_TYPE_LABELS[EntryType.VendorDebit] },
  { value: EntryType.VendorCredit, label: ENTRY_TYPE_LABELS[EntryType.VendorCredit] },
  { value: EntryType.CashDebit, label: ENTRY_TYPE_LABELS[EntryType.CashDebit] },
  { value: EntryType.CashCredit, label: ENTRY_TYPE_LABELS[EntryType.CashCredit] },
  { value: EntryType.Revenue, label: ENTRY_TYPE_LABELS[EntryType.Revenue] },
  { value: EntryType.Expense, label: ENTRY_TYPE_LABELS[EntryType.Expense] }
];

export const JOURNAL_ENTRY_TYPE_SELECT_OPTIONS: SelectOption[] =
  JOURNAL_ENTRY_TYPE_OPTIONS.map(option => ({ id: option.value, name: option.label }));
