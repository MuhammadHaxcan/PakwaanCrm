namespace PakwaanCrm.API.DTOs.Responses;

public class VendorDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public decimal OpeningBalance { get; set; }
    public DateTime CreatedAt { get; set; }
}
