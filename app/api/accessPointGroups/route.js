import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  const data = await prisma.accessPointGroups.findMany({
    orderBy: { access_point_group_id: "asc" },
  });
  return Response.json(data);
}

export async function POST(req) {
  const body = await req.json();
  const created = await prisma.accessPointGroups.create({
    data: { access_point_group_name: body.access_point_group_name || null },
  });
  return Response.json(created);
}
