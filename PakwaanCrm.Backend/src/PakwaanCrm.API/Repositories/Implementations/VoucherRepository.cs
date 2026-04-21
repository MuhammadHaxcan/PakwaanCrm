using Microsoft.EntityFrameworkCore;
using PakwaanCrm.API.Data;
using PakwaanCrm.API.Entities;
using PakwaanCrm.API.Repositories.Interfaces;

namespace PakwaanCrm.API.Repositories.Implementations;

public class VoucherRepository : Repository<Voucher>, IVoucherRepository
{
    public VoucherRepository(AppDbContext context) : base(context) { }

    public async Task<Voucher?> GetWithLinesAsync(int id, CancellationToken ct = default)
        => await _context.Vouchers
            .Include(v => v.Lines)
                .ThenInclude(l => l.Customer)
            .Include(v => v.Lines)
                .ThenInclude(l => l.Vendor)
            .Include(v => v.Lines)
                .ThenInclude(l => l.Item)
            .FirstOrDefaultAsync(v => v.Id == id, ct);

    public async Task<List<Voucher>> GetListWithLinesAsync(int? voucherType, int page, int pageSize, CancellationToken ct = default)
    {
        var query = _context.Vouchers
            .Include(v => v.Lines)
                .ThenInclude(l => l.Customer)
            .Include(v => v.Lines)
                .ThenInclude(l => l.Vendor)
            .Include(v => v.Lines)
                .ThenInclude(l => l.Item)
            .AsQueryable();

        if (voucherType.HasValue)
            query = query.Where(v => (int)v.VoucherType == voucherType.Value);

        return await query
            .OrderByDescending(v => v.Date)
            .ThenByDescending(v => v.Id)
            .Skip(page * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);
    }

    public async Task<string> GenerateVoucherNumberAsync(string prefix, CancellationToken ct = default)
    {
        var last = await _context.Vouchers
            .IgnoreQueryFilters()
            .Where(v => v.VoucherNo.StartsWith(prefix))
            .OrderByDescending(v => v.VoucherNo)
            .Select(v => v.VoucherNo)
            .FirstOrDefaultAsync(ct);

        int next = 1;
        if (last != null && int.TryParse(last[prefix.Length..], out int n))
            next = n + 1;

        return $"{prefix}{next:D4}";
    }
}
