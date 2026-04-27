using PakwaanCrm.API.Enums;

namespace PakwaanCrm.API.DTOs.Responses;

public class VoucherListDto
{
    public int Id { get; set; }
    public string VoucherNo { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public VoucherType VoucherType { get; set; }
    public string VoucherTypeLabel => VoucherType switch
    {
        VoucherType.Sales => "Sales",
        VoucherType.Purchase => "Purchase",
        _ => "General"
    };
    public string? Description { get; set; }
    public decimal TotalDebit { get; set; }
    public decimal TotalCredit { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class VoucherDetailDto
{
    public int Id { get; set; }
    public string VoucherNo { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public VoucherType VoucherType { get; set; }
    public string VoucherTypeLabel => VoucherType switch
    {
        VoucherType.Sales => "Sales",
        VoucherType.Purchase => "Purchase",
        _ => "General"
    };
    public string? Description { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<VoucherLineDto> Lines { get; set; } = new();
}

public class SalesVoucherCreateResultDto
{
    public int CreatedCount { get; set; }
    public List<string> VoucherNos { get; set; } = new();
    public List<VoucherDetailDto> Vouchers { get; set; } = new();
}

public class VoucherLineDto
{
    public int Id { get; set; }
    public EntryType EntryType { get; set; }
    public string EntryTypeLabel { get; set; } = string.Empty;
    public int? CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public int? VendorId { get; set; }
    public string? VendorName { get; set; }
    public string? FreeText { get; set; }
    public int? ItemId { get; set; }
    public string? ItemName { get; set; }
    public QuantityType? QuantityType { get; set; }
    public decimal? Quantity { get; set; }
    public decimal? Rate { get; set; }
    public string? Description { get; set; }
    public decimal Debit { get; set; }
    public decimal Credit { get; set; }
}
