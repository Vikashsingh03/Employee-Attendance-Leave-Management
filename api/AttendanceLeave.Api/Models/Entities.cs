using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AttendanceLeave.Api.Models;


public class Department
{
    public int Id { get; set; }

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    public ICollection<Employee> Employees { get; set; } = new List<Employee>();
}

public class Employee
{
    public int Id { get; set; }

    [Required, MaxLength(20)]
    public string EmployeeCode { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    public string FirstName { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    public string LastName { get; set; } = string.Empty;

    [Required, EmailAddress, MaxLength(150)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(15)]
    public string? Phone { get; set; }

    [MaxLength(100)]
    public string? Designation { get; set; }

    public int DepartmentId { get; set; }
    public Department? Department { get; set; }

    public DateTime DateOfJoining { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Salary { get; set; }

    public bool IsActive { get; set; } = true;

    public string? PhotoPath { get; set; }

    public string PasswordHash { get; set; } = string.Empty;
    public string PasswordSalt { get; set; } = string.Empty;

    [Required, MaxLength(20)]
    public string Role { get; set; } = "Employee";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [NotMapped]
    public string FullName => $"{FirstName} {LastName}";
}

public class LeaveType
{
    public int Id { get; set; }

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    public int DaysAllowedPerYear { get; set; }

    public bool IsPaid { get; set; } = true;

    public ICollection<LeaveRequest> LeaveRequests { get; set; } = new List<LeaveRequest>();
    public ICollection<LeaveBalance> LeaveBalances { get; set; } = new List<LeaveBalance>();
}

public class LeaveRequest
{
    public int Id { get; set; }

    public int EmployeeId { get; set; }
    public Employee? Employee { get; set; }

    public int LeaveTypeId { get; set; }
    public LeaveType? LeaveType { get; set; }

    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }

    [Required, MaxLength(500)]
    public string Reason { get; set; } = string.Empty;

    [Required, MaxLength(20)]
    public string Status { get; set; } = "Pending";

    public DateTime AppliedOn { get; set; } = DateTime.UtcNow;

    public int? ReviewedBy { get; set; }
    public Employee? Reviewer { get; set; }

    public DateTime? ReviewedOn { get; set; }

    [MaxLength(500)]
    public string? ReviewComments { get; set; }
}

public class LeaveBalance
{
    public int Id { get; set; }

    public int EmployeeId { get; set; }
    public Employee? Employee { get; set; }

    public int LeaveTypeId { get; set; }
    public LeaveType? LeaveType { get; set; }

    public int Year { get; set; }

    public int TotalDays { get; set; }

    public int UsedDays { get; set; }

    [NotMapped]
    public int RemainingDays => TotalDays - UsedDays;
}

public class Attendance
{
    public int Id { get; set; }

    public int EmployeeId { get; set; }
    public Employee? Employee { get; set; }

    public DateTime Date { get; set; }

    [Required, MaxLength(20)]
    public string Status { get; set; } = "Present";

    public TimeSpan? CheckInTime { get; set; }
    public TimeSpan? CheckOutTime { get; set; }

    [MaxLength(300)]
    public string? Remarks { get; set; }
}

public class Holiday
{
    public int Id { get; set; }

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    public DateTime Date { get; set; }

    [MaxLength(500)]
    public string? Description { get; set; }

    public bool IsPublicHoliday { get; set; } = true;
}
