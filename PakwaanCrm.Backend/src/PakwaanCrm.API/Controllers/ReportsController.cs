using Microsoft.AspNetCore.Mvc;
using PakwaanCrm.API.Services.Interfaces;

namespace PakwaanCrm.API.Controllers;

[ApiController]
[Route("api/reports")]
public class ReportsController : ControllerBase
{
    private readonly IReportService _service;
    public ReportsController(IReportService service) => _service = service;

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
}
