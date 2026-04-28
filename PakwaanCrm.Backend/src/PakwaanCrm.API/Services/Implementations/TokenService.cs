using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using PakwaanCrm.API.Configuration;
using PakwaanCrm.API.DTOs.Responses;
using PakwaanCrm.API.Entities;

namespace PakwaanCrm.API.Services.Implementations;

public class TokenService : Interfaces.ITokenService
{
    private readonly JwtOptions _jwtOptions;

    public TokenService(IOptions<JwtOptions> jwtOptions)
    {
        _jwtOptions = jwtOptions.Value;
    }

    public AuthResponseDto CreateAuthResponse(AppUser user)
    {
        var expiresAt = DateTime.UtcNow.AddMinutes(_jwtOptions.AccessTokenMinutes);
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtOptions.SigningKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.Username),
            new(ClaimTypes.Role, user.Role.ToString())
        };

        var token = new JwtSecurityToken(
            issuer: _jwtOptions.Issuer,
            audience: _jwtOptions.Audience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials);

        return new AuthResponseDto
        {
            AccessToken = new JwtSecurityTokenHandler().WriteToken(token),
            AccessTokenExpiresAt = expiresAt,
            User = new UserSummaryDto
            {
                Id = user.Id,
                Username = user.Username,
                DisplayName = user.DisplayName,
                Role = user.Role.ToString(),
                IsActive = user.IsActive
            }
        };
    }

    public (string Token, DateTime ExpiresAtUtc) CreateRefreshToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        var token = Convert.ToBase64String(bytes);
        return (token, DateTime.UtcNow.AddDays(_jwtOptions.RefreshTokenDays));
    }
}
