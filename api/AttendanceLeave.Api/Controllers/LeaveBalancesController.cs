using AttendanceLeave.Api.Data;
using AttendanceLeave.Api.Dtos;
using AttendanceLeave.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AttendanceLeave.Api.Controllers;

[ApiController]
[Route("api/leavebalances")]
[Authorize]
public class LeaveBalancesController : ControllerBase
{
    private readonly AppDbContext _db;

    public LeaveBalancesController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int? employeeId,
        [FromQuery] int year = 2026)
    {
        var me = CurrentUser.EmployeeId(User);

        if (!CurrentUser.IsAdmin(User) && employeeId.HasValue && employeeId.Value != me)
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                message = "You can only view your own leave balances."
            });

        if (!CurrentUser.IsAdmin(User))
        {
            employeeId = me;
        }
        if (employeeId is null)
            return BadRequest(new { message = "employeeId is required (Admins must pass it)." });

        var employee = await _db.Employees.FindAsync(employeeId.Value);
        if (employee is null) return NotFound(new { message = "Employee not found." });

        var list = await _db.LeaveBalances
            .Include(b => b.LeaveType)
            .Where(b => b.EmployeeId == employeeId.Value && b.Year == year)
            .OrderBy(b => b.LeaveType!.Name)
            .Select(b => new LeaveBalanceDto(
                b.Id, b.EmployeeId, employee.FullName, b.LeaveTypeId,
                b.LeaveType!.Name, b.Year, b.TotalDays, b.UsedDays, b.RemainingDays))
            .ToListAsync();
        return Ok(list);
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMine([FromQuery] int year = 2026)
    {
        var me = CurrentUser.EmployeeId(User);
        var employee = await _db.Employees.FindAsync(me);
        if (employee is null) return NotFound(new { message = "Employee not found." });

        var list = await _db.LeaveBalances
            .Include(b => b.LeaveType)
            .Where(b => b.EmployeeId == me && b.Year == year)
            .OrderBy(b => b.LeaveType!.Name)
            .Select(b => new LeaveBalanceDto(
                b.Id, b.EmployeeId, employee.FullName, b.LeaveTypeId,
                b.LeaveType!.Name, b.Year, b.TotalDays, b.UsedDays, b.RemainingDays))
            .ToListAsync();
        return Ok(list);
    }
}
