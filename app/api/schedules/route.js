import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

export async function GET() {
  const schedules = await prisma.schedules.findMany({
    orderBy: { schedule_id: "asc" },
  });

  return Response.json(schedules);
}

export async function POST(request) {
  const body = await request.json();

  if (!isScheduleJson(body.schedule_json)) {
    return Response.json({ error: "Invalid schedule_json" }, { status: 400 });
  }

  const created = await prisma.schedules.create({
    data: { schedule_json: body.schedule_json },
  });

  return Response.json(created, { status: 201 });
}