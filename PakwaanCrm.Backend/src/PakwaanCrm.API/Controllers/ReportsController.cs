using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PakwaanCrm.API.Enums;
using PakwaanCrm.API.Services.Interfaces;

namespace PakwaanCrm.API.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.Staff)}")]
public class ReportsController : ControllerBase
{
    private readonly IReportService _service;
    private readonly IReportPrintService _printService;
    public ReportsController(IReportService service, IReportPrintService printService)
    {
        _service = service;
        _printService = printService;
    }

    [HttpGet("soa")]
    public async Task<IActionResult> GetSoa(
        [FromQuery] string accountType,
        [FromQuery] int accountId,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        CancellationToken ct)
    {
        var result = await _service.GetSoaAsync(accountType, accountId, startDate, endDate, ct);
        return result == null ? NotFound(new { error = "Account not found." }) : Ok(result);
    }

    [HttpGet("master")]
    public async Task<IActionResult> GetMaster(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] int? customerId,
        [FromQuery] int? vendorId,
        [FromQuery] int? voucherType,
        [FromQuery] int page = 0,
        [FromQuery] int pageSize = 500,
        CancellationToken ct = default)
        => Ok(await _service.GetMasterReportAsync(startDate, endDate, customerId, vendorId, voucherType, page, pageSize, ct));

    [HttpGet("balances")]
    public async Task<IActionResult> GetBalances(CancellationToken ct)
        => Ok(await _service.GetBalancesAsync(ct));

    [HttpGet("print/soa")]
    public async Task<IActionResult> PrintSoa(
        [FromQuery] string accountType,
        [FromQuery] int accountId,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(accountType) || accountId <= 0)
            return BadRequest(new { error = "accountType and accountId are required." });
        if (!accountType.Equals("Customer", StringComparison.OrdinalIgnoreCase)
            && !accountType.Equals("Vendor", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { error = "accountType must be either Customer or Vendor." });
        if (startDate.HasValue && endDate.HasValue && startDate.Value.Date > endDate.Value.Date)
            return BadRequest(new { error = "startDate cannot be after endDate." });

        var result = await _printService.GenerateSoaPdfAsync(accountType, accountId, startDate, endDate, ct);
        if (!result.IsSuccess || result.Value is null)
        {
            if (result.Error.Equals("Account not found.", StringComparison.OrdinalIgnoreCase))
                return NotFound(new { error = result.Error });
            return BadRequest(new { error = result.Error });
        }

        return File(result.Value.Content, result.Value.ContentType, result.Value.FileName);
    }

    [HttpGet("print/master")]
    public async Task<IActionResult> PrintMaster(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] int? customerId,
        [FromQuery] int? vendorId,
        [FromQuery] int? voucherType,
        CancellationToken ct)
    {
        if (startDate.HasValue && endDate.HasValue && startDate.Value.Date > endDate.Value.Date)
            return BadRequest(new { error = "startDate cannot be after endDate." });
        var result = await _printService.GenerateMasterReportPdfAsync(startDate, endDate, customerId, vendorId, voucherType, ct);
        if (!result.IsSuccess || result.Value is null)
            return BadRequest(new { error = result.Error });

        return File(result.Value.Content, result.Value.ContentType, result.Value.FileName);
    }
}
