import { prisma } from "@/lib/prisma";
import { findRoomTableCombination } from "@/lib/tableAvailability";
import {
  formatReservationTime,
  getRequiredSlotTimes,
  getReservationShift,
  getReservationTimeOptions,
  isReservationDate,
  parseScheduleData,
  parseReservationTime,
} from "@/lib/tableReservation";

const DAY_KEYS = [
  "domingo",
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
];

function getTodayDate() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}

function formatDate(value) {
  return value.toISOString().slice(0, 10);
}

function getSlotCapacity(rows) {
  return rows.reduce(
    (capacity, row) => ({
      total: capacity.total + row.total_capacity,
      available: capacity.available + row.available_capacity,
    }),
    { total: 0, available: 0 }
  );
}

function getRequiredTimeCapacity(rows, requiredTimes) {
  const rowsByRoomTypeTime = new Map();
  const rowsByRoomType = new Map();

  for (const row of rows) {
    const roomTypeKey = `${row.room_id}:${row.typology_id}`;
    const timeKey = `${roomTypeKey}:${formatReservationTime(row.start_time)}`;
    rowsByRoomTypeTime.set(timeKey, row);
    const groupRows = rowsByRoomType.get(roomTypeKey) || [];
    groupRows.push(row);
    rowsByRoomType.set(roomTypeKey, groupRows);
  }

  return [...rowsByRoomType.entries()].reduce(
    (capacity, [roomTypeKey, groupRows]) => {
      const total = Math.max(...groupRows.map((row) => row.total_capacity));
      const available = Math.min(
        ...requiredTimes.map((time) => {
          const key = `${roomTypeKey}:${formatReservationTime(time)}`;
          return rowsByRoomTypeTime.get(key)?.available_capacity ?? 0;
        })
      );

      return {
        total: capacity.total + total,
        available: capacity.available + Math.min(total, available),
      };
    },
    { total: 0, available: 0 }
  );
}

export async function GET(request) {
  const searchParams = new URL(request.url).searchParams;
  const outletId = Number(searchParams.get("outlet_id"));
  const dateValue = searchParams.get("date");
  const people = Number(searchParams.get("people") || 2);
  const view = searchParams.get("view") || "availability";

  if (
    !Number.isSafeInteger(outletId) ||
    outletId <= 0 ||
    !Number.isSafeInteger(people) ||
    people < 2 ||
    people > 20 ||
    !["availability", "reservations"].includes(view) ||
    (dateValue && !isReservationDate(dateValue))
  ) {
    return Response.json(
      { error: "Indique um outlet, uma data e um número de pessoas válidos." },
      { status: 400 }
    );
  }

  try {
    const outlet = await prisma.outlets.findUnique({
      where: { outlet_id: outletId },
      select: {
        reservation: true,
        schedule_id: true,
        combine_tables: true,
        typologies: {
          select: { typology_id: true, name: true, seats: true },
        },
      },
    });

    if (!outlet || Number(outlet.reservation) !== 1) {
      return Response.json(
        { error: "Este outlet não permite reservas de mesa." },
        { status: 404 }
      );
    }

    if (view === "reservations" && dateValue) {
      const startOfDay = new Date(`${dateValue}T00:00:00.000Z`);
      const startOfNextDay = new Date(startOfDay);
      startOfNextDay.setUTCDate(startOfNextDay.getUTCDate() + 1);
      const reservations = await prisma.reservations.findMany({
        where: {
          outlet_id: outletId,
          status: "confirmed",
          start_at: { gte: startOfDay, lt: startOfNextDay },
        },
        select: {
          reservation_id: true,
          customer_name: true,
          customer_surname: true,
          pax_size: true,
          start_at: true,
          typology_id: true,
          typologies: { select: { name: true, seats: true } },
          ReservationTableAllocations: {
            select: {
              room_id: true,
              table_count: true,
              typologies: { select: { name: true, seats: true } },
            },
          },
        },
        orderBy: { start_at: "asc" },
      });

      const roomIds = [
        ...new Set(
          reservations.flatMap((reservation) =>
            reservation.ReservationTableAllocations.map(
              (allocation) => allocation.room_id
            )
          ).filter((roomId) => roomId > 0)
        ),
      ];
      const rooms = roomIds.length
        ? await prisma.accessPointGroups.findMany({
            where: { access_point_group_id: { in: roomIds } },
            select: {
              access_point_group_id: true,
              access_point_group_name: true,
            },
          })
        : [];
      const roomNames = new Map(
        rooms.map((room) => [
          room.access_point_group_id,
          room.access_point_group_name,
        ])
      );

      return Response.json({
        date: dateValue,
        reservations: reservations.map((reservation) => {
          const allocations = reservation.ReservationTableAllocations.length
            ? reservation.ReservationTableAllocations
            : reservation.typologies
              ? [
                  {
                    room_id: 0,
                    table_count: 1,
                    typologies: reservation.typologies,
                  },
                ]
              : [];

          return {
            reservation_id: reservation.reservation_id,
            name:
              [reservation.customer_name, reservation.customer_surname]
                .filter((part) => typeof part === "string" && part.trim())
                .join(" ") || "Sem nome",
            time: formatReservationTime(reservation.start_at),
            pax_size: reservation.pax_size,
            tables: allocations.map((allocation) => ({
              count: allocation.table_count,
              typology: allocation.typologies.name,
              room: roomNames.get(allocation.room_id) || null,
            })),
          };
        }),
      });
    }

    const typologyIds = outlet.typologies.map(
      (typology) => typology.typology_id
    );
    if (!dateValue) {
      if (!typologyIds.length) {
        return Response.json({ available_dates: [] });
      }

      const dates = await prisma.availability.groupBy({
        by: ["availability_date"],
        where: {
          typology_id: { in: typologyIds },
          availability_date: { gte: getTodayDate() },
        },
        orderBy: { availability_date: "asc" },
      });

      return Response.json({
        available_dates: dates.map((date) =>
          formatDate(date.availability_date)
        ),
      });
    }

    if (!outlet.schedule_id || !typologyIds.length) {
      return Response.json({ date: dateValue, shifts: [] });
    }

    const [schedule, items, rows] = await Promise.all([
      prisma.schedules.findUnique({
        where: { schedule_id: outlet.schedule_id },
        select: { schedule_json: true, slotDuration: true },
      }),
      prisma.outletItems.findMany({
        where: {
          outlet_id: outletId,
          is_reservation_item: true,
          shift_index: { not: null },
        },
        select: { shift_index: true, item_duration: true },
      }),
      prisma.availability.findMany({
        where: {
          typology_id: { in: typologyIds },
          availability_date: new Date(`${dateValue}T00:00:00.000Z`),
        },
        select: {
          typology_id: true,
          room_id: true,
          start_time: true,
          end_time: true,
          total_capacity: true,
          available_capacity: true,
        },
        orderBy: [{ start_time: "asc" }, { room_id: "asc" }],
      }),
    ]);

    if (!schedule) {
      return Response.json({ date: dateValue, shifts: [] });
    }

    const scheduleData = parseScheduleData(schedule.schedule_json);
    const day = new Date(`${dateValue}T00:00:00.000Z`).getUTCDay();
    const dayRanges = scheduleData?.days?.[DAY_KEYS[day]];
    if (!Array.isArray(dayRanges)) {
      return Response.json({ date: dateValue, shifts: [] });
    }

    const slotDuration =
      Number.isSafeInteger(Number(schedule.slotDuration)) &&
      Number(schedule.slotDuration) > 0
        ? Number(schedule.slotDuration)
        : 30;
    const timeOptions = getReservationTimeOptions(
      schedule.schedule_json,
      dateValue,
      slotDuration
    );
    const rowsByStart = new Map();
    for (const row of rows) {
      const startTime = formatReservationTime(row.start_time);
      const startRows = rowsByStart.get(startTime) || [];
      startRows.push(row);
      rowsByStart.set(startTime, startRows);
    }

    const itemsByShift = new Map();
    for (const item of items) {
      const shiftItems = itemsByShift.get(item.shift_index) || [];
      shiftItems.push(item);
      itemsByShift.set(item.shift_index, shiftItems);
    }

    const shifts = dayRanges
      .map((range, shiftIndex) => {
        const start = parseReservationTime(range?.start);
        const end = parseReservationTime(range?.end);
        if (start === null || end === null || end <= start) return null;

        const shiftStarts = timeOptions.filter(
          (time) =>
            getReservationShift(schedule.schedule_json, dateValue, time) ===
            shiftIndex
        );
        let peak = null;
        const shiftCapacity = { total: 0, available: 0 };
        for (const startTime of shiftStarts) {
          const startRows = rowsByStart.get(startTime) || [];
          if (!startRows.length) continue;

          const capacity = getSlotCapacity(startRows);
          shiftCapacity.total += capacity.total;
          shiftCapacity.available += capacity.available;
          const occupied = capacity.total - capacity.available;
          const occupancyPercent = capacity.total
            ? Math.round((occupied / capacity.total) * 100)
            : 0;
          if (
            !peak ||
            occupied > peak.occupied ||
            (occupied === peak.occupied &&
              occupancyPercent > peak.occupancy_percent)
          ) {
            peak = {
              time: startTime,
              total: capacity.total,
              available: capacity.available,
              occupied,
              occupancy_percent: occupancyPercent,
              rows: startRows,
            };
          }
        }

        const shiftItems = itemsByShift.get(shiftIndex) || [];
        const slots = [];
        if (shiftItems.length === 1) {
          const duration = Number(shiftItems[0].item_duration);
          if (Number.isSafeInteger(duration) && duration > 0) {
            for (const startTime of shiftStarts) {
              const startMinutes = parseReservationTime(startTime);
              if (startMinutes === null || startMinutes + duration > end) {
                continue;
              }

              const requiredTimes = getRequiredSlotTimes(
                startTime,
                duration,
                slotDuration
              );
              if (!requiredTimes.length) continue;

              const tableCombination = findRoomTableCombination({
                rows,
                typologies: outlet.typologies,
                requiredTimes,
                people,
                allowCombination: outlet.combine_tables,
              });
              const capacity = getRequiredTimeCapacity(rows, requiredTimes);
              const typologyAvailability = outlet.typologies.map((typology) => {
                const typologyCapacity = getRequiredTimeCapacity(
                  rows.filter(
                    (row) => row.typology_id === typology.typology_id
                  ),
                  requiredTimes
                );
                return {
                  typology_id: typology.typology_id.toString(),
                  name: typology.name,
                  seats: typology.seats,
                  total: typologyCapacity.total,
                  available: typologyCapacity.available,
                  occupied:
                    typologyCapacity.total - typologyCapacity.available,
                };
              });
              slots.push({
                time: startTime,
                bookable: Boolean(tableCombination),
                total: capacity.total,
                available: capacity.available,
                occupied: capacity.total - capacity.available,
                occupancy_percent: capacity.total
                  ? Math.round(
                      ((capacity.total - capacity.available) /
                        capacity.total) *
                        100
                    )
                  : 0,
                typologies: typologyAvailability,
              });
            }
          }
        }

        const shiftOccupied =
          shiftCapacity.total - shiftCapacity.available;
        const shiftOccupancyPercent = shiftCapacity.total
          ? Math.round((shiftOccupied / shiftCapacity.total) * 100)
          : 0;

        const typologyAvailability = peak
          ? outlet.typologies.map((typology) => {
              const typologyRows = peak.rows.filter(
                (row) => row.typology_id === typology.typology_id
              );
              const capacity = getSlotCapacity(typologyRows);
              return {
                typology_id: typology.typology_id.toString(),
                name: typology.name,
                seats: typology.seats,
                total: capacity.total,
                available: capacity.available,
                occupied: capacity.total - capacity.available,
              };
            })
          : outlet.typologies.map((typology) => ({
              typology_id: typology.typology_id.toString(),
              name: typology.name,
              seats: typology.seats,
              total: 0,
              available: 0,
              occupied: 0,
            }));

        return {
          shift_index: shiftIndex,
          label:
            typeof range.name === "string" && range.name.trim()
              ? range.name.trim()
              : `${shiftIndex + 1}.º turno`,
          start_time: range.start,
          end_time: range.end,
          peak_time: peak?.time || null,
          total: peak?.total || 0,
          occupied: peak?.occupied || 0,
          available: peak?.available || 0,
          occupancy_percent: shiftOccupancyPercent,
          slots,
          typologies: typologyAvailability,
        };
      })
      .filter(Boolean);

    return Response.json({ date: dateValue, shifts });
  } catch (error) {
    console.error("Não foi possível carregar o painel de reservas.", error);
    return Response.json(
      { error: "Não foi possível carregar a disponibilidade das reservas." },
      { status: 500 }
    );
  }
}
