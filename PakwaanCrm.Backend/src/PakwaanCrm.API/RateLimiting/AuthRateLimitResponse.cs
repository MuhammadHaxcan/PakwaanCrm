namespace PakwaanCrm.API.RateLimiting;

public static class AuthRateLimitResponse
{
    public const int FallbackRetryAfterSeconds = 60;

    public static int GetRetryAfterSeconds(TimeSpan? retryAfter)
    {
        return retryAfter.HasValue
            ? Math.Max(1, (int)Math.Ceiling(retryAfter.Value.TotalSeconds))
            : FallbackRetryAfterSeconds;
    }
}
