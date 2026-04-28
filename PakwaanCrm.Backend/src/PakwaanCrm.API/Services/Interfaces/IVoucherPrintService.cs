using PakwaanCrm.API.Common.Models;
using PakwaanCrm.API.DTOs.Responses;
using PakwaanCrm.API.Enums;

namespace PakwaanCrm.API.Services.Interfaces;

public interface IVoucherPrintService
{
    Task<Result<PrintableVoucherDocument>> GenerateVoucherPdfAsync(
        string voucherNo,
        VoucherType expectedType,
        CancellationToken ct = default);
}

