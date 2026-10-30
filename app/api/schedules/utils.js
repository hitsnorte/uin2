function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function getScheduleData(body) {
  const scheduleJson = body?.schedule_json;

  if (
    !scheduleJson ||
    typeof scheduleJson !== "object" ||
    Array.isArray(scheduleJson) ||
    typeof scheduleJson.name !== "string" ||
    !scheduleJson.days ||
    typeof scheduleJson.days !== "object" ||
    Array.isArray(scheduleJson.days)
  ) {
    return null;
  }

  const slotDuration = body.slotDuration ?? scheduleJson.slotDuration ?? 30;
  if (
    !Number.isInteger(slotDuration) ||
    slotDuration < 15 ||
    slotDuration > 120 ||
    slotDuration % 15 !== 0
  ) {
    return null;
  }

  const exceptions = body.exceptions ?? scheduleJson.exceptions ?? [];
  if (
    !Array.isArray(exceptions) ||
    exceptions.some(
      (exception) =>
        !exception ||
        typeof exception !== "object" ||
        !isValidDate(exception.startDate) ||
        !isValidDate(exception.endDate) ||
        exception.startDate > exception.endDate ||
        typeof exception.reason !== "string" ||
        !exception.reason.trim()
    )
  ) {
    return null;
  }

  const scheduleJsonForStorage = { ...scheduleJson };
  delete scheduleJsonForStorage.slotDuration;
  delete scheduleJsonForStorage.exceptions;

  return {
    schedule_json: scheduleJsonForStorage,
    slotDuration,
    exceptions,
  };
}
