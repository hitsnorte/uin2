import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  const data = await prisma.preparation.findMany({
    orderBy: { preparation_id: "asc" },
  });

  return Response.json(data);
}

export async function POST(req) {
  const body = await req.json();

  const created = await prisma.preparation.create({
    data: {
      preparation_group_id: body.preparation_group_id
        ? Number(body.preparation_group_id)
        : null,
      preparation_name1: body.preparation_name1 || null,
      preparation_name2: body.preparation_name2 || null,
      preparation_name3: body.preparation_name3 || null,
      preparation_name4: body.preparation_name4 || null,
      preparation_name5: body.preparation_name5 || null,
    },
  });

  return Response.json(created);
}
