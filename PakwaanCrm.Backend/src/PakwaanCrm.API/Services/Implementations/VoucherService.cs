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
    private readonly ISalesOrderRepository _salesOrderRepo;
    private readonly IMapper _mapper;

    public VoucherService(IVoucherRepository repo, ISalesOrderRepository salesOrderRepo, IMapper mapper)
    {
        _repo = repo;
        _salesOrderRepo = salesOrderRepo;
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

    public async Task<SalesOrderDetailDto?> GetSalesOrderAsync(int id, CancellationToken ct = default)
    {
        var order = await _salesOrderRepo.GetWithVouchersAsync(id, ct);
        return order == null ? null : MapSalesOrder(order);
    }

    public async Task<SalesOrderDetailDto?> GetSalesOrderByNumberAsync(string orderNo, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(orderNo)) return null;
        var order = await _salesOrderRepo.GetWithVouchersByOrderNoAsync(orderNo, ct);
        return order == null ? null : MapSalesOrder(order);
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

        var order = new SalesOrder
        {
            OrderNo = await _salesOrderRepo.GenerateOrderNumberAsync(ct),
            Mode = SalesOrderMode.CustomerWise
        };
        ApplySalesOrderHeader(order, request.Description, request.Notes);

        var firstVoucherNo = await _repo.GenerateVoucherNumberAsync("SV-", ct);
        var nextNumber = ParseVoucherNumber(firstVoucherNo, "SV-");

        foreach (var group in customerGroups)
        {
            var voucher = new Voucher
            {
                VoucherNo = $"SV-{nextNumber:D4}",
                VoucherType = VoucherType.Sales,
                SalesOrder = order
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

            order.Vouchers.Add(voucher);
        }

        await _salesOrderRepo.AddAsync(order, ct);
        await _repo.SaveChangesAsync(ct);
        return await LoadSalesOrderResultAsync(order.Id, ct);
    }

    public async Task<Result<SalesVoucherCreateResultDto>> CreateCustomerDateSalesVoucherAsync(CreateCustomerDateSalesVoucherRequest request, CancellationToken ct = default)
    {
        var validation = ValidateCustomerDateSalesRequest(request);
        if (!validation.IsSuccess) return Result<SalesVoucherCreateResultDto>.Failure(validation.Error!);

        var dateGroups = request.Lines
            .Where(line => line.Quantity > 0 && line.Rate >= 0)
            .Select(line => new
            {
                Date = NormalizeDate(line.Date),
                Line = line
            })
            .GroupBy(entry => entry.Date)
            .OrderBy(group => group.Key)
            .ToList();

        var order = new SalesOrder
        {
            OrderNo = await _salesOrderRepo.GenerateOrderNumberAsync(ct),
            Mode = SalesOrderMode.CustomerDateWise
        };
        ApplySalesOrderHeader(order, null, request.Notes);

        var firstVoucherNo = await _repo.GenerateVoucherNumberAsync("SV-", ct);
        var nextNumber = ParseVoucherNumber(firstVoucherNo, "SV-");

        foreach (var group in dateGroups)
        {
            var voucher = new Voucher
            {
                VoucherNo = $"SV-{nextNumber:D4}",
                VoucherType = VoucherType.Sales,
                SalesOrder = order
            };

            nextNumber++;

            var salesRequest = new CreateSalesVoucherRequest
            {
                Date = group.Key,
                Notes = request.Notes,
                Lines = group
                    .Select(entry => new SalesLineRequest
                    {
                        CustomerId = request.CustomerId,
                        ItemId = entry.Line.ItemId,
                        QuantityType = entry.Line.QuantityType,
                        Quantity = entry.Line.Quantity,
                        Rate = entry.Line.Rate,
                        DeliveryCharge = entry.Line.DeliveryCharge,
                        Description = entry.Line.Description
                    })
                    .ToList()
            };

            ApplyVoucherHeader(voucher, salesRequest.Date, salesRequest.Description, salesRequest.Notes);
            ReplaceSalesLines(voucher, salesRequest);

            order.Vouchers.Add(voucher);
        }

        await _salesOrderRepo.AddAsync(order, ct);
        await _repo.SaveChangesAsync(ct);
        return await LoadSalesOrderResultAsync(order.Id, ct);
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
        if (voucher.SalesOrderId.HasValue)
            return Result<VoucherDetailDto>.Failure("This voucher belongs to a sales order. Edit the parent sales order instead.");

        ApplyVoucherHeader(voucher, request.Date, request.Description, request.Notes);
        ReplaceSalesLines(voucher, request);

        _repo.Update(voucher);
        await _repo.SaveChangesAsync(ct);

        return await LoadSavedVoucherAsync(voucher.Id, ct);
    }

    public async Task<Result<SalesVoucherCreateResultDto>> UpdateCustomerWiseSalesOrderAsync(
        int id, CreateSalesVoucherRequest request, CancellationToken ct = default)
    {
        var validation = ValidateSalesRequest(request);
        if (!validation.IsSuccess) return Result<SalesVoucherCreateResultDto>.Failure(validation.Error!);

        var order = await _salesOrderRepo.GetWithVouchersAsync(id, ct);
        if (order == null) return Result<SalesVoucherCreateResultDto>.Failure("Sales order not found.");
        if (order.Mode != SalesOrderMode.CustomerWise)
            return Result<SalesVoucherCreateResultDto>.Failure("Sales order mode does not match the customer-wise editor.");

        var groups = request.Lines
            .Where(line => line.Quantity > 0 && line.Rate >= 0)
            .GroupBy(line => line.CustomerId)
            .OrderBy(group => group.Key)
            .ToList();
        var existingByCustomer = order.Vouchers
            .Select(voucher => new
            {
                Voucher = voucher,
                CustomerId = voucher.Lines.FirstOrDefault(line => line.EntryType == EntryType.CustomerDebit)?.CustomerId
            })
            .Where(entry => entry.CustomerId.HasValue)
            .GroupBy(entry => entry.CustomerId!.Value)
            .ToDictionary(group => group.Key, group => group.First().Voucher);

        var nextNumber = ParseVoucherNumber(await _repo.GenerateVoucherNumberAsync("SV-", ct), "SV-");
        var retainedIds = new HashSet<int>();
        foreach (var group in groups)
        {
            if (!existingByCustomer.TryGetValue(group.Key, out var voucher))
            {
                voucher = new Voucher
                {
                    VoucherNo = $"SV-{nextNumber++:D4}",
                    VoucherType = VoucherType.Sales,
                    SalesOrder = order
                };
                order.Vouchers.Add(voucher);
            }
            else
            {
                retainedIds.Add(voucher.Id);
            }

            ApplyVoucherHeader(voucher, request.Date, request.Description, request.Notes);
            ReplaceSalesLines(voucher, new CreateSalesVoucherRequest
            {
                Date = request.Date,
                Description = request.Description,
                Notes = request.Notes,
                Lines = group.ToList()
            });
        }

        foreach (var voucher in order.Vouchers.Where(voucher => voucher.Id > 0 && !retainedIds.Contains(voucher.Id)).ToList())
            SoftDeleteVoucher(voucher);

        ApplySalesOrderHeader(order, request.Description, request.Notes);
        await _repo.SaveChangesAsync(ct);
        return await LoadSalesOrderResultAsync(order.Id, ct);
    }

    public async Task<Result<SalesVoucherCreateResultDto>> UpdateCustomerDateSalesOrderAsync(
        int id, CreateCustomerDateSalesVoucherRequest request, CancellationToken ct = default)
    {
        var validation = ValidateCustomerDateSalesRequest(request);
        if (!validation.IsSuccess) return Result<SalesVoucherCreateResultDto>.Failure(validation.Error!);

        var order = await _salesOrderRepo.GetWithVouchersAsync(id, ct);
        if (order == null) return Result<SalesVoucherCreateResultDto>.Failure("Sales order not found.");
        if (order.Mode != SalesOrderMode.CustomerDateWise)
            return Result<SalesVoucherCreateResultDto>.Failure("Sales order mode does not match the customer date-wise editor.");

        var groups = request.Lines
            .Where(line => line.Quantity > 0 && line.Rate >= 0)
            .Select(line => new { Date = NormalizeDate(line.Date), Line = line })
            .GroupBy(entry => entry.Date)
            .OrderBy(group => group.Key)
            .ToList();
        var existingByDate = order.Vouchers
            .GroupBy(voucher => NormalizeDate(voucher.Date))
            .ToDictionary(group => group.Key, group => group.First());

        var nextNumber = ParseVoucherNumber(await _repo.GenerateVoucherNumberAsync("SV-", ct), "SV-");
        var retainedIds = new HashSet<int>();
        foreach (var group in groups)
        {
            if (!existingByDate.TryGetValue(group.Key, out var voucher))
            {
                voucher = new Voucher
                {
                    VoucherNo = $"SV-{nextNumber++:D4}",
                    VoucherType = VoucherType.Sales,
                    SalesOrder = order
                };
                order.Vouchers.Add(voucher);
            }
            else
            {
                retainedIds.Add(voucher.Id);
            }

            var salesRequest = new CreateSalesVoucherRequest
            {
                Date = group.Key,
                Notes = request.Notes,
                Lines = group.Select(entry => new SalesLineRequest
                {
                    CustomerId = request.CustomerId,
                    ItemId = entry.Line.ItemId,
                    QuantityType = entry.Line.QuantityType,
                    Quantity = entry.Line.Quantity,
                    Rate = entry.Line.Rate,
                    DeliveryCharge = entry.Line.DeliveryCharge,
                    Description = entry.Line.Description
                }).ToList()
            };
            ApplyVoucherHeader(voucher, salesRequest.Date, null, request.Notes);
            ReplaceSalesLines(voucher, salesRequest);
        }

        foreach (var voucher in order.Vouchers.Where(voucher => voucher.Id > 0 && !retainedIds.Contains(voucher.Id)).ToList())
            SoftDeleteVoucher(voucher);

        ApplySalesOrderHeader(order, null, request.Notes);
        await _repo.SaveChangesAsync(ct);
        return await LoadSalesOrderResultAsync(order.Id, ct);
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

        var voucherNo = await _repo.GenerateVoucherNumberAsync("PV-", ct);
        var voucher = new Voucher
        {
            VoucherNo = voucherNo,
            VoucherType = VoucherType.Purchase
        };

        ApplyVoucherHeader(voucher, request.Date, request.Description, request.Notes);
        ReplaceVendorPurchaseLines(voucher, request);

        await _repo.AddAsync(voucher, ct);
        await _repo.SaveChangesAsync(ct);

        return await LoadSavedVoucherAsync(voucher.Id, ct);
    }

    public async Task<Result<VoucherDetailDto>> UpdateVendorPurchaseAsync(int id, CreateVendorPurchaseRequest request, CancellationToken ct = default)
    {
        var validation = ValidateVendorPurchaseRequest(request);
        if (!validation.IsSuccess) return Result<VoucherDetailDto>.Failure(validation.Error!);

        var voucher = await _repo.GetWithLinesAsync(id, ct);
        if (voucher == null) return Result<VoucherDetailDto>.Failure("Voucher not found.");
        if (voucher.VoucherType != VoucherType.Purchase)
            return Result<VoucherDetailDto>.Failure("Voucher type does not match vendor purchase editor.");

        ApplyVoucherHeader(voucher, request.Date, request.Description, request.Notes);
        ReplaceVendorPurchaseLines(voucher, request);

        _repo.Update(voucher);
        await _repo.SaveChangesAsync(ct);

        return await LoadSavedVoucherAsync(voucher.Id, ct);
    }

    public async Task<Result> DeleteAsync(int id, CancellationToken ct = default)
    {
        var voucher = await _repo.GetWithLinesAsync(id, ct);
        if (voucher == null) return Result.Failure("Voucher not found.");

        SalesOrder? order = null;
        if (voucher.SalesOrderId.HasValue)
            order = await _salesOrderRepo.GetWithVouchersAsync(voucher.SalesOrderId.Value, ct);

        SoftDeleteVoucher(voucher);
        if (order != null && order.Vouchers.All(child => child.Id == voucher.Id || child.IsDeleted))
            order.IsDeleted = true;

        await _repo.SaveChangesAsync(ct);
        return Result.Success();
    }

    public async Task<Result> DeleteSalesOrderAsync(int id, CancellationToken ct = default)
    {
        var order = await _salesOrderRepo.GetWithVouchersAsync(id, ct);
        if (order == null) return Result.Failure("Sales order not found.");

        foreach (var voucher in order.Vouchers)
            SoftDeleteVoucher(voucher);
        order.IsDeleted = true;

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

        if (request.Lines.Any(line => line.Quantity <= 0 || line.Rate < 0 || line.DeliveryCharge < 0))
            return Result.Failure("Each sales line must have a quantity greater than zero.");

        return Result.Success();
    }

    private static Result ValidateCustomerDateSalesRequest(CreateCustomerDateSalesVoucherRequest request)
    {
        if (request.CustomerId <= 0)
            return Result.Failure("Customer is required.");

        if (request.Lines == null || request.Lines.Count == 0)
            return Result.Failure("At least one sales line is required.");

        if (request.Lines.Any(line => line.Date == default))
            return Result.Failure("Each sales line requires a valid date.");

        if (request.Lines.Any(line => line.ItemId <= 0))
            return Result.Failure("Each sales line requires an item.");

        if (request.Lines.Any(line => line.Quantity <= 0 || line.Rate < 0 || line.DeliveryCharge < 0))
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

        if (request.Lines.Any(line => line.Debit > 0 && line.Credit > 0))
            return Result.Failure("A journal line cannot have both debit and credit.");

        if (request.Lines.Any(line => line.Debit == 0 && line.Credit == 0))
            return Result.Failure("Each journal line must have either a debit or a credit amount.");

        for (var i = 0; i < request.Lines.Count; i++)
        {
            var line = request.Lines[i];
            var lineNo = i + 1;
            switch (line.EntryType)
            {
                case EntryType.CustomerDebit:
                case EntryType.CustomerCredit:
                    if (!line.CustomerId.HasValue || line.CustomerId.Value <= 0)
                        return Result.Failure($"Line {lineNo}: customer is required for customer entries.");
                    break;

                case EntryType.VendorDebit:
                case EntryType.VendorCredit:
                    if (!line.VendorId.HasValue || line.VendorId.Value <= 0)
                        return Result.Failure($"Line {lineNo}: vendor is required for vendor entries.");
                    break;

                case EntryType.CashDebit:
                case EntryType.CashCredit:
                    if (!line.AccountId.HasValue || line.AccountId.Value <= 0)
                        return Result.Failure($"Line {lineNo}: account is required for cash/account entries.");
                    break;
            }
        }

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

        if (normalizedLines.Any(line => !line.ItemId.HasValue || line.ItemId.Value <= 0))
            return Result.Failure("Each purchase line requires a valid item.");

        var totalAmount = normalizedLines.Sum(line => line.Quantity * line.Rate);
        if (totalAmount <= 0)
            return Result.Failure("Purchase total must be greater than zero.");

        return Result.Success();
    }

    private void ApplyVoucherHeader(Voucher voucher, DateTime date, string? description, string? notes)
    {
        voucher.Date = NormalizeDate(date);
        voucher.Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
        voucher.Notes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim();
    }

    private static void ApplySalesOrderHeader(SalesOrder order, string? description, string? notes)
    {
        order.Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
        order.Notes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim();
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
                DeliveryCharge = line.DeliveryCharge,
                Description = string.IsNullOrWhiteSpace(line.Description) ? null : line.Description.Trim(),
                Debit = amount + line.DeliveryCharge,
                Credit = 0
            };
        }

        var totalAmount = normalizedLines.Sum(line => line.Quantity * line.Rate + line.DeliveryCharge);
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

    private async Task<Result<SalesVoucherCreateResultDto>> LoadSalesOrderResultAsync(int id, CancellationToken ct)
    {
        var order = await _salesOrderRepo.GetWithVouchersAsync(id, ct);
        if (order == null)
            return Result<SalesVoucherCreateResultDto>.Failure("Sales order not found after save.");

        var vouchers = order.Vouchers
            .Where(voucher => !voucher.IsDeleted)
            .OrderBy(voucher => voucher.VoucherNo)
            .Select(voucher => _mapper.Map<VoucherDetailDto>(voucher))
            .ToList();
        return Result<SalesVoucherCreateResultDto>.Success(new SalesVoucherCreateResultDto
        {
            SalesOrderId = order.Id,
            SalesOrderNo = order.OrderNo,
            CreatedCount = vouchers.Count,
            VoucherNos = vouchers.Select(voucher => voucher.VoucherNo).ToList(),
            Vouchers = vouchers
        });
    }

    private static SalesOrderDetailDto MapSalesOrder(SalesOrder order)
    {
        var activeVouchers = order.Vouchers.Where(voucher => !voucher.IsDeleted).ToList();
        var lines = activeVouchers
            .OrderBy(voucher => voucher.Date)
            .ThenBy(voucher => voucher.VoucherNo)
            .SelectMany(voucher => voucher.Lines
                .Where(line => line.EntryType == EntryType.CustomerDebit)
                .OrderBy(line => line.Id)
                .Select(line => new SalesOrderLineDto
                {
                    VoucherId = voucher.Id,
                    VoucherNo = voucher.VoucherNo,
                    Date = voucher.Date,
                    CustomerId = line.CustomerId ?? 0,
                    CustomerName = line.Customer?.Name ?? string.Empty,
                    ItemId = line.ItemId ?? 0,
                    ItemName = line.Item?.Name ?? string.Empty,
                    QuantityType = line.QuantityType ?? QuantityType.PerPerson,
                    Quantity = line.Quantity ?? 0,
                    Rate = line.Rate ?? 0,
                    DeliveryCharge = line.DeliveryCharge,
                    Description = line.Description
                }))
            .ToList();

        return new SalesOrderDetailDto
        {
            Id = order.Id,
            OrderNo = order.OrderNo,
            Mode = order.Mode,
            Description = order.Description,
            Notes = order.Notes,
            CreatedAt = order.CreatedAt,
            VoucherNos = activeVouchers.OrderBy(voucher => voucher.VoucherNo).Select(voucher => voucher.VoucherNo).ToList(),
            Lines = lines
        };
    }

    private static void SoftDeleteVoucher(Voucher voucher)
    {
        foreach (var line in voucher.Lines)
            line.IsDeleted = true;
        voucher.IsDeleted = true;
    }

    private static int ParseVoucherNumber(string voucherNo, string prefix)
    {
        if (voucherNo.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)
            && int.TryParse(voucherNo[prefix.Length..], out var number))
            return number;

        return 1;
    }

    private static DateTime NormalizeDate(DateTime date)
        => new(date.Year, date.Month, date.Day, 0, 0, 0, DateTimeKind.Unspecified);
}
