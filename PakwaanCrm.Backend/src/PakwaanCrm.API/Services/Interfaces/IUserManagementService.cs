using PakwaanCrm.API.DTOs.Requests;
using PakwaanCrm.API.DTOs.Responses;

namespace PakwaanCrm.API.Services.Interfaces;

public interface IUserManagementService
{
    Task<List<UserAdminDto>> GetAllAsync(CancellationToken ct = default);
    Task<(bool Success, string? Error, UserAdminDto? User)> CreateAsync(CreateUserRequest request, CancellationToken ct = default);
    Task<(bool Success, string? Error, UserAdminDto? User)> UpdateAsync(int id, UpdateUserRequest request, CancellationToken ct = default);
    Task<(bool Success, string? Error)> ResetPasswordAsync(int id, ResetPasswordRequest request, CancellationToken ct = default);
    Task<(bool Success, string? Error)> DeleteAsync(int id, CancellationToken ct = default);
}
