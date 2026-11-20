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
[Route("api/leaverequests")]
[Authorize]
public class LeaveRequestsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IEmailService _email;

    public LeaveRequestsController(AppDbContext db, IEmailService email)
    {
        _db = db;
        _email = email;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? status,
        [FromQuery] int? employeeId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var me = CurrentUser.EmployeeId(User);

        var query = _db.LeaveRequests
            .Include(r => r.Employee)
            .Include(r => r.LeaveType)
            .Include(r => r.Reviewer)
            .AsQueryable();

        if (!CurrentUser.IsAdmin(User))
        {
            if (employeeId.HasValue && employeeId.Value != me)
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "You can only view your own leave requests."
                });
            query = query.Where(r => r.EmployeeId == me);
        }
        else if (employeeId.HasValue)
        {
            query = query.Where(r => r.EmployeeId == employeeId.Value);
        }

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(r => r.Status == status);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(r => r.AppliedOn)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => ToDto(r))
            .ToListAsync();

        return Ok(new PagedResult<LeaveRequestDto>(items, total, page, pageSize));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var req = await _db.LeaveRequests
            .Include(r => r.Employee)
            .Include(r => r.LeaveType)
            .Include(r => r.Reviewer)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (req is null) return NotFound(new { message = "Leave request not found." });

        if (!CurrentUser.IsAdmin(User) && req.EmployeeId != CurrentUser.EmployeeId(User))
            return Forbid();

        return Ok(ToDto(req));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] LeaveRequestCreateDto dto)
    {
        var me = CurrentUser.EmployeeId(User);
        var start = dto.StartDate.Date;
        var end = dto.EndDate.Date;

        if (end < start)
            return BadRequest(new { message = "End date cannot be before start date." });

        var leaveType = await _db.LeaveTypes.FindAsync(dto.LeaveTypeId);
        if (leaveType is null)
            return BadRequest(new { message = "Leave type does not exist." });

        var overlaps = await _db.LeaveRequests.AnyAsync(r =>
            r.EmployeeId == me &&
            (r.Status == "Pending" || r.Status == "Approved") &&
            r.StartDate.Date <= end && start <= r.EndDate.Date);
        if (overlaps)
            return BadRequest(new
            {
                message = "You already have a pending or approved leave covering these dates."
            });

        var days = LeaveCalculator.CountLeaveDays(start, end);
        if (days <= 0)
            return BadRequest(new { message = "The selected dates contain no leave days (Sundays don't count)." });

        var balance = await _db.LeaveBalances.FirstOrDefaultAsync(b =>
            b.EmployeeId == me && b.LeaveTypeId == dto.LeaveTypeId && b.Year == start.Year);
        if (balance is null)
            return BadRequest(new { message = $"No {leaveType.Name} balance found for {start.Year}." });
        if (balance.RemainingDays < days)
            return BadRequest(new
            {
                message = $"Not enough {leaveType.Name} balance: {days} day(s) needed, {balance.RemainingDays} remaining."
            });

        var req = new LeaveRequest
        {
            EmployeeId = me,
            LeaveTypeId = dto.LeaveTypeId,
            StartDate = start,
            EndDate = end,
            Reason = dto.Reason,
            Status = "Pending",
            AppliedOn = DateTime.UtcNow,
        };
        _db.LeaveRequests.Add(req);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = req.Id }, new { id = req.Id });
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:int}/approve")]
    public async Task<IActionResult> Approve(int id, [FromBody] LeaveReviewDto dto)
    {
        var req = await _db.LeaveRequests
            .Include(r => r.Employee)
            .Include(r => r.LeaveType)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (req is null) return NotFound(new { message = "Leave request not found." });
        if (req.Status != "Pending")
            return BadRequest(new { message = $"Only a Pending request can be approved (current status: {req.Status})." });

        var days = LeaveCalculator.CountLeaveDays(req.StartDate, req.EndDate);

        var balance = await _db.LeaveBalances.FirstOrDefaultAsync(b =>
            b.EmployeeId == req.EmployeeId && b.LeaveTypeId == req.LeaveTypeId
            && b.Year == req.StartDate.Year);
        if (balance is null || balance.RemainingDays < days)
            return BadRequest(new { message = "Not enough leave balance left to approve this request." });

        balance.UsedDays += days;
        req.Status = "Approved";
        req.ReviewedBy = CurrentUser.EmployeeId(User);
        req.ReviewedOn = DateTime.UtcNow;
        req.ReviewComments = dto.Comments;
        await _db.SaveChangesAsync();

        await _email.SendLeaveStatusEmailAsync(req.Employee!.Email, req.Employee.FullName,
            req.LeaveType!.Name, "Approved", dto.Comments);

        return Ok(new { message = "Leave approved.", days });
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:int}/reject")]
    public async Task<IActionResult> Reject(int id, [FromBody] LeaveReviewDto dto)
    {
        var req = await _db.LeaveRequests
            .Include(r => r.Employee)
            .Include(r => r.LeaveType)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (req is null) return NotFound(new { message = "Leave request not found." });
        if (req.Status != "Pending")
            return BadRequest(new { message = $"Only a Pending request can be rejected (current status: {req.Status})." });

        req.Status = "Rejected";
        req.ReviewedBy = CurrentUser.EmployeeId(User);
        req.ReviewedOn = DateTime.UtcNow;
        req.ReviewComments = dto.Comments;
        await _db.SaveChangesAsync();

        await _email.SendLeaveStatusEmailAsync(req.Employee!.Email, req.Employee.FullName,
            req.LeaveType!.Name, "Rejected", dto.Comments);

        return Ok(new { message = "Leave rejected." });
    }

    [HttpPut("{id:int}/cancel")]
    public async Task<IActionResult> Cancel(int id)
    {
        var me = CurrentUser.EmployeeId(User);
        var req = await _db.LeaveRequests.FindAsync(id);
        if (req is null) return NotFound(new { message = "Leave request not found." });
        if (req.EmployeeId != me)
            return Forbid();
        if (req.Status != "Pending")
            return BadRequest(new { message = "Only a Pending request can be cancelled." });

        req.Status = "Cancelled";
        await _db.SaveChangesAsync();
        return Ok(new { message = "Leave request cancelled." });
    }

    private static LeaveRequestDto ToDto(LeaveRequest r) => new(
        r.Id, r.EmployeeId, r.Employee!.FullName, r.LeaveTypeId, r.LeaveType!.Name,
        r.StartDate, r.EndDate,
        LeaveCalculator.CountLeaveDays(r.StartDate, r.EndDate),
        r.Reason, r.Status, r.AppliedOn,
        r.Reviewer?.FullName, r.ReviewedOn, r.ReviewComments);
}
