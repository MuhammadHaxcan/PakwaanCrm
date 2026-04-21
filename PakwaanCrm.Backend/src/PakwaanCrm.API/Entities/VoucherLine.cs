using PakwaanCrm.API.Enums;

namespace PakwaanCrm.API.Entities;

public class VoucherLine : BaseEntity
{
    public int VoucherId { get; set; }
    public Voucher Voucher { get; set; } = null!;

    public EntryType EntryType { get; set; }

    public int? CustomerId { get; set; }
    public Customer? Customer { get; set; }

    public int? VendorId { get; set; }
    public Vendor? Vendor { get; set; }

    public string? FreeText { get; set; }

    public int? ItemId { get; set; }
    public Item? Item { get; set; }

    public QuantityType? QuantityType { get; set; }
    public decimal? Quantity { get; set; }
    public decimal? Rate { get; set; }

    public string? Description { get; set; }
    public decimal Debit { get; set; } = 0;
    public decimal Credit { get; set; } = 0;
}
