using AutoMapper;
using PakwaanCrm.API.Common.Models;
using PakwaanCrm.API.DTOs.Requests;
using PakwaanCrm.API.DTOs.Responses;
using PakwaanCrm.API.Entities;
using PakwaanCrm.API.Repositories.Interfaces;
using PakwaanCrm.API.Services.Interfaces;

namespace PakwaanCrm.API.Services.Implementations;

public class AccountService : IAccountService
{
    private readonly IAccountRepository _repo;
    private readonly IMapper _mapper;

    public AccountService(IAccountRepository repo, IMapper mapper)
    {
        _repo = repo;
        _mapper = mapper;
    }

    public async Task<List<AccountDto>> GetAllAsync(CancellationToken ct = default)
    {
        var accounts = await _repo.GetAllAsync(ct);
        return _mapper.Map<List<AccountDto>>(accounts);
    }

    public async Task<AccountDto?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var account = await _repo.GetByIdAsync(id, ct);
        return account == null ? null : _mapper.Map<AccountDto>(account);
    }

    public async Task<Result<AccountDto>> CreateAsync(CreateAccountRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return Result<AccountDto>.Failure("Account name is required.");

        var account = _mapper.Map<Account>(request);
        await _repo.AddAsync(account, ct);
        await _repo.SaveChangesAsync(ct);
        return Result<AccountDto>.Success(_mapper.Map<AccountDto>(account));
    }

    public async Task<Result<AccountDto>> UpdateAsync(int id, UpdateAccountRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return Result<AccountDto>.Failure("Account name is required.");

        var account = await _repo.GetByIdAsync(id, ct);
        if (account == null) return Result<AccountDto>.Failure("Account not found.");

        _mapper.Map(request, account);
        _repo.Update(account);
        await _repo.SaveChangesAsync(ct);
        return Result<AccountDto>.Success(_mapper.Map<AccountDto>(account));
    }

    public async Task<Result> DeleteAsync(int id, CancellationToken ct = default)
    {
        var account = await _repo.GetByIdAsync(id, ct);
        if (account == null) return Result.Failure("Account not found.");
        _repo.Delete(account);
        await _repo.SaveChangesAsync(ct);
        return Result.Success();
    }
}