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
    private readonly IItemRepository _itemRepo;
    private readonly IMapper _mapper;

    public VoucherService(IVoucherRepository repo, IItemRepository itemRepo, IMapper mapper)
    {
        _repo = repo;
        _itemRepo = itemRepo;
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

    public async Task<VoucherDetailDto?> GetByVoucherNoAsync(string voucherNo, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(voucherNo)) return null;

        var voucher = await _repo.GetWithLinesByVoucherNoAsync(voucherNo, ct);
        return voucher == null ? null : _mapper.Map<VoucherDetailDto>(voucher);
    }

    public async Task<Result<SalesVoucherCreateResultDto>> CreateSalesVoucherAsync(CreateSalesVoucherRequest request, CancellationToken ct = default)
    {
        var validation = ValidateSalesRequest(request);
        if (!validation.IsSuccess) return Result<SalesVoucherCreateResultDto>.Failure(validation.Error!);

        var customerGroups = request.Lines
            .Where(line => line.Quantity > 0 && line.Rate >= 0)
            .GroupBy(line => line.CustomerId)
            .OrderBy(group => group.Key)
            .ToList();

        var firstVoucherNo = await _repo.GenerateVoucherNumberAsync("SV-", ct);
        var nextNumber = ParseVoucherNumber(firstVoucherNo, "SV-");
        var createdVoucherEntities = new List<Voucher>();

        foreach (var group in customerGroups)
        {
            var voucher = new Voucher
            {
                VoucherNo = $"SV-{nextNumber:D4}",
                VoucherType = VoucherType.Sales
            };

            nextNumber++;

            ApplyVoucherHeader(voucher, request.Date, request.Description, request.Notes);
            ReplaceSalesLines(voucher, new CreateSalesVoucherRequest
            {
                Date = request.Date,
                Description = request.Description,
                Notes = request.Notes,
                Lines = group.ToList()
            });

            await _repo.AddAsync(voucher, ct);
            createdVoucherEntities.Add(voucher);
        }

        await _repo.SaveChangesAsync(ct);

        var savedVouchers = new List<VoucherDetailDto>();
        foreach (var voucher in createdVoucherEntities.OrderBy(v => v.VoucherNo))
        {
            var saved = await _repo.GetWithLinesAsync(voucher.Id, ct);
            if (saved != null)
                savedVouchers.Add(_mapper.Map<VoucherDetailDto>(saved));
        }

        return Result<SalesVoucherCreateResultDto>.Success(new SalesVoucherCreateResultDto
        {
            CreatedCount = savedVouchers.Count,
            VoucherNos = savedVouchers.Select(v => v.VoucherNo).ToList(),
            Vouchers = savedVouchers
        });
    }

    public async Task<Result<VoucherDetailDto>> UpdateSalesVoucherAsync(int id, CreateSalesVoucherRequest request, CancellationToken ct = default)
    {
        var validation = ValidateSalesRequest(request);
        if (!validation.IsSuccess) return Result<VoucherDetailDto>.Failure(validation.Error!);

        if (request.Lines.Select(line => line.CustomerId).Distinct().Count() > 1)
            return Result<VoucherDetailDto>.Failure("Edit mode supports one customer per sales voucher. Create mode can split mixed customers into separate vouchers.");

        var voucher = await _repo.GetWithLinesAsync(id, ct);
        if (voucher == null) return Result<VoucherDetailDto>.Failure("Voucher not found.");
        if (voucher.VoucherType != VoucherType.Sales)
            return Result<VoucherDetailDto>.Failure("Voucher type does not match sales editor.");

        ApplyVoucherHeader(voucher, request.Date, request.Description, request.Notes);
        ReplaceSalesLines(voucher, request);

        _repo.Update(voucher);
        await _repo.SaveChangesAsync(ct);

        return await LoadSavedVoucherAsync(voucher.Id, ct);
    }

    public async Task<Result<VoucherDetailDto>> CreateGeneralVoucherAsync(CreateGeneralVoucherRequest request, CancellationToken ct = default)
    {
        var validation = ValidateGeneralRequest(request);
        if (!validation.IsSuccess) return Result<VoucherDetailDto>.Failure(validation.Error!);

        var voucherNo = await _repo.GenerateVoucherNumberAsync("JV-", ct);
        var voucher = new Voucher
        {
            VoucherNo = voucherNo,
            VoucherType = VoucherType.General
        };

        ApplyVoucherHeader(voucher, request.Date, request.Description, request.Notes);
        ReplaceGeneralLines(voucher, request);

        await _repo.AddAsync(voucher, ct);
        await _repo.SaveChangesAsync(ct);

        return await LoadSavedVoucherAsync(voucher.Id, ct);
    }

    public async Task<Result<VoucherDetailDto>> UpdateGeneralVoucherAsync(int id, CreateGeneralVoucherRequest request, CancellationToken ct = default)
    {
        var validation = ValidateGeneralRequest(request);
        if (!validation.IsSuccess) return Result<VoucherDetailDto>.Failure(validation.Error!);

        var voucher = await _repo.GetWithLinesAsync(id, ct);
        if (voucher == null) return Result<VoucherDetailDto>.Failure("Voucher not found.");
        if (voucher.VoucherType != VoucherType.General)
            return Result<VoucherDetailDto>.Failure("Voucher type does not match journal editor.");

        ApplyVoucherHeader(voucher, request.Date, request.Description, request.Notes);
        ReplaceGeneralLines(voucher, request);

        _repo.Update(voucher);
        await _repo.SaveChangesAsync(ct);

        return await LoadSavedVoucherAsync(voucher.Id, ct);
    }

    public async Task<Result<VoucherDetailDto>> CreateVendorPurchaseAsync(CreateVendorPurchaseRequest request, CancellationToken ct = default)
    {
        var validation = ValidateVendorPurchaseRequest(request);
        if (!validation.IsSuccess) return Result<VoucherDetailDto>.Failure(validation.Error!);

        var resolvedRequest = await ResolveVendorPurchaseItemsAsync(request, ct);

        var voucherNo = await _repo.GenerateVoucherNumberAsync("PV-", ct);
        var voucher = new Voucher
        {
            VoucherNo = voucherNo,
            VoucherType = VoucherType.Purchase
        };

        ApplyVoucherHeader(voucher, resolvedRequest.Date, resolvedRequest.Description, resolvedRequest.Notes);
        ReplaceVendorPurchaseLines(voucher, resolvedRequest);

        await _repo.AddAsync(voucher, ct);
        await _repo.SaveChangesAsync(ct);

        return await LoadSavedVoucherAsync(voucher.Id, ct);
    }

    public async Task<Result<VoucherDetailDto>> UpdateVendorPurchaseAsync(int id, CreateVendorPurchaseRequest request, CancellationToken ct = default)
    {
        var validation = ValidateVendorPurchaseRequest(request);
        if (!validation.IsSuccess) return Result<VoucherDetailDto>.Failure(validation.Error!);

        var resolvedRequest = await ResolveVendorPurchaseItemsAsync(request, ct);

        var voucher = await _repo.GetWithLinesAsync(id, ct);
        if (voucher == null) return Result<VoucherDetailDto>.Failure("Voucher not found.");
        if (voucher.VoucherType != VoucherType.Purchase)
            return Result<VoucherDetailDto>.Failure("Voucher type does not match vendor purchase editor.");

        ApplyVoucherHeader(voucher, resolvedRequest.Date, resolvedRequest.Description, resolvedRequest.Notes);
        ReplaceVendorPurchaseLines(voucher, resolvedRequest);

        _repo.Update(voucher);
        await _repo.SaveChangesAsync(ct);

        return await LoadSavedVoucherAsync(voucher.Id, ct);
    }

    public async Task<Result> DeleteAsync(int id, CancellationToken ct = default)
    {
        var voucher = await _repo.GetByIdAsync(id, ct);
        if (voucher == null) return Result.Failure("Voucher not found.");
        _repo.Delete(voucher);
        await _repo.SaveChangesAsync(ct);
        return Result.Success();
    }

    private static Result ValidateSalesRequest(CreateSalesVoucherRequest request)
    {
        if (request.Lines == null || request.Lines.Count == 0)
            return Result.Failure("At least one sales line is required.");

        if (request.Lines.Any(line => line.CustomerId <= 0))
            return Result.Failure("Each sales line requires a customer.");

        if (request.Lines.Any(line => line.ItemId <= 0))
            return Result.Failure("Each sales line requires an item.");

        if (request.Lines.Any(line => line.Quantity <= 0 || line.Rate < 0))
            return Result.Failure("Each sales line must have a quantity greater than zero.");

        return Result.Success();
    }

    private static Result ValidateGeneralRequest(CreateGeneralVoucherRequest request)
    {
        if (request.Lines == null || request.Lines.Count < 2)
            return Result.Failure("At least two journal lines are required.");

        var totalDebit = request.Lines.Sum(l => l.Debit);
        var totalCredit = request.Lines.Sum(l => l.Credit);
        if (Math.Round(totalDebit, 2) != Math.Round(totalCredit, 2))
            return Result.Failure($"Voucher is unbalanced. Debit: {totalDebit}, Credit: {totalCredit}");

        if (request.Lines.Any(line => line.Debit < 0 || line.Credit < 0))
            return Result.Failure("Debit and credit must be zero or positive.");

        return Result.Success();
    }

    private static Result ValidateVendorPurchaseRequest(CreateVendorPurchaseRequest request)
    {
        if (request.VendorId <= 0)
            return Result.Failure("Vendor is required.");

        if (request.Lines == null || request.Lines.Count == 0)
            return Result.Failure("At least one purchase line is required.");

        var normalizedLines = request.Lines
            .Where(line => line.Quantity > 0 && line.Rate >= 0)
            .ToList();

        if (normalizedLines.Count == 0)
            return Result.Failure("Each line must have a quantity greater than zero.");

        if (normalizedLines.Any(line => line.ItemId is null && string.IsNullOrWhiteSpace(line.ItemName)))
            return Result.Failure("Each line needs either an item or an item name.");

        var totalAmount = normalizedLines.Sum(line => line.Quantity * line.Rate);
        if (totalAmount <= 0)
            return Result.Failure("Purchase total must be greater than zero.");

        return Result.Success();
    }

    private void ApplyVoucherHeader(Voucher voucher, DateTime date, string? description, string? notes)
    {
        voucher.Date = NormalizeUtcDate(date);
        voucher.Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
        voucher.Notes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim();
    }

    private void ReplaceSalesLines(Voucher voucher, CreateSalesVoucherRequest request)
    {
        ReplaceVoucherLines(voucher, BuildSalesLines(request).ToList());
    }

    private void ReplaceGeneralLines(Voucher voucher, CreateGeneralVoucherRequest request)
    {
        ReplaceVoucherLines(voucher, request.Lines.Select(line => new VoucherLine
        {
            EntryType = line.EntryType,
            CustomerId = line.CustomerId,
            VendorId = line.VendorId,
            AccountId = line.AccountId,
            FreeText = string.IsNullOrWhiteSpace(line.FreeText) ? null : line.FreeText.Trim(),
            ItemId = line.ItemId,
            QuantityType = line.QuantityType,
            Quantity = line.Quantity,
            Rate = line.Rate,
            Description = string.IsNullOrWhiteSpace(line.Description) ? null : line.Description.Trim(),
            Debit = line.Debit,
            Credit = line.Credit
        }).ToList());
    }

    private void ReplaceVendorPurchaseLines(Voucher voucher, CreateVendorPurchaseRequest request)
    {
        ReplaceVoucherLines(voucher, BuildVendorPurchaseLines(request).ToList());
    }

    private void ReplaceVoucherLines(Voucher voucher, List<VoucherLine> newLines)
    {
        if (voucher.Lines.Count > 0)
            _repo.RemoveLines(voucher.Lines.ToList());

        voucher.Lines.Clear();

        foreach (var line in newLines)
            voucher.Lines.Add(line);
    }

    private IEnumerable<VoucherLine> BuildSalesLines(CreateSalesVoucherRequest request)
    {
        var normalizedLines = request.Lines
            .Where(line => line.Quantity > 0 && line.Rate >= 0)
            .OrderBy(line => line.CustomerId)
            .ThenBy(line => line.ItemId)
            .ToList();

        foreach (var line in normalizedLines)
        {
            var amount = line.Quantity * line.Rate;
            yield return new VoucherLine
            {
                EntryType = EntryType.CustomerDebit,
                CustomerId = line.CustomerId,
                ItemId = line.ItemId,
                QuantityType = line.QuantityType,
                Quantity = line.Quantity,
                Rate = line.Rate,
                Description = string.IsNullOrWhiteSpace(line.Description) ? null : line.Description.Trim(),
                Debit = amount,
                Credit = 0
            };
        }

        var totalAmount = normalizedLines.Sum(line => line.Quantity * line.Rate);
        yield return new VoucherLine
        {
            EntryType = EntryType.Revenue,
            FreeText = "Sales Revenue",
            Description = request.Description ?? "Sales",
            Debit = 0,
            Credit = totalAmount
        };
    }

    private IEnumerable<VoucherLine> BuildVendorPurchaseLines(CreateVendorPurchaseRequest request)
    {
        var normalizedLines = request.Lines
            .Where(line => line.Quantity > 0 && line.Rate >= 0)
            .ToList();

        foreach (var line in normalizedLines)
        {
            var amount = line.Quantity * line.Rate;
            yield return new VoucherLine
            {
                EntryType = EntryType.Expense,
                ItemId = line.ItemId,
                FreeText = line.ItemId.HasValue ? null : (string.IsNullOrWhiteSpace(line.ItemName) ? null : line.ItemName!.Trim()),
                QuantityType = line.QuantityType,
                Quantity = line.Quantity,
                Rate = line.Rate,
                Description = string.IsNullOrWhiteSpace(line.Description) ? null : line.Description.Trim(),
                Debit = amount,
                Credit = 0
            };
        }

        var totalAmount = normalizedLines.Sum(line => line.Quantity * line.Rate);
        yield return new VoucherLine
        {
            EntryType = EntryType.VendorCredit,
            VendorId = request.VendorId,
            Description = request.Description ?? "Vendor purchase",
            Debit = 0,
            Credit = totalAmount
        };
    }

    private async Task<Result<VoucherDetailDto>> LoadSavedVoucherAsync(int id, CancellationToken ct)
    {
        var saved = await _repo.GetWithLinesAsync(id, ct);
        return saved == null
            ? Result<VoucherDetailDto>.Failure("Voucher not found after save.")
            : Result<VoucherDetailDto>.Success(_mapper.Map<VoucherDetailDto>(saved));
    }

    private async Task<CreateVendorPurchaseRequest> ResolveVendorPurchaseItemsAsync(CreateVendorPurchaseRequest request, CancellationToken ct)
    {
        var items = await _itemRepo.GetAllAsync(ct);
        var itemLookup = items.ToDictionary(item => item.Name.Trim().ToUpperInvariant(), item => item);
        var pendingItems = new Dictionary<string, Item>();

        foreach (var line in request.Lines.Where(line => line.ItemId is null && !string.IsNullOrWhiteSpace(line.ItemName)))
        {
            var normalizedName = line.ItemName!.Trim().ToUpperInvariant();
            if (itemLookup.ContainsKey(normalizedName) || pendingItems.ContainsKey(normalizedName))
                continue;

            var item = new Item
            {
                Name = line.ItemName!.Trim(),
                Unit = line.QuantityType == QuantityType.PerKg ? ItemUnit.PerKg : ItemUnit.PerPerson,
                DefaultRate = line.Rate,
                IsActive = true
            };

            await _itemRepo.AddAsync(item, ct);
            pendingItems[normalizedName] = item;
        }

        if (pendingItems.Count > 0)
            await _itemRepo.SaveChangesAsync(ct);

        foreach (var pair in pendingItems)
            itemLookup[pair.Key] = pair.Value;

        return new CreateVendorPurchaseRequest
        {
            Date = request.Date,
            VendorId = request.VendorId,
            Description = request.Description,
            Notes = request.Notes,
            Lines = request.Lines.Select(line =>
            {
                var trimmedName = string.IsNullOrWhiteSpace(line.ItemName) ? null : line.ItemName.Trim();
                var resolvedItemId = line.ItemId;

                if (!resolvedItemId.HasValue && trimmedName != null && itemLookup.TryGetValue(trimmedName.ToUpperInvariant(), out var item))
                    resolvedItemId = item.Id;

                return new VendorPurchaseLineRequest
                {
                    ItemId = resolvedItemId,
                    ItemName = trimmedName,
                    QuantityType = line.QuantityType,
                    Quantity = line.Quantity,
                    Rate = line.Rate,
                    Description = line.Description
                };
            }).ToList()
        };
    }

    private static int ParseVoucherNumber(string voucherNo, string prefix)
    {
        if (voucherNo.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)
            && int.TryParse(voucherNo[prefix.Length..], out var number))
            return number;

        return 1;
    }

    private static DateTime NormalizeUtcDate(DateTime date)
    {
        var normalizedDate = date.Kind switch
        {
            DateTimeKind.Utc => date,
            DateTimeKind.Local => date.ToUniversalTime(),
            _ => DateTime.SpecifyKind(date, DateTimeKind.Utc)
        };

        return normalizedDate;
    }
}
