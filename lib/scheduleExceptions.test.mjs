import assert from "node:assert/strict";
import test from "node:test";
import {
  getScheduleAvailabilityCapacity,
  getScheduleDateExceptionReason,
  isScheduleDateException,
} from "./scheduleExceptions.js";

test("closes every date in an exception range, including the endpoints", () => {
  const exceptions = [
    { startDate: "2026-12-24", endDate: "2026-12-26", reason: "Fechado" },
  ];

  assert.equal(isScheduleDateException("2026-12-24", exceptions), true);
  assert.equal(isScheduleDateException("2026-12-25", exceptions), true);
  assert.equal(isScheduleDateException("2026-12-26", exceptions), true);
  assert.equal(isScheduleDateException("2026-12-27", exceptions), false);
});

test("ignores invalid exception dates", () => {
  assert.equal(
    isScheduleDateException("2026-02-29", [
      { startDate: "2026-02-30", endDate: "2026-03-02" },
    ]),
    false
  );
});

test("sets generated availability to zero on exception dates", () => {
  const exceptions = [
    { startDate: "2026-12-24", endDate: "2026-12-26", reason: "Fechado" },
  ];

  assert.equal(
    getScheduleAvailabilityCapacity("2026-12-25", 4, exceptions),
    0
  );
  assert.equal(
    getScheduleAvailabilityCapacity("2026-12-27", 4, exceptions),
    4
  );
});

test("returns the reason for the exception covering a date", () => {
  const exceptions = [
    { startDate: "2026-12-24", endDate: "2026-12-26", reason: " Obras " },
  ];

  assert.equal(
    getScheduleDateExceptionReason("2026-12-25", exceptions),
    "Obras"
  );
  assert.equal(getScheduleDateExceptionReason("2026-12-27", exceptions), null);
});
