namespace PakwaanCrm.API.Services.Implementations;

internal static class PdfBranding
{
    public static byte[]? LoadPanjatanImage(string contentRootPath)
    {
        var candidates = new[]
        {
            Path.Combine(contentRootPath, "panjatan.jpeg"),
            Path.Combine(contentRootPath, "..", "panjatan.jpeg"),
            Path.Combine(contentRootPath, "..", "..", "panjatan.jpeg"),
            Path.Combine(contentRootPath, "..", "..", "..", "panjatan.jpeg")
        };

        foreach (var candidate in candidates)
        {
            var fullPath = Path.GetFullPath(candidate);
            if (File.Exists(fullPath))
            {
                return File.ReadAllBytes(fullPath);
            }
        }

        return null;
    }
}

