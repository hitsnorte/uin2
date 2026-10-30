import { formatReservationTime } from "./tableReservation.js";

function comparePlans(left, right) {
  return (
    left.table_count - right.table_count ||
    left.total_seats - right.total_seats ||
    left.room_id - right.room_id
  );
}

export function selectTableCombination(tables, people, allowCombination) {
  const usableTables = tables
    .filter(
      (table) =>
        Number.isSafeInteger(Number(table.seats)) &&
        Number(table.seats) > 0 &&
        Number.isSafeInteger(Number(table.available_count)) &&
        Number(table.available_count) > 0
    )
    .map((table) => ({
      ...table,
      seats: Number(table.seats),
      available_count: Number(table.available_count),
    }))
    .sort(
      (left, right) =>
        left.seats - right.seats ||
        String(left.typology_id).localeCompare(String(right.typology_id))
    );

  const singleTable = usableTables.find((table) => table.seats >= people);
  if (singleTable) {
    return {
      room_id: Number(singleTable.room_id),
      table_count: 1,
      total_seats: singleTable.seats,
      allocations: [
        {
          typology_id: singleTable.typology_id,
          room_id: Number(singleTable.room_id),
          table_count: 1,
        },
      ],
    };
  }

  if (!allowCombination || !usableTables.length) return null;

  const maxSeats = Math.max(...usableTables.map((table) => table.seats));
  const maxCapacity = people + maxSeats - 1;
  let states = new Map([[0, { table_count: 0, allocations: [] }]]);

  for (const table of usableTables) {
    const nextStates = new Map(states);
    for (const [currentSeats, state] of states) {
      const maxTableCount = Math.min(
        table.available_count,
        Math.floor((maxCapacity - currentSeats) / table.seats)
      );

      for (let count = 1; count <= maxTableCount; count += 1) {
        const totalSeats = currentSeats + count * table.seats;
        const candidate = {
          table_count: state.table_count + count,
          allocations: [
            ...state.allocations,
            {
              typology_id: table.typology_id,
              room_id: Number(table.room_id),
              table_count: count,
            },
          ],
        };
        const current = nextStates.get(totalSeats);
        if (!current || candidate.table_count < current.table_count) {
          nextStates.set(totalSeats, candidate);
        }
      }
    }
    states = nextStates;
  }

  const feasiblePlans = [...states.entries()]
    .filter(([totalSeats, state]) => totalSeats >= people && state.table_count)
    .map(([total_seats, state]) => ({
      room_id: Number(usableTables[0].room_id),
      total_seats,
      ...state,
    }))
    .sort(comparePlans);

  return feasiblePlans[0] || null;
}

export function findRoomTableCombination({
  rows,
  typologies,
  requiredTimes,
  people,
  allowCombination,
}) {
  const rowsByRoomTypeTime = new Map();
  for (const row of rows) {
    const key = `${row.room_id}:${row.typology_id}:${formatReservationTime(
      row.start_time
    )}`;
    rowsByRoomTypeTime.set(key, row);
  }

  const roomIds = [...new Set(rows.map((row) => row.room_id))].sort(
    (left, right) => left - right
  );
  const plans = [];
  for (const roomId of roomIds) {
    const tables = typologies.map((typology) => {
      const capacities = requiredTimes.map((time) => {
        const key = `${roomId}:${typology.typology_id}:${formatReservationTime(
          time
        )}`;
        return rowsByRoomTypeTime.get(key)?.available_capacity ?? 0;
      });

      return {
        typology_id: typology.typology_id,
        room_id: roomId,
        seats: typology.seats,
        available_count: capacities.length
          ? Math.min(...capacities)
          : 0,
      };
    });
    const plan = selectTableCombination(tables, people, allowCombination);
    if (plan) plans.push(plan);
  }

  return plans.sort(comparePlans)[0] || null;
}
