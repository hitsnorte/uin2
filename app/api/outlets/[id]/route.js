import { prisma } from "@/lib/prisma";
import {
  buildOutletItemSnapshot,
  validateOutletReservationItems,
} from "@/lib/outletReservationItems";
import { syncOutletAvailability } from "@/lib/availability";

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
      include: {
        reservationItems: {
          select: {
            outlet_reservation_item_id: true,
            item_id: true,
            shift_index: true,
          },
        },
      },
    });

    if (!existingOutlet) {
      return Response.json({ error: "Outlet não encontrado" }, { status: 404 });
    }

    const referencedSnapshot = existingOutlet.reservation_item_id
      ? await prisma.outletItems.findFirst({
          where: {
            outlet_item_id: existingOutlet.reservation_item_id,
            outlet_id: id,
            is_reservation_item: true,
          },
        })
      : null;

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

    const reservationItemsInput =
      body.reservation_items ??
      (body.reservation_item_id !== undefined
        ? body.reservation_item_id
          ? [{ item_id: body.reservation_item_id, shift_index: 0 }]
          : []
        : existingOutlet.reservationItems.length
          ? existingOutlet.reservationItems
          : referencedSnapshot
            ? [referencedSnapshot]
            : []);
    const reservationItems = reservationEnabled
      ? await validateOutletReservationItems(
          prisma,
          reservationItemsInput,
          selectedScheduleId
        )
      : { items: [] };
    if (reservationItems.error) {
      return Response.json(
        { error: reservationItems.error },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(async (transaction) => {
      await transaction.outlets.update({
        where: { outlet_id: id },
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
          reservation_item_id: null,
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
          ...((body.combine_tables !== undefined ||
            body.reservation !== undefined) && {
            combine_tables:
              reservationEnabled &&
              (body.combine_tables === undefined
                ? existingOutlet.combine_tables
                : toBooleanFlag(body.combine_tables)),
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

      await transaction.outletReservationItems.deleteMany({
        where: { outlet_id: id },
      });
      const existingSnapshots = await transaction.outletItems.findMany({
        where: { outlet_id: id, is_reservation_item: true },
        select: {
          outlet_item_id: true,
          item_id: true,
          shift_index: true,
          _count: { select: { Reservations: true } },
        },
        orderBy: { outlet_item_id: "asc" },
      });
      const usedSnapshotIds = new Set();
      let firstOutletItem = null;
      if (reservationItems.items.length) {
        await transaction.outletReservationItems.createMany({
          data: reservationItems.items.map(({ item_id, shift_index }) => ({
            outlet_id: id,
            item_id,
            shift_index,
          })),
        });
        for (const item of reservationItems.items) {
          const matchingSnapshot = existingSnapshots.find(
            (snapshot) =>
              !usedSnapshotIds.has(snapshot.outlet_item_id) &&
              snapshot.item_id === item.item_id &&
              snapshot.shift_index === item.shift_index
          );
          const reusableSnapshot =
            matchingSnapshot ||
            existingSnapshots.find(
              (snapshot) =>
                !usedSnapshotIds.has(snapshot.outlet_item_id) &&
                snapshot._count.Reservations === 0
            );
          const snapshotData = buildOutletItemSnapshot(
            item,
            id,
            selectedScheduleId
          );
          const outletItem = reusableSnapshot
            ? await transaction.outletItems.update({
                where: { outlet_item_id: reusableSnapshot.outlet_item_id },
                data: { ...snapshotData, updated_at: new Date() },
              })
            : await transaction.outletItems.create({ data: snapshotData });
          if (reusableSnapshot) {
            usedSnapshotIds.add(reusableSnapshot.outlet_item_id);
          }
          firstOutletItem ??= outletItem;
        }
      }
      const unusedSnapshotIds = existingSnapshots
        .filter(
          (snapshot) =>
            !usedSnapshotIds.has(snapshot.outlet_item_id) &&
            snapshot._count.Reservations === 0
        )
        .map((snapshot) => snapshot.outlet_item_id);
      if (unusedSnapshotIds.length) {
        await transaction.outletItems.deleteMany({
          where: { outlet_item_id: { in: unusedSnapshotIds } },
        });
      }

      if (firstOutletItem) {
        await transaction.outlets.update({
          where: { outlet_id: id },
          data: { reservation_item_id: firstOutletItem.outlet_item_id },
        });
      }

      await syncOutletAvailability(transaction, id);

      return transaction.outlets.findUnique({
        where: { outlet_id: id },
        include: {
          reservationItems: {
            select: {
              outlet_reservation_item_id: true,
              item_id: true,
              shift_index: true,
            },
          },
        },
      });
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