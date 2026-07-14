using PakwaanCrm.API.Entities;

namespace PakwaanCrm.API.Repositories.Interfaces;

public interface ICustomerRepository : IRepository<Customer>
{
    Task<bool> HasVoucherLinesAsync(int customerId, CancellationToken ct = default);
}
