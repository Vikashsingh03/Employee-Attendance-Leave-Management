using AttendanceLeave.Api.Data;
using AttendanceLeave.Api.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AttendanceLeave.Api.Controllers;

[ApiController]
[Route("api/leavetypes")]
[Authorize]
public class LeaveTypesController : ControllerBase
{
    private readonly AppDbContext _db;

    public LeaveTypesController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var list = await _db.LeaveTypes
            .OrderBy(t => t.Name)
            .Select(t => new LeaveTypeDto(
                t.Id, t.Name, t.Description, t.DaysAllowedPerYear, t.IsPaid))
            .ToListAsync();
        return Ok(list);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var type = await _db.LeaveTypes.FindAsync(id);
        if (type is null) return NotFound(new { message = "Leave type not found." });
        return Ok(new LeaveTypeDto(
            type.Id, type.Name, type.Description, type.DaysAllowedPerYear, type.IsPaid));
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] LeaveTypeCreateDto dto)
    {
        var type = new Models.LeaveType
        {
            Name = dto.Name,
            Description = dto.Description,
            DaysAllowedPerYear = dto.DaysAllowedPerYear,
            IsPaid = dto.IsPaid
        };
        _db.LeaveTypes.Add(type);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = type.Id },
            new LeaveTypeDto(type.Id, type.Name, type.Description,
                type.DaysAllowedPerYear, type.IsPaid));
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] LeaveTypeCreateDto dto)
    {
        var type = await _db.LeaveTypes.FindAsync(id);
        if (type is null) return NotFound(new { message = "Leave type not found." });
        type.Name = dto.Name;
        type.Description = dto.Description;
        type.DaysAllowedPerYear = dto.DaysAllowedPerYear;
        type.IsPaid = dto.IsPaid;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var type = await _db.LeaveTypes.FindAsync(id);
        if (type is null) return NotFound(new { message = "Leave type not found." });

        var inUse = await _db.LeaveRequests.AnyAsync(r => r.LeaveTypeId == id)
            || await _db.LeaveBalances.AnyAsync(b => b.LeaveTypeId == id);
        if (inUse)
            return BadRequest(new
            {
                message = "Cannot delete this leave type: leave requests or balances use it."
            });

        _db.LeaveTypes.Remove(type);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
