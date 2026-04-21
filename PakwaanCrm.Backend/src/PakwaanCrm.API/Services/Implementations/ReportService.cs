using Microsoft.EntityFrameworkCore;
using PakwaanCrm.API.Data;
using PakwaanCrm.API.DTOs.Responses;
using PakwaanCrm.API.Enums;
using PakwaanCrm.API.Services.Interfaces;

namespace PakwaanCrm.API.Services.Implementations;

public class ReportService : IReportService
{
    private readonly AppDbContext _context;

    public ReportService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<SoaResponseDto?> GetSoaAsync(
        string accountType, int accountId,
        DateTime? startDate, DateTime? endDate,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(accountType))
            return null;

        string accountName;
        decimal baseOpeningBalance;
        bool isCustomer;

        if (accountType.Equals("Customer", StringComparison.OrdinalIgnoreCase))
        {
            var customer = await _context.Customers.FirstOrDefaultAsync(c => c.Id == accountId, ct);
            if (customer == null) return null;
            accountName = customer.Name;
            baseOpeningBalance = customer.OpeningBalance;
            isCustomer = true;
        }
        else if (accountType.Equals("Vendor", StringComparison.OrdinalIgnoreCase))
        {
            var vendor = await _context.Vendors.FirstOrDefaultAsync(v => v.Id == accountId, ct);
            if (vendor == null) return null;
            accountName = vendor.Name;
            baseOpeningBalance = vendor.OpeningBalance;
            isCustomer = false;
        }
        else
        {
            return null;
        }

        var fromDate = startDate?.Date;
        var toExclusive = endDate?.Date.AddDays(1);

        var accountLinesQuery = isCustomer
            ? _context.VoucherLines.Include(l => l.Voucher).Where(l => l.CustomerId == accountId)
            : _context.VoucherLines.Include(l => l.Voucher).Where(l => l.VendorId == accountId);

        decimal openingBalance = baseOpeningBalance;
        if (fromDate.HasValue)
        {
            var previousEntries = await accountLinesQuery
                .Where(l => l.Voucher.Date < fromDate.Value)
                .Select(l => new { l.Debit, l.Credit })
                .ToListAsync(ct);

            openingBalance += previousEntries.Sum(entry => GetBalanceDelta(entry.Debit, entry.Credit, isCustomer));
        }

        var periodQuery = accountLinesQuery;
        if (fromDate.HasValue)
            periodQuery = periodQuery.Where(l => l.Voucher.Date >= fromDate.Value);
        if (toExclusive.HasValue)
            periodQuery = periodQuery.Where(l => l.Voucher.Date < toExclusive.Value);

        var rawEntries = await periodQuery
            .OrderBy(l => l.Voucher.Date)
            .ThenBy(l => l.Voucher.VoucherNo)
            .Select(l => new
            {
                l.Voucher.Date,
                l.Voucher.VoucherNo,
                l.Voucher.VoucherType,
                Description = l.Description ?? l.Voucher.Description,
                l.Debit,
                l.Credit
            })
            .ToListAsync(ct);

        var entries = new List<SoaEntryDto>();
        var running = openingBalance;

        foreach (var entry in rawEntries)
        {
            running += GetBalanceDelta(entry.Debit, entry.Credit, isCustomer);
            entries.Add(new SoaEntryDto
            {
                Date = entry.Date,
                VoucherNo = entry.VoucherNo,
                VoucherType = GetVoucherTypeLabel(entry.VoucherType),
                Description = entry.Description,
                Debit = entry.Debit,
                Credit = entry.Credit,
                RunningBalance = running
            });
        }

        return new SoaResponseDto
        {
            AccountName = accountName,
            AccountType = accountType,
            OpeningBalance = openingBalance,
            Entries = entries,
            TotalDebit = entries.Sum(e => e.Debit),
            TotalCredit = entries.Sum(e => e.Credit),
            ClosingBalance = running
        };
    }

    public async Task<MasterReportResponseDto> GetMasterReportAsync(
        DateTime? startDate, DateTime? endDate,
        int? customerId, int? vendorId, int? voucherType,
        int page, int pageSize,
        CancellationToken ct = default)
    {
        var query = _context.VoucherLines
            .Include(l => l.Voucher)
            .Include(l => l.Customer)
            .Include(l => l.Vendor)
            .Include(l => l.Item)
            .AsQueryable();

        if (startDate.HasValue) query = query.Where(l => l.Voucher.Date >= startDate.Value);
        if (endDate.HasValue) query = query.Where(l => l.Voucher.Date <= endDate.Value.AddDays(1));
        if (customerId.HasValue) query = query.Where(l => l.CustomerId == customerId.Value);
        if (vendorId.HasValue) query = query.Where(l => l.VendorId == vendorId.Value);
        if (voucherType.HasValue) query = query.Where(l => (int)l.Voucher.VoucherType == voucherType.Value);

        var totalRecords = await query.CountAsync(ct);
        var lines = await query
            .OrderBy(l => l.Voucher.Date)
            .ThenBy(l => l.Voucher.VoucherNo)
            .Skip(page * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var entries = lines.Select(l => new MasterReportEntryDto
        {
            Date = l.Voucher.Date,
            VoucherNo = l.Voucher.VoucherNo,
            VoucherType = GetVoucherTypeLabel(l.Voucher.VoucherType),
            Description = l.Description ?? l.Voucher.Description,
            AccountName = l.Customer?.Name ?? l.Vendor?.Name ?? l.FreeText ?? "-",
            AccountCategory = l.EntryType.ToString(),
            ItemName = l.Item?.Name ?? (l.EntryType == EntryType.Expense ? l.FreeText : null),
            Quantity = l.Quantity,
            QuantityTypeLabel = l.QuantityType.HasValue
                ? (l.QuantityType == QuantityType.PerPerson ? "Per Person" : "Per Kg")
                : null,
            Rate = l.Rate,
            Debit = l.Debit,
            Credit = l.Credit
        }).ToList();

        return new MasterReportResponseDto
        {
            Entries = entries,
            TotalRecords = totalRecords,
            HasMoreData = (page + 1) * pageSize < totalRecords,
            TotalDebit = entries.Sum(e => e.Debit),
            TotalCredit = entries.Sum(e => e.Credit)
        };
    }

    public async Task<List<AccountBalanceDto>> GetBalancesAsync(CancellationToken ct = default)
    {
        var result = new List<AccountBalanceDto>();

        var customers = await _context.Customers.ToListAsync(ct);
        foreach (var customer in customers)
        {
            var debit = await _context.VoucherLines.Where(l => l.CustomerId == customer.Id).SumAsync(l => l.Debit, ct);
            var credit = await _context.VoucherLines.Where(l => l.CustomerId == customer.Id).SumAsync(l => l.Credit, ct);
            result.Add(new AccountBalanceDto
            {
                Id = customer.Id,
                Name = customer.Name,
                AccountType = "Customer",
                OpeningBalance = customer.OpeningBalance,
                TotalDebit = debit,
                TotalCredit = credit,
                Balance = customer.OpeningBalance + debit - credit
            });
        }

        var vendors = await _context.Vendors.ToListAsync(ct);
        foreach (var vendor in vendors)
        {
            var debit = await _context.VoucherLines.Where(l => l.VendorId == vendor.Id).SumAsync(l => l.Debit, ct);
            var credit = await _context.VoucherLines.Where(l => l.VendorId == vendor.Id).SumAsync(l => l.Credit, ct);
            result.Add(new AccountBalanceDto
            {
                Id = vendor.Id,
                Name = vendor.Name,
                AccountType = "Vendor",
                OpeningBalance = vendor.OpeningBalance,
                TotalDebit = debit,
                TotalCredit = credit,
                Balance = vendor.OpeningBalance + credit - debit
            });
        }

        return result;
    }

    private static decimal GetBalanceDelta(decimal debit, decimal credit, bool isCustomer)
        => isCustomer ? debit - credit : credit - debit;

    private static string GetVoucherTypeLabel(VoucherType voucherType) => voucherType switch
    {
        VoucherType.Sales => "Sales",
        VoucherType.Purchase => "Purchase",
        _ => "Journal"
    };
}
