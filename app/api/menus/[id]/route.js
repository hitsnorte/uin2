import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// UPDATE
export async function PUT(req, context) {
  try {
    const params = await context.params;
    const id = Number(params.id);

    if (!id) {
      return Response.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();

    const updated = await prisma.Menus.update({
      where: {
        menu_id: id,
      },
      data: {
        menu_name1: body.menu_name1 || null,
        menu_name2: body.menu_name2 || null,
        menu_name3: body.menu_name3 || null,
        menu_name4: body.menu_name4 || null,
        menu_name5: body.menu_name5 || null,
        menu_type: Number(body.menu_type) || 1,
        outlet_id: Number(body.outlet_id),
        visible: body.visible ?? true,
        menu_card_background: body.menu_card_background || null,
      },
    });

    return Response.json(updated);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// DELETE
export async function DELETE(_, context) {
  try {
    const params = await context.params;
    const id = Number(params.id);

    if (!id) {
      return Response.json({ error: "ID inválido" }, { status: 400 });
    }

    await prisma.Menus.delete({
      where: {
        menu_id: id,
      },
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}