using PakwaanCrm.API.DTOs.Responses;
using PakwaanCrm.API.Entities;

namespace PakwaanCrm.API.Services.Interfaces;

public interface ITokenService
{
    AuthResponseDto CreateAuthResponse(AppUser user);
    (string Token, DateTime ExpiresAtUtc) CreateRefreshToken();
}
