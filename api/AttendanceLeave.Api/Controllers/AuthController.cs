using System.Net.Mail;
using AttendanceLeave.Api.Data;
using AttendanceLeave.Api.Dtos;
using AttendanceLeave.Api.Models;
using AttendanceLeave.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AttendanceLeave.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly JwtTokenService _jwt;

    public AuthController(AppDbContext db, JwtTokenService jwt)
    {
        _db = db;
        _jwt = jwt;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        var employee = await _db.Employees
            .Include(e => e.Department)
            .FirstOrDefaultAsync(e => e.Email == req.Email);

        if (employee is null || !employee.IsActive ||
            !PasswordHasher.Verify(req.Password, employee.PasswordHash, employee.PasswordSalt))
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        var user = ToUserDto(employee);
        return Ok(new LoginResponse(_jwt.CreateToken(employee), user));
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req)
    {
        var fullName = req.FullName?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(fullName))
            return BadRequest(new { message = "Full name is required." });

        var email = req.Email?.Trim() ?? string.Empty;
        if (!IsValidEmail(email))
            return BadRequest(new { message = "A valid email address is required." });

        if (string.IsNullOrEmpty(req.Password) || req.Password.Length < 8 ||
            !req.Password.Any(char.IsLetter) || !req.Password.Any(char.IsDigit))
            return BadRequest(new { message = "Password must be at least 8 characters long and contain at least one letter and one digit." });

        var department = await _db.Departments.FirstOrDefaultAsync(d => d.Id == req.DepartmentId);
        if (department is null)
            return BadRequest(new { message = "Department not found." });

        var emailLower = email.ToLowerInvariant();
        if (await _db.Employees.AnyAsync(e => e.Email.ToLower() == emailLower))
            return BadRequest(new { message = "An account with this email already exists." });

        var nextNumber = await _db.Employees.CountAsync() + 1;
        var code = $"EMP{nextNumber:000}";
        while (await _db.Employees.AnyAsync(e => e.EmployeeCode == code))
            code = $"EMP{++nextNumber:000}";

        var space = fullName.IndexOf(' ');
        var firstName = space < 0 ? fullName : fullName[..space].Trim();
        var lastName = space < 0 ? string.Empty : fullName[(space + 1)..].Trim();

        var (hash, salt) = PasswordHasher.HashPassword(req.Password);
        var employee = new Employee
        {
            EmployeeCode = code,
            FirstName = firstName,
            LastName = lastName,
            Email = email,
            DepartmentId = department.Id,
            DateOfJoining = DateTime.UtcNow.Date,
            Salary = 0,
            IsActive = true,
            PasswordHash = hash,
            PasswordSalt = salt,
            Role = "Employee",
            CreatedAt = DateTime.UtcNow,
        };
        _db.Employees.Add(employee);
        await _db.SaveChangesAsync();

        var types = await _db.LeaveTypes
            .Where(t => t.Name != "Maternity Leave" && t.Name != "Paternity Leave")
            .ToListAsync();
        foreach (var t in types)
        {
            _db.LeaveBalances.Add(new LeaveBalance
            {
                EmployeeId = employee.Id,
                LeaveTypeId = t.Id,
                Year = DateTime.UtcNow.Year,
                TotalDays = t.DaysAllowedPerYear,
                UsedDays = 0
            });
        }
        await _db.SaveChangesAsync();

        var registeredUser = new UserDto(
            employee.Id, employee.EmployeeCode, fullName, employee.Email,
            employee.Role, employee.DepartmentId, department.Name);
        return StatusCode(StatusCodes.Status201Created,
            new LoginResponse(_jwt.CreateToken(employee), registeredUser));
    }

    private static bool IsValidEmail(string email)
    {
        if (string.IsNullOrWhiteSpace(email)) return false;
        try
        {
            var addr = new MailAddress(email);
            return addr.Address == email && email.Contains('.');
        }
        catch (FormatException)
        {
            return false;
        }
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var id = CurrentUser.EmployeeId(User);
        var employee = await _db.Employees
            .Include(e => e.Department)
            .FirstOrDefaultAsync(e => e.Id == id);
        if (employee is null) return NotFound(new { message = "Employee not found." });
        return Ok(ToUserDto(employee));
    }

    private static UserDto ToUserDto(Models.Employee e) => new(
        e.Id, e.EmployeeCode, e.FullName, e.Email, e.Role,
        e.DepartmentId, e.Department?.Name ?? string.Empty);
}

public record RegisterRequest(
    string? FullName,
    string? Email,
    string? Password,
    int DepartmentId);
