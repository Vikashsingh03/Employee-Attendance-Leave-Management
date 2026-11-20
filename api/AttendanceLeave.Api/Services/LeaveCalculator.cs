namespace AttendanceLeave.Api.Services;

public static class LeaveCalculator
{
    public static int CountLeaveDays(DateTime start, DateTime end)
    {
        var days = 0;
        for (var d = start.Date; d <= end.Date; d = d.AddDays(1))
            if (d.DayOfWeek != DayOfWeek.Sunday)
                days++;
        return days;
    }
}
