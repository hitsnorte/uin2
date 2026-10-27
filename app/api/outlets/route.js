import { prisma } from "@/lib/prisma";
import {
  buildOutletItemSnapshot,
  validateOutletReservationItems,
} from "@/lib/outletReservationItems";

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

// GET ALL
export async function GET() {
  try {
    const data = await prisma.outlets.findMany({
      include: {
        reservationItems: {
          select: {
            outlet_reservation_item_id: true,
            item_id: true,
            shift_index: true,
          },
        },
      },
      orderBy: {
        outlet_id: "asc",
      },
    });

    const outletItems = await prisma.outletItems.findMany({
      where: {
        outlet_id: { in: data.map((outlet) => outlet.outlet_id) },
        is_reservation_item: true,
      },
      orderBy: { outlet_item_id: "asc" },
    });
    const itemsByOutletId = new Map();
    for (const item of outletItems) {
      const items = itemsByOutletId.get(item.outlet_id) || [];
      items.push(item);
      itemsByOutletId.set(item.outlet_id, items);
    }

    return Response.json(
      data.map((outlet) => ({
        ...outlet,
        OutletItems: itemsByOutletId.get(outlet.outlet_id) || [],
      }))
    );
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

    const reservationItemsInput =
      body.reservation_items ??
      (body.reservation_item_id
        ? [{ item_id: body.reservation_item_id, shift_index: 0 }]
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

    const created = await prisma.$transaction(async (transaction) => {
      const outlet = await transaction.outlets.create({
        data: {
          outlet_name1: outlet_name1 || null,
          outlet_name2: outlet_name2 || null,
          outlet_name3: outlet_name3 || null,
          outlet_name4: outlet_name4 || null,
          outlet_name5: outlet_name5 || null,
          area_id: Number(area_id),
          visible: true,
          outlet_card_background: outlet_card_background || null,
          schedule_id: selectedScheduleId,
          schedule_visible: toBooleanFlag(schedule_visible),
          schedule_visible_part: scheduleVisiblePart,
          associate_schedule: toBooleanFlag(associate_schedule),
          access_points: toBooleanFlag(access_points),
          reservation: toNumericFlag(reservation),
          reservation_item_id: null,
          service_reservation: toBooleanFlag(service_reservation),
          takeaway_order: toBooleanFlag(takeaway_order),
          order: toNumericFlag(order),
          instant_order: toBooleanFlag(instant_order),
          reservationItems: {
            create: reservationItems.items.map(({ item_id, shift_index }) => ({
              item_id,
              shift_index,
            })),
          },
        },
      });

      let firstOutletItem = null;
      if (reservationItems.items.length) {
        for (const item of reservationItems.items) {
          const outletItem = await transaction.outletItems.create({
            data: buildOutletItemSnapshot(
              item,
              outlet.outlet_id,
              selectedScheduleId
            ),
          });
          firstOutletItem ??= outletItem;
        }
      }

      if (firstOutletItem) {
        await transaction.outlets.update({
          where: { outlet_id: outlet.outlet_id },
          data: { reservation_item_id: firstOutletItem.outlet_item_id },
        });
      }

      return transaction.outlets.findUnique({
        where: { outlet_id: outlet.outlet_id },
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

    return Response.json(created);
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}