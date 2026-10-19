import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PUT(req, context) {
  const params = await context.params;

  const id = Number(params.id);

  const body = await req.json();

  const updated = await prisma.Languages.update({
    where: { lang_id: id },
    data: { lang_name: body.lang_name },
  });

  return Response.json(updated);
}
// DELETE
export async function DELETE(req, context) {
  const params = await context.params;

  await prisma.Languages.delete({
    where: { lang_id: Number(params.id) },
  });

  return Response.json({ ok: true });
}