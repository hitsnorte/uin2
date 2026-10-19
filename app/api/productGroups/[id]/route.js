import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PUT(req, context) {
  const params = await context.params;

  const id = Number(params.id);

  const body = await req.json();

  const updated = await prisma.productGroup.update({
    where: { product_group_id: id },
    data: { product_group_name: body.product_group_name },
  });

  return Response.json(updated);
}
// DELETE
export async function DELETE(req, context) {
  const params = await context.params;

  await prisma.productGroup.delete({
    where: { product_group_id: Number(params.id) },
  });

  return Response.json({ ok: true });
}