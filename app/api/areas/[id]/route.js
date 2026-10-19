import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// UPDATE
export async function PUT(req, context) {
  const params = await context.params;
  const id = Number(params.id);

  const body = await req.json();

  const updated = await prisma.Areas.update({
    where: { area_id: id },
    data: {
      area_name1: body.area_name1,
      area_name2: body.area_name2,
      area_name3: body.area_name3,
      area_name4: body.area_name4,
      area_name5: body.area_name5,
      visible: body.visible,
      area_card_background: body.area_card_background || null,
    },
  });

  return Response.json(updated);
}

// DELETE
export async function DELETE(req, context) {
  const params = await context.params;

  await prisma.Areas.delete({
    where: { area_id: Number(params.id) },
  });

  return Response.json({ ok: true });
}