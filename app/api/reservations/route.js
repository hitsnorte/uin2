import { prisma } from "@/lib/prisma";
import {
  formatReservationTime,
  getRequiredSlotTimes,
  getReservationShift,
  isReservationDate,
  parseReservationTime,
} from "@/lib/tableReservation";

function isValidTime(value) {
  return parseReservationTime(value) !== null;
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Pedido inválido." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const outletId = Number(body.outlet_id);
  const people = Number(body.pax_size);
  const dateValue = body.date;
  const startTime = body.start_time;

  if (
    !Number.isSafeInteger(outletId) ||
    outletId <= 0 ||
    !Number.isSafeInteger(people) ||
    people <= 0 ||
    people > 20 ||
    !isReservationDate(dateValue) ||
    !isValidTime(startTime)
  ) {
    return Response.json(
      { error: "Indique outlet, data, horário e número de pessoas válidos." },
      { status: 400 }
    );
  }

  const date = new Date(`${dateValue}T00:00:00.000Z`);
  const startAt = new Date(`${dateValue}T${startTime}:00.000Z`);

  try {
    const reservation = await prisma.$transaction(async (transaction) => {
      const outlet = await transaction.outlets.findUnique({
        where: { outlet_id: outletId },
        select: {
          reservation: true,
          schedule_id: true,
          typologies: {
            where: { seats: { gte: people } },
            select: { typology_id: true, seats: true },
            orderBy: [{ seats: "asc" }, { typology_id: "asc" }],
          },
        },
      });

      if (!outlet || Number(outlet.reservation) !== 1 || !outlet.schedule_id) {
        const error = new Error("Este outlet não permite reservas de mesa.");
        error.status = 404;
        throw error;
      }

      if (!outlet.typologies.length) {
        const error = new Error(
          "Não existe uma tipologia com lugares suficientes para este grupo."
        );
        error.status = 409;
        throw error;
      }

      const schedule = await transaction.schedules.findUnique({
        where: { schedule_id: outlet.schedule_id },
        select: { schedule_json: true, slotDuration: true },
      });
      if (!schedule) {
        const error = new Error("O horário associado ao outlet não existe.");
        error.status = 409;
        throw error;
      }

      const shiftIndex = getReservationShift(
        schedule.schedule_json,
        dateValue,
        startTime
      );
      if (shiftIndex === null || shiftIndex < 0) {
        const error = new Error("O horário selecionado não pertence a um turno.");
        error.status = 409;
        throw error;
      }

      const shiftItems = await transaction.outletItems.findMany({
        where: {
          outlet_id: outletId,
          is_reservation_item: true,
          shift_index: shiftIndex,
        },
        orderBy: { outlet_item_id: "asc" },
      });
      if (shiftItems.length !== 1) {
        const error = new Error(
          "Configure exatamente um item de reserva para o turno selecionado."
        );
        error.status = 409;
        throw error;
      }

      const item = shiftItems[0];
      const duration = Number(item.item_duration);
      const slotDuration =
        Number.isSafeInteger(schedule.slotDuration) && schedule.slotDuration > 0
          ? schedule.slotDuration
          : 30;
      const requiredTimes = getRequiredSlotTimes(
        startTime,
        duration,
        slotDuration
      );
      if (!requiredTimes.length) {
        const error = new Error("A duração do item de reserva é inválida.");
        error.status = 409;
        throw error;
      }
      const requiredTimeLabels = new Set(
        requiredTimes.map(formatReservationTime)
      );

      for (const typology of outlet.typologies) {
        const typologyRows = await transaction.availability.findMany({
          where: {
            typology_id: typology.typology_id,
            availability_date: date,
            available_capacity: { gt: 0 },
          },
          orderBy: { start_time: "asc" },
        });
        const availableRows = typologyRows.filter((row) =>
          requiredTimeLabels.has(formatReservationTime(row.start_time))
        );
        if (
          availableRows.length !== requiredTimes.length ||
          requiredTimes.some(
            (requiredTime) =>
              !availableRows.some(
                (row) =>
                  formatReservationTime(row.start_time) ===
                  formatReservationTime(requiredTime)
              )
          )
        ) {
          continue;
        }

        let allSlotsReserved = true;
        for (const row of availableRows) {
          const result = await transaction.availability.updateMany({
            where: {
              availability_id: row.availability_id,
              available_capacity: { gt: 0 },
            },
            data: { available_capacity: { decrement: 1 } },
          });
          if (result.count !== 1) {
            allSlotsReserved = false;
            break;
          }
        }
        if (!allSlotsReserved) {
          const error = new Error(
            "Este horário acabou de ficar indisponível. Atualize os horários e escolha outro."
          );
          error.status = 409;
          throw error;
        }

        const created = await transaction.reservations.create({
          data: {
            outlet_id: outletId,
            outlet_item_id: item.outlet_item_id,
            typology_id: typology.typology_id,
            pax_size: people,
            start_at: startAt,
            end_at: new Date(startAt.getTime() + duration * 60 * 1000),
            duration_minutes: duration,
            source: "online",
          },
          select: {
            reservation_id: true,
            outlet_id: true,
            outlet_item_id: true,
            typology_id: true,
            pax_size: true,
            start_at: true,
            end_at: true,
            duration_minutes: true,
          },
        });

        return {
          ...created,
          typology_id: created.typology_id.toString(),
        };
      }

      const error = new Error(
        "Não há mesas disponíveis para este grupo durante toda a duração da reserva."
      );
      error.status = 409;
      throw error;
    });

    return Response.json(reservation, { status: 201 });
  } catch (error) {
    if (error.status) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    console.error("Não foi possível guardar a reserva.", error);
    return Response.json(
      { error: "Não foi possível guardar a reserva." },
      { status: 500 }
    );
  }
}
