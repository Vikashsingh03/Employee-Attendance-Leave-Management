using AttendanceLeave.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AttendanceLeave.Api.Controllers;

[ApiController]
[Route("api/health")]
public class HealthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public HealthController(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var provider = _config["DatabaseProvider"] ?? "Sqlite";
        var count = await _db.Employees.CountAsync(e => e.IsActive);
        return Ok(new
        {
            status = "ok",
            provider,
            employees = count
        });
    }
}
