import { prisma } from "@/lib/prisma";
import { getFoSessionUser } from "@/lib/foSession";
import { findRoomTableCombination } from "@/lib/tableAvailability";
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
          combine_tables: true,
          typologies: {
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

      const typologies = outlet.typologies.filter(
        (typology) => Number(typology.seats) > 0
      );
      if (!typologies.length) {
        const error = new Error(
          "Não existem mesas configuradas para este outlet."
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
      if (item.checkin === "1" && !(await getFoSessionUser(transaction))) {
        const error = new Error("Inicie sessão para reservar este item.");
        error.status = 401;
        throw error;
      }

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
      const typologyIds = typologies.map((typology) => typology.typology_id);
      const availabilityRows = await transaction.availability.findMany({
        where: {
          typology_id: { in: typologyIds },
          availability_date: date,
          available_capacity: { gt: 0 },
        },
        orderBy: [{ start_time: "asc" }, { room_id: "asc" }],
      });
      const tableCombination = findRoomTableCombination({
        rows: availabilityRows,
        typologies,
        requiredTimes,
        people,
        allowCombination: outlet.combine_tables,
      });
      if (!tableCombination) {
        const error = new Error(
          "Não há mesas disponíveis para este grupo durante toda a duração da reserva."
        );
        error.status = 409;
        throw error;
      }

      const rowsByRoomTypeTime = new Map(
        availabilityRows.map((row) => [
          `${row.room_id}:${row.typology_id}:${formatReservationTime(
            row.start_time
          )}`,
          row,
        ])
      );
      for (const allocation of tableCombination.allocations) {
        for (const requiredTime of requiredTimes) {
          const row = rowsByRoomTypeTime.get(
            `${allocation.room_id}:${allocation.typology_id}:${formatReservationTime(
              requiredTime
            )}`
          );
          if (!row) {
            const error = new Error(
              "Este horário acabou de ficar indisponível. Atualize os horários e escolha outro."
            );
            error.status = 409;
            throw error;
          }

          const result = await transaction.availability.updateMany({
            where: {
              availability_id: row.availability_id,
              available_capacity: { gte: allocation.table_count },
            },
            data: {
              available_capacity: { decrement: allocation.table_count },
            },
          });
          if (result.count !== 1) {
            const error = new Error(
              "Este horário acabou de ficar indisponível. Atualize os horários e escolha outro."
            );
            error.status = 409;
            throw error;
          }
        }
      }

      const created = await transaction.reservations.create({
        data: {
          outlet_id: outletId,
          outlet_item_id: item.outlet_item_id,
          typology_id: BigInt(tableCombination.allocations[0].typology_id),
          pax_size: people,
          start_at: startAt,
          end_at: new Date(startAt.getTime() + duration * 60 * 1000),
          duration_minutes: duration,
          source: "online",
          ReservationTableAllocations: {
            create: tableCombination.allocations.map((allocation) => ({
              typology_id: BigInt(allocation.typology_id),
              room_id: allocation.room_id,
              table_count: allocation.table_count,
            })),
          },
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
          ReservationTableAllocations: {
            select: {
              typology_id: true,
              room_id: true,
              table_count: true,
            },
          },
        },
      });

      return {
        ...created,
        typology_id: created.typology_id.toString(),
        table_allocations: created.ReservationTableAllocations.map(
          (allocation) => ({
            ...allocation,
            typology_id: allocation.typology_id.toString(),
          })
        ),
        ReservationTableAllocations: undefined,
      };
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
