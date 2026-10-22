import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PUT(req, context) {
  const params = await context.params;

  const id = Number(params.id);

  const body = await req.json();

  const updated = await prisma.itemSubFamily.update({
    where: { item_subfamily_id: id },
    data: {
      category_name1: body.category_name1,
      category_name2: body.category_name2 ?? null,
      category_name3: body.category_name3 ?? null,
      category_name4: body.category_name4 ?? null,
      category_name5: body.category_name5 ?? null,
      item_family_id: body.item_family_id ? Number(body.item_family_id) : null,
    },
  });

  return Response.json(updated);
}
// DELETE
export async function DELETE(req, context) {
  const params = await context.params;

  await prisma.itemSubFamily.delete({
    where: { item_subfamily_id: Number(params.id) },
  });

  return Response.json({ ok: true });
}