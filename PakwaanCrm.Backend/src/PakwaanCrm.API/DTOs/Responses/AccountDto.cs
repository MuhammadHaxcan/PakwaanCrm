namespace PakwaanCrm.API.DTOs.Responses;

public class AccountDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}