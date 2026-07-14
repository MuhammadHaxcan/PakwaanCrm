using PakwaanCrm.API.Entities;

namespace PakwaanCrm.API.Repositories.Interfaces;

public interface IAccountRepository : IRepository<Account>
{
    Task<bool> HasVoucherLinesAsync(int accountId, CancellationToken ct = default);
}
