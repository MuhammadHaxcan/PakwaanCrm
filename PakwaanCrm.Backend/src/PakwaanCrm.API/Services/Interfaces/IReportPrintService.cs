using PakwaanCrm.API.Common.Models;
using PakwaanCrm.API.DTOs.Responses;

namespace PakwaanCrm.API.Services.Interfaces;

public interface IReportPrintService
{
    Task<Result<PrintableVoucherDocument>> GenerateSoaPdfAsync(
        string accountType,
        int accountId,
        DateTime? startDate,
        DateTime? endDate,
        CancellationToken ct = default);

    Task<Result<PrintableVoucherDocument>> GenerateMasterReportPdfAsync(
        DateTime? startDate,
        DateTime? endDate,
        int? customerId,
        int? vendorId,
        int? voucherType,
        CancellationToken ct = default);
}

