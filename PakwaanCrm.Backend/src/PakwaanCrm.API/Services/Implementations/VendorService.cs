using AutoMapper;
using PakwaanCrm.API.Common.Models;
using PakwaanCrm.API.DTOs.Requests;
using PakwaanCrm.API.DTOs.Responses;
using PakwaanCrm.API.Entities;
using PakwaanCrm.API.Repositories.Interfaces;
using PakwaanCrm.API.Services.Interfaces;

namespace PakwaanCrm.API.Services.Implementations;

public class VendorService : IVendorService
{
    private readonly IVendorRepository _repo;
    private readonly IMapper _mapper;

    public VendorService(IVendorRepository repo, IMapper mapper)
    {
        _repo = repo;
        _mapper = mapper;
    }

    public async Task<List<VendorDto>> GetAllAsync(CancellationToken ct = default)
        => _mapper.Map<List<VendorDto>>(await _repo.GetAllAsync(ct));

    public async Task<VendorDto?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var vendor = await _repo.GetByIdAsync(id, ct);
        return vendor == null ? null : _mapper.Map<VendorDto>(vendor);
    }

    public async Task<Result<VendorDto>> CreateAsync(CreateVendorRequest request, CancellationToken ct = default)
    {
        var vendor = _mapper.Map<Vendor>(request);
        await _repo.AddAsync(vendor, ct);
        await _repo.SaveChangesAsync(ct);
        return Result<VendorDto>.Success(_mapper.Map<VendorDto>(vendor));
    }

    public async Task<Result<VendorDto>> UpdateAsync(int id, UpdateVendorRequest request, CancellationToken ct = default)
    {
        var vendor = await _repo.GetByIdAsync(id, ct);
        if (vendor == null) return Result<VendorDto>.Failure("Vendor not found.");
        _mapper.Map(request, vendor);
        _repo.Update(vendor);
        await _repo.SaveChangesAsync(ct);
        return Result<VendorDto>.Success(_mapper.Map<VendorDto>(vendor));
    }

    public async Task<Result> DeleteAsync(int id, CancellationToken ct = default)
    {
        var vendor = await _repo.GetByIdAsync(id, ct);
        if (vendor == null) return Result.Failure("Vendor not found.");
        _repo.Delete(vendor);
        await _repo.SaveChangesAsync(ct);
        return Result.Success();
    }
}
