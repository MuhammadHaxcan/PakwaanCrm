using PakwaanCrm.API.Enums;

namespace PakwaanCrm.API.Entities;

public class SalesOrder : BaseEntity
{
    public string OrderNo { get; set; } = string.Empty;
    public SalesOrderMode Mode { get; set; }
    public string? Description { get; set; }
    public string? Notes { get; set; }

    public ICollection<Voucher> Vouchers { get; set; } = new List<Voucher>();
}
