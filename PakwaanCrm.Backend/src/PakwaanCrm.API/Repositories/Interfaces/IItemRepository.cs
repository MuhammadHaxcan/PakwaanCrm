using PakwaanCrm.API.Entities;

namespace PakwaanCrm.API.Repositories.Interfaces;

public interface IItemRepository : IRepository<Item>
{
    Task<bool> HasVoucherLinesAsync(int itemId, CancellationToken ct = default);
}
