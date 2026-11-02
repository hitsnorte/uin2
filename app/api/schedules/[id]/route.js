import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth-options";
import { syncOutletAvailability } from "@/lib/availability";
import { getScheduleData } from "../utils";

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
  const session = await getServerSession(authOptions);
  const updatedBy = session?.user?.name?.trim();
  if (!updatedBy) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
  const scheduleId = Number(id);
  if (!Number.isSafeInteger(scheduleId) || scheduleId < 1) {
    return Response.json({ error: "Invalid schedule id" }, { status: 400 });
  }

  const body = await request.json();
  const scheduleData = getScheduleData(body);

  if (!scheduleData) {
    return Response.json(
      { error: "Invalid schedule_json or slotDuration" },
      { status: 400 }
    );
  }

  let updated;
  try {
    updated = await prisma.$transaction(async (transaction) => {
      const savedSchedule = await transaction.schedules.update({
        where: { schedule_id: scheduleId },
        data: scheduleData,
      });
      const outlets = await transaction.outlets.findMany({
        where: { schedule_id: scheduleId, reservation: 1 },
        select: { outlet_id: true },
      });

      for (const outlet of outlets) {
        await syncOutletAvailability(
          transaction,
          outlet.outlet_id,
          new Date(),
          updatedBy
        );
      }

      return savedSchedule;
    }, { timeout: 120000 });
  } catch (error) {
    console.error("Não foi possível guardar o horário e sincronizar a disponibilidade.", error);
    return Response.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Não foi possível guardar o horário.",
      },
      { status: 500 }
    );
  }

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