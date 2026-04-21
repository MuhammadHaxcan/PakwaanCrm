using PakwaanCrm.API.Enums;

namespace PakwaanCrm.API.Entities;

public class Item : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public ItemUnit Unit { get; set; } = ItemUnit.PerPerson;
    public decimal DefaultRate { get; set; } = 0;
    public bool IsActive { get; set; } = true;

    public ICollection<VoucherLine> VoucherLines { get; set; } = new List<VoucherLine>();
}
