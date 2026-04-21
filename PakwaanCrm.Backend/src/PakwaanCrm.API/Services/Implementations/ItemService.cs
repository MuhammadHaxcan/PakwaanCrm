using AutoMapper;
using PakwaanCrm.API.Common.Models;
using PakwaanCrm.API.DTOs.Requests;
using PakwaanCrm.API.DTOs.Responses;
using PakwaanCrm.API.Entities;
using PakwaanCrm.API.Repositories.Interfaces;
using PakwaanCrm.API.Services.Interfaces;

namespace PakwaanCrm.API.Services.Implementations;

public class ItemService : IItemService
{
    private readonly IItemRepository _repo;
    private readonly IMapper _mapper;

    public ItemService(IItemRepository repo, IMapper mapper)
    {
        _repo = repo;
        _mapper = mapper;
    }

    public async Task<List<ItemDto>> GetAllAsync(CancellationToken ct = default)
        => _mapper.Map<List<ItemDto>>(await _repo.GetAllAsync(ct));

    public async Task<ItemDto?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var item = await _repo.GetByIdAsync(id, ct);
        return item == null ? null : _mapper.Map<ItemDto>(item);
    }

    public async Task<Result<ItemDto>> CreateAsync(CreateItemRequest request, CancellationToken ct = default)
    {
        var item = _mapper.Map<Item>(request);
        await _repo.AddAsync(item, ct);
        await _repo.SaveChangesAsync(ct);
        return Result<ItemDto>.Success(_mapper.Map<ItemDto>(item));
    }

    public async Task<Result<ItemDto>> UpdateAsync(int id, UpdateItemRequest request, CancellationToken ct = default)
    {
        var item = await _repo.GetByIdAsync(id, ct);
        if (item == null) return Result<ItemDto>.Failure("Item not found.");
        _mapper.Map(request, item);
        _repo.Update(item);
        await _repo.SaveChangesAsync(ct);
        return Result<ItemDto>.Success(_mapper.Map<ItemDto>(item));
    }

    public async Task<Result> DeleteAsync(int id, CancellationToken ct = default)
    {
        var item = await _repo.GetByIdAsync(id, ct);
        if (item == null) return Result.Failure("Item not found.");
        _repo.Delete(item);
        await _repo.SaveChangesAsync(ct);
        return Result.Success();
    }
}
