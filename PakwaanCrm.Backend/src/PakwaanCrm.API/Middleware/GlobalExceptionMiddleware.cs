using System.Net;
using System.Text.Json;

namespace PakwaanCrm.API.Middleware;

public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;
    private readonly IHostEnvironment _environment;

    public GlobalExceptionMiddleware(
        RequestDelegate next,
        ILogger<GlobalExceptionMiddleware> logger,
        IHostEnvironment environment)
    {
        _next = next;
        _logger = logger;
        _environment = environment;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception");
            context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
            context.Response.ContentType = "application/json";
            object payload = _environment.IsDevelopment()
                ? new { error = "An unexpected error occurred.", detail = ex.Message }
                : new { error = "An unexpected error occurred." };
            var error = JsonSerializer.Serialize(payload);
            await context.Response.WriteAsync(error);
        }
    }
}
