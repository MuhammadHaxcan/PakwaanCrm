using PakwaanCrm.API.Common.Models;
using PakwaanCrm.API.DTOs.Requests;
using PakwaanCrm.API.DTOs.Responses;

namespace PakwaanCrm.API.Services.Interfaces;

public interface IVoucherService
{
    Task<List<VoucherListDto>> GetListAsync(int? voucherType, int page, int pageSize, CancellationToken ct = default);
    Task<VoucherDetailDto?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<VoucherDetailDto?> GetByVoucherNoAsync(string voucherNo, CancellationToken ct = default);
    Task<Result<SalesVoucherCreateResultDto>> CreateSalesVoucherAsync(CreateSalesVoucherRequest request, CancellationToken ct = default);
    Task<Result<VoucherDetailDto>> UpdateSalesVoucherAsync(int id, CreateSalesVoucherRequest request, CancellationToken ct = default);
    Task<Result<VoucherDetailDto>> CreateGeneralVoucherAsync(CreateGeneralVoucherRequest request, CancellationToken ct = default);
    Task<Result<VoucherDetailDto>> UpdateGeneralVoucherAsync(int id, CreateGeneralVoucherRequest request, CancellationToken ct = default);
    Task<Result<VoucherDetailDto>> CreateVendorPurchaseAsync(CreateVendorPurchaseRequest request, CancellationToken ct = default);
    Task<Result<VoucherDetailDto>> UpdateVendorPurchaseAsync(int id, CreateVendorPurchaseRequest request, CancellationToken ct = default);
    Task<Result> DeleteAsync(int id, CancellationToken ct = default);
}
