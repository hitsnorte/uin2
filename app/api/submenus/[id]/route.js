import { prisma } from "@/lib/prisma";

export async function PUT(req, context) {
  const { id } = await context.params;
  const body = await req.json();
  const data = {};

  for (let index = 1; index <= 5; index += 1) {
    const field = `submenu_name${index}`;
    if (body[field] !== undefined) {
      data[field] = body[field] || null;
    }
  }

  if (body.menu_id !== undefined) {
    data.menu_id = body.menu_id ? Number(body.menu_id) : null;
  }

  if (body.visible !== undefined) {
    data.visible = body.visible;
  }

  if (body.submenu_card_background !== undefined) {
    data.submenu_card_background = body.submenu_card_background || null;
  }

  const updated = await prisma.submenus.update({
    where: { submenu_id: Number(id) },
    data,
  });

  return Response.json(updated);
}

export async function DELETE(req, context) {
  const { id } = await context.params;

  await prisma.submenus.delete({
    where: { submenu_id: Number(id) },
  });

  return Response.json({ ok: true });
}
