using PakwaanCrm.API.Entities;

namespace PakwaanCrm.API.Repositories.Interfaces;

public interface IVoucherRepository : IRepository<Voucher>
{
    Task<Voucher?> GetWithLinesAsync(int id, CancellationToken ct = default);
    Task<Voucher?> GetWithLinesByVoucherNoAsync(string voucherNo, CancellationToken ct = default);
    Task<List<Voucher>> GetListWithLinesAsync(int? voucherType, int page, int pageSize, CancellationToken ct = default);
    Task<string> GenerateVoucherNumberAsync(string prefix, CancellationToken ct = default);
    void RemoveLines(IEnumerable<VoucherLine> lines);
    Task DeleteAsync(Voucher voucher, CancellationToken ct = default);
}
