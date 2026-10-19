import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function parseJson(value) {
  if (value == null || value === "") return null;
  return typeof value === "string" ? JSON.parse(value) : value;
}

export async function PUT(req, context) {
  const { id } = await context.params;
  const body = await req.json();
  const updated = await prisma.accessPoints.update({
    where: { access_point_id: Number(id) },
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
  return Response.json(updated);
}

export async function DELETE(req, context) {
  const { id } = await context.params;
  await prisma.accessPoints.delete({
    where: { access_point_id: Number(id) },
  });
  return Response.json({ ok: true });
}
