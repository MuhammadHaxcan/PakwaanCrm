using PakwaanCrm.API.Entities;

namespace PakwaanCrm.API.Repositories.Interfaces;

public interface IVendorRepository : IRepository<Vendor>
{
    Task<bool> HasVoucherLinesAsync(int vendorId, CancellationToken ct = default);
}
