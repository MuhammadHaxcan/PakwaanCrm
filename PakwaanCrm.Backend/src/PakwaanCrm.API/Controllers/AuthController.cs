using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using PakwaanCrm.API.Configuration;
using PakwaanCrm.API.DTOs.Requests;
using PakwaanCrm.API.Services.Interfaces;

namespace PakwaanCrm.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private const string RefreshTokenCookieName = "pakwaan_refresh_token";

    private readonly IAuthService _authService;
    private readonly IOptions<JwtOptions> _jwtOptions;
    private readonly IWebHostEnvironment _environment;

    public AuthController(IAuthService authService, IOptions<JwtOptions> jwtOptions, IWebHostEnvironment environment)
    {
        _authService = authService;
        _jwtOptions = jwtOptions;
        _environment = environment;
    }

    [AllowAnonymous]
    [EnableRateLimiting("AuthPolicy")]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        var result = await _authService.LoginAsync(request, ct);
        if (!result.Success || result.Response == null || result.RefreshToken == null)
        {
            return Unauthorized(new { error = result.Error ?? "Login failed." });
        }

        SetRefreshTokenCookie(result.RefreshToken);
        return Ok(result.Response);
    }

    [AllowAnonymous]
    [EnableRateLimiting("AuthPolicy")]
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(CancellationToken ct)
    {
        if (!Request.Cookies.TryGetValue(RefreshTokenCookieName, out var refreshToken) || string.IsNullOrWhiteSpace(refreshToken))
        {
            return Unauthorized(new { error = "Missing refresh token." });
        }

        var result = await _authService.RefreshAsync(refreshToken, ct);
        if (!result.Success || result.Response == null || result.RefreshToken == null)
        {
            ClearRefreshTokenCookie();
            return Unauthorized(new { error = result.Error ?? "Refresh failed." });
        }

        SetRefreshTokenCookie(result.RefreshToken);
        return Ok(result.Response);
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        if (Request.Cookies.TryGetValue(RefreshTokenCookieName, out var refreshToken) && !string.IsNullOrWhiteSpace(refreshToken))
        {
            await _authService.LogoutAsync(refreshToken, ct);
        }

        ClearRefreshTokenCookie();
        return Ok(new { message = "Logged out." });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized(new { error = "Invalid token." });
        }

        var user = await _authService.GetCurrentUserAsync(userId, ct);
        return user == null ? Unauthorized(new { error = "User inactive or not found." }) : Ok(user);
    }

    private void SetRefreshTokenCookie(string token)
    {
        Response.Cookies.Append(RefreshTokenCookieName, token, new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Strict,
            Secure = !_environment.IsDevelopment(),
            Expires = DateTimeOffset.UtcNow.AddDays(_jwtOptions.Value.RefreshTokenDays),
            Path = "/api/auth"
        });
    }

    private void ClearRefreshTokenCookie()
    {
        Response.Cookies.Append(RefreshTokenCookieName, string.Empty, new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Strict,
            Secure = !_environment.IsDevelopment(),
            Expires = DateTimeOffset.UtcNow.AddDays(-1),
            Path = "/api/auth"
        });
    }
}
