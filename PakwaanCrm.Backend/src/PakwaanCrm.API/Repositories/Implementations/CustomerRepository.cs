using Microsoft.EntityFrameworkCore;
using PakwaanCrm.API.Data;
using PakwaanCrm.API.Entities;
using PakwaanCrm.API.Repositories.Interfaces;

namespace PakwaanCrm.API.Repositories.Implementations;

public class CustomerRepository : Repository<Customer>, ICustomerRepository
{
    public CustomerRepository(AppDbContext context) : base(context) { }

    public Task<bool> HasVoucherLinesAsync(int customerId, CancellationToken ct = default)
        => _context.VoucherLines.AnyAsync(line => line.CustomerId == customerId, ct);
}
