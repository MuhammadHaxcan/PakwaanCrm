using PakwaanCrm.API.Enums;

namespace PakwaanCrm.API.Entities;

public class Voucher : BaseEntity
{
    public string VoucherNo { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public VoucherType VoucherType { get; set; }
    public string? Description { get; set; }
    public string? Notes { get; set; }

    public ICollection<VoucherLine> Lines { get; set; } = new List<VoucherLine>();
}
