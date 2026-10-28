import { prisma } from "@/lib/prisma";
import {
  formatReservationTime,
  getRequiredSlotTimes,
  getReservationShift,
  isReservationDate,
} from "@/lib/tableReservation";

export async function GET(request) {
  const searchParams = new URL(request.url).searchParams;
  const outletId = Number(searchParams.get("outlet_id"));
  const dateValue = searchParams.get("date");
  const people = Number(searchParams.get("people"));

  if (
    !Number.isSafeInteger(outletId) ||
    outletId <= 0 ||
    !isReservationDate(dateValue) ||
    !Number.isSafeInteger(people) ||
    people <= 0 ||
    people > 20
  ) {
    return Response.json(
      { error: "Indique um outlet e uma data válidos." },
      { status: 400 }
    );
  }

  try {
    const outlet = await prisma.outlets.findUnique({
      where: { outlet_id: outletId },
      select: {
        reservation: true,
        schedule_id: true,
        typologies: { select: { typology_id: true, seats: true } },
      },
    });

    if (!outlet || Number(outlet.reservation) !== 1) {
      return Response.json(
        { error: "Este outlet não permite reservas de mesa." },
        { status: 404 }
      );
    }
    if (!outlet.schedule_id) return Response.json([]);

    const typologies = outlet.typologies.filter(
      (typology) => Number(typology.seats) >= people
    );
    const typologyIds = typologies.map((typology) => typology.typology_id);
    if (!typologyIds.length) return Response.json([]);

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
          available_capacity: { gt: 0 },
        },
        select: {
          availability_id: true,
          typology_id: true,
          start_time: true,
          end_time: true,
          available_capacity: true,
        },
        orderBy: [{ start_time: "asc" }, { end_time: "asc" }],
      }),
    ]);
    if (!schedule) return Response.json([]);

    const itemsByShift = new Map();
    for (const item of items) {
      const shiftItems = itemsByShift.get(item.shift_index) || [];
      shiftItems.push(item);
      itemsByShift.set(item.shift_index, shiftItems);
    }

    const rowsByTypologyAndTime = new Map();
    for (const row of rows) {
      const key = `${row.typology_id}:${formatReservationTime(row.start_time)}`;
      rowsByTypologyAndTime.set(key, row);
    }

    const slotDuration =
      Number.isSafeInteger(Number(schedule.slotDuration)) && schedule.slotDuration > 0
        ? schedule.slotDuration
        : 30;
    const slots = new Map();
    for (const row of rows) {
      if (row.available_capacity <= 0) continue;

      const startTime = formatReservationTime(row.start_time);
      const shiftIndex = getReservationShift(
        schedule.schedule_json,
        dateValue,
        startTime
      );
      const shiftItems = itemsByShift.get(shiftIndex) || [];
      if (shiftItems.length !== 1) continue;
      const itemDuration = Number(shiftItems[0].item_duration);
      const requiredTimes = getRequiredSlotTimes(
        startTime,
        itemDuration,
        slotDuration
      );
      if (!requiredTimes.length) continue;

      const availableForDuration = requiredTimes.every((time) => {
        const key = `${row.typology_id}:${formatReservationTime(time)}`;
        return rowsByTypologyAndTime.has(key) &&
          rowsByTypologyAndTime.get(key).available_capacity > 0;
      });
      if (availableForDuration) {
        slots.set(startTime, {
          start_time: startTime,
          end_time: formatReservationTime(row.end_time),
        });
      }
    }

    return Response.json(
      [...slots.values()].sort((a, b) =>
        a.start_time.localeCompare(b.start_time)
      )
    );
  } catch (error) {
    console.error("Não foi possível carregar a disponibilidade.", error);
    return Response.json(
      { error: "Não foi possível carregar os horários disponíveis." },
      { status: 500 }
    );
  }
}
