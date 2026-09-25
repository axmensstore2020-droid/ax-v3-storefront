export async function GET() {
  const calendar = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AX Store//Launch Reminder//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    'UID:ax-launch-20260927T120000@axstore.in',
    'DTSTAMP:20260925T190000Z',
    'DTSTART:20260927T063000Z',
    'DTEND:20260927T073000Z',
    'SUMMARY:AX Store — Going Live',
    'DESCRIPTION:Inspired by the fear of being average. AX goes live Sunday at 12:00 PM IST. https://axstore.in',
    'LOCATION:https://axstore.in',
    'URL:https://axstore.in',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:AX goes live in 15 minutes.',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\\r\\n');

  return new Response(calendar, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="ax-store-launch.ics"',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
