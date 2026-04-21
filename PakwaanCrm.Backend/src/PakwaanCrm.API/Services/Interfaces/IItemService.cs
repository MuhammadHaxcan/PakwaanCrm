using PakwaanCrm.API.Common.Models;
using PakwaanCrm.API.DTOs.Requests;
using PakwaanCrm.API.DTOs.Responses;

namespace PakwaanCrm.API.Services.Interfaces;

public interface IItemService
{
    Task<List<ItemDto>> GetAllAsync(CancellationToken ct = default);
    Task<ItemDto?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<Result<ItemDto>> CreateAsync(CreateItemRequest request, CancellationToken ct = default);
    Task<Result<ItemDto>> UpdateAsync(int id, UpdateItemRequest request, CancellationToken ct = default);
    Task<Result> DeleteAsync(int id, CancellationToken ct = default);
}
