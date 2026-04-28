using PakwaanCrm.API.Common.Models;
using PakwaanCrm.API.DTOs.Requests;
using PakwaanCrm.API.DTOs.Responses;

namespace PakwaanCrm.API.Services.Interfaces;

public interface IAccountService
{
    Task<List<AccountDto>> GetAllAsync(CancellationToken ct = default);
    Task<AccountDto?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<Result<AccountDto>> CreateAsync(CreateAccountRequest request, CancellationToken ct = default);
    Task<Result<AccountDto>> UpdateAsync(int id, UpdateAccountRequest request, CancellationToken ct = default);
    Task<Result> DeleteAsync(int id, CancellationToken ct = default);
}