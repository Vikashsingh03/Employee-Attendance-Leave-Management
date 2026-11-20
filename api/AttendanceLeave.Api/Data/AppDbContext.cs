using AttendanceLeave.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AttendanceLeave.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Department> Departments => Set<Department>();
    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<LeaveType> LeaveTypes => Set<LeaveType>();
    public DbSet<LeaveRequest> LeaveRequests => Set<LeaveRequest>();
    public DbSet<LeaveBalance> LeaveBalances => Set<LeaveBalance>();
    public DbSet<Attendance> Attendances => Set<Attendance>();
    public DbSet<Holiday> Holidays => Set<Holiday>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Employee>()
            .HasIndex(e => e.Email).IsUnique();
        modelBuilder.Entity<Employee>()
            .HasIndex(e => e.EmployeeCode).IsUnique();

        modelBuilder.Entity<LeaveBalance>()
            .HasIndex(b => new { b.EmployeeId, b.LeaveTypeId, b.Year }).IsUnique();

        modelBuilder.Entity<Attendance>()
            .HasIndex(a => new { a.EmployeeId, a.Date }).IsUnique();

        modelBuilder.Entity<LeaveRequest>()
            .HasOne(r => r.Reviewer)
            .WithMany()
            .HasForeignKey(r => r.ReviewedBy)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Employee>()
            .HasOne(e => e.Department)
            .WithMany(d => d.Employees)
            .HasForeignKey(e => e.DepartmentId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
