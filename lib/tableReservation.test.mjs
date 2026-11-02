import assert from "node:assert/strict";
import test from "node:test";
import {
  isReservationTimeInPast,
  isValidReservationTimeZone,
  getReservationTimeOptions,
} from "./tableReservation.js";

test("recognizes reservation times earlier than the current local time", () => {
  const now = new Date("2026-11-02T17:00:00.000Z");

  assert.equal(isReservationTimeInPast("2026-11-02", "12:00", now), true);
  assert.equal(isReservationTimeInPast("2026-11-02", "18:00", now), false);
  assert.equal(isReservationTimeInPast("2026-11-03", "09:00", now), false);
});

test("compares reservation times using the requested timezone", () => {
  const now = new Date("2026-11-02T17:00:00.000Z");

  assert.equal(
    isReservationTimeInPast("2026-11-02", "12:00", now, "America/New_York"),
    false
  );
  assert.equal(
    isReservationTimeInPast("2026-11-02", "12:00", now, "Europe/Lisbon"),
    true
  );
});

test("treats a slot as past after its start minute begins", () => {
  const startOfMinute = new Date("2026-11-02T17:00:00.000Z");
  assert.equal(
    isReservationTimeInPast("2026-11-02", "17:00", startOfMinute),
    false
  );

  const now = new Date("2026-11-02T17:00:01.000Z");

  assert.equal(isReservationTimeInPast("2026-11-02", "17:00", now), true);
  assert.equal(isReservationTimeInPast("2026-11-02", "17:01", now), false);
});

test("validates IANA timezones", () => {
  assert.equal(isValidReservationTimeZone("Europe/Lisbon"), true);
  assert.equal(isValidReservationTimeZone("not-a-timezone"), false);
});

test("builds time options from schedule ranges and slot duration", () => {
  const schedule = {
    days: {
      segunda: [
        { start: "12:00", end: "14:00" },
        { start: "18:00", end: "19:00" },
      ],
    },
  };

  assert.deepEqual(
    getReservationTimeOptions(schedule, "2026-11-02", 30),
    ["12:00", "12:30", "13:00", "13:30", "18:00", "18:30"]
  );
  assert.deepEqual(
    getReservationTimeOptions(schedule, "2026-11-02", 60),
    ["12:00", "13:00", "18:00"]
  );
});
