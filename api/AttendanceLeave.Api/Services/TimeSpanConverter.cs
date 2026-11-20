using System.Text.Json;
using System.Text.Json.Serialization;

namespace AttendanceLeave.Api.Services;

public class TimeSpanConverter : JsonConverter<TimeSpan>
{
    private static readonly string[] Formats = { @"hh\:mm", @"hh\:mm\:ss" };

    public override TimeSpan Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var text = reader.GetString();
        if (string.IsNullOrWhiteSpace(text))
            throw new JsonException("Time value is empty.");

        if (TimeSpan.TryParseExact(text, Formats, null, out var value))
            return value;

        throw new JsonException($"Invalid time value '{text}'. Use HH:mm or HH:mm:ss.");
    }

    public override void Write(Utf8JsonWriter writer, TimeSpan value, JsonSerializerOptions options)
    {
        writer.WriteStringValue(value.ToString(@"hh\:mm\:ss"));
    }
}
