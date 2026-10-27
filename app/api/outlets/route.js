import { prisma } from "@/lib/prisma";

function toBooleanFlag(value) {
  return value === true || value === 1 || value === "1";
}

function toNumericFlag(value) {
  return toBooleanFlag(value) ? 1 : 0;
}

function getScheduleVisiblePart(value) {
  if (value === undefined) return 2;
  if (value === null || value === "") return null;

  const part = Number(value);
  return Number.isInteger(part) && part >= 0 && part <= 2 ? part : null;
}

async function getSelectedScheduleId(body, isRequired) {
  if (!isRequired && !body.schedule_id) return null;

  const scheduleId = Number(body.schedule_id);
  if (!Number.isInteger(scheduleId) || scheduleId <= 0) return null;

  const schedule = await prisma.schedules.findUnique({
    where: { schedule_id: scheduleId },
    select: { schedule_id: true },
  });

  return schedule ? scheduleId : null;
}

async function getTableReservationItemId(value) {
  const itemId = Number(value);
  if (!Number.isSafeInteger(itemId) || itemId <= 0) return null;

  const item = await prisma.items.findFirst({
    where: { item_id: itemId, item_type: "Reserva de mesa" },
    select: { item_id: true },
  });

  return item?.item_id ?? null;
}

function getReservationDuration(value) {
  const duration = Number(value);
  return Number.isSafeInteger(duration) && duration > 0 ? duration : null;
}

// GET ALL
export async function GET() {
  try {
    const data = await prisma.outlets.findMany({
      orderBy: {
        outlet_id: "asc",
      },
    });

    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// CREATE (FIXED)
export async function POST(req) {
  try {
    const body = await req.json();

    const {
      outlet_name1,
      outlet_name2,
      outlet_name3,
      outlet_name4,
      outlet_name5,
      // outlet_type,
      area_id,
      outlet_card_background,
      schedule_id,
      schedule_visible,
      associate_schedule,
      access_points,
      reservation,
      service_reservation,
      takeaway_order,
      order,
      instant_order,
    } = body;

    if (!area_id) {
      return Response.json(
        { error: "area_id obrigatório" },
        { status: 400 }
      );
    }

    const scheduleRequired =
      toBooleanFlag(reservation) || toBooleanFlag(associate_schedule);
    const reservationEnabled = toBooleanFlag(reservation);
    const reservationItemId = reservationEnabled
      ? await getTableReservationItemId(body.reservation_item_id)
      : null;
    if (reservationEnabled && reservationItemId === null) {
      return Response.json(
        { error: "Selecione um item válido do tipo Reserva de mesa." },
        { status: 400 }
      );
    }
    const reservationDuration = reservationEnabled
      ? getReservationDuration(body.reservation_duration)
      : null;
    if (reservationEnabled && reservationDuration === null) {
      return Response.json(
        { error: "Indique uma duração válida em minutos para a reserva." },
        { status: 400 }
      );
    }

    const scheduleVisiblePart = getScheduleVisiblePart(
      body.schedule_visible_part
    );
    if (scheduleVisiblePart === null) {
      return Response.json(
        { error: "A parte do horário visível é inválida." },
        { status: 400 }
      );
    }

    const selectedScheduleId = await getSelectedScheduleId(body, scheduleRequired);
    if (scheduleRequired && selectedScheduleId === null) {
      return Response.json(
        { error: "É obrigatório selecionar um horário válido para o outlet." },
        { status: 400 }
      );
    }

    const created = await prisma.outlets.create({
      data: {
        outlet_name1: outlet_name1 || null,
        outlet_name2: outlet_name2 || null,
        outlet_name3: outlet_name3 || null,
        outlet_name4: outlet_name4 || null,
        outlet_name5: outlet_name5 || null,
        // outlet_type: Number(outlet_type) || 1,
        area_id: Number(area_id),
        visible: true,

        // ✅ IMPORTANT: now using URL from upload endpoint
        outlet_card_background: outlet_card_background || null,
        schedule_id: selectedScheduleId,
        schedule_visible: toBooleanFlag(schedule_visible),
        schedule_visible_part: scheduleVisiblePart,
        associate_schedule: toBooleanFlag(associate_schedule),
        access_points: toBooleanFlag(access_points),
        reservation: toNumericFlag(reservation),
        reservation_item_id: reservationItemId,
        reservation_duration: reservationDuration,
        service_reservation: toBooleanFlag(service_reservation),
        takeaway_order: toBooleanFlag(takeaway_order),
        order: toNumericFlag(order),
        instant_order: toBooleanFlag(instant_order),
      },
    });

    return Response.json(created);
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}