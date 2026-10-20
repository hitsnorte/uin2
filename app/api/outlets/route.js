import { prisma } from "@/lib/prisma";

function toBooleanFlag(value) {
  return value === true || value === 1 || value === "1";
}

function toNumericFlag(value) {
  return toBooleanFlag(value) ? 1 : 0;
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
        associate_schedule: toBooleanFlag(associate_schedule),
        access_points: toBooleanFlag(access_points),
        reservation: toNumericFlag(reservation),
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