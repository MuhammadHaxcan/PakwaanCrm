using PakwaanCrm.API.Enums;

namespace PakwaanCrm.API.DTOs.Responses;

public class ItemDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public ItemUnit Unit { get; set; }
    public string UnitLabel => Unit == ItemUnit.PerPerson ? "Per Person" : "Per Kg";
    public decimal DefaultRate { get; set; }
    public bool IsActive { get; set; }
}
