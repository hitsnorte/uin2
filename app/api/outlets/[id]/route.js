import { prisma } from "@/lib/prisma";

function toBooleanFlag(value) {
  return value === true || value === 1 || value === "1";
}

function toNumericFlag(value) {
  return toBooleanFlag(value) ? 1 : 0;
}

function getScheduleVisiblePart(value, defaultValue = 2) {
  if (value === undefined) return defaultValue;
  if (value === null || value === "") return null;

  const part = Number(value);
  return Number.isInteger(part) && part >= 0 && part <= 2 ? part : null;
}

async function getSelectedScheduleId(body, existingOutlet, isRequired) {
  if (!isRequired) {
    return body.schedule_id === undefined
      ? existingOutlet.schedule_id
      : body.schedule_id
        ? Number(body.schedule_id)
        : null;
  }

  const scheduleId = Number(body.schedule_id ?? existingOutlet.schedule_id);
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

// UPDATE
export async function PUT(req, context) {
  try {
    const params = await context.params;
    const id = Number(params.id);

    if (!id) {
      return Response.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();
    const existingOutlet = await prisma.outlets.findUnique({
      where: { outlet_id: id },
    });

    if (!existingOutlet) {
      return Response.json({ error: "Outlet não encontrado" }, { status: 404 });
    }

    const scheduleVisiblePart = getScheduleVisiblePart(
      body.schedule_visible_part,
      existingOutlet.schedule_visible_part ?? 2
    );
    if (scheduleVisiblePart === null) {
      return Response.json(
        { error: "A parte do horário visível é inválida." },
        { status: 400 }
      );
    }

    const reservationEnabled =
      body.reservation === undefined
        ? toBooleanFlag(existingOutlet.reservation)
        : toBooleanFlag(body.reservation);
    const scheduleAssociationEnabled =
      body.associate_schedule === undefined
        ? toBooleanFlag(existingOutlet.associate_schedule)
        : toBooleanFlag(body.associate_schedule);
    const scheduleRequired = reservationEnabled || scheduleAssociationEnabled;
    const selectedScheduleId = await getSelectedScheduleId(
      body,
      existingOutlet,
      scheduleRequired
    );

    if (scheduleRequired && selectedScheduleId === null) {
      return Response.json(
        { error: "É obrigatório selecionar um horário válido para o outlet." },
        { status: 400 }
      );
    }

    if (
      typeof body.visible === "boolean" &&
      Object.keys(body).every((key) => key === "visible")
    ) {
      const updated = await prisma.outlets.update({
        where: { outlet_id: id },
        data: { visible: body.visible },
      });

      return Response.json(updated);
    }

    const reservationItemIdValue =
      body.reservation_item_id === undefined
        ? existingOutlet.reservation_item_id
        : body.reservation_item_id;
    const reservationItemId = reservationEnabled
      ? await getTableReservationItemId(reservationItemIdValue)
      : null;
    if (reservationEnabled && reservationItemId === null) {
      return Response.json(
        { error: "Selecione um item válido do tipo Reserva de mesa." },
        { status: 400 }
      );
    }
    const reservationDurationValue =
      body.reservation_duration === undefined
        ? existingOutlet.reservation_duration
        : body.reservation_duration;
    const reservationDuration = reservationEnabled
      ? getReservationDuration(reservationDurationValue)
      : null;
    if (reservationEnabled && reservationDuration === null) {
      return Response.json(
        { error: "Indique uma duração válida em minutos para a reserva." },
        { status: 400 }
      );
    }

    const updated = await prisma.outlets.update({
      where: {
        outlet_id: id,
      },
      data: {
        outlet_name1: body.outlet_name1 || null,
        outlet_name2: body.outlet_name2 || null,
        outlet_name3: body.outlet_name3 || null,
        outlet_name4: body.outlet_name4 || null,
        outlet_name5: body.outlet_name5 || null,
        // outlet_type: Number(body.outlet_type) || 1,
        area_id: Number(body.area_id),
        visible: body.visible ?? true,
        outlet_card_background: body.outlet_card_background || null,
        schedule_id: selectedScheduleId,
        schedule_visible_part: scheduleVisiblePart,
        reservation_item_id: reservationItemId,
        reservation_duration: reservationDuration,
        ...(body.schedule_visible !== undefined && {
          schedule_visible: toBooleanFlag(body.schedule_visible),
        }),
        ...(body.associate_schedule !== undefined && {
          associate_schedule: toBooleanFlag(body.associate_schedule),
        }),
        ...(body.access_points !== undefined && {
          access_points: toBooleanFlag(body.access_points),
        }),
        ...(body.reservation !== undefined && {
          reservation: toNumericFlag(body.reservation),
        }),
        ...(body.service_reservation !== undefined && {
          service_reservation: toBooleanFlag(body.service_reservation),
        }),
        ...(body.takeaway_order !== undefined && {
          takeaway_order: toBooleanFlag(body.takeaway_order),
        }),
        ...(body.order !== undefined && {
          order: toNumericFlag(body.order),
        }),
        ...(body.instant_order !== undefined && {
          instant_order: toBooleanFlag(body.instant_order),
        }),
      },
    });

    return Response.json(updated);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// DELETE
export async function DELETE(_, context) {
  try {
    const params = await context.params;
    const id = Number(params.id);

    if (!id) {
      return Response.json({ error: "ID inválido" }, { status: 400 });
    }

    await prisma.outlets.delete({
      where: {
        outlet_id: id,
      },
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}