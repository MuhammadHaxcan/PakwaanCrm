namespace PakwaanCrm.API.Entities;

public class RefreshToken
{
    public int Id { get; set; }
    public int AppUserId { get; set; }
    public string TokenHash { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? RevokedAt { get; set; }
    public string? ReplacedByTokenHash { get; set; }
    public string? RevokedReason { get; set; }

    public AppUser AppUser { get; set; } = null!;
}
