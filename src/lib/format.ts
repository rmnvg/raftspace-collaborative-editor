const RELATIVE_TIME_DIVISIONS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const diffSeconds = Math.round((now - new Date(iso).getTime()) / 1000);

  for (const [unit, secondsInUnit] of RELATIVE_TIME_DIVISIONS) {
    if (Math.abs(diffSeconds) >= secondsInUnit) {
      return relativeTimeFormatter.format(Math.round(-diffSeconds / secondsInUnit), unit);
    }
  }
  return relativeTimeFormatter.format(-diffSeconds, "second");
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}
