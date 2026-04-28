using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using PakwaanCrm.API.Data;
using PakwaanCrm.API.DTOs.Requests;
using PakwaanCrm.API.DTOs.Responses;
using PakwaanCrm.API.Entities;
using PakwaanCrm.API.Enums;
using PakwaanCrm.API.Services.Interfaces;

namespace PakwaanCrm.API.Services.Implementations;

public class UserManagementService : IUserManagementService
{
    private readonly AppDbContext _db;
    private readonly IPasswordHasher<AppUser> _passwordHasher;

    public UserManagementService(AppDbContext db, IPasswordHasher<AppUser> passwordHasher)
    {
        _db = db;
        _passwordHasher = passwordHasher;
    }

    public async Task<List<UserAdminDto>> GetAllAsync(CancellationToken ct = default)
    {
        var users = await _db.AppUsers
            .OrderBy(u => u.Username)
            .ToListAsync(ct);

        return users.Select(ToDto).ToList();
    }

    public async Task<(bool Success, string? Error, UserAdminDto? User)> CreateAsync(CreateUserRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        {
            return (false, "Username and password are required.", null);
        }

        if (!TryParseRole(request.Role, out var role))
        {
            return (false, "Invalid role.", null);
        }

        var username = request.Username.Trim().ToLowerInvariant();
        var exists = await _db.AppUsers.IgnoreQueryFilters().AnyAsync(u => u.Username == username, ct);
        if (exists)
        {
            return (false, "Username already exists.", null);
        }

        var user = new AppUser
        {
            Username = username,
            DisplayName = string.IsNullOrWhiteSpace(request.DisplayName) ? username : request.DisplayName.Trim(),
            Role = role,
            IsActive = request.IsActive
        };

        user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);
        _db.AppUsers.Add(user);
        await _db.SaveChangesAsync(ct);

        return (true, null, ToDto(user));
    }

    public async Task<(bool Success, string? Error, UserAdminDto? User)> UpdateAsync(int id, UpdateUserRequest request, CancellationToken ct = default)
    {
        var user = await _db.AppUsers.FirstOrDefaultAsync(u => u.Id == id, ct);
        if (user == null)
        {
            return (false, "User not found.", null);
        }

        if (!TryParseRole(request.Role, out var role))
        {
            return (false, "Invalid role.", null);
        }

        var username = request.Username.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(username))
        {
            return (false, "Username is required.", null);
        }

        var duplicate = await _db.AppUsers
            .IgnoreQueryFilters()
            .AnyAsync(u => u.Id != id && u.Username == username, ct);

        if (duplicate)
        {
            return (false, "Username already exists.", null);
        }

        if ((user.Role == UserRole.Admin && !request.IsActive) || (user.Role == UserRole.Admin && role != UserRole.Admin))
        {
            var adminCount = await _db.AppUsers.CountAsync(u => u.Role == UserRole.Admin && u.IsActive, ct);
            if (adminCount <= 1)
            {
                return (false, "At least one active admin is required.", null);
            }
        }

        user.Username = username;
        user.DisplayName = string.IsNullOrWhiteSpace(request.DisplayName) ? username : request.DisplayName.Trim();
        user.Role = role;
        user.IsActive = request.IsActive;
        await _db.SaveChangesAsync(ct);

        return (true, null, ToDto(user));
    }

    public async Task<(bool Success, string? Error)> ResetPasswordAsync(int id, ResetPasswordRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Password))
        {
            return (false, "Password is required.");
        }

        var user = await _db.AppUsers.FirstOrDefaultAsync(u => u.Id == id, ct);
        if (user == null)
        {
            return (false, "User not found.");
        }

        user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);
        await _db.SaveChangesAsync(ct);
        return (true, null);
    }

    public async Task<(bool Success, string? Error)> DeleteAsync(int id, CancellationToken ct = default)
    {
        var user = await _db.AppUsers.FirstOrDefaultAsync(u => u.Id == id, ct);
        if (user == null)
        {
            return (false, "User not found.");
        }

        if (user.Role == UserRole.Admin && user.IsActive)
        {
            var adminCount = await _db.AppUsers.CountAsync(u => u.Role == UserRole.Admin && u.IsActive, ct);
            if (adminCount <= 1)
            {
                return (false, "At least one active admin is required.");
            }
        }

        user.IsDeleted = true;
        user.IsActive = false;
        await _db.SaveChangesAsync(ct);
        return (true, null);
    }

    private static bool TryParseRole(string roleText, out UserRole role)
    {
        return Enum.TryParse(roleText, true, out role);
    }

    private static UserAdminDto ToDto(AppUser user)
    {
        return new UserAdminDto
        {
            Id = user.Id,
            Username = user.Username,
            DisplayName = user.DisplayName,
            Role = user.Role.ToString(),
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt
        };
    }
}
