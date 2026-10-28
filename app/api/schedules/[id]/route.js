import { prisma } from "@/lib/prisma";
import { syncOutletAvailability } from "@/lib/availability";

function isScheduleJson(value) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof value.name === "string" &&
    value.days &&
    typeof value.days === "object" &&
    !Array.isArray(value.days)
  );
}

export async function GET(_request, context) {
  const { id } = await context.params;
  const schedule = await prisma.schedules.findUnique({
    where: { schedule_id: Number(id) },
  });

  if (!schedule) {
    return Response.json({ error: "Schedule not found" }, { status: 404 });
  }

  return Response.json(schedule);
}

export async function PUT(request, context) {
  const { id } = await context.params;
  const body = await request.json();

  if (!isScheduleJson(body.schedule_json)) {
    return Response.json({ error: "Invalid schedule_json" }, { status: 400 });
  }

  const scheduleId = Number(id);
  const updated = await prisma.$transaction(async (transaction) => {
    const savedSchedule = await transaction.schedules.update({
      where: { schedule_id: scheduleId },
      data: { schedule_json: body.schedule_json },
    });
    const outlets = await transaction.outlets.findMany({
      where: { schedule_id: scheduleId },
      select: { outlet_id: true },
    });

    for (const outlet of outlets) {
      await syncOutletAvailability(transaction, outlet.outlet_id);
    }

    return savedSchedule;
  });

  return Response.json(updated);
}

export async function DELETE(_request, context) {
  const { id } = await context.params;
  const scheduleId = Number(id);

  if (!Number.isInteger(scheduleId) || scheduleId < 1) {
    return Response.json({ error: "Invalid schedule id" }, { status: 400 });
  }

  await prisma.schedules.delete({ where: { schedule_id: scheduleId } });
  return Response.json({ ok: true });
}