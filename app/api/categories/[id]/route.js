import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// UPDATE
export async function PUT(req, context) {
  const params = await context.params;
  const id = Number(params.id);

  const body = await req.json();

  const updated = await prisma.categories.update({
    where: { category_id: id },
    data: {
      category_name1: body.category_name1,
      category_name2: body.category_name2,
      category_name3: body.category_name3,
      category_name4: body.category_name4,
      category_name5: body.category_name5,
      visible: body.visible,
      category_card_background: body.category_card_background || null,
    },
  });

  return Response.json(updated);
}

// DELETE
export async function DELETE(req, context) {
  const params = await context.params;

  await prisma.categories.delete({
    where: { category_id: Number(params.id) },
  });

  return Response.json({ ok: true });
}