using PakwaanCrm.API.Enums;

namespace PakwaanCrm.API.DTOs.Requests;

public class CreateItemRequest
{
    public string Name { get; set; } = string.Empty;
    public ItemUnit Unit { get; set; } = ItemUnit.PerPerson;
    public decimal DefaultRate { get; set; } = 0;
    public bool IsActive { get; set; } = true;
}

public class UpdateItemRequest
{
    public string Name { get; set; } = string.Empty;
    public ItemUnit Unit { get; set; } = ItemUnit.PerPerson;
    public decimal DefaultRate { get; set; } = 0;
    public bool IsActive { get; set; } = true;
}
