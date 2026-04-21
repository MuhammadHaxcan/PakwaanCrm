using PakwaanCrm.API.Enums;

namespace PakwaanCrm.API.DTOs.Requests;

public class CreateSalesVoucherRequest
{
    public DateTime Date { get; set; } = DateTime.Today;
    public string? Description { get; set; }
    public string? Notes { get; set; }
    public List<SalesLineRequest> Lines { get; set; } = new();
}

public class SalesLineRequest
{
    public int CustomerId { get; set; }
    public int ItemId { get; set; }
    public QuantityType QuantityType { get; set; }
    public decimal Quantity { get; set; }
    public decimal Rate { get; set; }
    public string? Description { get; set; }
}

public class CreateGeneralVoucherRequest
{
    public DateTime Date { get; set; } = DateTime.Today;
    public string? Description { get; set; }
    public string? Notes { get; set; }
    public List<GeneralLineRequest> Lines { get; set; } = new();
}

public class CreateVendorPurchaseRequest
{
    public DateTime Date { get; set; } = DateTime.Today;
    public int VendorId { get; set; }
    public string? Description { get; set; }
    public string? Notes { get; set; }
    public decimal PaidAmount { get; set; }
    public string? PaymentAccountName { get; set; }
    public string? PaymentDescription { get; set; }
    public List<VendorPurchaseLineRequest> Lines { get; set; } = new();
}

public class VendorPurchaseLineRequest
{
    public int? ItemId { get; set; }
    public string? ItemName { get; set; }
    public QuantityType? QuantityType { get; set; }
    public decimal Quantity { get; set; }
    public decimal Rate { get; set; }
    public string? Description { get; set; }
}

public class GeneralLineRequest
{
    public EntryType EntryType { get; set; }
    public int? CustomerId { get; set; }
    public int? VendorId { get; set; }
    public string? FreeText { get; set; }
    public int? ItemId { get; set; }
    public QuantityType? QuantityType { get; set; }
    public decimal? Quantity { get; set; }
    public decimal? Rate { get; set; }
    public string? Description { get; set; }
    public decimal Debit { get; set; }
    public decimal Credit { get; set; }
}
