using PakwaanCrm.API.Data;
using PakwaanCrm.API.Entities;
using PakwaanCrm.API.Repositories.Interfaces;

namespace PakwaanCrm.API.Repositories.Implementations;

public class AccountRepository : Repository<Account>, IAccountRepository
{
    public AccountRepository(AppDbContext context) : base(context) { }
}