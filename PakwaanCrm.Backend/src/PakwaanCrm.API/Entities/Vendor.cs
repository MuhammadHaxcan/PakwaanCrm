namespace PakwaanCrm.API.Entities;

public class Vendor : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public decimal OpeningBalance { get; set; } = 0;

    public ICollection<VoucherLine> VoucherLines { get; set; } = new List<VoucherLine>();
}
