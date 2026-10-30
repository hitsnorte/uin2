import { prisma } from "@/lib/prisma";
import { getScheduleData } from "./utils";

export async function GET() {
  const schedules = await prisma.schedules.findMany({
    orderBy: { schedule_id: "asc" },
  });

  return Response.json(schedules);
}

export async function POST(request) {
  const body = await request.json();
  const scheduleData = getScheduleData(body);

  if (!scheduleData) {
    return Response.json(
      { error: "Invalid schedule_json or slotDuration" },
      { status: 400 }
    );
  }

  const created = await prisma.schedules.create({
    data: scheduleData,
  });

  return Response.json(created, { status: 201 });
}