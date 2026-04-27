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

        var fromDate = NormalizeUtcDate(startDate)?.Date;
        var toExclusive = NormalizeUtcDate(endDate)?.Date.AddDays(1);

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
        var fromDate = NormalizeUtcDate(startDate)?.Date;
        var toExclusive = NormalizeUtcDate(endDate)?.Date.AddDays(1);

        var query = _context.VoucherLines
            .Include(l => l.Voucher)
            .Include(l => l.Customer)
            .Include(l => l.Vendor)
            .Include(l => l.Item)
            .AsQueryable();

        if (fromDate.HasValue) query = query.Where(l => l.Voucher.Date >= fromDate.Value);
        if (toExclusive.HasValue) query = query.Where(l => l.Voucher.Date < toExclusive.Value);
        if (customerId.HasValue && vendorId.HasValue)
            query = query.Where(l => l.CustomerId == customerId.Value || l.VendorId == vendorId.Value);
        else if (customerId.HasValue)
            query = query.Where(l => l.CustomerId == customerId.Value);
        else if (vendorId.HasValue)
            query = query.Where(l => l.VendorId == vendorId.Value);
        if (voucherType.HasValue) query = query.Where(l => (int)l.Voucher.VoucherType == voucherType.Value);

        decimal openingDebit = 0, openingCredit = 0;
        bool hasOpeningBalance = false;

        if (fromDate.HasValue)
        {
            var openingQuery = _context.VoucherLines
                .Include(l => l.Voucher)
                .Where(l => l.Voucher.Date < fromDate.Value)
                .AsQueryable();

            if (customerId.HasValue && vendorId.HasValue)
                openingQuery = openingQuery.Where(l => l.CustomerId == customerId.Value || l.VendorId == vendorId.Value);
            else if (customerId.HasValue)
                openingQuery = openingQuery.Where(l => l.CustomerId == customerId.Value);
            else if (vendorId.HasValue)
                openingQuery = openingQuery.Where(l => l.VendorId == vendorId.Value);
            if (voucherType.HasValue)
                openingQuery = openingQuery.Where(l => (int)l.Voucher.VoucherType == voucherType.Value);

            var openingTotals = await openingQuery
                .Select(l => new { l.Debit, l.Credit })
                .ToListAsync(ct);

            openingDebit = openingTotals.Sum(x => x.Debit);
            openingCredit = openingTotals.Sum(x => x.Credit);
            hasOpeningBalance = true;
        }

        var openingBalance = openingDebit - openingCredit;
        var orderedQuery = query
            .OrderBy(l => l.Voucher.Date)
            .ThenBy(l => l.Voucher.VoucherNo)
            .ThenBy(l => l.Id);

        var totalRecords = await query.CountAsync(ct);

        decimal runningBalanceBeforePage = openingBalance;
        if (page > 0)
        {
            var previousPageTotals = await orderedQuery
                .Skip(0)
                .Take(page * pageSize)
                .Select(l => new { l.Debit, l.Credit })
                .ToListAsync(ct);

            runningBalanceBeforePage += previousPageTotals.Sum(x => x.Debit - x.Credit);
        }

        var lines = await orderedQuery
            .Skip(page * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var runningBalance = runningBalanceBeforePage;
        var entries = new List<MasterReportEntryDto>(lines.Count);

        foreach (var line in lines)
        {
            runningBalance += line.Debit - line.Credit;

            entries.Add(new MasterReportEntryDto
            {
                Date = line.Voucher.Date,
                VoucherNo = line.Voucher.VoucherNo,
                VoucherType = GetVoucherTypeLabel(line.Voucher.VoucherType),
                Description = line.Description ?? line.Voucher.Description,
                AccountName = line.Customer?.Name ?? line.Vendor?.Name ?? line.FreeText ?? "-",
                AccountCategory = line.EntryType.ToString(),
                ItemName = line.Item?.Name ?? (line.EntryType == EntryType.Expense ? line.FreeText : null),
                Quantity = line.Quantity,
                QuantityTypeLabel = line.QuantityType.HasValue
                    ? (line.QuantityType == QuantityType.PerPerson ? "Per Person" : "Per Kg")
                    : null,
                Rate = line.Rate,
                Debit = line.Debit,
                Credit = line.Credit,
                RunningBalance = runningBalance
            });
        }

        return new MasterReportResponseDto
        {
            Entries = entries,
            TotalRecords = totalRecords,
            HasMoreData = (page + 1) * pageSize < totalRecords,
            TotalDebit = entries.Sum(e => e.Debit),
            TotalCredit = entries.Sum(e => e.Credit),
            HasOpeningBalance = hasOpeningBalance,
            OpeningDebit = openingDebit,
            OpeningCredit = openingCredit,
            OpeningBalance = openingBalance
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

    private static DateTime? NormalizeUtcDate(DateTime? value)
    {
        if (!value.HasValue) return null;
        var date = value.Value;
        return date.Kind switch
        {
            DateTimeKind.Utc => date,
            DateTimeKind.Local => date.ToUniversalTime(),
            _ => DateTime.SpecifyKind(date, DateTimeKind.Utc)
        };
    }

    private static string GetVoucherTypeLabel(VoucherType voucherType) => voucherType switch
    {
        VoucherType.Sales => "Sales",
        VoucherType.Purchase => "Purchase",
        _ => "Journal"
    };
}
