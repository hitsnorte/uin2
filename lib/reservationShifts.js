export function getReservationShifts(scheduleData) {
  let data = scheduleData;

  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      data = null;
    }
  }

  const days = data?.days;
  const shiftCount = days && typeof days === "object"
    ? Math.max(
        0,
        ...Object.values(days).map((times) =>
          Array.isArray(times) ? times.length : 0
        )
      )
    : 0;

  return Array.from({ length: shiftCount }, (_, shiftIndex) => {
    const timeRanges = new Set(
      Object.values(days || {})
        .map((times) => times?.[shiftIndex])
        .filter((time) => time?.start && time?.end)
        .map((time) => `${time.start}–${time.end}`)
    );
    const timeLabel = [...timeRanges].join(" / ");

    return {
      shift_index: shiftIndex,
      label: `${shiftIndex + 1}.º turno${timeLabel ? ` (${timeLabel})` : ""}`,
    };
  });
}
