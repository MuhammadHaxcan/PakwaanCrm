using PakwaanCrm.API.Common.Models;
using PakwaanCrm.API.DTOs.Requests;
using PakwaanCrm.API.DTOs.Responses;

namespace PakwaanCrm.API.Services.Interfaces;

public interface IVendorService
{
    Task<List<VendorDto>> GetAllAsync(CancellationToken ct = default);
    Task<VendorDto?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<Result<VendorDto>> CreateAsync(CreateVendorRequest request, CancellationToken ct = default);
    Task<Result<VendorDto>> UpdateAsync(int id, UpdateVendorRequest request, CancellationToken ct = default);
    Task<Result> DeleteAsync(int id, CancellationToken ct = default);
}
