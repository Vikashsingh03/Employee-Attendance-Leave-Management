using AttendanceLeave.Api.Data;
using AttendanceLeave.Api.Dtos;
using AttendanceLeave.Api.Models;
using AttendanceLeave.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AttendanceLeave.Api.Controllers;

[ApiController]
[Route("api/employees")]
[Authorize]
public class EmployeesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;

    public EmployeesController(AppDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    [Authorize(Roles = "Admin")]
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search,
        [FromQuery] int? departmentId,
        [FromQuery] string status = "active",
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string sortBy = "name",
        [FromQuery] string sortDir = "asc")
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _db.Employees
            .Include(e => e.Department)
            .AsQueryable();
        query = status.ToLowerInvariant() switch
        {
            "all" => query,
            "inactive" => query.Where(e => !e.IsActive),
            _ => query.Where(e => e.IsActive),
        };

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(e =>
                e.FirstName.ToLower().Contains(s) ||
                e.LastName.ToLower().Contains(s) ||
                e.Email.ToLower().Contains(s) ||
                e.EmployeeCode.ToLower().Contains(s));
        }
        if (departmentId.HasValue)
            query = query.Where(e => e.DepartmentId == departmentId.Value);

        var descending = sortDir.Equals("desc", StringComparison.OrdinalIgnoreCase);
        query = sortBy.ToLower() switch
        {
            "dateofjoining" => descending
                ? query.OrderByDescending(e => e.DateOfJoining)
                : query.OrderBy(e => e.DateOfJoining),
            _ => descending
                ? query.OrderByDescending(e => e.FirstName).ThenByDescending(e => e.LastName)
                : query.OrderBy(e => e.FirstName).ThenBy(e => e.LastName),
        };

        var total = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(e => new EmployeeListItemDto(
                e.Id, e.EmployeeCode, e.FullName, e.Email, e.Phone,
                e.Designation, e.Department!.Name, e.DateOfJoining, e.IsActive))
            .ToListAsync();

        return Ok(new PagedResult<EmployeeListItemDto>(items, total, page, pageSize));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var me = CurrentUser.EmployeeId(User);
        if (!CurrentUser.IsAdmin(User) && me != id)
            return Forbid();

        var employee = await _db.Employees
            .Include(e => e.Department)
            .FirstOrDefaultAsync(e => e.Id == id);
        if (employee is null) return NotFound(new { message = "Employee not found." });

        var balances = await _db.LeaveBalances
            .Include(b => b.LeaveType)
            .Where(b => b.EmployeeId == id && b.Year == 2026)
            .Select(b => new LeaveBalanceDto(
                b.Id, b.EmployeeId, employee.FullName, b.LeaveTypeId,
                b.LeaveType!.Name, b.Year, b.TotalDays, b.UsedDays, b.RemainingDays))
            .ToListAsync();

        return Ok(new EmployeeDetailDto(
            employee.Id, employee.EmployeeCode, employee.FullName, employee.Email,
            employee.Phone, employee.Designation, employee.DepartmentId,
            employee.Department?.Name ?? string.Empty, employee.DateOfJoining,
            employee.Salary, employee.IsActive, employee.Role,
            employee.PhotoPath, balances));
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] EmployeeCreateDto dto)
    {
        if (dto.Role is not ("Admin" or "Employee"))
            return BadRequest(new { message = "Role must be 'Admin' or 'Employee'." });

        if (!await _db.Departments.AnyAsync(d => d.Id == dto.DepartmentId))
            return BadRequest(new { message = "Department does not exist." });

        if (await _db.Employees.AnyAsync(e => e.Email == dto.Email))
            return BadRequest(new { message = "An employee with this email already exists." });

        var nextNumber = await _db.Employees.CountAsync() + 1;
        var code = $"EMP{nextNumber:000}";
        while (await _db.Employees.AnyAsync(e => e.EmployeeCode == code))
            code = $"EMP{++nextNumber:000}";

        var (hash, salt) = PasswordHasher.HashPassword(dto.Password);
        var employee = new Employee
        {
            EmployeeCode = code,
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Email = dto.Email,
            Phone = dto.Phone,
            Designation = dto.Designation,
            DepartmentId = dto.DepartmentId,
            DateOfJoining = dto.DateOfJoining.Date,
            Salary = dto.Salary,
            IsActive = true,
            PasswordHash = hash,
            PasswordSalt = salt,
            Role = dto.Role,
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

        return CreatedAtAction(nameof(GetById), new { id = employee.Id },
            new { id = employee.Id, employeeCode = employee.EmployeeCode });
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] EmployeeUpdateDto dto)
    {
        var employee = await _db.Employees.FindAsync(id);
        if (employee is null) return NotFound(new { message = "Employee not found." });
        if (dto.Role is not ("Admin" or "Employee"))
            return BadRequest(new { message = "Role must be 'Admin' or 'Employee'." });
        if (!await _db.Departments.AnyAsync(d => d.Id == dto.DepartmentId))
            return BadRequest(new { message = "Department does not exist." });

        employee.FirstName = dto.FirstName;
        employee.LastName = dto.LastName;
        employee.Phone = dto.Phone;
        employee.Designation = dto.Designation;
        employee.DepartmentId = dto.DepartmentId;
        employee.DateOfJoining = dto.DateOfJoining.Date;
        employee.Salary = dto.Salary;
        employee.Role = dto.Role;
        employee.IsActive = dto.IsActive;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var employee = await _db.Employees.FindAsync(id);
        if (employee is null) return NotFound(new { message = "Employee not found." });
        employee.IsActive = false;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:int}/photo")]
    public async Task<IActionResult> UploadPhoto(int id, IFormFile file)
    {
        var me = CurrentUser.EmployeeId(User);
        if (!CurrentUser.IsAdmin(User) && me != id)
            return Forbid();

        var employee = await _db.Employees.FindAsync(id);
        if (employee is null) return NotFound(new { message = "Employee not found." });
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "No file uploaded." });
        if (file.Length > 2 * 1024 * 1024)
            return BadRequest(new { message = "Photo must be 2 MB or smaller." });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext is not (".jpg" or ".jpeg" or ".png"))
            return BadRequest(new { message = "Only .jpg and .png photos are allowed." });

        var uploads = Path.Combine(_env.WebRootPath ?? "wwwroot", "uploads");
        Directory.CreateDirectory(uploads);
        var fileName = $"{id}_{Guid.NewGuid():N}{ext}";
        var path = Path.Combine(uploads, fileName);
        await using (var stream = new FileStream(path, FileMode.Create))
            await file.CopyToAsync(stream);

        employee.PhotoPath = $"uploads/{fileName}";
        await _db.SaveChangesAsync();
        return Ok(new { photoUrl = $"/{employee.PhotoPath}" });
    }
}
