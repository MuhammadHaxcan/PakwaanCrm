using PakwaanCrm.API.DTOs.Requests;
using PakwaanCrm.API.DTOs.Responses;

namespace PakwaanCrm.API.Services.Interfaces;

public interface IAuthService
{
    Task<(bool Success, string? Error, AuthResponseDto? Response, string? RefreshToken)> LoginAsync(LoginRequest request, CancellationToken ct = default);
    Task<(bool Success, string? Error, AuthResponseDto? Response, string? RefreshToken)> RefreshAsync(string refreshToken, CancellationToken ct = default);
    Task<bool> LogoutAsync(string refreshToken, CancellationToken ct = default);
    Task<UserSummaryDto?> GetCurrentUserAsync(int userId, CancellationToken ct = default);
}
