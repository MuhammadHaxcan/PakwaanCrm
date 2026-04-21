using Microsoft.AspNetCore.Mvc;
using PakwaanCrm.API.DTOs.Requests;
using PakwaanCrm.API.Services.Interfaces;

namespace PakwaanCrm.API.Controllers;

[ApiController]
[Route("api/vouchers")]
public class VouchersController : ControllerBase
{
    private readonly IVoucherService _service;
    public VouchersController(IVoucherService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] int? type,
        [FromQuery] int page = 0,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
        => Ok(await _service.GetListAsync(type, page, pageSize, ct));

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken ct)
    {
        var result = await _service.GetByIdAsync(id, ct);
        return result == null ? NotFound() : Ok(result);
    }

    [HttpPost("sales")]
    public async Task<IActionResult> CreateSales([FromBody] CreateSalesVoucherRequest request, CancellationToken ct)
    {
        var result = await _service.CreateSalesVoucherAsync(request, ct);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { error = result.Error });
    }

    [HttpPost("general")]
    public async Task<IActionResult> CreateGeneral([FromBody] CreateGeneralVoucherRequest request, CancellationToken ct)
    {
        var result = await _service.CreateGeneralVoucherAsync(request, ct);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { error = result.Error });
    }

    [HttpPost("vendor-purchases")]
    public async Task<IActionResult> CreateVendorPurchase([FromBody] CreateVendorPurchaseRequest request, CancellationToken ct)
    {
        var result = await _service.CreateVendorPurchaseAsync(request, ct);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { error = result.Error });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var result = await _service.DeleteAsync(id, ct);
        return result.IsSuccess ? Ok() : BadRequest(new { error = result.Error });
    }
}
