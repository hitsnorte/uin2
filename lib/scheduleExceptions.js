function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isScheduleDateException(date, exceptions) {
  const dateValue =
    date instanceof Date ? date.toISOString().slice(0, 10) : date;
  if (!isValidDate(dateValue) || !Array.isArray(exceptions)) return false;

  return exceptions.some(
    (exception) =>
      isValidDate(exception?.startDate) &&
      isValidDate(exception?.endDate) &&
      exception.startDate <= dateValue &&
      dateValue <= exception.endDate
  );
}

export function getScheduleAvailabilityCapacity(date, capacity, exceptions) {
  return isScheduleDateException(date, exceptions) ? 0 : capacity;
}
