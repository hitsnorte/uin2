import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PUT(req, context) {
  const params = await context.params;

  const id = Number(params.id);

  const body = await req.json();

  const updated = await prisma.ProductFamily.update({
    where: { product_family_id: id },
    data: { product_family_name: body.product_family_name,
      product_group_id: body.product_group_id ? Number(body.product_group_id) : null
     },
  });

  return Response.json(updated);
}
// DELETE
export async function DELETE(req, context) {
  const params = await context.params;

  await prisma.ProductFamily.delete({
    where: { product_family_id: Number(params.id) },
  });

  return Response.json({ ok: true });
}