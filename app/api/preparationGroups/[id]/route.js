import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PUT(req, context) {
  const { id } = await context.params;
  const body = await req.json();

  const updated = await prisma.preparationGroups.update({
    where: { preparation_group_id: Number(id) },
    data: {
      preparation_group_name: body.preparation_group_name || null,
    },
  });

  return Response.json(updated);
}

export async function DELETE(req, context) {
  const { id } = await context.params;

  await prisma.preparationGroups.delete({
    where: { preparation_group_id: Number(id) },
  });

  return Response.json({ ok: true });
}
