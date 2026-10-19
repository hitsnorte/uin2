import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PUT(req, context) {
  const { id } = await context.params;
  const body = await req.json();

  const updated = await prisma.preparation.update({
    where: { preparation_id: Number(id) },
    data: {
      preparation_group_id: body.preparation_group_id
        ? Number(body.preparation_group_id)
        : null,
      preparation_name1: body.preparation_name1 || null,
      preparation_name2: body.preparation_name2 || null,
      preparation_name3: body.preparation_name3 || null,
      preparation_name4: body.preparation_name4 || null,
      preparation_name5: body.preparation_name5 || null,
    },
  });

  return Response.json(updated);
}

export async function DELETE(req, context) {
  const { id } = await context.params;

  await prisma.preparation.delete({
    where: { preparation_id: Number(id) },
  });

  return Response.json({ ok: true });
}
