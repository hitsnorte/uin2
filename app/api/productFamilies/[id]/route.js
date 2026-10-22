import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PUT(req, context) {
  const params = await context.params;

  const id = Number(params.id);

  const body = await req.json();

  const updated = await prisma.itemFamily.update({
    where: { item_family_id: id },
    data: { item_family_name: body.item_family_name,
      item_group_id: body.item_group_id ? Number(body.item_group_id) : null
     },
  });

  return Response.json(updated);
}
// DELETE
export async function DELETE(req, context) {
  const params = await context.params;

  await prisma.itemFamily.delete({
    where: { item_family_id: Number(params.id) },
  });

  return Response.json({ ok: true });
}