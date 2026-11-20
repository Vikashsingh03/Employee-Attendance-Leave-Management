using AttendanceLeave.Api.Models;
using AttendanceLeave.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace AttendanceLeave.Api.Data;

public static class SeedData
{

    public static async Task SeedAsync(AppDbContext db)
    {
        if (!await db.Departments.AnyAsync())
        {
            var departments = new[]
            {
                new Department { Name = "HR", Description = "Human Resources — hiring, payroll and employee relations." },
                new Department { Name = "Engineering", Description = "Software development, QA and DevOps." },
                new Department { Name = "Sales", Description = "Business development and client sales." },
                new Department { Name = "Finance", Description = "Accounts, payroll and financial planning." },
                new Department { Name = "Marketing", Description = "Digital marketing, content and brand." },
            };
            db.Departments.AddRange(departments);
            await db.SaveChangesAsync();
        }
        var dept = (await db.Departments.ToListAsync())
            .ToDictionary(d => d.Name, d => d.Id);

        if (!await db.LeaveTypes.AnyAsync())
        {
            var leaveTypes = new[]
            {
                new LeaveType { Name = "Casual Leave", Description = "Short personal leave.", DaysAllowedPerYear = 12, IsPaid = true },
                new LeaveType { Name = "Sick Leave", Description = "Leave for illness, with a medical certificate for long spells.", DaysAllowedPerYear = 10, IsPaid = true },
                new LeaveType { Name = "Earned Leave", Description = "Planned long leave, earned through service.", DaysAllowedPerYear = 15, IsPaid = true },
                new LeaveType { Name = "Maternity Leave", Description = "Leave for expecting mothers.", DaysAllowedPerYear = 180, IsPaid = true },
                new LeaveType { Name = "Paternity Leave", Description = "Leave for new fathers.", DaysAllowedPerYear = 15, IsPaid = true },
            };
            db.LeaveTypes.AddRange(leaveTypes);
            await db.SaveChangesAsync();
        }
        var lt = (await db.LeaveTypes.ToListAsync())
            .ToDictionary(t => t.Name, t => t);

        var people = new (string First, string Last, char Gender, string Dept, string Role, string Designation, DateTime Joined, decimal Salary)[]
        {
            ("Amit", "Verma", 'M', "HR", "Admin", "HR Manager", new DateTime(2022, 3, 1), 95000),
            ("Rahul", "Sharma", 'M', "Engineering", "Employee", "Software Developer", new DateTime(2023, 6, 15), 72000),
            ("Priya", "Verma", 'F', "Sales", "Employee", "Sales Executive", new DateTime(2023, 1, 10), 55000),
            ("Arjun", "Mehta", 'M', "Engineering", "Employee", "Senior Software Developer", new DateTime(2022, 8, 1), 98000),
            ("Sneha", "Patel", 'F', "Engineering", "Employee", "QA Engineer", new DateTime(2023, 4, 12), 62000),
            ("Vikram", "Singh", 'M', "Sales", "Employee", "Sales Manager", new DateTime(2022, 5, 20), 88000),
            ("Ananya", "Gupta", 'F', "Marketing", "Employee", "Digital Marketing Executive", new DateTime(2024, 2, 1), 48000),
            ("Rohit", "Kumar", 'M', "Finance", "Employee", "Accountant", new DateTime(2023, 9, 5), 58000),
            ("Kavya", "Nair", 'F', "HR", "Employee", "HR Executive", new DateTime(2024, 1, 15), 45000),
            ("Aditya", "Joshi", 'M', "Engineering", "Employee", "DevOps Engineer", new DateTime(2023, 11, 1), 78000),
            ("Neha", "Sharma", 'F', "Finance", "Employee", "Financial Analyst", new DateTime(2022, 11, 10), 65000),
            ("Karan", "Malhotra", 'M', "Marketing", "Employee", "Marketing Manager", new DateTime(2022, 7, 1), 92000),
            ("Pooja", "Singh", 'F', "Engineering", "Employee", "Frontend Developer", new DateTime(2024, 3, 1), 60000),
            ("Manish", "Yadav", 'M', "Engineering", "Employee", "Backend Developer", new DateTime(2023, 2, 20), 70000),
            ("Divya", "Reddy", 'F', "Sales", "Employee", "Business Development Executive", new DateTime(2024, 5, 6), 52000),
            ("Suresh", "Chandra", 'M', "Finance", "Employee", "Finance Manager", new DateTime(2022, 4, 1), 105000),
            ("Ritika", "Agarwal", 'F', "Marketing", "Employee", "Content Writer", new DateTime(2024, 7, 1), 42000),
            ("Aman", "Gupta", 'M', "Engineering", "Employee", "Junior Software Developer", new DateTime(2025, 6, 1), 50000),
            ("Shreya", "Mishra", 'F', "HR", "Employee", "Recruiter", new DateTime(2023, 8, 14), 50000),
            ("Nikhil", "Verma", 'M', "Sales", "Employee", "Area Sales Manager", new DateTime(2023, 3, 1), 68000),
            ("Tanvi", "Kapoor", 'F', "Engineering", "Employee", "UI/UX Designer", new DateTime(2024, 9, 2), 64000),
            ("Harsh", "Vardhan", 'M', "Marketing", "Employee", "SEO Specialist", new DateTime(2023, 12, 1), 54000),
            ("Meera", "Iyer", 'F', "Finance", "Employee", "Payroll Executive", new DateTime(2024, 4, 15), 47000),
            ("Varun", "Khanna", 'M', "Engineering", "Employee", "Team Lead", new DateTime(2022, 9, 15), 115000),
        };

        static string EmailFor((string First, string Last, char Gender, string Dept, string Role, string Designation, DateTime Joined, decimal Salary) p)
            => p.First == "Amit" && p.Last == "Verma"
                ? "admin@company.com"
                : $"{p.First.ToLower()}.{p.Last.ToLower()}@company.com";

        if (!await db.Employees.AnyAsync())
        {
            var employees = new List<Employee>();
            for (var i = 0; i < people.Length; i++)
            {
                var p = people[i];
                var password = p.First == "Amit" && p.Last == "Verma" ? "Admin@123" : "Emp@123";
                var (hash, salt) = PasswordHasher.HashPassword(password);

                employees.Add(new Employee
                {
                    EmployeeCode = $"EMP{i + 1:000}",
                    FirstName = p.First,
                    LastName = p.Last,
                    Email = EmailFor(p),
                    Phone = $"98{14829137 + (i * 137913) % 89999999}",
                    Designation = p.Designation,
                    DepartmentId = dept[p.Dept],
                    DateOfJoining = p.Joined,
                    Salary = p.Salary,
                    IsActive = true,
                    PasswordHash = hash,
                    PasswordSalt = salt,
                    Role = p.Role,
                    CreatedAt = new DateTime(2026, 1, 1),
                });
            }
            db.Employees.AddRange(employees);
            await db.SaveChangesAsync();
        }
        var employeesInDb = await db.Employees.ToListAsync();
        var emp = employeesInDb.ToDictionary(e => $"{e.FirstName} {e.LastName}", e => e.Id);
        var adminId = emp["Amit Verma"];
        var genderByEmail = people.ToDictionary(EmailFor, p => p.Gender);

        if (!await db.Holidays.AnyAsync())
        {
            var holidays = new[]
            {
                new Holiday { Name = "New Year", Date = new DateTime(2026, 1, 1), Description = "New Year's Day", IsPublicHoliday = true },
                new Holiday { Name = "Republic Day", Date = new DateTime(2026, 1, 26), Description = "Republic Day of India", IsPublicHoliday = true },
                new Holiday { Name = "Holi", Date = new DateTime(2026, 3, 4), Description = "Festival of colours", IsPublicHoliday = true },
                new Holiday { Name = "Eid-ul-Fitr", Date = new DateTime(2026, 3, 21), Description = "End of Ramzan (date depends on moon sighting)", IsPublicHoliday = true },
                new Holiday { Name = "Ram Navami", Date = new DateTime(2026, 3, 26), Description = "Birth of Lord Rama", IsPublicHoliday = true },
                new Holiday { Name = "Good Friday", Date = new DateTime(2026, 4, 3), Description = "Good Friday", IsPublicHoliday = true },
                new Holiday { Name = "Bakrid (Id-ul-Zuha)", Date = new DateTime(2026, 5, 28), Description = "Festival of sacrifice (Id-ul-Zuha).", IsPublicHoliday = true },
                new Holiday { Name = "Independence Day", Date = new DateTime(2026, 8, 15), Description = "Independence Day of India", IsPublicHoliday = true },
                new Holiday { Name = "Janmashtami", Date = new DateTime(2026, 9, 4), Description = "Birth of Lord Krishna", IsPublicHoliday = true },
                new Holiday { Name = "Gandhi Jayanti", Date = new DateTime(2026, 10, 2), Description = "Birth anniversary of Mahatma Gandhi", IsPublicHoliday = true },
                new Holiday { Name = "Dussehra", Date = new DateTime(2026, 10, 20), Description = "Vijayadashami", IsPublicHoliday = true },
                new Holiday { Name = "Diwali", Date = new DateTime(2026, 11, 8), Description = "Festival of lights", IsPublicHoliday = true },
                new Holiday { Name = "Christmas", Date = new DateTime(2026, 12, 25), Description = "Christmas Day", IsPublicHoliday = true },
            };
            db.Holidays.AddRange(holidays);
            await db.SaveChangesAsync();
        }
        var holidayDates = (await db.Holidays.ToListAsync())
            .Select(h => h.Date.Date).ToHashSet();

        if (!await db.LeaveRequests.AnyAsync())
        {
            var requests = new (string Who, string Type, DateTime From, DateTime To, string Status, string Reason, string? Comments)[]
            {
                ("Rahul Sharma", "Casual Leave", new DateTime(2026, 10, 5), new DateTime(2026, 10, 7), "Approved", "Family function in hometown", "Approved. Enjoy!"),
                ("Priya Verma", "Sick Leave", new DateTime(2026, 10, 12), new DateTime(2026, 10, 13), "Approved", "Down with viral fever", null),
                ("Arjun Mehta", "Earned Leave", new DateTime(2026, 10, 19), new DateTime(2026, 10, 23), "Approved", "Planned vacation with family", null),
                ("Sneha Patel", "Casual Leave", new DateTime(2026, 11, 2), new DateTime(2026, 11, 3), "Approved", "Personal work at bank", null),
                ("Vikram Singh", "Sick Leave", new DateTime(2026, 11, 9), new DateTime(2026, 11, 9), "Approved", "Food poisoning, resting at home", null),
                ("Ananya Gupta", "Casual Leave", new DateTime(2026, 10, 26), new DateTime(2026, 10, 28), "Approved", "Attending cousin's wedding", null),
                ("Rohit Kumar", "Earned Leave", new DateTime(2026, 11, 16), new DateTime(2026, 11, 18), "Approved", "Trip to Himachal with friends", null),
                ("Kavya Nair", "Casual Leave", new DateTime(2026, 11, 23), new DateTime(2026, 11, 24), "Pending", "Personal work", null),
                ("Aditya Joshi", "Sick Leave", new DateTime(2026, 11, 19), new DateTime(2026, 11, 19), "Pending", "Fever since last night", null),
                ("Neha Sharma", "Earned Leave", new DateTime(2026, 11, 25), new DateTime(2026, 11, 27), "Pending", "Visiting parents in Jaipur", null),
                ("Karan Malhotra", "Casual Leave", new DateTime(2026, 11, 23), new DateTime(2026, 11, 25), "Pending", "House shifting", null),
                ("Pooja Singh", "Casual Leave", new DateTime(2026, 11, 27), new DateTime(2026, 11, 28), "Pending", "Attending a friend's engagement", null),
                ("Manish Yadav", "Casual Leave", new DateTime(2026, 10, 14), new DateTime(2026, 10, 15), "Rejected", "Want to attend a concert", "Team release in progress that week."),
                ("Divya Reddy", "Sick Leave", new DateTime(2026, 11, 5), new DateTime(2026, 11, 6), "Rejected", "Not feeling well", "Please attach a medical certificate and re-apply."),
                ("Suresh Chandra", "Earned Leave", new DateTime(2026, 10, 26), new DateTime(2026, 10, 30), "Rejected", "Planned family trip", "Month-end closing — cannot approve these dates."),
                ("Ritika Agarwal", "Casual Leave", new DateTime(2026, 11, 10), new DateTime(2026, 11, 11), "Cancelled", "Changed my plans", null),
            };

            var leaveRequests = new List<LeaveRequest>();
            foreach (var r in requests)
            {
                var reviewed = r.Status is "Approved" or "Rejected";
                var appliedOn = r.From.AddDays(-3) > AppDates.Today ? AppDates.Today : r.From.AddDays(-3);
                leaveRequests.Add(new LeaveRequest
                {
                    EmployeeId = emp[r.Who],
                    LeaveTypeId = lt[r.Type].Id,
                    StartDate = r.From,
                    EndDate = r.To,
                    Reason = r.Reason,
                    Status = r.Status,
                    AppliedOn = appliedOn,
                    ReviewedBy = reviewed ? adminId : null,
                    ReviewedOn = reviewed ? r.From.AddDays(-2) : null,
                    ReviewComments = r.Comments,
                });
            }
            db.LeaveRequests.AddRange(leaveRequests);
            await db.SaveChangesAsync();
        }
        var leaveRequestsInDb = await db.LeaveRequests.ToListAsync();

        if (!await db.LeaveBalances.AnyAsync())
        {
            var usedDays = new Dictionary<(int EmpId, int TypeId), int>();
            foreach (var r in leaveRequestsInDb.Where(x => x.Status == "Approved"))
            {
                var days = LeaveCalculator.CountLeaveDays(r.StartDate, r.EndDate);
                var key = (r.EmployeeId, r.LeaveTypeId);
                usedDays[key] = usedDays.GetValueOrDefault(key) + days;
            }

            var balances = new List<LeaveBalance>();
            foreach (var e in employeesInDb)
            {
                var gender = genderByEmail.GetValueOrDefault(e.Email, 'M');
                var types = new[] { "Casual Leave", "Sick Leave", "Earned Leave" }
                    .Append(gender == 'F' ? "Maternity Leave" : "Paternity Leave");
                foreach (var typeName in types)
                {
                    var type = lt[typeName];
                    balances.Add(new LeaveBalance
                    {
                        EmployeeId = e.Id,
                        LeaveTypeId = type.Id,
                        Year = 2026,
                        TotalDays = type.DaysAllowedPerYear,
                        UsedDays = usedDays.GetValueOrDefault((e.Id, type.Id)),
                    });
                }
            }
            db.LeaveBalances.AddRange(balances);
            await db.SaveChangesAsync();
        }

        if (!await db.Attendances.AnyAsync())
        {
            var rng = new Random(42);
            var approvedLeaves = leaveRequestsInDb.Where(x => x.Status == "Approved").ToList();
            var attendance = new List<Attendance>();

            for (var d = AppDates.Today.AddDays(-30); d <= AppDates.Today.AddDays(-1); d = d.AddDays(1))
            {
                if (d.DayOfWeek == DayOfWeek.Sunday || holidayDates.Contains(d.Date))
                    continue;

                foreach (var e in employeesInDb)
                {                    var onLeave = approvedLeaves.Any(r =>
                        r.EmployeeId == e.Id && r.StartDate.Date <= d.Date && d.Date <= r.EndDate.Date);

                    if (onLeave)
                    {
                        attendance.Add(new Attendance
                        {
                            EmployeeId = e.Id, Date = d.Date, Status = "Leave",
                            Remarks = "Approved leave"
                        });
                        continue;
                    }

                    if (rng.Next(100) < 5)
                    {
                        attendance.Add(new Attendance
                        {
                            EmployeeId = e.Id, Date = d.Date, Status = "Absent",
                            Remarks = "Absent without notice"
                        });
                        continue;
                    }

                    var inMinutes = 9 * 60 + rng.Next(0, 46);
                    var outMinutes = 17 * 60 + 30 + rng.Next(0, 61);
                    attendance.Add(new Attendance
                    {
                        EmployeeId = e.Id,
                        Date = d.Date,
                        Status = "Present",
                        CheckInTime = TimeSpan.FromMinutes(inMinutes),
                        CheckOutTime = TimeSpan.FromMinutes(outMinutes),
                    });
                }
            }
            db.Attendances.AddRange(attendance);
            await db.SaveChangesAsync();
        }

        if (AppDates.Today.DayOfWeek != DayOfWeek.Sunday && !holidayDates.Contains(AppDates.Today.Date))
        {
            var demoEmails = new HashSet<string>
            {
                "admin@company.com",
                "rahul.sharma@company.com",
                "priya.verma@company.com",
            };
            var approvedLeavesToday = leaveRequestsInDb.Where(x => x.Status == "Approved").ToList();
            var hasRowToday = (await db.Attendances
                    .Where(a => a.Date.Date == AppDates.Today.Date)
                    .Select(a => a.EmployeeId)
                    .ToListAsync())
                .ToHashSet();
            var rngToday = new Random(20261120);
            var todaysAttendance = new List<Attendance>();
            foreach (var e in employeesInDb)
            {
                if (demoEmails.Contains(e.Email) || hasRowToday.Contains(e.Id))
                    continue;

                var onLeave = approvedLeavesToday.Any(r =>
                    r.EmployeeId == e.Id && r.StartDate.Date <= AppDates.Today.Date && AppDates.Today.Date <= r.EndDate.Date);
                if (onLeave)
                {
                    todaysAttendance.Add(new Attendance
                    {
                        EmployeeId = e.Id, Date = AppDates.Today.Date, Status = "Leave",
                        Remarks = "Approved leave"
                    });
                    continue;
                }

                var inMinutes = 9 * 60 + 5 + rngToday.Next(0, 46);
                todaysAttendance.Add(new Attendance
                {
                    EmployeeId = e.Id,
                    Date = AppDates.Today.Date,
                    Status = "Present",
                    CheckInTime = TimeSpan.FromMinutes(inMinutes),
                    CheckOutTime = null,
                });
            }
            if (todaysAttendance.Count > 0)
            {
                db.Attendances.AddRange(todaysAttendance);
                await db.SaveChangesAsync();
            }
        }
    }
}
