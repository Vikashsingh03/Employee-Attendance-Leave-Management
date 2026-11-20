using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using AttendanceLeave.Api.Models;
using Microsoft.IdentityModel.Tokens;

namespace AttendanceLeave.Api.Services;

public static class PasswordHasher
{
    public static (string Hash, string Salt) HashPassword(string password)
    {
        var saltBytes = RandomNumberGenerator.GetBytes(16);
        using var sha = SHA256.Create();
        var hashBytes = sha.ComputeHash(Combine(saltBytes, Encoding.UTF8.GetBytes(password)));
        return (Convert.ToBase64String(hashBytes), Convert.ToBase64String(saltBytes));
    }

    public static bool Verify(string password, string storedHash, string storedSalt)
    {
        var saltBytes = Convert.FromBase64String(storedSalt);
        using var sha = SHA256.Create();
        var hashBytes = sha.ComputeHash(Combine(saltBytes, Encoding.UTF8.GetBytes(password)));
        return CryptographicOperations.FixedTimeEquals(
            hashBytes, Convert.FromBase64String(storedHash));
    }

    private static byte[] Combine(byte[] a, byte[] b)
    {
        var result = new byte[a.Length + b.Length];
        Buffer.BlockCopy(a, 0, result, 0, a.Length);
        Buffer.BlockCopy(b, 0, result, a.Length, b.Length);
        return result;
    }
}

public class JwtTokenService
{
    private readonly IConfiguration _config;

    public JwtTokenService(IConfiguration config) => _config = config;

    public string CreateToken(Employee employee)
    {
        var jwt = _config.GetSection("Jwt");
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(jwt["Key"]!));

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, employee.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, employee.Email),
            new Claim(ClaimTypes.Role, employee.Role),
            new Claim("fullName", employee.FullName),
        };

        var token = new JwtSecurityToken(
            issuer: jwt["Issuer"],
            audience: jwt["Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(
                double.TryParse(jwt["ExpiresHours"], out var h) ? h : 8),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

public static class CurrentUser
{
    public static int EmployeeId(ClaimsPrincipal user)
        => int.Parse(user.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? user.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new InvalidOperationException("No employee id in token."));

    public static bool IsAdmin(ClaimsPrincipal user)
        => user.IsInRole("Admin");
}
