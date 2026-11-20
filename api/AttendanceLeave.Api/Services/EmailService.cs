using System.Net.Mail;

namespace AttendanceLeave.Api.Services;

public interface IEmailService
{
    Task SendLeaveStatusEmailAsync(string toEmail, string employeeName,
        string leaveTypeName, string status, string? comments);
}

public class SmtpEmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<SmtpEmailService> _logger;

    public SmtpEmailService(IConfiguration config, ILogger<SmtpEmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task SendLeaveStatusEmailAsync(string toEmail, string employeeName,
        string leaveTypeName, string status, string? comments)
    {
        var email = _config.GetSection("Email");
        var host = email["SmtpHost"];

        if (string.IsNullOrWhiteSpace(host))
        {
            _logger.LogWarning(
                "Email not configured (Email:SmtpHost empty) — skipping leave {Status} email to {To}.",
                status, toEmail);
            return;
        }

        try
        {
            var from = email["FromEmail"] ?? email["SmtpUser"] ?? "noreply@company.com";
            using var message = new MailMessage(from, toEmail)
            {
                Subject = $"Leave {status}: {leaveTypeName}",
                Body = $"Hi {employeeName},\n\n" +
                       $"Your {leaveTypeName} leave request has been {status.ToLower()}." +
                       (string.IsNullOrWhiteSpace(comments)
                           ? string.Empty
                           : $"\n\nReviewer comments: {comments}") +
                       "\n\n— HR, Attendance & Leave Management",
                IsBodyHtml = false
            };

            using var client = new SmtpClient(host,
                int.TryParse(email["SmtpPort"], out var port) ? port : 587)
            {
                EnableSsl = bool.TryParse(email["EnableSsl"], out var ssl) && ssl
            };

            var user = email["SmtpUser"];
            var pass = email["SmtpPass"];
            if (!string.IsNullOrWhiteSpace(user))
                client.Credentials = new System.Net.NetworkCredential(user, pass);

            await client.SendMailAsync(message);
            _logger.LogInformation("Leave {Status} email sent to {To}.", status, toEmail);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "Failed to send leave {Status} email to {To}; continuing anyway.", status, toEmail);
        }
    }
}
