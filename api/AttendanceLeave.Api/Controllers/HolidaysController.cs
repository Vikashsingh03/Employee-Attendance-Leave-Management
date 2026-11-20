using AttendanceLeave.Api.Data;
using AttendanceLeave.Api.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AttendanceLeave.Api.Controllers;

[ApiController]
[Route("api/holidays")]
[Authorize]
public class HolidaysController : ControllerBase
{
    private readonly AppDbContext _db;

    public HolidaysController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int year = 2026)
    {
        var list = await _db.Holidays
            .Where(h => h.Date.Year == year)
            .OrderBy(h => h.Date)
            .Select(h => new HolidayDto(
                h.Id, h.Name, h.Date, h.Description, h.IsPublicHoliday))
            .ToListAsync();
        return Ok(list);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var h = await _db.Holidays.FindAsync(id);
        if (h is null) return NotFound(new { message = "Holiday not found." });
        return Ok(new HolidayDto(h.Id, h.Name, h.Date, h.Description, h.IsPublicHoliday));
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] HolidayCreateDto dto)
    {
        var h = new Models.Holiday
        {
            Name = dto.Name,
            Date = dto.Date.Date,
            Description = dto.Description,
            IsPublicHoliday = dto.IsPublicHoliday
        };
        _db.Holidays.Add(h);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = h.Id },
            new HolidayDto(h.Id, h.Name, h.Date, h.Description, h.IsPublicHoliday));
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] HolidayCreateDto dto)
    {
        var h = await _db.Holidays.FindAsync(id);
        if (h is null) return NotFound(new { message = "Holiday not found." });
        h.Name = dto.Name;
        h.Date = dto.Date.Date;
        h.Description = dto.Description;
        h.IsPublicHoliday = dto.IsPublicHoliday;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var h = await _db.Holidays.FindAsync(id);
        if (h is null) return NotFound(new { message = "Holiday not found." });
        _db.Holidays.Remove(h);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
