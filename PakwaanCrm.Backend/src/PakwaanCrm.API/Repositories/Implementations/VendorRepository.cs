using Microsoft.EntityFrameworkCore;
using PakwaanCrm.API.Data;
using PakwaanCrm.API.Entities;
using PakwaanCrm.API.Repositories.Interfaces;

namespace PakwaanCrm.API.Repositories.Implementations;

public class VendorRepository : Repository<Vendor>, IVendorRepository
{
    public VendorRepository(AppDbContext context) : base(context) { }

    public Task<bool> HasVoucherLinesAsync(int vendorId, CancellationToken ct = default)
        => _context.VoucherLines.AnyAsync(line => line.VendorId == vendorId, ct);
}
