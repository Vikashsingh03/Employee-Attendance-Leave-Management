using AttendanceLeave.Api.Data;
using AttendanceLeave.Api.Dtos;
using AttendanceLeave.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AttendanceLeave.Api.Controllers;

[ApiController]
[Route("api/departments")]
[Authorize]
public class DepartmentsController : ControllerBase
{
    private readonly AppDbContext _db;

    public DepartmentsController(AppDbContext db) => _db = db;

    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var list = await _db.Departments
            .OrderBy(d => d.Name)
            .Select(d => new DepartmentDto(
                d.Id, d.Name, d.Description,
                d.Employees.Count(e => e.IsActive)))
            .ToListAsync();
        return Ok(list);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var dept = await _db.Departments
            .Where(d => d.Id == id)
            .Select(d => new DepartmentDto(
                d.Id, d.Name, d.Description,
                d.Employees.Count(e => e.IsActive)))
            .FirstOrDefaultAsync();
        if (dept is null) return NotFound(new { message = "Department not found." });
        return Ok(dept);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] DepartmentCreateDto dto)
    {
        var dept = new Department { Name = dto.Name, Description = dto.Description };
        _db.Departments.Add(dept);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = dept.Id },
            new DepartmentDto(dept.Id, dept.Name, dept.Description, 0));
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] DepartmentCreateDto dto)
    {
        var dept = await _db.Departments.FindAsync(id);
        if (dept is null) return NotFound(new { message = "Department not found." });
        dept.Name = dto.Name;
        dept.Description = dto.Description;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var dept = await _db.Departments
            .Include(d => d.Employees)
            .FirstOrDefaultAsync(d => d.Id == id);
        if (dept is null) return NotFound(new { message = "Department not found." });

        if (dept.Employees.Any())
            return BadRequest(new
            {
                message = $"Cannot delete '{dept.Name}': {dept.Employees.Count} employee(s) still belong to it."
            });

        _db.Departments.Remove(dept);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
