namespace PakwaanCrm.API.DTOs.Requests;

public class LoginRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class CreateUserRequest
{
    public string Username { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Role { get; set; } = "Staff";
    public bool IsActive { get; set; } = true;
}

public class UpdateUserRequest
{
    public string Username { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Role { get; set; } = "Staff";
    public bool IsActive { get; set; } = true;
}

public class ResetPasswordRequest
{
    public string Password { get; set; } = string.Empty;
}
