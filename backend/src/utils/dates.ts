const BUSINESS_TIME_ZONE = "Europe/Istanbul";

function istanbulParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

export function nowStamp(): string {
  const parts = istanbulParts(new Date());
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

export function isToday(stamp: string): boolean {
  if (!stamp) return false;
  const parts = istanbulParts(new Date());
  const today = `${parts.year}-${parts.month}-${parts.day}`;
  return stamp.startsWith(today);
}
