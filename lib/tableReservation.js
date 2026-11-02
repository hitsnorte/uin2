const DAY_KEYS = [
  "domingo",
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
];

export const DEFAULT_RESERVATION_TIME_ZONE = "Europe/Lisbon";

export function isValidReservationTimeZone(value) {
  if (typeof value !== "string" || !value) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function isReservationTimeInPast(
  dateValue,
  startTime,
  now = new Date(),
  timeZone = DEFAULT_RESERVATION_TIME_ZONE
) {
  const start = parseReservationTime(startTime);
  if (start === null || !isValidReservationTimeZone(timeZone)) return false;

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );
  const currentDate = `${values.year}-${values.month}-${values.day}`;
  if (dateValue !== currentDate) return dateValue < currentDate;

  const currentMinutes = Number(values.hour) * 60 + Number(values.minute);
  return (
    start < currentMinutes ||
    (start === currentMinutes && Number(values.second) > 0)
  );
}

export function isReservationDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function parseScheduleData(value) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function parseReservationTime(value) {
  if (typeof value !== "string") return null;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

export function formatReservationTime(value) {
  return `${String(value.getUTCHours()).padStart(2, "0")}:${String(
    value.getUTCMinutes()
  ).padStart(2, "0")}`;
}

export function getReservationShift(scheduleJson, dateValue, startTime) {
  const schedule = parseScheduleData(scheduleJson);
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  const dayRanges = schedule?.days?.[DAY_KEYS[date.getUTCDay()]];
  const start = parseReservationTime(startTime);
  if (!Array.isArray(dayRanges) || start === null) return null;

  return dayRanges.findIndex((range) => {
    const rangeStart = parseReservationTime(range?.start);
    const rangeEnd = parseReservationTime(range?.end);
    return rangeStart !== null && rangeEnd !== null && start >= rangeStart && start < rangeEnd;
  });
}

export function getReservationTimeOptions(scheduleJson, dateValue, slotDuration) {
  if (!isReservationDate(dateValue) || !Number.isSafeInteger(slotDuration) || slotDuration <= 0) {
    return [];
  }

  const schedule = parseScheduleData(scheduleJson);
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  const dayRanges = schedule?.days?.[DAY_KEYS[date.getUTCDay()]];
  if (!Array.isArray(dayRanges)) return [];

  const options = new Set();
  for (const range of dayRanges) {
    const start = parseReservationTime(range?.start);
    const end = parseReservationTime(range?.end);
    if (start === null || end === null || end <= start) continue;

    for (let minutes = start; minutes + slotDuration <= end; minutes += slotDuration) {
      options.add(
        `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(
          minutes % 60
        ).padStart(2, "0")}`
      );
    }
  }

  return [...options].sort();
}

export function getRequiredSlotTimes(startTime, duration, slotDuration) {
  const start = parseReservationTime(startTime);
  if (
    start === null ||
    !Number.isSafeInteger(duration) ||
    duration <= 0 ||
    !Number.isSafeInteger(slotDuration) ||
    slotDuration <= 0
  ) {
    return [];
  }

  const slotCount = Math.ceil(duration / slotDuration);
  return Array.from({ length: slotCount }, (_, index) => {
    const minutes = start + index * slotDuration;
    if (minutes >= 24 * 60) return null;

    return new Date(
      Date.UTC(1970, 0, 1, Math.floor(minutes / 60), minutes % 60)
    );
  }).filter(Boolean);
}
