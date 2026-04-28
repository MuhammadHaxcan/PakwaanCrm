using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PakwaanCrm.API.DTOs.Requests;
using PakwaanCrm.API.Enums;
using PakwaanCrm.API.Services.Interfaces;

namespace PakwaanCrm.API.Controllers;

[ApiController]
[Route("api/users")]
[Authorize(Roles = nameof(UserRole.Admin))]
public class UsersController : ControllerBase
{
    private readonly IUserManagementService _service;

    public UsersController(IUserManagementService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
        => Ok(await _service.GetAllAsync(ct));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUserRequest request, CancellationToken ct)
    {
        var result = await _service.CreateAsync(request, ct);
        return result.Success ? Ok(result.User) : BadRequest(new { error = result.Error });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateUserRequest request, CancellationToken ct)
    {
        var result = await _service.UpdateAsync(id, request, ct);
        return result.Success ? Ok(result.User) : BadRequest(new { error = result.Error });
    }

    [HttpPut("{id:int}/password")]
    public async Task<IActionResult> ResetPassword(int id, [FromBody] ResetPasswordRequest request, CancellationToken ct)
    {
        var result = await _service.ResetPasswordAsync(id, request, ct);
        return result.Success ? Ok() : BadRequest(new { error = result.Error });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var result = await _service.DeleteAsync(id, ct);
        return result.Success ? Ok() : BadRequest(new { error = result.Error });
    }
}
