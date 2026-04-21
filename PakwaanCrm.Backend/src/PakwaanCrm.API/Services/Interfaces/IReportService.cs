using PakwaanCrm.API.DTOs.Responses;

namespace PakwaanCrm.API.Services.Interfaces;

public interface IReportService
{
    Task<SoaResponseDto?> GetSoaAsync(string accountType, int accountId, DateTime? startDate, DateTime? endDate, CancellationToken ct = default);
    Task<MasterReportResponseDto> GetMasterReportAsync(DateTime? startDate, DateTime? endDate, int? customerId, int? vendorId, int? voucherType, int page, int pageSize, CancellationToken ct = default);
    Task<List<AccountBalanceDto>> GetBalancesAsync(CancellationToken ct = default);
}
