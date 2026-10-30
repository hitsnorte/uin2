import assert from "node:assert/strict";
import test from "node:test";
import {
  findRoomTableCombination,
  selectTableCombination,
} from "./tableAvailability.js";

test("combines three two-seat tables for five people", () => {
  const plan = selectTableCombination(
    [
      {
        typology_id: 1n,
        room_id: 3,
        seats: 2,
        available_count: 3,
      },
    ],
    5,
    true
  );

  assert.equal(plan.table_count, 3);
  assert.equal(plan.total_seats, 6);
  assert.deepEqual(plan.allocations, [
    { typology_id: 1n, room_id: 3, table_count: 3 },
  ]);
});

test("combines a two-seat and a four-seat table for five people", () => {
  const plan = selectTableCombination(
    [
      {
        typology_id: 1n,
        room_id: 3,
        seats: 2,
        available_count: 1,
      },
      {
        typology_id: 2n,
        room_id: 3,
        seats: 4,
        available_count: 1,
      },
    ],
    5,
    true
  );

  assert.equal(plan.table_count, 2);
  assert.equal(plan.total_seats, 6);
  assert.deepEqual(plan.allocations, [
    { typology_id: 1n, room_id: 3, table_count: 1 },
    { typology_id: 2n, room_id: 3, table_count: 1 },
  ]);
});

test("does not combine tables when the outlet option is disabled", () => {
  const plan = selectTableCombination(
    [
      { typology_id: 1n, room_id: 3, seats: 2, available_count: 3 },
      { typology_id: 2n, room_id: 3, seats: 4, available_count: 1 },
    ],
    5,
    false
  );

  assert.equal(plan, null);
});

test("does not combine tables from different rooms", () => {
  const plan = findRoomTableCombination({
    rows: [
      {
        room_id: 3,
        typology_id: 1n,
        start_time: new Date("1970-01-01T18:00:00.000Z"),
        available_capacity: 1,
      },
      {
        room_id: 4,
        typology_id: 2n,
        start_time: new Date("1970-01-01T18:00:00.000Z"),
        available_capacity: 1,
      },
    ],
    typologies: [
      { typology_id: 1n, seats: 2 },
      { typology_id: 2n, seats: 4 },
    ],
    requiredTimes: [new Date("1970-01-01T18:00:00.000Z")],
    people: 5,
    allowCombination: true,
  });

  assert.equal(plan, null);
});

test("requires every combined table to be free for the full duration", () => {
  const plan = findRoomTableCombination({
    rows: [
      {
        room_id: 3,
        typology_id: 1n,
        start_time: new Date("1970-01-01T18:00:00.000Z"),
        available_capacity: 2,
      },
      {
        room_id: 3,
        typology_id: 1n,
        start_time: new Date("1970-01-01T18:30:00.000Z"),
        available_capacity: 1,
      },
    ],
    typologies: [{ typology_id: 1n, seats: 2 }],
    requiredTimes: [
      new Date("1970-01-01T18:00:00.000Z"),
      new Date("1970-01-01T18:30:00.000Z"),
    ],
    people: 4,
    allowCombination: true,
  });

  assert.equal(plan, null);
});
