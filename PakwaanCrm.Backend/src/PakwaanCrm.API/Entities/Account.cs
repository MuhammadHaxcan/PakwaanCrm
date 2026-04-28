namespace PakwaanCrm.API.Entities;

public class Account : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public ICollection<VoucherLine> VoucherLines { get; set; } = new List<VoucherLine>();
}