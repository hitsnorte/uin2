import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function parseJson(value) {
  if (value == null || value === "") return null;
  return typeof value === "string" ? JSON.parse(value) : value;
}

export async function GET() {
  const data = await prisma.accessPoints.findMany({
    orderBy: { access_point_id: "asc" },
  });
  return Response.json(data);
}

export async function POST(req) {
  const body = await req.json();
  const created = await prisma.accessPoints.create({
    data: {
      access_point_sub_group_id: body.access_point_sub_group_id
        ? Number(body.access_point_sub_group_id)
        : null,
      access_point_name: body.access_point_name || null,
      products: parseJson(body.products),
      product_cat: parseJson(body.product_cat),
      activities: parseJson(body.activities),
      active: body.active !== false,
    },
  });
  return Response.json(created);
}
