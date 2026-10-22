import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PUT(req, context) {
  const params = await context.params;

  const id = Number(params.id);

  const body = await req.json();

  const updated = await prisma.itemGroup.update({
    where: { item_group_id: id },
    data: { item_group_name: body.item_group_name },
  });

  return Response.json(updated);
}
// DELETE
export async function DELETE(req, context) {
  const params = await context.params;

  await prisma.itemGroup.delete({
    where: { item_group_id: Number(params.id) },
  });

  return Response.json({ ok: true });
}