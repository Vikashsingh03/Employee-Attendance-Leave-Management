using System.ComponentModel.DataAnnotations;

namespace AttendanceLeave.Api.Dtos;



public record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password);

public record LoginResponse(
    string Token,
    UserDto User);

public record UserDto(
    int Id,
    string EmployeeCode,
    string FullName,
    string Email,
    string Role,
    int DepartmentId,
    string DepartmentName);


public record DepartmentCreateDto(
    [Required, MaxLength(100)] string Name,
    [MaxLength(500)] string? Description);

public record DepartmentDto(
    int Id, string Name, string? Description, int EmployeeCount);


public record EmployeeCreateDto(
    [Required, MaxLength(50)] string FirstName,
    [Required, MaxLength(50)] string LastName,
    [Required, EmailAddress] string Email,
    [MaxLength(15)] string? Phone,
    [MaxLength(100)] string? Designation,
    [Required] int DepartmentId,
    [Required] DateTime DateOfJoining,
    [Range(0, 10000000)] decimal Salary,
    [Required, MinLength(6)] string Password,
    [Required] string Role);

public record EmployeeUpdateDto(
    [Required, MaxLength(50)] string FirstName,
    [Required, MaxLength(50)] string LastName,
    [MaxLength(15)] string? Phone,
    [MaxLength(100)] string? Designation,
    [Required] int DepartmentId,
    [Required] DateTime DateOfJoining,
    [Range(0, 10000000)] decimal Salary,
    [Required] string Role,
    bool IsActive);

public record EmployeeListItemDto(
    int Id, string EmployeeCode, string FullName, string Email, string? Phone,
    string? Designation, string DepartmentName, DateTime DateOfJoining, bool IsActive);

public record EmployeeDetailDto(
    int Id, string EmployeeCode, string FullName, string Email, string? Phone,
    string? Designation, int DepartmentId, string DepartmentName,
    DateTime DateOfJoining, decimal Salary, bool IsActive, string Role,
    string? PhotoPath, IEnumerable<LeaveBalanceDto> LeaveBalances);

public record PagedResult<T>(IEnumerable<T> Items, int Total, int Page, int PageSize);


public record LeaveTypeDto(
    int Id, string Name, string? Description, int DaysAllowedPerYear, bool IsPaid);

public record LeaveTypeCreateDto(
    [Required, MaxLength(100)] string Name,
    [MaxLength(500)] string? Description,
    [Range(0, 365)] int DaysAllowedPerYear,
    bool IsPaid = true);


public record LeaveRequestCreateDto(
    [Required] int LeaveTypeId,
    [Required] DateTime StartDate,
    [Required] DateTime EndDate,
    [Required, MaxLength(500)] string Reason);

public record LeaveReviewDto(
    [MaxLength(500)] string? Comments);

public record LeaveRequestDto(
    int Id, int EmployeeId, string EmployeeName, int LeaveTypeId, string LeaveTypeName,
    DateTime StartDate, DateTime EndDate, int Days, string Reason, string Status,
    DateTime AppliedOn, string? ReviewedByName, DateTime? ReviewedOn, string? ReviewComments);


public record LeaveBalanceDto(
    int Id, int EmployeeId, string EmployeeName, int LeaveTypeId, string LeaveTypeName,
    int Year, int TotalDays, int UsedDays, int RemainingDays);


public record AttendanceMarkDto(
    [Required] int EmployeeId,
    [Required] DateTime Date,
    [Required] string Status,
    TimeSpan? CheckInTime,
    TimeSpan? CheckOutTime,
    [MaxLength(300)] string? Remarks);

public record AttendanceDto(
    int Id, int EmployeeId, string EmployeeName, DateTime Date, string Status,
    TimeSpan? CheckInTime, TimeSpan? CheckOutTime, string? Remarks);


public record HolidayDto(
    int Id, string Name, DateTime Date, string? Description, bool IsPublicHoliday);

public record HolidayCreateDto(
    [Required, MaxLength(100)] string Name,
    [Required] DateTime Date,
    [MaxLength(500)] string? Description,
    bool IsPublicHoliday = true);
