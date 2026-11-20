using AttendanceLeave.Api.Data;
using AttendanceLeave.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AttendanceLeave.Api.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _db;

    public DashboardController(AppDbContext db) => _db = db;

    private static DateTime Today => AppDates.Today;

    [Authorize(Roles = "Admin")]
    [HttpGet("admin")]
    public async Task<IActionResult> Admin()
    {
        var today = Today.Date;
        var monthStart = new DateTime(Today.Year, Today.Month, 1);

        var totalEmployees = await _db.Employees.CountAsync(e => e.IsActive);

        var todaysAttendance = await _db.Attendances
            .Include(a => a.Employee)
            .Where(a => a.Date == today && a.Employee!.IsActive)
            .ToListAsync();
        var presentToday = todaysAttendance.Count(a => a.Status == "Present");
        var absentToday = todaysAttendance.Count(a => a.Status == "Absent");
        var onLeaveToday = todaysAttendance.Count(a => a.Status == "Leave");

        var pending = await _db.LeaveRequests.CountAsync(r => r.Status == "Pending");
        var approvedThisMonth = await _db.LeaveRequests.CountAsync(r =>
            r.Status == "Approved" && r.AppliedOn >= monthStart);

        var leavesByStatus = await _db.LeaveRequests
            .GroupBy(r => r.Status)
            .Select(g => new { status = g.Key, count = g.Count() })
            .ToListAsync();

        var presentByDept = await _db.Attendances
            .Where(a => a.Date == today && a.Status == "Present")
            .Join(_db.Employees.Where(e => e.IsActive), a => a.EmployeeId, e => e.Id,
                (a, e) => e.DepartmentId)
            .GroupBy(deptId => deptId)
            .ToDictionaryAsync(g => g.Key, g => g.Count());

        var deptStats = await _db.Departments
            .Select(d => new
            {
                department = d.Name,
                deptId = d.Id,
                total = d.Employees.Count(e => e.IsActive)
            })
            .ToListAsync();

        var recent = await _db.LeaveRequests
            .Include(r => r.Employee)
            .Include(r => r.LeaveType)
            .OrderByDescending(r => r.AppliedOn)
            .Take(5)
            .Select(r => new
            {
                id = r.Id,
                employeeName = r.Employee!.FullName,
                leaveType = r.LeaveType!.Name,
                startDate = r.StartDate,
                endDate = r.EndDate,
                status = r.Status
            })
            .ToListAsync();

        var upcomingHolidays = await _db.Holidays
            .Where(h => h.Date >= today)
            .OrderBy(h => h.Date)
            .Take(5)
            .Select(h => new { id = h.Id, name = h.Name, date = h.Date })
            .ToListAsync();

        return Ok(new
        {
            totalEmployees,
            presentToday,
            absentToday,
            onLeaveToday,
            pendingLeaveRequests = pending,
            leavesApprovedThisMonth = approvedThisMonth,
            leavesByStatus,
            attendanceByDepartment = deptStats.Select(d => new
            {
                department = d.department,
                present = presentByDept.GetValueOrDefault(d.deptId),
                total = d.total
            }),
            recentLeaveRequests = recent,
            upcomingHolidays
        });
    }

    [HttpGet("employee")]
    public async Task<IActionResult> Employee()
    {
        var myId = CurrentUser.EmployeeId(User);
        var today = Today.Date;
        var monthStart = new DateTime(Today.Year, Today.Month, 1);
        var monthEnd = monthStart.AddMonths(1).AddDays(-1);

        var balances = await _db.LeaveBalances
            .Include(b => b.LeaveType)
            .Where(b => b.EmployeeId == myId && b.Year == Today.Year)
            .Select(b => new
            {
                leaveType = b.LeaveType!.Name,
                total = b.TotalDays,
                used = b.UsedDays,
                remaining = b.RemainingDays
            })
            .ToListAsync();

        var pending = await _db.LeaveRequests.CountAsync(r =>
            r.EmployeeId == myId && r.Status == "Pending");

        var myMonth = await _db.Attendances
            .Where(a => a.EmployeeId == myId && a.Date >= monthStart && a.Date <= monthEnd)
            .ToListAsync();

        var upcomingHolidays = await _db.Holidays
            .Where(h => h.Date >= today)
            .OrderBy(h => h.Date)
            .Take(5)
            .Select(h => new { id = h.Id, name = h.Name, date = h.Date })
            .ToListAsync();

        return Ok(new
        {
            myLeaveBalances = balances,
            myPendingRequests = pending,
            myAttendanceThisMonth = new
            {
                present = myMonth.Count(a => a.Status == "Present"),
                absent = myMonth.Count(a => a.Status == "Absent"),
                leave = myMonth.Count(a => a.Status == "Leave")
            },
            upcomingHolidays
        });
    }
}
