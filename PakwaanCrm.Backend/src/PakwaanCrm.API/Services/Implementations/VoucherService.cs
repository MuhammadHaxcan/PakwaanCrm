using AutoMapper;
using PakwaanCrm.API.Common.Models;
using PakwaanCrm.API.DTOs.Requests;
using PakwaanCrm.API.DTOs.Responses;
using PakwaanCrm.API.Entities;
using PakwaanCrm.API.Enums;
using PakwaanCrm.API.Repositories.Interfaces;
using PakwaanCrm.API.Services.Interfaces;

namespace PakwaanCrm.API.Services.Implementations;

public class VoucherService : IVoucherService
{
    private readonly IVoucherRepository _repo;
    private readonly IMapper _mapper;

    public VoucherService(IVoucherRepository repo, IMapper mapper)
    {
        _repo = repo;
        _mapper = mapper;
    }

    public async Task<List<VoucherListDto>> GetListAsync(int? voucherType, int page, int pageSize, CancellationToken ct = default)
    {
        var vouchers = await _repo.GetListWithLinesAsync(voucherType, page, pageSize, ct);
        return _mapper.Map<List<VoucherListDto>>(vouchers);
    }

    public async Task<VoucherDetailDto?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var voucher = await _repo.GetWithLinesAsync(id, ct);
        return voucher == null ? null : _mapper.Map<VoucherDetailDto>(voucher);
    }

    public async Task<Result<VoucherDetailDto>> CreateSalesVoucherAsync(CreateSalesVoucherRequest request, CancellationToken ct = default)
    {
        if (request.Lines == null || request.Lines.Count == 0)
            return Result<VoucherDetailDto>.Failure("At least one sales line is required.");

        var voucherNo = await _repo.GenerateVoucherNumberAsync("SV-", ct);
        var totalAmount = request.Lines.Sum(l => l.Quantity * l.Rate);

        var voucher = new Voucher
        {
            VoucherNo = voucherNo,
            Date = request.Date,
            VoucherType = VoucherType.Sales,
            Description = request.Description,
            Notes = request.Notes
        };

        // One debit line per customer
        foreach (var line in request.Lines)
        {
            var amount = line.Quantity * line.Rate;
            voucher.Lines.Add(new VoucherLine
            {
                EntryType = EntryType.CustomerDebit,
                CustomerId = line.CustomerId,
                ItemId = line.ItemId,
                QuantityType = line.QuantityType,
                Quantity = line.Quantity,
                Rate = line.Rate,
                Description = line.Description,
                Debit = amount,
                Credit = 0
            });
        }

        // One revenue credit line for the total
        voucher.Lines.Add(new VoucherLine
        {
            EntryType = EntryType.Revenue,
            FreeText = "Sales Revenue",
            Description = request.Description ?? "Sales",
            Debit = 0,
            Credit = totalAmount
        });

        await _repo.AddAsync(voucher, ct);
        await _repo.SaveChangesAsync(ct);

        var saved = await _repo.GetWithLinesAsync(voucher.Id, ct);
        return Result<VoucherDetailDto>.Success(_mapper.Map<VoucherDetailDto>(saved!));
    }

    public async Task<Result<VoucherDetailDto>> CreateGeneralVoucherAsync(CreateGeneralVoucherRequest request, CancellationToken ct = default)
    {
        if (request.Lines == null || request.Lines.Count == 0)
            return Result<VoucherDetailDto>.Failure("At least one line is required.");

        var totalDebit = request.Lines.Sum(l => l.Debit);
        var totalCredit = request.Lines.Sum(l => l.Credit);
        if (Math.Round(totalDebit, 2) != Math.Round(totalCredit, 2))
            return Result<VoucherDetailDto>.Failure($"Voucher is unbalanced. Debit: {totalDebit}, Credit: {totalCredit}");

        var voucherNo = await _repo.GenerateVoucherNumberAsync("JV-", ct);

        var voucher = new Voucher
        {
            VoucherNo = voucherNo,
            Date = request.Date,
            VoucherType = VoucherType.General,
            Description = request.Description,
            Notes = request.Notes
        };

        foreach (var line in request.Lines)
        {
            voucher.Lines.Add(new VoucherLine
            {
                EntryType    = line.EntryType,
                CustomerId   = line.CustomerId,
                VendorId     = line.VendorId,
                FreeText     = line.FreeText,
                ItemId       = line.ItemId,
                QuantityType = line.QuantityType,
                Quantity     = line.Quantity,
                Rate         = line.Rate,
                Description  = line.Description,
                Debit        = line.Debit,
                Credit       = line.Credit
            });
        }

        await _repo.AddAsync(voucher, ct);
        await _repo.SaveChangesAsync(ct);

        var saved = await _repo.GetWithLinesAsync(voucher.Id, ct);
        return Result<VoucherDetailDto>.Success(_mapper.Map<VoucherDetailDto>(saved!));
    }

    public async Task<Result<VoucherDetailDto>> CreateVendorPurchaseAsync(CreateVendorPurchaseRequest request, CancellationToken ct = default)
    {
        if (request.Lines == null || request.Lines.Count == 0)
            return Result<VoucherDetailDto>.Failure("At least one purchase line is required.");

        if (request.VendorId <= 0)
            return Result<VoucherDetailDto>.Failure("Vendor is required.");

        var normalizedLines = request.Lines
            .Where(line => line.Quantity > 0 && line.Rate >= 0)
            .ToList();

        if (normalizedLines.Count == 0)
            return Result<VoucherDetailDto>.Failure("Each line must have a quantity greater than zero.");

        if (normalizedLines.Any(line => line.ItemId is null && string.IsNullOrWhiteSpace(line.ItemName)))
            return Result<VoucherDetailDto>.Failure("Each line needs either an item or an item name.");

        var totalAmount = normalizedLines.Sum(line => line.Quantity * line.Rate);
        if (totalAmount <= 0)
            return Result<VoucherDetailDto>.Failure("Purchase total must be greater than zero.");

        if (request.PaidAmount < 0)
            return Result<VoucherDetailDto>.Failure("Paid amount cannot be negative.");

        if (request.PaidAmount > totalAmount)
            return Result<VoucherDetailDto>.Failure("Paid amount cannot be more than the purchase total.");

        var voucherNo = await _repo.GenerateVoucherNumberAsync("PV-", ct);
        var voucher = new Voucher
        {
            VoucherNo = voucherNo,
            Date = request.Date,
            VoucherType = VoucherType.Purchase,
            Description = request.Description,
            Notes = request.Notes
        };

        foreach (var line in normalizedLines)
        {
            var amount = line.Quantity * line.Rate;

            voucher.Lines.Add(new VoucherLine
            {
                EntryType = EntryType.Expense,
                ItemId = line.ItemId,
                FreeText = string.IsNullOrWhiteSpace(line.ItemName) ? null : line.ItemName!.Trim(),
                QuantityType = line.QuantityType,
                Quantity = line.Quantity,
                Rate = line.Rate,
                Description = line.Description,
                Debit = amount,
                Credit = 0
            });
        }

        voucher.Lines.Add(new VoucherLine
        {
            EntryType = EntryType.VendorCredit,
            VendorId = request.VendorId,
            Description = request.Description ?? "Vendor purchase",
            Debit = 0,
            Credit = totalAmount
        });

        if (request.PaidAmount > 0)
        {
            voucher.Lines.Add(new VoucherLine
            {
                EntryType = EntryType.VendorDebit,
                VendorId = request.VendorId,
                Description = request.PaymentDescription ?? "Payment made against purchase",
                Debit = request.PaidAmount,
                Credit = 0
            });

            voucher.Lines.Add(new VoucherLine
            {
                EntryType = EntryType.CashCredit,
                FreeText = string.IsNullOrWhiteSpace(request.PaymentAccountName)
                    ? "Cash / Bank"
                    : request.PaymentAccountName!.Trim(),
                Description = request.PaymentDescription ?? "Purchase payment",
                Debit = 0,
                Credit = request.PaidAmount
            });
        }

        await _repo.AddAsync(voucher, ct);
        await _repo.SaveChangesAsync(ct);

        var saved = await _repo.GetWithLinesAsync(voucher.Id, ct);
        return Result<VoucherDetailDto>.Success(_mapper.Map<VoucherDetailDto>(saved!));
    }

    public async Task<Result> DeleteAsync(int id, CancellationToken ct = default)
    {
        var voucher = await _repo.GetByIdAsync(id, ct);
        if (voucher == null) return Result.Failure("Voucher not found.");
        _repo.Delete(voucher);
        await _repo.SaveChangesAsync(ct);
        return Result.Success();
    }
}
