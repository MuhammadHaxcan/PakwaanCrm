using PakwaanCrm.API.Entities;

namespace PakwaanCrm.API.Repositories.Interfaces;

public interface ISalesOrderRepository : IRepository<SalesOrder>
{
    Task<SalesOrder?> GetWithVouchersAsync(int id, CancellationToken ct = default);
    Task<SalesOrder?> GetWithVouchersByOrderNoAsync(string orderNo, CancellationToken ct = default);
    Task<string> GenerateOrderNumberAsync(CancellationToken ct = default);
}
