using PakwaanCrm.API.Common.Models;
using PakwaanCrm.API.DTOs.Requests;
using PakwaanCrm.API.DTOs.Responses;

namespace PakwaanCrm.API.Services.Interfaces;

public interface IVoucherService
{
    Task<List<VoucherListDto>> GetListAsync(int? voucherType, int page, int pageSize, CancellationToken ct = default);
    Task<VoucherDetailDto?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<Result<VoucherDetailDto>> CreateSalesVoucherAsync(CreateSalesVoucherRequest request, CancellationToken ct = default);
    Task<Result<VoucherDetailDto>> CreateGeneralVoucherAsync(CreateGeneralVoucherRequest request, CancellationToken ct = default);
    Task<Result<VoucherDetailDto>> CreateVendorPurchaseAsync(CreateVendorPurchaseRequest request, CancellationToken ct = default);
    Task<Result> DeleteAsync(int id, CancellationToken ct = default);
}
