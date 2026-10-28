import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

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

function getAvailabilityKey(typologyId, date, time) {
  return `${typologyId}:${date.toISOString().slice(0, 10)}:${time
    .toISOString()
    .slice(11, 16)}`;
}

function parseScheduleJson(value) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function createAvailabilityRows(schedule, typologyCapacities, today) {
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

        for (const { typologyId, capacity } of typologyCapacities) {
          const row = {
            typology_id: typologyId,
            availability_date: date,
            start_time: startTime,
            end_time: endTime,
            total_capacity: capacity,
            available_capacity: capacity,
          };
          rows.set(
            getAvailabilityKey(typologyId, date, startTime),
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
  if (Number(outlet.reservation) === 1 && outlet.schedule_id && typologyIds.length) {
    const [schedule, accessPoints] = await Promise.all([
      db.schedules.findUnique({
        where: { schedule_id: outlet.schedule_id },
        select: { schedule_json: true, slotDuration: true },
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
        select: { typology_id: true },
      }),
    ]);

    if (schedule) {
      const capacities = new Map();
      for (const point of accessPoints) {
        const typologyId = BigInt(point.typology_id);
        capacities.set(typologyId, (capacities.get(typologyId) || 0) + 1);
      }

      rows = createAvailabilityRows(
        schedule,
        [...capacities].map(([typologyId, capacity]) => ({
          typologyId,
          capacity,
        })),
        today
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
          availability_date: true,
          start_time: true,
        },
      })
    : [];
  const desiredKeys = new Set(
    rows.map((row) =>
      getAvailabilityKey(
        row.typology_id,
        row.availability_date,
        row.start_time
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
            row.start_time
          )
        )
    )
    .map((row) => row.availability_id);

  if (obsoleteIds.length) {
    await db.availability.deleteMany({
      where: { availability_id: { in: obsoleteIds } },
    });
  }

  for (let offset = 0; offset < rows.length; offset += 400) {
    const batch = rows.slice(offset, offset + 400);
    const values = batch.map(
      (row) =>
        Prisma.sql`(${row.typology_id}, ${row.availability_date}, ${row.start_time}, ${row.end_time}, ${row.total_capacity}, ${row.available_capacity})`
    );

    await db.$executeRaw(Prisma.sql`
      INSERT INTO availability (
        typology_id,
        availability_date,
        start_time,
        end_time,
        total_capacity,
        available_capacity
      )
      VALUES ${Prisma.join(values)}
      ON DUPLICATE KEY UPDATE
        available_capacity = GREATEST(
          0,
          LEAST(
            VALUES(total_capacity),
            VALUES(total_capacity) - GREATEST(0, total_capacity - available_capacity)
          )
        ),
        end_time = VALUES(end_time),
        total_capacity = VALUES(total_capacity),
        updated_at = CURRENT_TIMESTAMP
    `);
  }
}

export async function refreshReservationAvailability(db = prisma) {
  const outlets = await db.outlets.findMany({
    where: { reservation: 1 },
    select: { outlet_id: true },
  });

  for (const outlet of outlets) {
    await syncOutletAvailability(db, outlet.outlet_id);
  }
}
