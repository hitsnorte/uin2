import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getScheduleAvailabilityCapacity,
  isScheduleDateException,
} from "@/lib/scheduleExceptions";

const DAY_KEYS = [
  "domingo",
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
];

function getUtcDate(date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function parseTime(value) {
  if (typeof value !== "string") return null;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function toTimeDate(minutes) {
  return new Date(Date.UTC(1970, 0, 1, Math.floor(minutes / 60), minutes % 60));
}

function getAvailabilityKey(typologyId, date, time, roomId) {
  return `${typologyId}:${date.toISOString().slice(0, 10)}:${time
    .toISOString()
    .slice(11, 16)}:${roomId}`;
}

function getAvailabilityPeriodKey(typologyId, date, time) {
  return `${typologyId}:${date.toISOString().slice(0, 10)}:${time
    .toISOString()
    .slice(11, 16)}`;
}

function getAvailabilityDateTime(date, time) {
  return new Date(
    `${date.toISOString().slice(0, 10)}T${time.toISOString().slice(11, 19)}.000Z`
  );
}

function getOccupiedTables(
  reservations,
  typologyId,
  roomId,
  date,
  startTime,
  endTime,
  includeAllRooms = false
) {
  const slotStart = getAvailabilityDateTime(date, startTime);
  const slotEnd = getAvailabilityDateTime(date, endTime);
  let occupiedTables = 0;

  for (const reservation of reservations) {
    if (reservation.start_at >= slotEnd || reservation.end_at <= slotStart) {
      continue;
    }

    const reservationAllocations =
      reservation.ReservationTableAllocations || [];
    const allocations = reservationAllocations.length
      ? reservationAllocations
      : reservation.typology_id
        ? [{ typology_id: reservation.typology_id, room_id: 0, table_count: 1 }]
        : [];
    for (const allocation of allocations) {
      if (
        allocation.typology_id === typologyId &&
        (includeAllRooms || allocation.room_id === roomId)
      ) {
        occupiedTables += allocation.table_count;
      }
    }
  }

  return occupiedTables;
}

function parseScheduleJson(value) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function createAvailabilityRows(
  schedule,
  typologyCapacities,
  today,
  exceptions = []
) {
  const scheduleData = parseScheduleJson(schedule.schedule_json);
  const days = scheduleData?.days;
  if (!days || typeof days !== "object" || Array.isArray(days)) return [];

  const slotDuration = Number(schedule.slotDuration);
  const duration =
    Number.isSafeInteger(slotDuration) && slotDuration > 0 ? slotDuration : 30;
  const rows = new Map();

  for (let dayOffset = 0; dayOffset < 30; dayOffset += 1) {
    const date = addDays(today, dayOffset);
    const timeRanges = days[DAY_KEYS[date.getUTCDay()]];
    if (!Array.isArray(timeRanges)) continue;

    for (const range of timeRanges) {
      const start = parseTime(range?.start);
      const end = parseTime(range?.end);
      if (start === null || end === null || end <= start) continue;

      for (let startMinutes = start; startMinutes + duration <= end; startMinutes += duration) {
        const startTime = toTimeDate(startMinutes);
        const endTime = toTimeDate(startMinutes + duration);

        for (const { typologyId, roomId, capacity } of typologyCapacities) {
          const row = {
            typology_id: typologyId,
            room_id: roomId,
            availability_date: date,
            start_time: startTime,
            end_time: endTime,
            total_capacity: capacity,
            available_capacity: getScheduleAvailabilityCapacity(
              date,
              capacity,
              exceptions
            ),
          };
          rows.set(
            getAvailabilityKey(typologyId, date, startTime, roomId),
            row
          );
        }
      }
    }
  }

  return [...rows.values()];
}

export async function syncOutletAvailability(db, outletId, now = new Date()) {
  const outlet = await db.outlets.findUnique({
    where: { outlet_id: outletId },
    select: {
      outlet_id: true,
      reservation: true,
      schedule_id: true,
      typologies: { select: { typology_id: true } },
    },
  });
  if (!outlet) return;

  const today = getUtcDate(now);
  const typologyIds = outlet.typologies.map((typology) => typology.typology_id);

  if (typologyIds.length) {
    await db.availability.deleteMany({
      where: {
        typology_id: { in: typologyIds },
        availability_date: { lt: today },
      },
    });
  }

  let rows = [];
  let schedule = null;
  if (Number(outlet.reservation) === 1 && outlet.schedule_id && typologyIds.length) {
    const [selectedSchedule, accessPoints] = await Promise.all([
      db.schedules.findUnique({
        where: { schedule_id: outlet.schedule_id },
        select: {
          schedule_json: true,
          slotDuration: true,
          exceptions: true,
        },
      }),
      db.accessPoints.findMany({
        where: {
          outlet_id: outletId,
          active: true,
          typology_id: {
            in: typologyIds
              .map(Number)
              .filter(Number.isSafeInteger),
          },
        },
        select: { typology_id: true, access_point_group_id: true },
      }),
    ]);

    schedule = selectedSchedule;
    if (schedule) {
      const capacities = new Map();
      for (const point of accessPoints) {
        const typologyId = BigInt(point.typology_id);
        const roomId = point.access_point_group_id ?? 0;
        const key = `${typologyId}:${roomId}`;
        const capacity = capacities.get(key);
        if (capacity) {
          capacity.capacity += 1;
        } else {
          capacities.set(key, { typologyId, roomId, capacity: 1 });
        }
      }

      rows = createAvailabilityRows(
        schedule,
        [...capacities.values()],
        today,
        schedule.exceptions
      );
    }
  }

  const existingRows = typologyIds.length
    ? await db.availability.findMany({
        where: {
          typology_id: { in: typologyIds },
          availability_date: { gte: today },
        },
        select: {
          availability_id: true,
          typology_id: true,
          room_id: true,
          availability_date: true,
          start_time: true,
          total_capacity: true,
          available_capacity: true,
        },
      })
    : [];
  const exceptionRows = existingRows.filter((row) =>
    isScheduleDateException(row.availability_date, schedule?.exceptions)
  );
  if (exceptionRows.length) {
    await db.availability.updateMany({
      where: {
        availability_id: {
          in: exceptionRows.map((row) => row.availability_id),
        },
      },
      data: { available_capacity: 0 },
    });
  }

  const rowsWithZeroCapacity = existingRows.filter(
    (row) =>
      row.available_capacity === 0 &&
      !isScheduleDateException(row.availability_date, schedule?.exceptions)
  );
  const reservations = rowsWithZeroCapacity.length
    ? await db.reservations.findMany({
        where: {
          outlet_id: outletId,
          status: "confirmed",
          start_at: { lt: addDays(today, 30) },
          end_at: { gt: today },
        },
        select: {
          start_at: true,
          end_at: true,
          typology_id: true,
          ReservationTableAllocations: {
            select: { typology_id: true, room_id: true, table_count: true },
          },
        },
      })
    : [];
  const legacyAggregateIds = [];
  const desiredKeys = new Set(
    rows.map((row) =>
      getAvailabilityKey(
        row.typology_id,
        row.availability_date,
        row.start_time,
        row.room_id
      )
    )
  );
  const obsoleteIds = existingRows
    .filter(
      (row) =>
        !desiredKeys.has(
          getAvailabilityKey(
            row.typology_id,
            row.availability_date,
            row.start_time,
            row.room_id
          )
        ) &&
        !isScheduleDateException(row.availability_date, schedule?.exceptions)
    )
    .map((row) => row.availability_id);

  if (obsoleteIds.length) {
    await db.availability.deleteMany({
      where: { availability_id: { in: obsoleteIds } },
    });
  }

  const desiredRowsByPeriod = new Map();
  for (const row of rows) {
    const key = getAvailabilityPeriodKey(
      row.typology_id,
      row.availability_date,
      row.start_time
    );
    const periodRows = desiredRowsByPeriod.get(key) || [];
    periodRows.push(row);
    desiredRowsByPeriod.set(key, periodRows);
  }
  const existingRowsByPeriod = new Map();
  for (const row of existingRows) {
    const key = getAvailabilityPeriodKey(
      row.typology_id,
      row.availability_date,
      row.start_time
    );
    const periodRows = existingRowsByPeriod.get(key) || [];
    periodRows.push(row);
    existingRowsByPeriod.set(key, periodRows);
  }

  for (const [key, desiredPeriodRows] of desiredRowsByPeriod) {
    const existingPeriodRows = existingRowsByPeriod.get(key) || [];
    const legacyAggregate =
      existingPeriodRows.length === 1 &&
      existingPeriodRows[0].room_id === 0 &&
      desiredPeriodRows.some((row) => row.room_id !== 0);
    if (legacyAggregate) {
      legacyAggregateIds.push(existingPeriodRows[0].availability_id);
      let occupiedTables =
        existingPeriodRows[0].available_capacity === 0 &&
        !isScheduleDateException(
          existingPeriodRows[0].availability_date,
          schedule?.exceptions
        )
          ? getOccupiedTables(
              reservations,
              desiredPeriodRows[0].typology_id,
              0,
              desiredPeriodRows[0].availability_date,
              desiredPeriodRows[0].start_time,
              desiredPeriodRows[0].end_time,
              true
            )
          : Math.max(
              0,
              existingPeriodRows[0].total_capacity -
                existingPeriodRows[0].available_capacity
            );
      for (const row of desiredPeriodRows.sort(
        (left, right) => left.room_id - right.room_id
      )) {
        const occupiedInRoom = Math.min(occupiedTables, row.total_capacity);
        row.available_capacity = row.total_capacity - occupiedInRoom;
        occupiedTables -= occupiedInRoom;
      }
      continue;
    }

    const existingByRoom = new Map(
      existingPeriodRows.map((row) => [row.room_id, row])
    );
    for (const row of desiredPeriodRows) {
      const existing = existingByRoom.get(row.room_id);
      if (!existing) continue;
      const isClosed = isScheduleDateException(
        row.availability_date,
        schedule?.exceptions
      );
      if (isClosed) {
        row.available_capacity = 0;
        continue;
      }

      const shouldRestoreCapacity = existing.available_capacity === 0;
      const occupiedTables = shouldRestoreCapacity
        ? getOccupiedTables(
            reservations,
            row.typology_id,
            row.room_id,
            row.availability_date,
            row.start_time,
            row.end_time
          )
        : Math.max(0, existing.total_capacity - existing.available_capacity);
      row.available_capacity = Math.max(0, row.total_capacity - occupiedTables);
      row.restoreAvailability = shouldRestoreCapacity;
    }
  }

  if (legacyAggregateIds.length) {
    await db.availability.deleteMany({
      where: { availability_id: { in: legacyAggregateIds } },
    });
  }

  const writeRows = async (batch, mode) => {
    const values = batch.map(
      (row) =>
        Prisma.sql`(${row.typology_id}, ${row.room_id}, ${row.availability_date}, ${row.start_time}, ${row.end_time}, ${row.total_capacity}, ${row.available_capacity})`
    );

    const availabilityUpdate =
      mode === "closed"
        ? Prisma.sql`available_capacity = 0`
        : mode === "restore"
          ? Prisma.sql`available_capacity = VALUES(available_capacity)`
          : Prisma.sql`available_capacity = GREATEST(
              0,
              LEAST(
                VALUES(total_capacity),
                VALUES(total_capacity) - GREATEST(0, total_capacity - available_capacity)
              )
            )`;

    await db.$executeRaw(Prisma.sql`
        INSERT INTO availability (
          typology_id,
          room_id,
          availability_date,
          start_time,
          end_time,
          total_capacity,
          available_capacity
        )
        VALUES ${Prisma.join(values)}
        ON DUPLICATE KEY UPDATE
          ${availabilityUpdate},
          end_time = VALUES(end_time),
          total_capacity = VALUES(total_capacity),
          updated_at = CURRENT_TIMESTAMP
      `);
  };

  const rowsByMode = {
    closed: rows.filter((row) =>
      isScheduleDateException(row.availability_date, schedule?.exceptions)
    ),
    restore: rows.filter(
      (row) =>
        row.restoreAvailability &&
        !isScheduleDateException(row.availability_date, schedule?.exceptions)
    ),
    regular: rows.filter(
      (row) =>
        !row.restoreAvailability &&
        !isScheduleDateException(row.availability_date, schedule?.exceptions)
    ),
  };
  for (const [mode, modeRows] of Object.entries(rowsByMode)) {
    for (let offset = 0; offset < modeRows.length; offset += 400) {
      await writeRows(modeRows.slice(offset, offset + 400), mode);
    }
  }
}

export async function refreshReservationAvailability(db = prisma) {
  const outlets = await db.outlets.findMany({
    where: { reservation: 1 },
    select: { outlet_id: true },
  });

  for (const outlet of outlets) {
    await db.$transaction((transaction) =>
      syncOutletAvailability(transaction, outlet.outlet_id)
    );
  }
}
