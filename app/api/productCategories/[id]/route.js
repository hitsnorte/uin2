import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PUT(req, context) {
  const params = await context.params;

  const id = Number(params.id);

  const body = await req.json();

  const updated = await prisma.productCats.update({
    where: { product_cat_id: id },
    data: {
      category_name1: body.category_name1,
      category_name2: body.category_name2 ?? null,
      category_name3: body.category_name3 ?? null,
      category_name4: body.category_name4 ?? null,
      category_name5: body.category_name5 ?? null,
      product_family_id: body.product_family_id ? Number(body.product_family_id) : null,
    },
  });

  return Response.json(updated);
}
// DELETE
export async function DELETE(req, context) {
  const params = await context.params;

  await prisma.productCats.delete({
    where: { product_cat_id: Number(params.id) },
  });

  return Response.json({ ok: true });
}