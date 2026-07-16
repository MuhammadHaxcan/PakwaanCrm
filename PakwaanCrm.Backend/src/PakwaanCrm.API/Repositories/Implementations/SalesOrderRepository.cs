using Microsoft.EntityFrameworkCore;
using PakwaanCrm.API.Data;
using PakwaanCrm.API.Entities;
using PakwaanCrm.API.Repositories.Interfaces;

namespace PakwaanCrm.API.Repositories.Implementations;

public class SalesOrderRepository : Repository<SalesOrder>, ISalesOrderRepository
{
    public SalesOrderRepository(AppDbContext context) : base(context) { }

    public Task<SalesOrder?> GetWithVouchersAsync(int id, CancellationToken ct = default)
        => BuildDetailQuery().FirstOrDefaultAsync(order => order.Id == id, ct);

    public Task<SalesOrder?> GetWithVouchersByOrderNoAsync(string orderNo, CancellationToken ct = default)
    {
        var normalized = orderNo.Trim().ToUpperInvariant();
        return BuildDetailQuery().FirstOrDefaultAsync(order => order.OrderNo.ToUpper() == normalized, ct);
    }

    public async Task<string> GenerateOrderNumberAsync(CancellationToken ct = default)
    {
        const string prefix = "SO-";
        var last = await _context.SalesOrders
            .IgnoreQueryFilters()
            .Where(order => order.OrderNo.StartsWith(prefix))
            .OrderByDescending(order => order.OrderNo)
            .Select(order => order.OrderNo)
            .FirstOrDefaultAsync(ct);

        var next = 1;
        if (last != null && int.TryParse(last[prefix.Length..], out var number))
            next = number + 1;

        return $"{prefix}{next:D4}";
    }

    private IQueryable<SalesOrder> BuildDetailQuery()
        => _context.SalesOrders
            .Include(order => order.Vouchers)
                .ThenInclude(voucher => voucher.Lines)
                    .ThenInclude(line => line.Customer)
            .Include(order => order.Vouchers)
                .ThenInclude(voucher => voucher.Lines)
                    .ThenInclude(line => line.Item);
}
