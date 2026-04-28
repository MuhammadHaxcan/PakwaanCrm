using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using PakwaanCrm.API.Data;
using PakwaanCrm.API.DTOs.Requests;
using PakwaanCrm.API.DTOs.Responses;
using PakwaanCrm.API.Entities;
using PakwaanCrm.API.Security;
using PakwaanCrm.API.Services.Interfaces;

namespace PakwaanCrm.API.Services.Implementations;

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly IPasswordHasher<AppUser> _passwordHasher;
    private readonly ITokenService _tokenService;

    public AuthService(AppDbContext db, IPasswordHasher<AppUser> passwordHasher, ITokenService tokenService)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
    }

    public async Task<(bool Success, string? Error, AuthResponseDto? Response, string? RefreshToken)> LoginAsync(
        LoginRequest request,
        CancellationToken ct = default)
    {
        var normalizedUsername = request.Username.Trim().ToLowerInvariant();
        var user = await _db.AppUsers
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Username == normalizedUsername, ct);

        if (user == null || user.IsDeleted || !user.IsActive)
        {
            return (false, "Invalid username or password.", null, null);
        }

        var result = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (result == PasswordVerificationResult.Failed)
        {
            return (false, "Invalid username or password.", null, null);
        }

        var authResponse = _tokenService.CreateAuthResponse(user);
        var (refreshToken, refreshExpiresAt) = _tokenService.CreateRefreshToken();

        var refreshTokenEntity = new RefreshToken
        {
            AppUserId = user.Id,
            TokenHash = TokenHashing.Hash(refreshToken),
            ExpiresAt = refreshExpiresAt
        };

        _db.RefreshTokens.Add(refreshTokenEntity);
        await _db.SaveChangesAsync(ct);

        return (true, null, authResponse, refreshToken);
    }

    public async Task<(bool Success, string? Error, AuthResponseDto? Response, string? RefreshToken)> RefreshAsync(
        string refreshToken,
        CancellationToken ct = default)
    {
        var tokenHash = TokenHashing.Hash(refreshToken);
        var storedToken = await _db.RefreshTokens
            .Include(rt => rt.AppUser)
            .FirstOrDefaultAsync(rt => rt.TokenHash == tokenHash, ct);

        if (storedToken == null)
        {
            return (false, "Invalid refresh token.", null, null);
        }

        if (storedToken.RevokedAt.HasValue || storedToken.ExpiresAt <= DateTime.UtcNow)
        {
            return (false, "Refresh token expired or revoked.", null, null);
        }

        var user = storedToken.AppUser;
        if (user.IsDeleted || !user.IsActive)
        {
            return (false, "User is inactive.", null, null);
        }

        var authResponse = _tokenService.CreateAuthResponse(user);
        var (newRefreshToken, newRefreshExpiresAt) = _tokenService.CreateRefreshToken();
        var newRefreshHash = TokenHashing.Hash(newRefreshToken);

        storedToken.RevokedAt = DateTime.UtcNow;
        storedToken.RevokedReason = "Rotated";
        storedToken.ReplacedByTokenHash = newRefreshHash;

        _db.RefreshTokens.Add(new RefreshToken
        {
            AppUserId = user.Id,
            TokenHash = newRefreshHash,
            ExpiresAt = newRefreshExpiresAt
        });

        await _db.SaveChangesAsync(ct);
        return (true, null, authResponse, newRefreshToken);
    }

    public async Task<bool> LogoutAsync(string refreshToken, CancellationToken ct = default)
    {
        var tokenHash = TokenHashing.Hash(refreshToken);
        var storedToken = await _db.RefreshTokens.FirstOrDefaultAsync(rt => rt.TokenHash == tokenHash, ct);
        if (storedToken == null || storedToken.RevokedAt.HasValue)
        {
            return false;
        }

        storedToken.RevokedAt = DateTime.UtcNow;
        storedToken.RevokedReason = "User logout";
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<UserSummaryDto?> GetCurrentUserAsync(int userId, CancellationToken ct = default)
    {
        var user = await _db.AppUsers
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Id == userId, ct);

        if (user == null || user.IsDeleted || !user.IsActive)
        {
            return null;
        }

        return new UserSummaryDto
        {
            Id = user.Id,
            Username = user.Username,
            DisplayName = user.DisplayName,
            Role = user.Role.ToString(),
            IsActive = user.IsActive
        };
    }
}
