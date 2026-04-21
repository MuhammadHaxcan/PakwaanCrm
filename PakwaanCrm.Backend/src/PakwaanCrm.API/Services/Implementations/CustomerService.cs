using AutoMapper;
using PakwaanCrm.API.Common.Models;
using PakwaanCrm.API.DTOs.Requests;
using PakwaanCrm.API.DTOs.Responses;
using PakwaanCrm.API.Entities;
using PakwaanCrm.API.Repositories.Interfaces;
using PakwaanCrm.API.Services.Interfaces;

namespace PakwaanCrm.API.Services.Implementations;

public class CustomerService : ICustomerService
{
    private readonly ICustomerRepository _repo;
    private readonly IMapper _mapper;

    public CustomerService(ICustomerRepository repo, IMapper mapper)
    {
        _repo = repo;
        _mapper = mapper;
    }

    public async Task<List<CustomerDto>> GetAllAsync(CancellationToken ct = default)
    {
        var customers = await _repo.GetAllAsync(ct);
        return _mapper.Map<List<CustomerDto>>(customers);
    }

    public async Task<CustomerDto?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var customer = await _repo.GetByIdAsync(id, ct);
        return customer == null ? null : _mapper.Map<CustomerDto>(customer);
    }

    public async Task<Result<CustomerDto>> CreateAsync(CreateCustomerRequest request, CancellationToken ct = default)
    {
        var customer = _mapper.Map<Customer>(request);
        await _repo.AddAsync(customer, ct);
        await _repo.SaveChangesAsync(ct);
        return Result<CustomerDto>.Success(_mapper.Map<CustomerDto>(customer));
    }

    public async Task<Result<CustomerDto>> UpdateAsync(int id, UpdateCustomerRequest request, CancellationToken ct = default)
    {
        var customer = await _repo.GetByIdAsync(id, ct);
        if (customer == null) return Result<CustomerDto>.Failure("Customer not found.");
        _mapper.Map(request, customer);
        _repo.Update(customer);
        await _repo.SaveChangesAsync(ct);
        return Result<CustomerDto>.Success(_mapper.Map<CustomerDto>(customer));
    }

    public async Task<Result> DeleteAsync(int id, CancellationToken ct = default)
    {
        var customer = await _repo.GetByIdAsync(id, ct);
        if (customer == null) return Result.Failure("Customer not found.");
        _repo.Delete(customer);
        await _repo.SaveChangesAsync(ct);
        return Result.Success();
    }
}
