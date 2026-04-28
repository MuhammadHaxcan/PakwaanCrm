using System.Security.Cryptography;
using System.Text;

namespace PakwaanCrm.API.Security;

public static class TokenHashing
{
    public static string Hash(string token)
    {
        var bytes = Encoding.UTF8.GetBytes(token);
        var hash = SHA256.HashData(bytes);
        return Convert.ToHexString(hash);
    }
}
