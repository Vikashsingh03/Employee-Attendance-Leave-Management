using System.Text;
using AttendanceLeave.Api.Data;
using AttendanceLeave.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AttendanceLeave.Api.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize(Roles = "Admin")]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ReportsController(AppDbContext db) => _db = db;

    [HttpGet("attendance.csv")]
    public async Task<IActionResult> AttendanceCsv([FromQuery] string month = "2026-11")
    {
        if (!DateTime.TryParseExact(month, "yyyy-MM",
                System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.None, out var monthStart))
            return BadRequest(new { message = "month must look like 2026-11." });

        var monthEnd = monthStart.AddMonths(1).AddDays(-1);
        var rows = await _db.Attendances
            .Include(a => a.Employee)
            .ThenInclude(e => e!.Department)
            .Where(a => a.Date >= monthStart && a.Date <= monthEnd)
            .OrderBy(a => a.Date)
            .ThenBy(a => a.Employee!.FirstName)
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("EmployeeCode,Name,Department,Date,Status,CheckIn,CheckOut");
        foreach (var a in rows)
        {
            sb.AppendLine(string.Join(",",
                Csv(a.Employee!.EmployeeCode),
                Csv(a.Employee.FullName),
                Csv(a.Employee.Department?.Name ?? ""),
                a.Date.ToString("yyyy-MM-dd"),
                Csv(a.Status),
                a.CheckInTime?.ToString(@"hh\:mm") ?? "",
                a.CheckOutTime?.ToString(@"hh\:mm") ?? ""));
        }

        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        return File(bytes, "text/csv", $"attendance-{month}.csv");
    }

    [HttpGet("leaves.csv")]
    public async Task<IActionResult> LeavesCsv(
        [FromQuery] string? status,
        [FromQuery] int year = 2026)
    {
        var query = _db.LeaveRequests
            .Include(r => r.Employee)
            .Include(r => r.LeaveType)
            .Where(r => r.StartDate.Year == year);

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(r => r.Status == status);

        var rows = await query
            .OrderBy(r => r.StartDate)
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("Employee,LeaveType,StartDate,EndDate,Days,Status");
        foreach (var r in rows)
        {
            sb.AppendLine(string.Join(",",
                Csv(r.Employee!.FullName),
                Csv(r.LeaveType!.Name),
                r.StartDate.ToString("yyyy-MM-dd"),
                r.EndDate.ToString("yyyy-MM-dd"),
                LeaveCalculator.CountLeaveDays(r.StartDate, r.EndDate),
                Csv(r.Status)));
        }

        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        return File(bytes, "text/csv", $"leaves-{year}.csv");
    }

    private static string Csv(string value)
        => value.Contains(',') || value.Contains('"')
            ? "\"" + value.Replace("\"", "\"\"") + "\""
            : value;
}
