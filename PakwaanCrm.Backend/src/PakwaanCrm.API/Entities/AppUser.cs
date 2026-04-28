using PakwaanCrm.API.Enums;

namespace PakwaanCrm.API.Entities;

public class AppUser : BaseEntity
{
    public string Username { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.Staff;
    public bool IsActive { get; set; } = true;

    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}
