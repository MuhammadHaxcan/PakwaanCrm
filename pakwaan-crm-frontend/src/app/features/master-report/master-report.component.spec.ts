import { AccountBalance, MasterReportEntry } from '../../core/models/models';
import { buildFilteredAccountBalances } from './master-report.component';

describe('buildFilteredAccountBalances', () => {
  const balances: AccountBalance[] = [
    {
      id: 1,
      name: 'Noor Wedding Services',
      accountType: 'Customer',
      openingBalance: 5000,
      totalDebit: 6700,
      totalCredit: 35000,
      balance: -23300
    }
  ];

  const entries: MasterReportEntry[] = [
    {
      date: '2026-05-10',
      voucherNo: 'SV-0003',
      voucherType: 'Sales',
      accountName: 'Noor Wedding Services',
      accountCategory: 'CustomerDebit',
      debit: 3000,
      credit: 0,
      runningBalance: 3000
    },
    {
      date: '2026-05-11',
      voucherNo: 'SV-0004',
      voucherType: 'Sales',
      accountName: 'Noor Wedding Services',
      accountCategory: 'CustomerDebit',
      debit: 3200,
      credit: 0,
      runningBalance: 6200
    },
    {
      date: '2026-05-12',
      voucherNo: 'JV-0003',
      voucherType: 'Journal',
      accountName: 'Noor Wedding Services',
      accountCategory: 'CustomerCredit',
      debit: 0,
      credit: 35000,
      runningBalance: -28800
    }
  ];

  it('recalculates totals from only the entries matched by a voucher search', () => {
    const result = buildFilteredAccountBalances(entries, balances, 'SV-0003');

    expect(result.length).toBe(1);
    expect(result[0].totalDebit).toBe(3000);
    expect(result[0].totalCredit).toBe(0);
    expect(result[0].balance).toBe(3000);
  });

  it('keeps the server balances unchanged when no text search is active', () => {
    expect(buildFilteredAccountBalances(entries, balances, '')).toEqual(balances);
  });

  it('removes opening balance from an account-name search result', () => {
    const result = buildFilteredAccountBalances(entries, balances, 'Noor Wedding');

    expect(result[0].openingBalance).toBe(0);
    expect(result[0].balance).toBe(-28300);
  });
});
