using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PakwaanCrm.API.DTOs.Requests;
using PakwaanCrm.API.Enums;
using PakwaanCrm.API.Services.Interfaces;

namespace PakwaanCrm.API.Controllers;

[ApiController]
[Route("api/vouchers")]
[Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.Staff)}")]
public class VouchersController : ControllerBase
{
    private readonly IVoucherService _service;
    private readonly IVoucherPrintService _printService;
    public VouchersController(IVoucherService service, IVoucherPrintService printService)
    {
        _service = service;
        _printService = printService;
    }

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

    [HttpGet("by-number/{voucherNo}")]
    public async Task<IActionResult> GetByVoucherNo(string voucherNo, CancellationToken ct)
    {
        var result = await _service.GetByVoucherNoAsync(voucherNo, ct);
        return result == null ? NotFound(new { error = "Voucher not found." }) : Ok(result);
    }

    [HttpGet("print/sale/{voucherNo}")]
    public async Task<IActionResult> PrintSaleVoucher(string voucherNo, CancellationToken ct)
        => await PrintVoucher(voucherNo, VoucherType.Sales, ct);

    [HttpGet("print/purchase/{voucherNo}")]
    public async Task<IActionResult> PrintPurchaseVoucher(string voucherNo, CancellationToken ct)
        => await PrintVoucher(voucherNo, VoucherType.Purchase, ct);

    [HttpGet("print/journal/{voucherNo}")]
    public async Task<IActionResult> PrintJournalVoucher(string voucherNo, CancellationToken ct)
        => await PrintVoucher(voucherNo, VoucherType.General, ct);

    [HttpPost("sales")]
    public async Task<IActionResult> CreateSales([FromBody] CreateSalesVoucherRequest request, CancellationToken ct)
    {
        var result = await _service.CreateSalesVoucherAsync(request, ct);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { error = result.Error });
    }

    [HttpPut("{id:int}/sales")]
    public async Task<IActionResult> UpdateSales(int id, [FromBody] CreateSalesVoucherRequest request, CancellationToken ct)
    {
        var result = await _service.UpdateSalesVoucherAsync(id, request, ct);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { error = result.Error });
    }

    [HttpPost("general")]
    public async Task<IActionResult> CreateGeneral([FromBody] CreateGeneralVoucherRequest request, CancellationToken ct)
    {
        var result = await _service.CreateGeneralVoucherAsync(request, ct);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { error = result.Error });
    }

    [HttpPut("{id:int}/general")]
    public async Task<IActionResult> UpdateGeneral(int id, [FromBody] CreateGeneralVoucherRequest request, CancellationToken ct)
    {
        var result = await _service.UpdateGeneralVoucherAsync(id, request, ct);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { error = result.Error });
    }

    [HttpPost("vendor-purchases")]
    public async Task<IActionResult> CreateVendorPurchase([FromBody] CreateVendorPurchaseRequest request, CancellationToken ct)
    {
        var result = await _service.CreateVendorPurchaseAsync(request, ct);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { error = result.Error });
    }

    [HttpPut("{id:int}/vendor-purchases")]
    public async Task<IActionResult> UpdateVendorPurchase(int id, [FromBody] CreateVendorPurchaseRequest request, CancellationToken ct)
    {
        var result = await _service.UpdateVendorPurchaseAsync(id, request, ct);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(new { error = result.Error });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var result = await _service.DeleteAsync(id, ct);
        return result.IsSuccess ? Ok() : BadRequest(new { error = result.Error });
    }

    private async Task<IActionResult> PrintVoucher(string voucherNo, VoucherType expectedType, CancellationToken ct)
    {
        var result = await _printService.GenerateVoucherPdfAsync(voucherNo, expectedType, ct);
        if (!result.IsSuccess || result.Value is null)
        {
            if (result.Error.Equals("Voucher not found.", StringComparison.OrdinalIgnoreCase))
                return NotFound(new { error = result.Error });

            return BadRequest(new { error = result.Error });
        }

        return File(result.Value.Content, result.Value.ContentType, result.Value.FileName);
    }
}
