using AttendanceLeave.Api.Data;
using AttendanceLeave.Api.Dtos;
using AttendanceLeave.Api.Models;
using AttendanceLeave.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AttendanceLeave.Api.Controllers;

[ApiController]
[Route("api/attendance")]
[Authorize]
public class AttendanceController : ControllerBase
{
    private readonly AppDbContext _db;

    public AttendanceController(AppDbContext db) => _db = db;

    private static DateTime Today => AppDates.Today;

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] DateTime? date,
        [FromQuery] int? employeeId,
        [FromQuery] string? month,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var me = CurrentUser.EmployeeId(User);

        var query = _db.Attendances
            .Include(a => a.Employee)
            .AsQueryable();

        if (!CurrentUser.IsAdmin(User))
        {
            if (employeeId.HasValue && employeeId.Value != me)
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "You can only view your own attendance."
                });
            query = query.Where(a => a.EmployeeId == me);
        }
        else if (employeeId.HasValue)
        {
            query = query.Where(a => a.EmployeeId == employeeId.Value);
        }

        if (date.HasValue)
            query = query.Where(a => a.Date == date.Value.Date);

        if (!string.IsNullOrWhiteSpace(month) &&
            DateTime.TryParseExact(month, "yyyy-MM",
                System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.None, out var monthStart))
        {
            var monthEnd = monthStart.AddMonths(1).AddDays(-1);
            query = query.Where(a => a.Date >= monthStart && a.Date <= monthEnd);
        }

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(a => a.Date)
            .ThenBy(a => a.Employee!.FirstName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new AttendanceDto(
                a.Id, a.EmployeeId, a.Employee!.FullName, a.Date, a.Status,
                a.CheckInTime, a.CheckOutTime, a.Remarks))
            .ToListAsync();

        return Ok(new PagedResult<AttendanceDto>(items, total, page, pageSize));
    }

    [HttpGet("today")]
    public async Task<IActionResult> GetToday()
    {
        var me = CurrentUser.EmployeeId(User);
        var today = Today.Date;

        var record = await _db.Attendances
            .Include(a => a.Employee)
            .FirstOrDefaultAsync(a => a.EmployeeId == me && a.Date == today);

        AttendanceDto? dto = record is null ? null : new AttendanceDto(
            record.Id, record.EmployeeId, record.Employee!.FullName, record.Date,
            record.Status, record.CheckInTime, record.CheckOutTime, record.Remarks);

        return Ok(new { date = today.ToString("yyyy-MM-dd"), record = dto });
    }

    [HttpGet("my")]
    public async Task<IActionResult> GetMine([FromQuery] string? month)
    {
        var me = CurrentUser.EmployeeId(User);
        var query = _db.Attendances
            .Include(a => a.Employee)
            .Where(a => a.EmployeeId == me);

        if (!string.IsNullOrWhiteSpace(month) &&
            DateTime.TryParseExact(month, "yyyy-MM",
                System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.None, out var monthStart))
        {
            var monthEnd = monthStart.AddMonths(1).AddDays(-1);
            query = query.Where(a => a.Date >= monthStart && a.Date <= monthEnd);
        }

        var items = await query
            .OrderBy(a => a.Date)
            .Select(a => new AttendanceDto(
                a.Id, a.EmployeeId, a.Employee!.FullName, a.Date, a.Status,
                a.CheckInTime, a.CheckOutTime, a.Remarks))
            .ToListAsync();
        return Ok(items);
    }

    [HttpPost("checkin")]
    public async Task<IActionResult> CheckIn()
    {
        var me = CurrentUser.EmployeeId(User);
        var today = Today.Date;
        var now = TimeSpan.FromMinutes(Math.Floor(DateTime.Now.TimeOfDay.TotalMinutes));

        var record = await _db.Attendances
            .Include(a => a.Employee)
            .FirstOrDefaultAsync(a => a.EmployeeId == me && a.Date == today);

        if (record is not null && record.CheckInTime.HasValue)
            return BadRequest(new { message = "You have already checked in today." });

        if (record is null)
        {
            record = new Attendance
            {
                EmployeeId = me, Date = today, Status = "Present", CheckInTime = now
            };
            _db.Attendances.Add(record);
        }
        else
        {
            record.CheckInTime = now;
            record.Status = "Present";
        }

        await _db.SaveChangesAsync();
        var name = record.Employee?.FullName
            ?? await _db.Employees.Where(e => e.Id == me).Select(e => e.FullName).FirstOrDefaultAsync()
            ?? string.Empty;
        return Ok(new AttendanceDto(
            record.Id, record.EmployeeId, name, record.Date,
            record.Status, record.CheckInTime, record.CheckOutTime, record.Remarks));
    }

    [HttpPost("checkout")]
    public async Task<IActionResult> CheckOut()
    {
        var me = CurrentUser.EmployeeId(User);
        var today = Today.Date;
        var now = TimeSpan.FromMinutes(Math.Floor(DateTime.Now.TimeOfDay.TotalMinutes));

        var record = await _db.Attendances
            .Include(a => a.Employee)
            .FirstOrDefaultAsync(a => a.EmployeeId == me && a.Date == today);

        if (record is null || !record.CheckInTime.HasValue)
            return BadRequest(new { message = "You have not checked in today, so you cannot check out." });
        if (record.CheckOutTime.HasValue)
            return BadRequest(new { message = "You have already checked out today." });

        record.CheckOutTime = now;
        await _db.SaveChangesAsync();
        var name = record.Employee?.FullName
            ?? await _db.Employees.Where(e => e.Id == me).Select(e => e.FullName).FirstOrDefaultAsync()
            ?? string.Empty;
        return Ok(new AttendanceDto(
            record.Id, record.EmployeeId, name, record.Date,
            record.Status, record.CheckInTime, record.CheckOutTime, record.Remarks));
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("mark")]
    public async Task<IActionResult> Mark([FromBody] AttendanceMarkDto dto)
    {
        if (dto.Status is not ("Present" or "Absent" or "Leave" or "HalfDay"))
            return BadRequest(new { message = "Status must be Present, Absent, Leave or HalfDay." });

        if (!await _db.Employees.AnyAsync(e => e.Id == dto.EmployeeId))
            return BadRequest(new { message = "Employee does not exist." });

        var date = dto.Date.Date;
        var record = await _db.Attendances
            .FirstOrDefaultAsync(a => a.EmployeeId == dto.EmployeeId && a.Date == date);

        if (record is null)
        {
            record = new Attendance
            {
                EmployeeId = dto.EmployeeId,
                Date = date,
                Status = dto.Status,
                CheckInTime = dto.CheckInTime,
                CheckOutTime = dto.CheckOutTime,
                Remarks = dto.Remarks
            };
            _db.Attendances.Add(record);
        }
        else
        {
            record.Status = dto.Status;
            record.CheckInTime = dto.CheckInTime;
            record.CheckOutTime = dto.CheckOutTime;
            record.Remarks = dto.Remarks;
        }

        await _db.SaveChangesAsync();
        return Ok(new
        {
            id = record.Id,
            employeeId = record.EmployeeId,
            date = record.Date,
            status = record.Status
        });
    }
}
