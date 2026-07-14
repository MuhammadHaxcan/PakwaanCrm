using Microsoft.EntityFrameworkCore;
using PakwaanCrm.API.Data;
using PakwaanCrm.API.Entities;
using PakwaanCrm.API.Repositories.Interfaces;

namespace PakwaanCrm.API.Repositories.Implementations;

public class ItemRepository : Repository<Item>, IItemRepository
{
    public ItemRepository(AppDbContext context) : base(context) { }

    public Task<bool> HasVoucherLinesAsync(int itemId, CancellationToken ct = default)
        => _context.VoucherLines.AnyAsync(line => line.ItemId == itemId, ct);
}
