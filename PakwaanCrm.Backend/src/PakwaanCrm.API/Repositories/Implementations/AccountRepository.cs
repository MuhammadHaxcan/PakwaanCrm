using Microsoft.EntityFrameworkCore;
using PakwaanCrm.API.Data;
using PakwaanCrm.API.Entities;
using PakwaanCrm.API.Repositories.Interfaces;

namespace PakwaanCrm.API.Repositories.Implementations;

public class AccountRepository : Repository<Account>, IAccountRepository
{
    public AccountRepository(AppDbContext context) : base(context) { }

    public Task<bool> HasVoucherLinesAsync(int accountId, CancellationToken ct = default)
        => _context.VoucherLines.AnyAsync(line => line.AccountId == accountId, ct);
}
