import { prisma } from "@/lib/prisma";
import { getFoSessionUser } from "@/lib/foSession";
import { findRoomTableCombination } from "@/lib/tableAvailability";
import {
  formatReservationTime,
  DEFAULT_RESERVATION_TIME_ZONE,
  getRequiredSlotTimes,
  getReservationShift,
  getReservationTimeOptions,
  isReservationDate,
  isReservationTimeInPast,
  isValidReservationTimeZone,
} from "@/lib/tableReservation";

export async function GET(request) {
  const searchParams = new URL(request.url).searchParams;
  const outletId = Number(searchParams.get("outlet_id"));
  const dateValue = searchParams.get("date");
  const people = Number(searchParams.get("people"));
  const timeZone =
    searchParams.get("time_zone") || DEFAULT_RESERVATION_TIME_ZONE;

  if (
    !Number.isSafeInteger(outletId) ||
    outletId <= 0 ||
    !isReservationDate(dateValue) ||
    !Number.isSafeInteger(people) ||
    people <= 0 ||
    people > 20 ||
    !isValidReservationTimeZone(timeZone)
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
        combine_tables: true,
        typologies: { select: { typology_id: true, seats: true } },
      },
    });

    if (!outlet || Number(outlet.reservation) !== 1) {
      return Response.json(
        { error: "Este outlet não permite reservas de mesa." },
        { status: 404 }
      );
    }
    const items = await prisma.outletItems.findMany({
      where: {
        outlet_id: outletId,
        is_reservation_item: true,
        shift_index: { not: null },
      },
      select: { shift_index: true, item_duration: true, checkin: true },
    });

    if (
      items.some((item) => item.checkin === "1") &&
      !(await getFoSessionUser())
    ) {
      return Response.json(
        { error: "Inicie sessão para consultar esta reserva." },
        { status: 401 }
      );
    }
    if (!outlet.schedule_id) {
      return Response.json({ slots: [], time_options: [] });
    }

    const typologies = outlet.typologies.filter(
      (typology) =>
        (outlet.combine_tables || Number(typology.seats) >= people) &&
        Number(typology.seats) > 0
    );
    const typologyIds = typologies.map((typology) => typology.typology_id);
    if (!typologyIds.length) {
      return Response.json({ slots: [], time_options: [] });
    }

    const [schedule, rows] = await Promise.all([
      prisma.schedules.findUnique({
        where: { schedule_id: outlet.schedule_id },
        select: {
          schedule_json: true,
          slotDuration: true,
        },
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
          room_id: true,
          start_time: true,
          end_time: true,
          available_capacity: true,
        },
        orderBy: [{ start_time: "asc" }, { end_time: "asc" }],
      }),
    ]);
    if (!schedule) return Response.json({ slots: [], time_options: [] });

    const itemsByShift = new Map();
    for (const item of items) {
      const shiftItems = itemsByShift.get(item.shift_index) || [];
      shiftItems.push(item);
      itemsByShift.set(item.shift_index, shiftItems);
    }

    const slotDuration =
      Number.isSafeInteger(Number(schedule.slotDuration)) && schedule.slotDuration > 0
        ? schedule.slotDuration
        : 30;
    const timeOptions = getReservationTimeOptions(
      schedule.schedule_json,
      dateValue,
      slotDuration
    );
    const slots = new Map();
    const startTimes = new Set(
      rows.map((row) => formatReservationTime(row.start_time))
    );
    const now = new Date();
    for (const startTime of startTimes) {
      if (isReservationTimeInPast(dateValue, startTime, now, timeZone)) {
        continue;
      }

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

      const tableCombination = findRoomTableCombination({
        rows,
        typologies,
        requiredTimes,
        people,
        allowCombination: outlet.combine_tables,
      });
      if (tableCombination) {
        const row = rows.find(
          (availabilityRow) =>
            formatReservationTime(availabilityRow.start_time) === startTime
        );
        slots.set(startTime, {
          start_time: startTime,
          end_time: formatReservationTime(row.end_time),
        });
      }
    }

    return Response.json({
      slots: [...slots.values()].sort((a, b) =>
        a.start_time.localeCompare(b.start_time)
      ),
      time_options: timeOptions,
    });
  } catch (error) {
    console.error("Não foi possível carregar a disponibilidade.", error);
    return Response.json(
      { error: "Não foi possível carregar os horários disponíveis." },
      { status: 500 }
    );
  }
}
